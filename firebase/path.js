const { firestore } = require("./database");

async function savePathLog({ timestamp, sessionId = null, status, position }) {
  const ref = firestore.collection("path_logs").doc();
  const data = {
    timestamp: timestamp ? new Date(timestamp) : new Date(),
    sessionId: sessionId,
    position: {
      x: parseFloat(position?.x || 0),
      y: parseFloat(position?.y || 0),
    },
    speed: parseFloat(position?.speed || 0),
    heading: parseFloat(position?.heading || 0),
    status: status || "Moving",
    createdAt: new Date(),
  };

  await ref.set(data);
  return { id: ref.id, ...data };
}

async function getAllPathLogs() {
  const snapshot = await firestore
    .collection("path_logs")
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

async function getPathLogById(id) {
  const ref = firestore.collection("path_logs").doc(id);
  const doc = await ref.get();
  if (!doc.exists) return null;
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    timestamp: data.timestamp?.toDate?.()?.toISOString() || null,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
  };
}

async function getPathLogsBySessionId(sessionId) {
  const snapshot = await firestore
    .collection("path_logs")
    .where("sessionId", "==", sessionId)
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

async function getPathLogsByDate(date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const snapshot = await firestore
    .collection("path_logs")
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

async function getPathLogsByDateAndSessionId(startOfDay, endOfDay, sessionId) {
  const snapshot = await firestore
    .collection("path_logs")
    .where("timestamp", ">=", startOfDay)
    .where("timestamp", "<=", endOfDay)
    .where("sessionId", "==", Number(sessionId))
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

async function deletePathLogByID(id) {
  const ref = firestore.collection("path_logs").doc(id);
  const doc = await ref.get();
  if (!doc.exists) return null;
  await ref.delete();
  return true;
}

async function deletePathLogByDate(date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const snapshot = await firestore
    .collection("path_logs")
    .where("timestamp", ">=", startOfDay)
    .where("timestamp", "<=", endOfDay)
    .get();

  if (snapshot.empty) return null;

  const batch = firestore.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  return true;
}

async function deletePathLogByDateAndSessionId(
  startOfDay,
  endOfDay,
  sessionId
) {
  const snapshot = await firestore
    .collection("path_logs")
    .where("timestamp", ">=", startOfDay)
    .where("timestamp", "<=", endOfDay)
    .where("sessionId", "==", Number(sessionId))
    .get();

  if (snapshot.empty) return null;

  const batch = firestore.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  return true;
}

module.exports = {
  savePathLog,
  getAllPathLogs,
  getPathLogById,
  getPathLogsBySessionId,
  getPathLogsByDate,
  getPathLogsByDateAndSessionId,
  deletePathLogByID,
  deletePathLogByDate,
  deletePathLogByDateAndSessionId,
};
