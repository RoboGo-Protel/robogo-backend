const { firestore } = require("./database");

function calculateAlertLevel(distance) {
  if (distance < 0.5) return "High";
  if (distance <= 1.0) return "Medium";
  return "Safe";
}

async function saveUltrasonicLog({
  sessionId = null,
  timestamp,
  distance,
  imageId = null,
}) {
  const alertLevel = calculateAlertLevel(distance);
  const ref = firestore.collection("ultrasonic_logs").doc();

  const data = {
    timestamp: timestamp ? new Date(timestamp) : new Date(),
    sessionId: sessionId,
    distance: parseFloat(distance),
    alertLevel,
    imageId: imageId || null,
    createdAt: new Date(),
  };

  await ref.set(data);
  return { id: ref.id, ...data };
}

async function getAllUltrasonicLogs() {
  const snapshot = await firestore
    .collection("ultrasonic_logs")
    .orderBy("timestamp", "asc")
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() || null,
      timestamp: data.timestamp?.toDate?.() || null,
    };
  });
}

async function getUltrasonicLogById(id) {
  const doc = await firestore.collection("ultrasonic_logs").doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

async function getUltrasonicLogsByDate(date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const snapshot = await firestore
    .collection("ultrasonic_logs")
    .where("timestamp", ">=", startOfDay)
    .where("timestamp", "<=", endOfDay)
    .orderBy("timestamp", "asc")
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      timestamp: data.timestamp?.toDate?.() || new Date(data.timestamp),
      createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
    };
  });
}

async function getUltrasonicLogsByDateAndSessionId(date, sessionId) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const snapshot = await firestore
    .collection("ultrasonic_logs")
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
      timestamp: data.timestamp?.toDate?.() || new Date(data.timestamp),
      createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
    };
  });
}

async function deleteUltrasonicLog(id) {
  const ref = firestore.collection("ultrasonic_logs").doc(id);
  const doc = await ref.get();
  if (!doc.exists) return false;

  await ref.delete();
  return true;
}

module.exports = {
  saveUltrasonicLog,
  getAllUltrasonicLogs,
  getUltrasonicLogsByDate,
  getUltrasonicLogById,
  getUltrasonicLogsByDateAndSessionId,
  deleteUltrasonicLog,
};
