const { firestore } = require("../database");

function getDirectionFromHeading(heading) {
  const directions = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
    "N",
  ];
  const index = Math.round(heading / 22.5) % 16;
  return directions[index];
}

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
  const parsedHeading = parseFloat(heading || 0);
  const calculatedDirection = getDirectionFromHeading(parsedHeading);

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
    heading: parsedHeading,
    direction: direction || calculatedDirection,
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

async function getAllSummaries() {
  const snapshot = await firestore
    .collection("imu_logs")
    .orderBy("timestamp", "asc")
    .get();

  let total_heading = 0;
  let max_turn_angle = 0;
  let count = 0;

  let previous_heading = null;
  let min_heading = Infinity;
  let max_heading = -Infinity;

  snapshot.forEach((doc) => {
    const data = doc.data();
    if (data?.heading == null) return;

    const heading = data.heading;
    total_heading += heading;
    count++;

    min_heading = Math.min(min_heading, heading);
    max_heading = Math.max(max_heading, heading);

    if (previous_heading != null) {
      const diff = Math.abs(heading - previous_heading);
      max_turn_angle = Math.max(max_turn_angle, diff);
    }

    previous_heading = heading;
  });

  return {
    average_heading: count > 0 ? total_heading / count : 0,
    heading_range: count > 0 ? [min_heading, max_heading] : [0, 0],
    total_orientation_changes: count > 1 ? count - 1 : 0,
    max_turn_angle: max_turn_angle,
  };
}

async function getSummariesByDate(date) {
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

  let total_heading = 0;
  let heading_differences = 0;
  let max_turn_angle = 0;
  let count = 0;

  let previous_heading = null;

  snapshot.forEach((doc) => {
    const data = doc.data();
    if (data?.heading == null) return;

    const heading = data.heading;
    total_heading += heading;
    count++;

    if (previous_heading != null) {
      const diff = Math.abs(heading - previous_heading);
      heading_differences += diff;
      max_turn_angle = Math.max(max_turn_angle, diff);
    }

    previous_heading = heading;
  });

  return {
    average_heading: count > 0 ? total_heading / count : 0,
    heading_range: count > 1 ? heading_differences / (count - 1) : 0,
    total_orientation_changes: count > 1 ? count - 1 : 0,
    max_turn_angle: max_turn_angle,
  };
}

async function getSummariesByDateAndSessionId(date, sessionId) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const snapshot = await firestore
    .collection("imu_logs")
    .where("timestamp", ">=", startOfDay)
    .where("timestamp", "<", endOfDay)
    .where("sessionId", "==", Number(sessionId))
    .orderBy("timestamp", "asc")
    .get();

  let total_heading = 0;
  let heading_differences = 0;
  let max_turn_angle = 0;
  let count = 0;

  let previous_heading = null;

  snapshot.forEach((doc) => {
    const data = doc.data();
    if (data?.heading == null) return;

    const heading = data.heading;
    total_heading += heading;
    count++;

    if (previous_heading != null) {
      const diff = Math.abs(heading - previous_heading);
      heading_differences += diff;
      max_turn_angle = Math.max(max_turn_angle, diff);
    }

    previous_heading = heading;
  });

  return {
    average_heading: count > 0 ? total_heading / count : 0,
    heading_range: count > 1 ? heading_differences / (count - 1) : 0,
    total_orientation_changes: count > 1 ? count - 1 : 0,
    max_turn_angle: max_turn_angle,
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

async function getAvailableDates() {
  const snapshot = await firestore
    .collection("imu_logs")
    .orderBy("timestamp", "asc")
    .get();

  const dates = new Set();
  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    const date = data.timestamp?.toDate?.()?.toISOString().split("T")[0];
    if (date) {
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
    .collection("imu_logs")
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
    .collection("imu_logs")
    .orderBy("timestamp", "asc")
    .get();

  const dateSessionMap = new Map();

  snapshot.forEach((doc) => {
    const data = doc.data();
    if (!data || !data.timestamp || !data.sessionId) return;

    const utcDate = data.timestamp.toDate();
    const jakartaOffset = 7 * 60;
    const local = new Date(
      utcDate.getTime() + (jakartaOffset - utcDate.getTimezoneOffset()) * 60000,
    );
    const year = local.getFullYear();
    const month = String(local.getMonth() + 1).padStart(2, '0');
    const day = String(local.getDate()).padStart(2, '0');
    const date = `${year}-${month}-${day}`;

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
  getAllSummaries,
  getSummariesByDate,
  getSummariesByDateAndSessionId,
  getAllIMULogs,
  getIMULogById,
  getIMULogsByDate,
  getIMULogsByDateAndSessionId,
  getAvailableDates,
  getAvailableSessionIdsFromDate,
  getAvailableDatesWithSessions,
  deleteIMULogByID,
  deleteIMULogByDate,
  deleteIMULogByDateAndSessionId,
};
