const { rtdb, firestore } = require("../../database");
const storage = require("../../storage");
const { v4: uuidv4 } = require("uuid");

function calculateAlertLevel(distance) {
  if (typeof distance === "number") {
    if (distance < 10) {
      return "High";
    } else if (distance >= 10 && distance <= 20) {
      return "Medium";
    } else {
      return "Safe";
    }
  }
  return "Unknown";
}

async function restructureRealtimeData() {
  const oldRef = rtdb.ref("realtime_monitoring");
  const snapshot = await oldRef.once("value");
  const oldData = snapshot.val();

  if (!oldData) {
    console.log("No data to restructure.");
    return { migrated: 0 };
  }

  let migratedCount = 0;

  for (const [id, entry] of Object.entries(oldData)) {
    if (typeof entry === "object" && entry.sessionId !== undefined) {
      const sessionId = entry.sessionId;

      if (!sessionId || typeof sessionId !== "number" || sessionId < 1) {
        console.warn(`Invalid sessionId for entry ${id}, skipping.`);
        continue;
      }

      const newRef = rtdb.ref(`realtime_monitoring/${sessionId}/${id}`);
      await newRef.set(entry);
      await rtdb.ref(`realtime_monitoring/${id}`).remove();

      migratedCount++;
    }
  }

  console.log(`Restructure complete. Migrated ${migratedCount} entries.`);
  return { migrated: migratedCount };
}

async function saveRealtime(data) {
  const currentSessionSnap = await rtdb.ref("current_session").once("value");
  let sessionId = currentSessionSnap.val();

  sessionId = Number(sessionId);

  if (
    !sessionId ||
    typeof sessionId !== "number" ||
    sessionId < 1 ||
    isNaN(sessionId)
  ) {
    throw new Error(
      "Invalid or missing current_session value in the database."
    );
  }

  const ref = rtdb.ref(`realtime_monitoring/${sessionId}`).push();

  const baseData = {
    timestamp: data.timestamp || new Date().toISOString(),
    sessionId,
    metadata: data.metadata || {},
    obstacle: data.obstacle || false,
    createdAt: new Date().toISOString(),
    rssi: typeof data.rssi !== "undefined" ? data.rssi : 0,
    sessionStatus:
      typeof data.sessionStatus !== "undefined" ? data.sessionStatus : false,
  };

  const imageData = data.imageUrl
    ? {
        filename: data.filename || null,
        path: data.path || null,
        imageUrl: data.imageUrl || null,
        takenWith: data.takenWith || "ESP32-CAM",
      }
    : {};

  await ref.set({ ...baseData, ...imageData });

  return { id: ref.key, ...baseData, ...imageData };
}

async function getLastDataRealtime() {
  const snapshot = await rtdb
    .ref("realtime_monitoring")
    .orderByChild("createdAt")
    .limitToLast(1)
    .once("value");

  const val = snapshot.val();
  if (!val) return null;

  const [id] = Object.keys(val);
  return { id, ...val[id] };
}

async function getAllRealtime() {
  const snapshot = await rtdb
    .ref("realtime_monitoring")
    .orderByChild("createdAt")
    .once("value");

  const val = snapshot.val();
  if (!val) return { count: 0, data: [] };

  const data = Object.entries(val)
    .map(([id, item]) => ({ id, ...item }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return { count: data.length, data };
}

async function getAllRealtimeByLatestData() {
  const snapshot = await rtdb
    .ref("realtime_monitoring")
    .orderByChild("createdAt")
    .once("value");

  const val = snapshot.val();
  if (!val) return [];

  return Object.entries(val)
    .map(([id, item]) => ({ id, ...item }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// Get all realtime data that contains imageUrl, flattened from all sessions
async function getAllRealtimeWithImage() {
  const snapshot = await rtdb.ref("realtime_monitoring").once("value");
  const val = snapshot.val();
  if (!val) return [];

  const results = [];

  for (const [sessionId, entries] of Object.entries(val)) {
    if (typeof entries === "object" && entries !== null) {
      for (const [id, item] of Object.entries(entries)) {
        if (item.imageUrl && item.imageUrl.trim() !== "") {
          results.push({ id, sessionId, ...item });
        }
      }
    }
  }

  return results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function getAllRealtimeIncludingMetadata() {
  const snapshot = await rtdb.ref("realtime_monitoring").once("value");
  const val = snapshot.val();
  if (!val) return [];

  const results = [];

  for (const [sessionId, entries] of Object.entries(val)) {
    if (typeof entries === "object" && entries !== null) {
      for (const [id, item] of Object.entries(entries)) {
        if (item.metadata && Object.keys(item.metadata).length > 0) {
          results.push({ id, sessionId, ...item });
        }
      }
    }
  }

  return results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function getRealtimeById(id) {
  const snapshot = await rtdb.ref(`realtime_monitoring/${id}`).once("value");
  if (!snapshot.exists()) return null;
  return { id, ...snapshot.val() };
}

async function getAllRealtimeByDate(date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  const snapshot = await rtdb.ref("realtime_monitoring").once("value");
  const val = snapshot.val();
  if (!val) return [];

  return Object.entries(val)
    .map(([id, item]) => ({ id, ...item }))
    .filter((item) => {
      const ts = new Date(item.timestamp);
      return ts >= start && ts <= end;
    })
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

async function deleteRealtimeByID(id) {
  const ref = rtdb.ref(`realtime_monitoring/${id}`);
  const snapshot = await ref.once("value");

  if (!snapshot.exists()) return null;

  const data = snapshot.val();
  const filename = decodeURIComponent(data.path?.split("/").pop());

  if (filename) {
    try {
      const file = storage.file(`images/${filename}`);
      const [exists] = await file.exists();

      if (exists) {
        await file.delete();
        console.log(`File ${filename} deleted from storage.`);
      } else {
        console.warn("File not found in storage.");
      }
    } catch (err) {
      console.error("Error deleting file from storage:", err);
      throw new Error("Error deleting file from storage");
    }
  }

  await ref.remove();
  console.log(`Data with ID ${id} removed from Realtime rtdb.`);
  return true;
}

async function uploadImageToStorage(file) {
  if (!file || !file.buffer) {
    throw new Error("File buffer is missing");
  }

  const uniqueId = uuidv4();
  const filename = `${uniqueId}.png`;
  const fileRef = storage.file(`images/${filename}`);

  await fileRef.save(file.buffer, {
    metadata: {
      contentType: file.mimetype,
    },
  });

  const [url] = await fileRef.getSignedUrl({
    action: "read",
    expires: "03-01-2100",
  });

  const path = `images/${filename}`;
  return { filename, path, imageUrl: url };
}

async function startMonitoring() {
  const monitoringRef = rtdb.ref("realtime_monitoring");

  const snapshot = await monitoringRef.once("value");
  const data = snapshot.val();

  const lastSessionId = data
    ? Math.max(...Object.keys(data).map((key) => parseInt(key)))
    : 0;

  const newSessionId = lastSessionId + 1;

  await rtdb.ref(`realtime_monitoring/${newSessionId}`).set({});

  await rtdb.ref("current_session").set(newSessionId);

  return { sessionId: newSessionId };
}

async function stopMonitoring() {
  // Ambil sessionId sebelum di-set -1
  const currentSessionRef = rtdb.ref("current_session");
  const currentSessionSnap = await currentSessionRef.once("value");
  let sessionId = currentSessionSnap.val();
  sessionId = Number(sessionId);

  if (
    !sessionId ||
    typeof sessionId !== "number" ||
    sessionId < 1 ||
    isNaN(sessionId)
  ) {
    // Set current_session ke 0 jika tidak valid, dan return pesan tidak ada session aktif
    await currentSessionRef.set(0);
    return {
      stopped: false,
      success: false,
      message: "No active session to stop.",
      sessionId: 0,
      date: new Date().toISOString().split("T")[0],
      importedReport: {
        ultrasonic_logs: {
          totalData: 0,
          success: false,
          message: "No active session to stop.",
        },
        imu_logs: {
          totalData: 0,
          success: false,
          message: "No active session to stop.",
        },
      },
    };
  }

  // Ambil semua data dari RTDB untuk session ini
  const sessionDataSnap = await rtdb
    .ref(`realtime_monitoring/${sessionId}`)
    .once("value");
  const sessionData = sessionDataSnap.val();
  let importedUltrasonic = 0;
  let importedIMU = 0;
  let ultrasonicSuccess = true;
  let ultrasonicMessage = "";
  let imuSuccess = true;
  let imuMessage = "";

  if (sessionData && typeof sessionData === "object") {
    const batch = firestore.batch();
    try {
      for (const [id, entry] of Object.entries(sessionData)) {
        // --- ULTRASONIC LOGS ---
        const docRefUltrasonic = firestore.collection("ultrasonic_logs").doc();
        const alertLevel = calculateAlertLevel(
          entry.metadata &&
            typeof entry.metadata.distances?.distTotal === "number"
            ? entry.metadata.distances.distTotal
            : null
        );
        const createdAt = entry.createdAt
          ? new Date(entry.createdAt)
          : new Date();
        const distance =
          entry.metadata &&
          typeof entry.metadata.distances?.distTotal === "number"
            ? entry.metadata.distances.distTotal
            : null;
        const ultrasonicData = {
          timestamp: createdAt, // Exactly matches createdAt
          sessionId: sessionId,
          distance: distance === null ? 0 : distance,
          alertLevel,
          imageId: entry.imageUrl || null,
          createdAt,
          date: createdAt.toISOString().split("T")[0],
        };
        // Deduplication for ultrasonic_logs
        const existingUltrasonic = await firestore
          .collection("ultrasonic_logs")
          .where("sessionId", "==", sessionId)
          .where("timestamp", "==", createdAt)
          .where("distance", "==", distance === null ? 0 : distance)
          .where("imageId", "==", entry.imageUrl || null)
          .get();
        if (existingUltrasonic.empty) {
          batch.set(docRefUltrasonic, ultrasonicData);
          importedUltrasonic++;
        }

        // --- IMU LOGS ---
        if (entry.sessionId === sessionId && entry.metadata) {
          const docRefIMU = firestore.collection("imu_logs").doc();
          const m = entry.metadata;
          const imuData = {
            timestamp: entry.timestamp ? new Date(entry.timestamp) : createdAt,
            sessionId: sessionId,
            accelerationMagnitude: m.accelerationMagnitude ?? null,
            direction: m.direction ?? null,
            distanceTraveled: m.distanceTraveled ?? null,
            heading: m.heading ?? null,
            linearAcceleration: m.linearAcceleration ?? null,
            pitch: m.pitch ?? null,
            roll: m.roll ?? null,
            rotationRate: m.rotationRate ?? null,
            ultrasonic: m.ultrasonic ?? null,
            yaw: m.yaw ?? null,
            distances: m.distances ?? null,
            magnetometer: m.magnetometer ?? null,
            position: m.position ?? null,
            velocity: m.velocity ?? null,
            createdAt,
            date: createdAt.toISOString().split("T")[0],
          };
          // Deduplication for imu_logs
          const existingIMU = await firestore
            .collection("imu_logs")
            .where("sessionId", "==", sessionId)
            .where("timestamp", "==", imuData.timestamp)
            .where("heading", "==", imuData.heading)
            .where("direction", "==", imuData.direction)
            .get();
          if (existingIMU.empty) {
            batch.set(docRefIMU, imuData);
            importedIMU++;
          }
        }
      }
      if (importedUltrasonic > 0 || importedIMU > 0) {
        await batch.commit();
      }
      ultrasonicSuccess = true;
      ultrasonicMessage =
        importedUltrasonic > 0
          ? `Successfully imported ${importedUltrasonic} ultrasonic log(s).`
          : "No new ultrasonic logs to import.";
      imuSuccess = true;
      imuMessage =
        importedIMU > 0
          ? `Successfully imported ${importedIMU} IMU log(s).`
          : "No new IMU logs to import.";
    } catch (e) {
      ultrasonicSuccess = false;
      ultrasonicMessage = e.message || "Failed to import ultrasonic_logs.";
      imuSuccess = false;
      imuMessage = e.message || "Failed to import imu_logs.";
    }
  }

  // Set current_session ke 0
  await currentSessionRef.set(0);
  // Ambil tanggal hari ini (atau dari data jika ada data, pakai tanggal createdAt entry pertama)
  let dateStr = null;
  function toJakartaDateString(dateObj) {
    // Convert to Asia/Jakarta (UTC+7) and return YYYY-MM-DD
    const jakartaOffset = 7 * 60; // minutes
    const utc = dateObj.getTime() + dateObj.getTimezoneOffset() * 60000;
    const jakarta = new Date(utc + jakartaOffset * 60000);
    return jakarta.toISOString().split("T")[0];
  }
  if (sessionData && typeof sessionData === "object") {
    const firstEntry = Object.values(sessionData)[0];
    let dateSource = firstEntry?.createdAt || new Date();
    if (typeof dateSource === "string" || dateSource instanceof String) {
      dateSource = new Date(dateSource);
    }
    dateStr = toJakartaDateString(dateSource);
  } else {
    dateStr = toJakartaDateString(new Date());
  }
  return {
    stopped: true,
    sessionId,
    date: dateStr,
    importedReport: {
      ultrasonic_logs: {
        totalData: importedUltrasonic,
        success: ultrasonicSuccess,
        duplication: importedUltrasonic === 0 ? true : false,
        message: ultrasonicMessage,
      },
      imu_logs: {
        totalData: importedIMU,
        success: imuSuccess,
        duplication: importedIMU === 0 ? true : false,
        message: imuMessage,
      },
    },
  };
}

module.exports = {
  restructureRealtimeData,
  saveRealtime,
  getAllRealtime,
  getAllRealtimeWithImage,
  getAllRealtimeIncludingMetadata,
  getRealtimeById,
  getAllRealtimeByDate,
  getAllRealtimeByLatestData,
  deleteRealtimeByID,
  getLastDataRealtime,
  uploadImageToStorage,

  startMonitoring,
  stopMonitoring,
};
