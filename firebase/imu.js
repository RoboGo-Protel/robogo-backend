const { firestore } = require("./database");

async function saveIMULog({
  timestamp,
  sessionId = null,
  acceleration,
  gyroscope,
  magnetometer,
  heading,
  direction,
  status,
}) {
  const ref = firestore.collection("imu_logs").doc();
  const data = {
    timestamp: timestamp ? new Date(timestamp) : new Date(),
    sessionId: sessionId,
    acceleration: {
      x: parseFloat(acceleration?.x || 0),
      y: parseFloat(acceleration?.y || 0),
      z: parseFloat(acceleration?.z || 0),
    },
    gyroscope: {
      x: parseFloat(gyroscope?.x || 0),
      y: parseFloat(gyroscope?.y || 0),
      z: parseFloat(gyroscope?.z || 0),
    },
    magnetometer: {
      magnetometerX: parseFloat(magnetometer?.magnetometerX || 0),
      magnetometerY: parseFloat(magnetometer?.magnetometerY || 0),
      magnetometerZ: parseFloat(magnetometer?.magnetometerZ || 0),
    },
    heading: parseFloat(heading || 0),
    direction: direction || "N",
    status: status || "Normal",
    createdAt: new Date(),
  };

  await ref.set(data);
  return {
    status: "success",
    code: 200,
    message: "IMU log saved successfully",
    data: { id: ref.id, ...data },
  };
}

async function getAllIMULogs() {
  const snapshot = await firestore
    .collection("imu_logs")
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

async function getIMULogById(id) {
  const ref = firestore.collection("imu_logs").doc(id);
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

async function getIMULogsByDate(date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const snapshot = await firestore
    .collection("imu_logs")
    .where("timestamp", ">=", startOfDay)
    .where("timestamp", "<", endOfDay)
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

async function getIMULogsByDateAndSessionId(startOfDay, endOfDay, sessionId) {
  const snapshot = await firestore
    .collection("imu_logs")
    .where("timestamp", ">=", startOfDay)
    .where("timestamp", "<", endOfDay)
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

async function deleteIMULogByID(id) {
  const ref = firestore.collection("imu_logs").doc(id);
  const doc = await ref.get();
  if (!doc.exists) return false;
  await ref.delete();
  return true;
}

async function deleteIMULogByDate(date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const snapshot = await firestore
    .collection("imu_logs")
    .where("timestamp", ">=", startOfDay)
    .where("timestamp", "<", endOfDay)
    .get();

  const batch = firestore.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();
}

async function deleteIMULogByDateAndSessionId(startOfDay, endOfDay, sessionId) {
  const snapshot = await firestore
    .collection("imu_logs")
    .where("timestamp", ">=", startOfDay)
    .where("timestamp", "<", endOfDay)
    .where("sessionId", "==", Number(sessionId))
    .get();

  const batch = firestore.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();
}

module.exports = {
  saveIMULog,
  getAllIMULogs,
  getIMULogById,
  getIMULogsByDate,
  getIMULogsByDateAndSessionId,
  deleteIMULogByID,
  deleteIMULogByDate,
  deleteIMULogByDateAndSessionId,
};
