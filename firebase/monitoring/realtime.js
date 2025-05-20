const { firestore } = require("../database");
const storage = require("../storage");
const { v4: uuidv4 } = require("uuid");

async function saveRealtime(data) {
  const ref = firestore.collection("realtime_monitoring").doc();

  const baseData = {
    timestamp: data.timestamp || new Date(),
    sessionId: data.sessionId || null,
    metadata: data.metadata || {},
    obstacle: data.obstacle || false,
    createdAt: new Date(),
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

  return { id: ref.id, ...baseData, ...imageData };
}

async function getLastDataRealtime() {
  const snapshot = await firestore
    .collection("realtime_monitoring")
    .where("metadata", "!=", {})
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }
  const doc = snapshot.docs[0];
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    timestamp: data.timestamp?.toDate?.()?.toISOString() || null,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
  };
}

async function getAllRealtime() {
  const snapshot = await firestore
    .collection("realtime_monitoring")
    .orderBy("createdAt", "desc")
    .get();

  const data = snapshot.docs.map((doc) => {
    const docData = doc.data();
    return {
      id: doc.id,
      ...docData,
      timestamp: docData.timestamp?.toDate?.()?.toISOString() || null,
      createdAt: docData.createdAt?.toDate?.()?.toISOString() || null,
    };
  });

  return {
    count: data.length,
    data,
  };
}

async function getAllRealtimeWithImage() {
  const snapshot = await firestore
    .collection("realtime_monitoring")
    .where("imageUrl", "!=", "")
    .orderBy("createdAt", "desc")
    .get();

  return snapshot.docs
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: data.timestamp?.toDate?.()?.toISOString() || null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      };
    })
    .filter((item) => item.imageUrl);
}

async function getRealtimeById(id) {
  const doc = await firestore.collection("realtime_monitoring").doc(id).get();
  if (!doc.exists) return null;

  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    timestamp: data.timestamp?.toDate?.()?.toISOString() || null,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
  };
}

async function getAllRealtimeByDate(date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const snapshot = await firestore
    .collection("realtime_monitoring")
    .where("timestamp", ">=", startOfDay)
    .where("timestamp", "<=", endOfDay)
    .orderBy("timestamp", "asc")
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      timestamp: data.timestamp?.toDate?.()?.toISOString() || null,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
    };
  });
}

async function deleteRealtimeByID(id) {
  const docRef = firestore.collection("realtime_monitoring").doc(id);
  const doc = await docRef.get();

  if (!doc.exists) {
    return null;
  }

  const data = doc.data();
  const filename = decodeURIComponent(data.path?.split("/").pop());

  if (filename) {
    try {
      const file = storage.file(`images/${filename}`);
      const [exists] = await file.exists();

      if (!exists) {
        throw new Error("File does not exist in storage.");
      }

      await file.delete();
      console.log(`File ${filename} deleted from storage.`);
    } catch (err) {
      console.error("Error deleting file from storage:", err);
      throw new Error("Error deleting file from storage");
    }
  }

  await docRef.delete();
  console.log(`Document with ID ${id} deleted from Firestore.`);

  const checkDoc = await docRef.get();
  return !checkDoc.exists;
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

module.exports = {
  saveRealtime,
  getAllRealtime,
  getAllRealtimeWithImage,
  getRealtimeById,
  getAllRealtimeByDate,
  deleteRealtimeByID,
  getLastDataRealtime,
  uploadImageToStorage,
};
