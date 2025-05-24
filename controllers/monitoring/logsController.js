const { firestore } = require("../database");

async function saveLog({ timestamp, sessionId = null, logType, message }) {
  const data = {
    timestamp: timestamp ? new Date(timestamp) : new Date(),
    sessionId: sessionId,
    logType: logType || null,
    message: message || null,
    createdAt: new Date(),
  };

  const ref = firestore.collection("logs").doc();
  await ref.set(data);
  return { id: ref.id, ...data };
}

async function getAllLogs() {
  const snapshot = await firestore
    .collection("logs")
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

async function getCurrentSessionLogs(sessionId) {
  const snapshot = await firestore
    .collection("logs")
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

module.exports = {
  saveLog,
  getAllLogs,
  getCurrentSessionLogs,
};
