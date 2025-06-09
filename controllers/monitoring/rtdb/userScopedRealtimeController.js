const { rtdb, firestore } = require('../../database');
const storage = require('../../storage');
const { v4: uuidv4 } = require('uuid');

function calculateAlertLevel(distance) {
  if (typeof distance === 'number') {
    if (distance < 10) {
      return 'High';
    } else if (distance >= 10 && distance <= 20) {
      return 'Medium';
    } else {
      return 'Safe';
    }
  }
  return 'Unknown';
}

/**
 * Get user ID and device ID from request
 * This should be called from middleware that sets req.user and req.device
 */
function getUserDeviceContext(req) {
  const userId = req.user?.userId;
  const deviceId =
    req.user?.selectedDevice || req.query.deviceId || req.body.deviceId;

  if (!userId) {
    throw new Error('User ID is required');
  }

  if (!deviceId) {
    throw new Error(
      'Device ID is required. Please select a device or specify deviceId parameter.',
    );
  }

  return { userId, deviceId };
}

/**
 * Save realtime data to the new nested structure
 */
async function saveRealtime(data, req) {
  try {
    const { userId, deviceId } = getUserDeviceContext(req);

    // Get current session for this user/device
    const currentSessionRef = rtdb.ref(
      `users/${userId}/${deviceId}/current_session`,
    );
    const currentSessionSnap = await currentSessionRef.once('value');
    let sessionId = currentSessionSnap.val();

    sessionId = Number(sessionId);

    if (
      !sessionId ||
      typeof sessionId !== 'number' ||
      sessionId < 1 ||
      isNaN(sessionId)
    ) {
      throw new Error(
        'Invalid or missing current_session value. Please start monitoring first.',
      );
    }

    // Save to new nested structure
    const ref = rtdb
      .ref(`users/${userId}/${deviceId}/realtime_monitoring/${sessionId}`)
      .push();

    const baseData = {
      timestamp: data.timestamp || new Date().toISOString(),
      sessionId,
      metadata: data.metadata || {},
      obstacle: data.obstacle || false,
      createdAt: new Date().toISOString(),
      rssi: typeof data.rssi !== 'undefined' ? data.rssi : 0,
      sessionStatus:
        typeof data.sessionStatus !== 'undefined' ? data.sessionStatus : false,
      user_id: userId,
      device_id: deviceId,
    };

    const imageData = data.imageUrl
      ? {
          filename: data.filename || null,
          path: data.path || null,
          imageUrl: data.imageUrl || null,
          takenWith: data.takenWith || 'ESP32-CAM',
        }
      : {};

    await ref.set({ ...baseData, ...imageData });

    return { id: ref.key, ...baseData, ...imageData };
  } catch (error) {
    console.error('Error saving realtime data:', error);
    throw error;
  }
}

/**
 * Get the last realtime data for a specific user/device
 */
async function getLastDataRealtime(req) {
  try {
    const { userId, deviceId } = getUserDeviceContext(req);

    const snapshot = await rtdb
      .ref(`users/${userId}/${deviceId}/realtime_monitoring`)
      .orderByChild('createdAt')
      .limitToLast(1)
      .once('value');

    const val = snapshot.val();
    if (!val) return null;

    // Get the session data
    for (const [sessionId, sessionData] of Object.entries(val)) {
      if (typeof sessionData === 'object') {
        for (const [id, data] of Object.entries(sessionData)) {
          if (data.metadata && Object.keys(data.metadata).length > 0) {
            return { id, sessionId: Number(sessionId), ...data };
          }
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting last realtime data:', error);
    throw error;
  }
}

/**
 * Get all realtime data for a specific user/device
 */
async function getAllRealtime(req) {
  try {
    const { userId, deviceId } = getUserDeviceContext(req);

    const snapshot = await rtdb
      .ref(`users/${userId}/${deviceId}/realtime_monitoring`)
      .orderByChild('createdAt')
      .once('value');

    const val = snapshot.val();
    if (!val) return { count: 0, data: [] };

    const data = [];

    for (const [sessionId, sessionData] of Object.entries(val)) {
      if (typeof sessionData === 'object') {
        for (const [id, item] of Object.entries(sessionData)) {
          data.push({ id, sessionId: Number(sessionId), ...item });
        }
      }
    }

    const sortedData = data.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    );

    return { count: sortedData.length, data: sortedData };
  } catch (error) {
    console.error('Error getting all realtime data:', error);
    throw error;
  }
}

/**
 * Get realtime data with images for a specific user/device
 */
async function getAllRealtimeWithImage(req) {
  try {
    const { userId, deviceId } = getUserDeviceContext(req);

    const snapshot = await rtdb
      .ref(`users/${userId}/${deviceId}/realtime_monitoring`)
      .once('value');
    const val = snapshot.val();
    if (!val) return [];

    const results = [];

    for (const [sessionId, sessionData] of Object.entries(val)) {
      if (typeof sessionData === 'object' && sessionData !== null) {
        for (const [id, item] of Object.entries(sessionData)) {
          if (item.imageUrl && item.imageUrl.trim() !== '') {
            results.push({ id, sessionId: Number(sessionId), ...item });
          }
        }
      }
    }

    return results.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    );
  } catch (error) {
    console.error('Error getting realtime data with images:', error);
    throw error;
  }
}

/**
 * Get realtime data including metadata for a specific user/device
 */
async function getAllRealtimeIncludingMetadata(req) {
  try {
    const { userId, deviceId } = getUserDeviceContext(req);

    const snapshot = await rtdb
      .ref(`users/${userId}/${deviceId}/realtime_monitoring`)
      .once('value');
    const val = snapshot.val();
    if (!val) return [];

    const results = [];

    for (const [sessionId, sessionData] of Object.entries(val)) {
      if (typeof sessionData === 'object' && sessionData !== null) {
        for (const [id, item] of Object.entries(sessionData)) {
          if (item.metadata && Object.keys(item.metadata).length > 0) {
            results.push({ id, sessionId: Number(sessionId), ...item });
          }
        }
      }
    }

    return results.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    );
  } catch (error) {
    console.error('Error getting realtime data with metadata:', error);
    throw error;
  }
}

/**
 * Get realtime data by ID for a specific user/device/session
 */
async function getRealtimeById(id, sessionId, req) {
  try {
    const { userId, deviceId } = getUserDeviceContext(req);

    const snapshot = await rtdb
      .ref(`users/${userId}/${deviceId}/realtime_monitoring/${sessionId}/${id}`)
      .once('value');

    if (!snapshot.exists()) return null;

    return { id, sessionId: Number(sessionId), ...snapshot.val() };
  } catch (error) {
    console.error('Error getting realtime data by ID:', error);
    throw error;
  }
}

/**
 * Get realtime data by date for a specific user/device
 */
async function getAllRealtimeByDate(date, req) {
  try {
    const { userId, deviceId } = getUserDeviceContext(req);

    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const snapshot = await rtdb
      .ref(`users/${userId}/${deviceId}/realtime_monitoring`)
      .once('value');
    const val = snapshot.val();
    if (!val) return [];

    const results = [];

    for (const [sessionId, sessionData] of Object.entries(val)) {
      if (typeof sessionData === 'object') {
        for (const [id, item] of Object.entries(sessionData)) {
          const ts = new Date(item.timestamp || item.createdAt);
          if (ts >= start && ts <= end) {
            results.push({ id, sessionId: Number(sessionId), ...item });
          }
        }
      }
    }

    return results.sort(
      (a, b) =>
        new Date(a.timestamp || a.createdAt) -
        new Date(b.timestamp || b.createdAt),
    );
  } catch (error) {
    console.error('Error getting realtime data by date:', error);
    throw error;
  }
}

/**
 * Delete realtime data by ID
 */
async function deleteRealtimeByID(id, sessionId, req) {
  try {
    const { userId, deviceId } = getUserDeviceContext(req);

    const ref = rtdb.ref(
      `users/${userId}/${deviceId}/realtime_monitoring/${sessionId}/${id}`,
    );
    const snapshot = await ref.once('value');

    if (!snapshot.exists()) return null;

    const data = snapshot.val();
    const filename = decodeURIComponent(data.path?.split('/').pop());

    if (filename) {
      try {
        const file = storage.file(`images/${filename}`);
        const [exists] = await file.exists();

        if (exists) {
          await file.delete();
          console.log(`File ${filename} deleted from storage.`);
        } else {
          console.warn('File not found in storage.');
        }
      } catch (err) {
        console.error('Error deleting file from storage:', err);
        throw new Error('Error deleting file from storage');
      }
    }

    await ref.remove();
    console.log(`Data with ID ${id} removed from Realtime Database.`);
    return true;
  } catch (error) {
    console.error('Error deleting realtime data:', error);
    throw error;
  }
}

/**
 * Upload image to storage (unchanged)
 */
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

/**
 * Start monitoring for a specific user/device
 */
async function startMonitoring(req) {
  try {
    const { userId, deviceId } = getUserDeviceContext(req);

    const monitoringRef = rtdb.ref(
      `users/${userId}/${deviceId}/realtime_monitoring`,
    );
    const snapshot = await monitoringRef.once('value');
    const data = snapshot.val();

    const lastSessionId = data
      ? Math.max(...Object.keys(data).map((key) => parseInt(key)))
      : 0;

    const newSessionId = lastSessionId + 1;

    // Initialize new session
    await rtdb
      .ref(`users/${userId}/${deviceId}/realtime_monitoring/${newSessionId}`)
      .set({});

    // Set current session
    await rtdb
      .ref(`users/${userId}/${deviceId}/current_session`)
      .set(newSessionId);

    return { sessionId: newSessionId, userId, deviceId };
  } catch (error) {
    console.error('Error starting monitoring:', error);
    throw error;
  }
}

/**
 * Stop monitoring for a specific user/device
 */
async function stopMonitoring(req) {
  try {
    const { userId, deviceId } = getUserDeviceContext(req);

    const currentSessionRef = rtdb.ref(
      `users/${userId}/${deviceId}/current_session`,
    );
    const currentSessionSnap = await currentSessionRef.once('value');
    let sessionId = currentSessionSnap.val();
    sessionId = Number(sessionId);

    if (
      !sessionId ||
      typeof sessionId !== 'number' ||
      sessionId < 1 ||
      isNaN(sessionId)
    ) {
      await currentSessionRef.set(0);
      return {
        stopped: false,
        success: false,
        message: 'No active session to stop.',
        sessionId: 0,
        userId,
        deviceId,
        date: new Date().toISOString().split('T')[0],
        importedReport: {
          ultrasonic_logs: {
            totalData: 0,
            success: false,
            message: 'No active session to stop.',
          },
          imu_logs: {
            totalData: 0,
            success: false,
            message: 'No active session to stop.',
          },
        },
      };
    }

    // Get session data
    const sessionDataSnap = await rtdb
      .ref(`users/${userId}/${deviceId}/realtime_monitoring/${sessionId}`)
      .once('value');
    const sessionData = sessionDataSnap.val();

    let importedUltrasonic = 0;
    let importedIMU = 0;
    let ultrasonicSuccess = true;
    let ultrasonicMessage = '';
    let imuSuccess = true;
    let imuMessage = '';

    if (sessionData && typeof sessionData === 'object') {
      const batch = firestore.batch();
      try {
        for (const [id, entry] of Object.entries(sessionData)) {
          // Create ultrasonic log with user_id and device_id
          const docRefUltrasonic = firestore
            .collection('ultrasonic_logs')
            .doc();
          const alertLevel = calculateAlertLevel(
            entry.metadata &&
              typeof entry.metadata.distances?.distTotal === 'number'
              ? entry.metadata.distances.distTotal
              : null,
          );
          const createdAt = entry.createdAt
            ? new Date(entry.createdAt)
            : new Date();
          const distance =
            entry.metadata &&
            typeof entry.metadata.distances?.distTotal === 'number'
              ? entry.metadata.distances.distTotal
              : null;

          const ultrasonicData = {
            timestamp: createdAt,
            sessionId: sessionId,
            distance: distance === null ? 0 : distance,
            alertLevel,
            imageId: entry.imageUrl || null,
            createdAt,
            date: createdAt.toISOString().split('T')[0],
            user_id: userId,
            device_id: deviceId,
          };

          const existingUltrasonic = await firestore
            .collection('ultrasonic_logs')
            .where('sessionId', '==', sessionId)
            .where('timestamp', '==', createdAt)
            .where('distance', '==', distance === null ? 0 : distance)
            .where('imageId', '==', entry.imageUrl || null)
            .where('user_id', '==', userId)
            .where('device_id', '==', deviceId)
            .get();

          if (existingUltrasonic.empty) {
            batch.set(docRefUltrasonic, ultrasonicData);
            importedUltrasonic++;
          }

          // Create IMU log with user_id and device_id
          if (entry.sessionId === sessionId && entry.metadata) {
            const docRefIMU = firestore.collection('imu_logs').doc();
            const m = entry.metadata;

            const imuData = {
              timestamp: entry.timestamp
                ? new Date(entry.timestamp)
                : createdAt,
              sessionId: sessionId,
              accelerationMagnitude: m.accelerationMagnitude ?? null,
              direction: m.direction ?? null,
              distanceTraveled: m.distanceTraveled ?? null,
              heading: m.heading ?? null,
              linearAcceleration: m.linearAcceleration ?? null,
              pitch: m.pitch ?? null,
              roll: m.roll ?? null,
              rotationRate: m.rotationRate ?? null,
              ultrasonic: m.ultrasonic ?? null,
              yaw: m.yaw ?? null,
              distances: m.distances ?? null,
              magnetometer: m.magnetometer ?? null,
              position: m.position ?? null,
              velocity: m.velocity ?? null,
              createdAt,
              date: createdAt.toISOString().split('T')[0],
              user_id: userId,
              device_id: deviceId,
            };

            const existingIMU = await firestore
              .collection('imu_logs')
              .where('sessionId', '==', sessionId)
              .where('timestamp', '==', imuData.timestamp)
              .where('heading', '==', imuData.heading)
              .where('direction', '==', imuData.direction)
              .where('user_id', '==', userId)
              .where('device_id', '==', deviceId)
              .get();

            if (existingIMU.empty) {
              batch.set(docRefIMU, imuData);
              importedIMU++;
            }
          }
        }

        if (importedUltrasonic > 0 || importedIMU > 0) {
          await batch.commit();
        }

        ultrasonicSuccess = true;
        ultrasonicMessage =
          importedUltrasonic > 0
            ? `Successfully imported ${importedUltrasonic} ultrasonic log(s).`
            : 'No new ultrasonic logs to import.';
        imuSuccess = true;
        imuMessage =
          importedIMU > 0
            ? `Successfully imported ${importedIMU} IMU log(s).`
            : 'No new IMU logs to import.';
      } catch (e) {
        ultrasonicSuccess = false;
        ultrasonicMessage = e.message || 'Failed to import ultrasonic_logs.';
        imuSuccess = false;
        imuMessage = e.message || 'Failed to import imu_logs.';
      }
    }

    // Reset current session
    await currentSessionRef.set(0);

    let dateStr = null;
    function toJakartaDateString(dateObj) {
      const jakartaOffset = 7 * 60;
      const utc = dateObj.getTime() + dateObj.getTimezoneOffset() * 60000;
      const jakarta = new Date(utc + jakartaOffset * 60000);
      return jakarta.toISOString().split('T')[0];
    }

    if (sessionData && typeof sessionData === 'object') {
      const firstEntry = Object.values(sessionData)[0];
      let dateSource = firstEntry?.createdAt || new Date();
      if (typeof dateSource === 'string' || dateSource instanceof String) {
        dateSource = new Date(dateSource);
      }
      dateStr = toJakartaDateString(dateSource);
    } else {
      dateStr = toJakartaDateString(new Date());
    }

    return {
      stopped: true,
      sessionId,
      userId,
      deviceId,
      date: dateStr,
      importedReport: {
        ultrasonic_logs: {
          totalData: importedUltrasonic,
          success: ultrasonicSuccess,
          duplication: importedUltrasonic === 0 ? true : false,
          message: ultrasonicMessage,
        },
        imu_logs: {
          totalData: importedIMU,
          success: imuSuccess,
          duplication: importedIMU === 0 ? true : false,
          message: imuMessage,
        },
      },
    };
  } catch (error) {
    console.error('Error stopping monitoring:', error);
    throw error;
  }
}

/**
 * Restructure realtime data - for backward compatibility
 * This function is mainly for migration purposes
 */
async function restructureRealtimeData(req) {
  try {
    const { userId, deviceId } = getUserDeviceContext(req);

    // For user-scoped structure, this function mainly serves as a health check
    console.log(
      `Checking realtime data structure for user ${userId}, device ${deviceId}`,
    );

    const snapshot = await rtdb
      .ref(`users/${userId}/${deviceId}/realtime_monitoring`)
      .once('value');
    const data = snapshot.val();

    if (!data) {
      return {
        migrated: 0,
        message: 'No data found for this user/device combination',
      };
    }

    const sessionCount = Object.keys(data).length;
    return {
      migrated: sessionCount,
      message: `Found ${sessionCount} sessions for user ${userId}, device ${deviceId}`,
    };
  } catch (error) {
    console.error('Error in restructureRealtimeData:', error);
    throw error;
  }
}

module.exports = {
  saveRealtime,
  getAllRealtime,
  getAllRealtimeWithImage,
  getAllRealtimeIncludingMetadata,
  getRealtimeById,
  getAllRealtimeByDate,
  deleteRealtimeByID,
  getLastDataRealtime,
  uploadImageToStorage,
  startMonitoring,
  stopMonitoring,
  getUserDeviceContext,
  restructureRealtimeData,
};
