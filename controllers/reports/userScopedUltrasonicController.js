const { firestore } = require('../database');

function calculateAlertLevel(distance) {
  if (distance < 0.5) return 'High';
  if (distance <= 1.0) return 'Medium';
  return 'Safe';
}

// Extract user and device context from request
function extractUserDeviceContext(req) {
  const userId =
    req.headers['x-user-id'] ||
    req.query.user_id ||
    req.body.user_id ||
    'default_user';
  const deviceId =
    req.headers['x-device-id'] ||
    req.query.device_id ||
    req.body.device_id ||
    'default_device';
  return { userId, deviceId };
}

async function saveUltrasonicLog(req) {
  const { userId, deviceId } = extractUserDeviceContext(req);
  const { sessionId = null, timestamp, distance, imageId = null } = req.body;

  const alertLevel = calculateAlertLevel(distance);
  const ref = firestore.collection('ultrasonic_logs').doc();

  const data = {
    user_id: userId,
    device_id: deviceId,
    timestamp: timestamp ? new Date(timestamp) : new Date(),
    sessionId: sessionId !== null ? Number(sessionId) : null,
    distance: parseFloat(distance),
    alertLevel,
    imageId: imageId || null,
    createdAt: new Date(),
  };

  await ref.set(data);
  return { id: ref.id, ...data };
}

async function getAllSummaries(req) {
  const { userId, deviceId } = extractUserDeviceContext(req);

  const snapshot = await firestore
    .collection('ultrasonic_logs')
    .where('user_id', '==', userId)
    .where('device_id', '==', deviceId)
    .orderBy('timestamp', 'asc')
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

async function getSummariesByDate(req) {
  const { userId, deviceId } = extractUserDeviceContext(req);
  const { date } = req.params;

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const snapshot = await firestore
    .collection('ultrasonic_logs')
    .where('user_id', '==', userId)
    .where('device_id', '==', deviceId)
    .where('timestamp', '>=', startOfDay)
    .where('timestamp', '<=', endOfDay)
    .orderBy('timestamp', 'asc')
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

async function getSummariesByDateAndSessionId(req) {
  const { userId, deviceId } = extractUserDeviceContext(req);
  const { date, sessionId } = req.params;

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const snapshot = await firestore
    .collection('ultrasonic_logs')
    .where('user_id', '==', userId)
    .where('device_id', '==', deviceId)
    .where('timestamp', '>=', startOfDay)
    .where('timestamp', '<=', endOfDay)
    .where('sessionId', '==', Number(sessionId))
    .orderBy('timestamp', 'asc')
    .get();

  let totalImages = 0;
  let totalObstacles = 0;
  let totalDistance = 0;
  let closestDistance = null;
  let countedDistance = 0;

  snapshot.forEach((doc) => {
    const data = doc.data();
    if (!data || data.distance == null) return;

    totalImages++;

    if (data.alertLevel === 'Medium' || data.alertLevel === 'High') {
      totalObstacles++;
    }

    if (data && data.distance != null) {
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

async function getAllUltrasonicLogs(req) {
  const { userId, deviceId } = extractUserDeviceContext(req);

  const snapshot = await firestore
    .collection('ultrasonic_logs')
    .where('user_id', '==', userId)
    .where('device_id', '==', deviceId)
    .orderBy('timestamp', 'asc')
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

async function getUltrasonicLogById(req) {
  const { userId, deviceId } = extractUserDeviceContext(req);
  const { id } = req.params;

  const ref = await firestore.collection('ultrasonic_logs').doc(id);
  const doc = await ref.get();

  if (!doc.exists) return null;

  const data = doc.data();

  // Verify ownership
  if (data.user_id !== userId || data.device_id !== deviceId) {
    return null;
  }

  return {
    id: doc.id,
    ...data,
    timestamp: data.timestamp?.toDate?.()?.toISOString() || null,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
  };
}

async function getUltrasonicLogsByDate(req) {
  const { userId, deviceId } = extractUserDeviceContext(req);
  const { date } = req.params;

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const snapshot = await firestore
    .collection('ultrasonic_logs')
    .where('user_id', '==', userId)
    .where('device_id', '==', deviceId)
    .where('timestamp', '>=', startOfDay)
    .where('timestamp', '<=', endOfDay)
    .orderBy('timestamp', 'asc')
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

async function getUltrasonicLogsByDateAndSessionId(req) {
  const { userId, deviceId } = extractUserDeviceContext(req);
  const { date, sessionId } = req.params;

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const snapshot = await firestore
    .collection('ultrasonic_logs')
    .where('user_id', '==', userId)
    .where('device_id', '==', deviceId)
    .where('timestamp', '>=', startOfDay)
    .where('timestamp', '<=', endOfDay)
    .where('sessionId', '==', Number(sessionId))
    .orderBy('timestamp', 'asc')
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

async function getAvailableDates(req) {
  const { userId, deviceId } = extractUserDeviceContext(req);

  const snapshot = await firestore
    .collection('ultrasonic_logs')
    .where('user_id', '==', userId)
    .where('device_id', '==', deviceId)
    .orderBy('timestamp', 'asc')
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

async function getAvailableSessionIdsFromDate(req) {
  const { userId, deviceId } = extractUserDeviceContext(req);
  const { date } = req.params;

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const snapshot = await firestore
    .collection('ultrasonic_logs')
    .where('user_id', '==', userId)
    .where('device_id', '==', deviceId)
    .where('timestamp', '>=', startOfDay)
    .where('timestamp', '<=', endOfDay)
    .orderBy('sessionId')
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

async function getAvailableDatesWithSessions(req) {
  const { userId, deviceId } = extractUserDeviceContext(req);

  const snapshot = await firestore
    .collection('ultrasonic_logs')
    .where('user_id', '==', userId)
    .where('device_id', '==', deviceId)
    .orderBy('timestamp', 'asc')
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

async function deleteUltrasonicLogByID(req) {
  const { userId, deviceId } = extractUserDeviceContext(req);
  const { id } = req.params;

  const ref = firestore.collection('ultrasonic_logs').doc(id);
  const doc = await ref.get();

  if (!doc.exists) return false;

  const data = doc.data();

  // Verify ownership
  if (data.user_id !== userId || data.device_id !== deviceId) {
    return false;
  }

  await ref.delete();
  return true;
}

async function deleteUltrasonicLogByDate(req) {
  const { userId, deviceId } = extractUserDeviceContext(req);
  const { date } = req.params;

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const snapshot = await firestore
    .collection('ultrasonic_logs')
    .where('user_id', '==', userId)
    .where('device_id', '==', deviceId)
    .where('timestamp', '>=', startOfDay)
    .where('timestamp', '<=', endOfDay)
    .get();

  if (snapshot.empty) return 0;

  const batch = firestore.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  return snapshot.docs.length;
}

async function deleteUltrasonicLogByDateAndSessionId(req) {
  const { userId, deviceId } = extractUserDeviceContext(req);
  const { date, sessionId } = req.params;

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const snapshot = await firestore
    .collection('ultrasonic_logs')
    .where('user_id', '==', userId)
    .where('device_id', '==', deviceId)
    .where('timestamp', '>=', startOfDay)
    .where('timestamp', '<=', endOfDay)
    .where('sessionId', '==', Number(sessionId))
    .get();

  if (snapshot.empty) return 0;

  const batch = firestore.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  return snapshot.docs.length;
}

module.exports = {
  saveUltrasonicLog,
  getAllSummaries,
  getSummariesByDate,
  getSummariesByDateAndSessionId,
  getAllUltrasonicLogs,
  getUltrasonicLogsByDate,
  getUltrasonicLogsByDateAndSessionId,
  getUltrasonicLogById,
  getAvailableDates,
  getAvailableSessionIdsFromDate,
  getAvailableDatesWithSessions,
  deleteUltrasonicLogByID,
  deleteUltrasonicLogByDate,
  deleteUltrasonicLogByDateAndSessionId,
};
