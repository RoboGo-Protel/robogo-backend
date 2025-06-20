const { firestore } = require("../database");

function calculateAlertLevel(distance) {
  if (distance < 0.5) return "High";
  if (distance <= 1.0) return "Medium";
  return "Safe";
}

async function saveUltrasonicLog(
  { sessionId = null, timestamp, distance, imageId = null },
  userContext,
) {
  const alertLevel = calculateAlertLevel(distance);
  const ref = firestore.collection('ultrasonic_logs').doc();

  const data = {
    timestamp: timestamp ? new Date(timestamp) : new Date(),
    sessionId: sessionId !== null ? Number(sessionId) : null,
    user_id: userContext.userId,
    device_id: userContext.selectedDevice,
    deviceName: userContext.deviceName,
    distance: parseFloat(distance),
    alertLevel,
    imageId: imageId || null,
    createdAt: new Date(),
  };

  await ref.set(data);
  return { id: ref.id, ...data };
}

async function getAllSummaries(userContext) {
  const snapshot = await firestore
    .collection('ultrasonic_logs')
    .where('user_id', '==', userContext.userId)
    .where('device_id', '==', userContext.selectedDevice)
    .limit(100)
    .get();

  let totalImages = 0;
  let totalObstacles = 0;
  let totalDistance = 0;
  let closestDistance = null;

  snapshot.forEach((doc) => {
    const data = doc.data();
    if (!data || data.distance == null) return;

    totalImages++;

    if (data.alertLevel === 'Medium' || data.alertLevel === 'High') {
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

async function getSummariesByDate(date, userContext) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const snapshot = await firestore
    .collection('ultrasonic_logs')
    .where('user_id', '==', userContext.userId)
    .where('device_id', '==', userContext.selectedDevice)
    .where('timestamp', '>=', startOfDay)
    .where('timestamp', '<=', endOfDay)
    .limit(100)
    .get();

  let totalImages = 0;
  let totalObstacles = 0;
  let totalDistance = 0;
  let closestDistance = null;
  let countedDistance = 0;

  snapshot.forEach((doc) => {
    const data = doc.data();
    if (!data || data.distance == null) return;

    if (data.imageId !== null) {
      totalImages++;
    }

    if (data.alertLevel === 'Medium' || data.alertLevel === 'High') {
      totalObstacles++;
    }

    totalDistance += data.distance;
    countedDistance++;

    if (closestDistance === null || data.distance < closestDistance) {
      closestDistance = data.distance;
    }
  });

  const averageDistance =
    countedDistance > 0 ? totalDistance / countedDistance : 0;

  return {
    totalImages,
    totalObstacles,
    closestDistance,
    averageDistance: parseFloat(averageDistance.toFixed(2)),
  };
}

async function getSummariesByDateAndSessionId(date, sessionId, userContext) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const snapshot = await firestore
    .collection('ultrasonic_logs')
    .where('user_id', '==', userContext.userId)
    .where('device_id', '==', userContext.selectedDevice)
    .where('timestamp', '>=', startOfDay)
    .where('timestamp', '<=', endOfDay)
    .where('sessionId', '==', Number(sessionId))
    .limit(100)
    .get();

  let totalImages = 0;
  let totalObstacles = 0;
  let totalDistance = 0;
  let closestDistance = null;
  let countedDistance = 0;

  snapshot.forEach((doc) => {
    const data = doc.data();
    totalImages++;
    if (data && data.distance != null) {
      if (data.alertLevel === 'Medium' || data.alertLevel === 'High') {
        totalObstacles++;
      }
      totalDistance += data.distance;
      countedDistance++;
      if (closestDistance === null || data.distance < closestDistance) {
        closestDistance = data.distance;
      }
    }
  });

  const averageDistance =
    countedDistance > 0 ? totalDistance / countedDistance : 0;

  return {
    totalImages,
    totalObstacles,
    closestDistance,
    averageDistance: parseFloat(averageDistance.toFixed(2)),
  };
}

async function getAllUltrasonicLogs(userContext) {
  const snapshot = await firestore
    .collection('ultrasonic_logs')
    .where('user_id', '==', userContext.userId)
    .where('device_id', '==', userContext.selectedDevice)
    .limit(100)
    .get();

  // Sort by timestamp in memory to avoid composite index requirement
  const logs = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      timestamp: data.timestamp?.toDate?.()?.toISOString() || null,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
    };
  });

  // Sort by timestamp in ascending order
  return logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

async function getUltrasonicLogById(id, userContext) {
  const ref = await firestore.collection('ultrasonic_logs').doc(id);
  const doc = await ref.get();
  if (!doc.exists) return null;

  const data = doc.data();
  // Verify ownership
  if (
    data.user_id !== userContext.userId ||
    data.device_id !== userContext.selectedDevice
  ) {
    return null; // Not accessible to this user/device
  }

  return {
    id: doc.id,
    ...data,
    timestamp: data.timestamp?.toDate?.()?.toISOString() || null,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
  };
}

async function getUltrasonicLogsByDate(date, userContext) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const snapshot = await firestore
    .collection('ultrasonic_logs')
    .where('user_id', '==', userContext.userId)
    .where('device_id', '==', userContext.selectedDevice)
    .where('timestamp', '>=', startOfDay)
    .where('timestamp', '<=', endOfDay)
    .limit(100)
    .get();

  // Sort by timestamp in memory to avoid composite index requirement
  const logs = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      timestamp: data.timestamp?.toDate?.()?.toISOString() || null,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
    };
  });

  // Sort by timestamp in ascending order
  return logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

async function getUltrasonicLogsByDateAndSessionId(
  startOfDay,
  endOfDay,
  sessionId,
  userContext,
) {
  const snapshot = await firestore
    .collection('ultrasonic_logs')
    .where('user_id', '==', userContext.userId)
    .where('device_id', '==', userContext.selectedDevice)
    .where('timestamp', '>=', startOfDay)
    .where('timestamp', '<=', endOfDay)
    .where('sessionId', '==', Number(sessionId))
    .limit(100)
    .get();

  // Sort by timestamp in memory to avoid composite index requirement
  const logs = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      timestamp: data.timestamp?.toDate?.()?.toISOString() || null,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
    };
  });

  // Sort by timestamp in ascending order
  return logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

async function getAvailableDates(userContext) {
  const snapshot = await firestore
    .collection('ultrasonic_logs')
    .where('user_id', '==', userContext.userId)
    .where('device_id', '==', userContext.selectedDevice)
    .limit(100)
    .get();

  const dates = new Set();
  snapshot.forEach((doc) => {
    const data = doc.data();
    if (data && data.timestamp && data.sessionId != null) {
      const utcDate = data.timestamp.toDate();

      const jakartaOffset = 7 * 60;
      const local = new Date(
        utcDate.getTime() +
          (jakartaOffset - utcDate.getTimezoneOffset()) * 60000,
      );
      const date = local.toISOString().split('T')[0];
      dates.add(date);
    }
  });

  return Array.from(dates).sort((a, b) => new Date(a) - new Date(b));
}

async function getAvailableSessionIdsFromDate(date, userContext) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const snapshot = await firestore
    .collection('ultrasonic_logs')
    .where('user_id', '==', userContext.userId)
    .where('device_id', '==', userContext.selectedDevice)
    .where('timestamp', '>=', startOfDay)
    .where('timestamp', '<=', endOfDay)
    .limit(100)
    .get();

  const sessionIds = new Set();
  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    if (data && data.sessionId != null) {
      sessionIds.add(data.sessionId);
    }
  });

  return Array.from(sessionIds).sort((a, b) => a - b);
}

async function getAvailableDatesWithSessions(userContext) {
  const snapshot = await firestore
    .collection('ultrasonic_logs')
    .where('user_id', '==', userContext.userId)
    .where('device_id', '==', userContext.selectedDevice)
    .limit(100)
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
      label: new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
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

async function deleteUltrasonicLogByID(id, userContext) {
  const ref = firestore.collection('ultrasonic_logs').doc(id);
  const doc = await ref.get();
  if (!doc.exists) return false;

  const data = doc.data();
  // Verify ownership before deletion
  if (
    data.user_id !== userContext.userId ||
    data.device_id !== userContext.selectedDevice
  ) {
    return false; // Not accessible to this user/device
  }

  await ref.delete();
  return true;
}

async function deleteUltrasonicLogByDate(date, userContext) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const snapshot = await firestore
    .collection('ultrasonic_logs')
    .where('user_id', '==', userContext.userId)
    .where('device_id', '==', userContext.selectedDevice)
    .where('timestamp', '>=', startOfDay)
    .where('timestamp', '<=', endOfDay)
    .get();

  if (snapshot.empty) return null;

  const batch = firestore.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  return true;
}

async function deleteUltrasonicLogByDateAndSessionId(
  startOfDay,
  endOfDay,
  sessionId,
  userContext,
) {
  const snapshot = await firestore
    .collection('ultrasonic_logs')
    .where('user_id', '==', userContext.userId)
    .where('device_id', '==', userContext.selectedDevice)
    .where('timestamp', '>=', startOfDay)
    .where('timestamp', '<=', endOfDay)
    .where('sessionId', '==', Number(sessionId))
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
  getSummariesByDateAndSessionId,
  getAllUltrasonicLogs,
  getUltrasonicLogsByDate,
  getUltrasonicLogById,
  getUltrasonicLogsByDateAndSessionId,
  getAvailableDates,
  getAvailableSessionIdsFromDate,
  getAvailableDatesWithSessions,
  deleteUltrasonicLogByID,
  deleteUltrasonicLogByDate,
  deleteUltrasonicLogByDateAndSessionId,
};
