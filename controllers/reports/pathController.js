const { firestore } = require("../database");

async function savePathLog({
  timestamp,
  sessionId = null,
  status,
  position,
  speed,
  heading,
}) {
  const ref = firestore.collection("path_logs").doc();
  const data = {
    timestamp: timestamp ? new Date(timestamp) : new Date(),
    sessionId: sessionId,
    position: {
      x: parseFloat(position?.x || 0),
      y: parseFloat(position?.y || 0),
    },
    speed: parseFloat(speed || 0),
    heading: parseFloat(heading || 0),
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

async function getAvailableDates() {
  const snapshot = await firestore
    .collection("path_logs")
    .orderBy("timestamp", "asc")
    .get();

  const dates = new Set();
  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    if (data.timestamp) {
      const date = data.timestamp.toDate().toISOString().split("T")[0];
      dates.add(date);
    }
  });

  return Array.from(dates).sort((a, b) => new Date(a) - new Date(b));
}

async function getAvailableSessionIdsFromDate(date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const snapshot = await firestore
    .collection("path_logs")
    .where("timestamp", ">=", startOfDay)
    .where("timestamp", "<", endOfDay)
    .orderBy("sessionId", "asc")
    .get();

  const sessionIds = new Set();
  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    if (data.sessionId) {
      sessionIds.add(data.sessionId);
    }
  });

  return Array.from(sessionIds).sort((a, b) => a - b);
}

async function getAvailableDatesWithSessions() {
  const snapshot = await firestore
    .collection("path_logs")
    .orderBy("timestamp", "asc")
    .get();

  const dateSessionMap = new Map();

  snapshot.forEach((doc) => {
    const data = doc.data();
    if (!data || !data.timestamp || !data.sessionId) return;

    const date = data.timestamp.toDate().toISOString().split("T")[0];

    if (!dateSessionMap.has(date)) {
      dateSessionMap.set(date, new Set());
    }

    dateSessionMap.get(date).add(data.sessionId);
  });

  const result = Array.from(dateSessionMap.entries())
    .map(([date, sessionSet]) => ({
      label: new Date(date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      value: date,
      sessions: Array.from(sessionSet)
        .sort((a, b) => a - b)
        .map((sessionId) => ({
          label: `Session ${sessionId}`,
          value: sessionId,
        })),
    }))
    .sort((a, b) => new Date(a.value) - new Date(b.value));

  return result;
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
  getAvailableDates,
  getAvailableSessionIdsFromDate,
  getAvailableDatesWithSessions,
  deletePathLogByID,
  deletePathLogByDate,
  deletePathLogByDateAndSessionId,
};
