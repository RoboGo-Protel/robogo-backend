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
      timestamp: data.timestamp?.toDate?.() || new Date(data.timestamp),
      createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
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
    timestamp: data.timestamp?.toDate?.() || new Date(data.timestamp),
    createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
  };
}

async function getIMULogsByDate(date) {
  const start = new Date(date);
  const end = new Date(date);
  end.setDate(end.getDate() + 1);

  const snapshot = await firestore
    .collection("imu_logs")
    .where("timestamp", ">=", start)
    .where("timestamp", "<", end)
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

async function getIMULogsByDateAndSessionId(date, sessionId) {
  const start = new Date(date);
  const end = new Date(date);
  end.setDate(end.getDate() + 1);

  const snapshot = await firestore
    .collection("imu_logs")
    .where("timestamp", ">=", start)
    .where("timestamp", "<", end)
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

async function deleteIMULogByID(id) {
  const ref = firestore.collection("imu_logs").doc(id);
  const doc = await ref.get();
  if (!doc.exists) return false;
  await ref.delete();
  return true;
}

module.exports = {
  saveIMULog,
  getAllIMULogs,
  getIMULogById,
  getIMULogsByDate,
  getIMULogsByDateAndSessionId,
  deleteIMULogByID,
};
