const { rtdb } = require("../database");
const storage = require("../storage");
const { v4: uuidv4 } = require("uuid");

async function saveRealtime(data) {
  const currentSessionSnap = await rtdb.ref("current_session").once("value");
  let sessionId = currentSessionSnap.val();

  if (!sessionId || sessionId < 1) {
    sessionId = -1;
  }

  const ref = rtdb.ref("realtime_monitoring").push();

  const baseData = {
    timestamp: data.timestamp || new Date().toISOString(),
    sessionId,
    metadata: data.metadata || {},
    obstacle: data.obstacle || false,
    createdAt: new Date().toISOString(),
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

async function getAllRealtimeWithImage() {
  const snapshot = await rtdb.ref("realtime_monitoring").once("value");
  const val = snapshot.val();
  if (!val) return [];

  return Object.entries(val)
    .filter(([, item]) => item.imageUrl)
    .map(([id, item]) => ({ id, ...item }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
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
  const currentSessionRef = rtdb.ref("current_session");
  const currentSessionSnap = await currentSessionRef.once("value");
  const currentSession = currentSessionSnap.val();

  if (currentSession && currentSession > 0) {
    return { sessionId: currentSession };
  }

  const snapshot = await rtdb.ref("realtime_monitoring").once("value");
  const val = snapshot.val();

  let maxSessionId = 0;
  if (val) {
    Object.values(val).forEach((item) => {
      if (typeof item.sessionId === "number" && item.sessionId > maxSessionId) {
        maxSessionId = item.sessionId;
      }
    });
  }

  const newSessionId = maxSessionId + 1;
  await currentSessionRef.set(newSessionId);

  return { sessionId: newSessionId };
}

async function stopMonitoring() {
  const currentSessionRef = rtdb.ref("current_session");
  await currentSessionRef.set(-1);
  return { stopped: true };
}

module.exports = {
  saveRealtime,
  getAllRealtime,
  getAllRealtimeWithImage,
  getRealtimeById,
  getAllRealtimeByDate,
  getAllRealtimeByLatestData,
  deleteRealtimeByID,
  getLastDataRealtime,
  uploadImageToStorage,

  startMonitoring,
  stopMonitoring,
};
