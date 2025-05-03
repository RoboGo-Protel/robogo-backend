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

async function getAllSummaries() {
  const snapshot = await firestore
    .collection("ultrasonic_logs")
    .orderBy("timestamp", "asc")
    .get();

  let totalImages = 0;
  let totalObstacles = 0;
  let totalDistance = 0;
  let closestDistance = null;

  snapshot.forEach((doc) => {
    const data = doc.data();
    if (!data || data.distance == null) return;

    totalImages++;

    if (data.alertLevel === "Medium" || data.alertLevel === "High") {
      totalObstacles++;
    }

    totalDistance += data.distance;

    if (closestDistance === null || data.distance < closestDistance) {
      closestDistance = data.distance;
    }
  });

  const averageDistance = totalImages > 0 ? totalDistance / totalImages : 0;

  return {
    totalImages,
    totalObstacles,
    closestDistance,
    averageDistance: parseFloat(averageDistance.toFixed(2)),
  };
}

async function getSummariesByDate(date) {
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

  let totalImages = 0;
  let totalObstacles = 0;
  let totalDistance = 0;
  let closestDistance = null;

  snapshot.forEach((doc) => {
    const data = doc.data();
    if (!data || data.distance == null) return;

    totalImages++;

    if (data.alertLevel === "Medium" || data.alertLevel === "High") {
      totalObstacles++;
    }

    totalDistance += data.distance;

    if (closestDistance === null || data.distance < closestDistance) {
      closestDistance = data.distance;
    }
  });

  const averageDistance = totalImages > 0 ? totalDistance / totalImages : 0;

  return {
    totalImages,
    totalObstacles,
    closestDistance,
    averageDistance: parseFloat(averageDistance.toFixed(2)),
  };
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

async function deleteUltrasonicLogByID(id) {
  const ref = firestore.collection("ultrasonic_logs").doc(id);
  const doc = await ref.get();
  if (!doc.exists) return false;

  await ref.delete();
  return true;
}

async function deleteUltrasonicLogByDate(date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const snapshot = await firestore
    .collection("ultrasonic_logs")
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

async function deleteUltrasonicLogByDateAndSessionId(date, sessionId) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const snapshot = await firestore
    .collection("ultrasonic_logs")
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
  saveUltrasonicLog,
  getAllSummaries,
  getSummariesByDate,
  getAllUltrasonicLogs,
  getUltrasonicLogsByDate,
  getUltrasonicLogById,
  getUltrasonicLogsByDateAndSessionId,
  deleteUltrasonicLogByID,
  deleteUltrasonicLogByDate,
  deleteUltrasonicLogByDateAndSessionId,
};
