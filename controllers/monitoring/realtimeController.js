const { rtdb } = require('../database');
const storage = require('../storage');
const { v4: uuidv4 } = require('uuid');

async function saveRealtime(data, userContext) {
  const userId = userContext.userId;
  const deviceId = userContext.selectedDevice;

  // Get current session from user's device
  const currentSessionRef = rtdb.ref(
    `users/${userId}/${deviceId}/current_session`,
  );
  const currentSessionSnapshot = await currentSessionRef.once('value');
  let currentSession = currentSessionSnapshot.val();

  // If no current session exists, start with session 1
  if (!currentSession) {
    currentSession = 1;
    await currentSessionRef.set(currentSession);
  }

  // Use provided sessionId or current session
  const sessionId = data.sessionId || currentSession;

  // Update current session if provided session is higher
  if (data.sessionId && data.sessionId > currentSession) {
    await currentSessionRef.set(data.sessionId);
    currentSession = data.sessionId;
  }
  const realtimeRef = rtdb.ref(
    `users/${userId}/${deviceId}/realtime_monitoring/${currentSession}`,
  );

  const baseData = {
    timestamp: data.timestamp || new Date().toISOString(),
    sessionId: currentSession,
    metadata: data.metadata || {},
    obstacle: data.obstacle || false,
    deviceName: userContext.deviceName,
    createdAt: new Date().toISOString(),
  };

  const imageData = data.imageUrl
    ? {
        filename: data.filename || null,
        path: data.path || null,
        imageUrl: data.imageUrl || null,
        takenWith: data.takenWith || 'ESP32-CAM',
      }
    : {};

  const dataToSave = { ...baseData, ...imageData };

  // Push data to realtime database
  const pushRef = await realtimeRef.push(dataToSave);

  return { id: pushRef.key, ...dataToSave };
}

async function getLastDataRealtime(userContext) {
  const userId = userContext.userId;
  const deviceId = userContext.selectedDevice;

  // Get current session
  const currentSessionRef = rtdb.ref(
    `users/${userId}/${deviceId}/current_session`,
  );
  const currentSessionSnapshot = await currentSessionRef.once('value');
  const currentSession = currentSessionSnapshot.val();

  if (!currentSession) {
    return null;
  }

  // Get latest data from current session
  const realtimeRef = rtdb.ref(
    `users/${userId}/${deviceId}/realtime_monitoring/${currentSession}`,
  );
  const snapshot = await realtimeRef
    .orderByChild('createdAt')
    .limitToLast(1)
    .once('value');

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.val();
  const latestKey = Object.keys(data)[0];
  const latestData = data[latestKey];

  return {
    id: latestKey,
    ...latestData,
  };
}

async function getAllRealtime(userContext) {
  const userId = userContext.userId;
  const deviceId = userContext.selectedDevice;

  // Get current session
  const currentSessionRef = rtdb.ref(
    `users/${userId}/${deviceId}/current_session`,
  );
  const currentSessionSnapshot = await currentSessionRef.once('value');
  const currentSession = currentSessionSnapshot.val();

  if (!currentSession) {
    return { count: 0, data: [] };
  }

  // Get all data from current session
  const realtimeRef = rtdb.ref(
    `users/${userId}/${deviceId}/realtime_monitoring/${currentSession}`,
  );
  const snapshot = await realtimeRef.orderByChild('createdAt').once('value');

  if (!snapshot.exists()) {
    return { count: 0, data: [] };
  }

  const data = snapshot.val();
  const formattedData = Object.keys(data)
    .map((key) => ({
      id: key,
      ...data[key],
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return {
    count: formattedData.length,
    data: formattedData,
  };
}

async function getAllRealtimeWithImage(userContext) {
  const userId = userContext.userId;
  const deviceId = userContext.selectedDevice;

  // Get current session
  const currentSessionRef = rtdb.ref(
    `users/${userId}/${deviceId}/current_session`,
  );
  const currentSessionSnapshot = await currentSessionRef.once('value');
  const currentSession = currentSessionSnapshot.val();

  if (!currentSession) {
    return [];
  }

  // Get all data from current session that has images
  const realtimeRef = rtdb.ref(
    `users/${userId}/${deviceId}/realtime_monitoring/${currentSession}`,
  );
  const snapshot = await realtimeRef.orderByChild('imageUrl').once('value');

  if (!snapshot.exists()) {
    return [];
  }

  const data = snapshot.val();
  const formattedData = Object.keys(data)
    .map((key) => ({
      id: key,
      ...data[key],
    }))
    .filter((item) => item.imageUrl && item.imageUrl !== '')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return formattedData;
}

async function getRealtimeById(id, userContext) {
  const userId = userContext.userId;
  const deviceId = userContext.selectedDevice;

  // Get current session
  const currentSessionRef = rtdb.ref(
    `users/${userId}/${deviceId}/current_session`,
  );
  const currentSessionSnapshot = await currentSessionRef.once('value');
  const currentSession = currentSessionSnapshot.val();

  if (!currentSession) {
    return null;
  }

  // Get specific data by ID from current session
  const dataRef = rtdb.ref(
    `users/${userId}/${deviceId}/realtime_monitoring/${currentSession}/${id}`,
  );
  const snapshot = await dataRef.once('value');

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.val();
  return {
    id: id,
    ...data,
  };
}

async function getAllRealtimeByDate(date, userContext) {
  const userId = userContext.userId;
  const deviceId = userContext.selectedDevice;

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const startTimestamp = startOfDay.toISOString();

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  const endTimestamp = endOfDay.toISOString();

  // Get all sessions data for the user/device
  const monitoringRef = rtdb.ref(
    `users/${userId}/${deviceId}/realtime_monitoring`,
  );
  const snapshot = await monitoringRef.once('value');

  if (!snapshot.exists()) {
    return [];
  }

  const allSessions = snapshot.val();
  const dateFilteredData = [];

  // Loop through all sessions and filter by date
  Object.keys(allSessions).forEach((sessionId) => {
    const sessionData = allSessions[sessionId];
    Object.keys(sessionData).forEach((dataId) => {
      const item = sessionData[dataId];
      if (item.timestamp >= startTimestamp && item.timestamp <= endTimestamp) {
        dateFilteredData.push({
          id: dataId,
          ...item,
        });
      }
    });
  });

  return dateFilteredData.sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
  );
}

async function deleteRealtimeByID(id, userContext) {
  const userId = userContext.userId;
  const deviceId = userContext.selectedDevice;

  // Get current session
  const currentSessionRef = rtdb.ref(
    `users/${userId}/${deviceId}/current_session`,
  );
  const currentSessionSnapshot = await currentSessionRef.once('value');
  const currentSession = currentSessionSnapshot.val();

  if (!currentSession) {
    return null;
  }

  // Get the data first to check if it exists and get file info
  const dataRef = rtdb.ref(
    `users/${userId}/${deviceId}/realtime_monitoring/${currentSession}/${id}`,
  );
  const snapshot = await dataRef.once('value');

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.val();
  const filename = data.path
    ? decodeURIComponent(data.path.split('/').pop())
    : null;

  // Delete file from storage if exists
  if (filename) {
    try {
      const file = storage.file(`images/${filename}`);
      const [exists] = await file.exists();

      if (exists) {
        await file.delete();
        console.log(`File ${filename} deleted from storage.`);
      }
    } catch (err) {
      console.error('Error deleting file from storage:', err);
      throw new Error('Error deleting file from storage');
    }
  }

  // Delete data from realtime database
  await dataRef.remove();
  console.log(`Data with ID ${id} deleted from Realtime Database.`);

  return true;
}

async function uploadImageToStorage(file) {
  if (!file || !file.buffer) {
    throw new Error('File buffer is missing');
  }

  const uniqueId = uuidv4();
  const filename = `${uniqueId}.png`;
  const fileRef = storage.file(`images/${filename}`);

  await fileRef.save(file.buffer, {
    metadata: {
      contentType: file.mimetype,
    },
  });

  const [url] = await fileRef.getSignedUrl({
    action: 'read',
    expires: '03-01-2100',
  });

  const path = `images/${filename}`;
  return { filename, path, imageUrl: url };
}

module.exports = {
  saveRealtime,
  getAllRealtime,
  getAllRealtimeWithImage,
  getRealtimeById,
  getAllRealtimeByDate,
  deleteRealtimeByID,
  getLastDataRealtime,
  uploadImageToStorage,
};
