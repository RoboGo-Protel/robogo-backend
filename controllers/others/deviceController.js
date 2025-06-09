const { firestore } = require("../database");
const {
  getUserConfig,
  saveUserConfig,
  clearDeviceCacheByDeviceId,
} = require('../auth/userConfigController');

/**
 * Apply component dependency logic for robotics system
 * Rules:
 * 1. If ultrasonic OR imu is ON -> main must be ON (sensors need central controller)
 * 2. If main is explicitly set to OFF -> ultrasonic and imu must be OFF (but camera can stay ON for monitoring)
 *
 * @param {Object} status - The component status object
 * @param {Object} requestedChanges - The original request to understand intent
 */
function applyComponentDependencies(status, requestedChanges = {}) {
  const result = { ...status };

  // Rule 2: If main is explicitly set to OFF, disable all sensors (highest priority)
  if (requestedChanges.main === 'OFF') {
    result.main = 'OFF';
    result.ultrasonic = 'OFF';
    result.imu = 'OFF';
    // Camera stays independent - don't touch it
    return result;
  }

  // Rule 1: If any sensor is ON, main must be ON
  if (result.ultrasonic === 'ON' || result.imu === 'ON') {
    result.main = 'ON';
  }

  return result;
}

async function getAllDevices(req, res) {
  try {
    const snapshot = await firestore.collection('devices').get();
    const devices = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        user_id: data.user_id || null,
        deviceName: data.deviceName || null,
        status: data.status || null,
        cameraStreamUrl: data.cameraStreamUrl || null,
      };
    });
    res.status(200).json({ success: true, data: devices });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function addDevice(req, res) {
  try {
    const {
      user_id,
      deviceName,
      status,
      cameraStreamUrl,
      main,
      camera,
      ultrasonic,
      imu,
    } = req.body;

    if (!deviceName) {
      return res.status(400).json({
        success: false,
        message: 'deviceName is required',
      });
    }

    let normalizedStatus;
    const validComponents = ['main', 'camera', 'ultrasonic', 'imu'];

    // Priority 1: Check if individual component fields are provided in body
    if (main || camera || ultrasonic || imu) {
      // New flexible format - individual components in body
      normalizedStatus = {
        main: 'OFF',
        camera: 'OFF',
        ultrasonic: 'OFF',
        imu: 'OFF',
      };

      // Update only the components that are provided
      for (const component of validComponents) {
        if (req.body[component]) {
          const componentStatus = req.body[component].toString().toUpperCase();
          if (componentStatus !== 'ON' && componentStatus !== 'OFF') {
            return res.status(400).json({
              success: false,
              message: `Status for ${component} must be either "ON" or "OFF"`,
            });
          }
          normalizedStatus[component] = componentStatus;
        }
      }
    }
    // Priority 2: Check if status field is provided (legacy support)
    else if (status) {
      if (typeof status === 'string') {
        // Legacy format - convert to new format
        const legacyStatus = status.toUpperCase();
        if (legacyStatus !== 'ON' && legacyStatus !== 'OFF') {
          return res.status(400).json({
            success: false,
            message: 'Status must be either "ON" or "OFF"',
          });
        }
        normalizedStatus = {
          main: legacyStatus,
          camera: legacyStatus,
          ultrasonic: legacyStatus,
          imu: legacyStatus,
        };
      } else if (typeof status === 'object' && status !== null) {
        // Object format in status field
        normalizedStatus = {
          main: 'OFF',
          camera: 'OFF',
          ultrasonic: 'OFF',
          imu: 'OFF',
        };

        for (const component of validComponents) {
          if (status[component]) {
            const componentStatus = status[component].toString().toUpperCase();
            if (componentStatus !== 'ON' && componentStatus !== 'OFF') {
              return res.status(400).json({
                success: false,
                message: `Status for ${component} must be either "ON" or "OFF"`,
              });
            }
            normalizedStatus[component] = componentStatus;
          }
        }
      } else {
        return res.status(400).json({
          success: false,
          message: 'Status must be a string or object with component statuses',
        });
      }
    }
    // Priority 3: Default all components to OFF if no status provided
    else {
      normalizedStatus = {
        main: 'OFF',
        camera: 'OFF',
        ultrasonic: 'OFF',
        imu: 'OFF',
      };
    } // Apply component dependency logic
    const requestedChanges = { main, camera, ultrasonic, imu, status };
    normalizedStatus = applyComponentDependencies(
      normalizedStatus,
      requestedChanges,
    );

    // Check if device name already exists
    const existingDeviceSnapshot = await firestore
      .collection('devices')
      .where('deviceName', '==', deviceName)
      .get();
    if (!existingDeviceSnapshot.empty) {
      // Device exists, merge status with existing status for partial updates
      const existingDeviceDoc = existingDeviceSnapshot.docs[0];
      const existingDeviceData = existingDeviceDoc.data();
      const existingDeviceRef = firestore
        .collection('devices')
        .doc(existingDeviceDoc.id);

      // Get current status and normalize it
      let currentStatus = existingDeviceData.status;
      if (typeof currentStatus === 'string') {
        // Convert legacy format to component format
        const legacyStatus = currentStatus.toUpperCase();
        currentStatus = {
          main: legacyStatus,
          camera: legacyStatus,
          ultrasonic: legacyStatus,
          imu: legacyStatus,
        };
      } else if (!currentStatus || typeof currentStatus !== 'object') {
        // Default if no existing status
        currentStatus = {
          main: 'OFF',
          camera: 'OFF',
          ultrasonic: 'OFF',
          imu: 'OFF',
        };
      } // For partial updates (individual component fields), merge with existing status
      let finalStatus;
      if (main || camera || ultrasonic || imu) {
        // Partial update - merge with existing status first
        finalStatus = { ...currentStatus };
        for (const component of validComponents) {
          if (req.body[component]) {
            finalStatus[component] = normalizedStatus[component];
          }
        } // Apply component dependency logic IMMEDIATELY after merge
        // This ensures main OFF rule takes precedence over existing sensor states
        const partialRequestedChanges = { main, camera, ultrasonic, imu };
        finalStatus = applyComponentDependencies(
          finalStatus,
          partialRequestedChanges,
        );
      } else {
        // Full update - use normalized status as-is (already has dependencies applied)
        finalStatus = normalizedStatus;
      }

      const updateData = {
        status: finalStatus,
        updatedAt: new Date(),
      };

      // Only update cameraStreamUrl if provided
      if (cameraStreamUrl !== undefined) {
        updateData.cameraStreamUrl = cameraStreamUrl;
      }

      await existingDeviceRef.update(updateData);
      const updatedDevice = {
        id: existingDeviceDoc.id,
        ...existingDeviceData,
        status: finalStatus,
        ...(cameraStreamUrl !== undefined && { cameraStreamUrl }),
        updatedAt: new Date(),
      };

      return res.status(200).json({
        success: true,
        message: `Device '${deviceName}' updated successfully`,
        data: updatedDevice,
      });
    }

    if (user_id) {
      const userRef = await firestore.collection('users').doc(user_id).get();
      if (!userRef.exists) {
        return res
          .status(404)
          .json({ success: false, message: 'User tidak ditemukan' });
      }
    }
    const newDevice = {
      user_id: user_id || null,
      deviceName,
      status: normalizedStatus, // Use normalized status (always uppercase)
      cameraStreamUrl: cameraStreamUrl || null, // Add camera stream URL
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const ref = await firestore.collection('devices').add(newDevice);
    res.status(201).json({
      success: true,
      message: `Device '${deviceName}' created successfully with status '${normalizedStatus}'`,
      data: { id: ref.id, ...newDevice },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function assignUserToDevice(req, res) {
  try {
    let { deviceId, user_id } = req.body;

    if (!user_id && req.user && req.user.userId) {
      user_id = req.user.userId;
    }
    if (!deviceId || !user_id) {
      return res.status(400).json({
        success: false,
        message: 'deviceId dan user_id wajib diisi (user_id bisa dari token)',
      });
    }

    const userRef = await firestore.collection('users').doc(user_id).get();
    if (!userRef.exists) {
      return res
        .status(404)
        .json({ success: false, message: 'User tidak ditemukan' });
    }

    const deviceRef = firestore.collection('devices').doc(deviceId);
    const deviceSnap = await deviceRef.get();
    if (!deviceSnap.exists) {
      return res
        .status(404)
        .json({ success: false, message: 'Device tidak ditemukan' });
    }
    await deviceRef.update({ user_id });
    res
      .status(200)
      .json({ success: true, message: 'User berhasil di-assign ke device' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getDevicesByUser(req, res) {
  try {
    const user_id = req.user && req.user.userId;
    if (!user_id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: user_id tidak ditemukan di token',
      });
    }
    const snapshot = await firestore
      .collection('devices')
      .where('user_id', '==', user_id)
      .get();
    const devices = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        user_id: data.user_id || null,
        deviceName: data.deviceName || null,
        status: data.status || null,
        cameraStreamUrl: data.cameraStreamUrl || null,
      };
    });
    res.status(200).json({ success: true, data: devices });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getUnassignedDevices(req, res) {
  try {
    const snapshot = await firestore
      .collection('devices')
      .where('user_id', '==', null)
      .get();
    const devices = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        user_id: data.user_id || null,
        deviceName: data.deviceName || null,
        status: data.status || null,
        cameraStreamUrl: data.cameraStreamUrl || null,
      };
    });
    res.status(200).json({ success: true, data: devices });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getDevicesByUserId(userId) {
  try {
    const snapshot = await firestore
      .collection('devices')
      .where('user_id', '==', userId)
      .get();
    const devices = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        user_id: data.user_id || null,
        deviceName: data.deviceName || null,
        status: data.status || null,
        cameraStreamUrl: data.cameraStreamUrl || null,
      };
    });

    return devices;
  } catch (error) {
    throw new Error(
      `Failed to get devices for user ${userId}: ${error.message}`,
    );
  }
}

async function unassignDeviceFromUser(req, res) {
  try {
    const { deviceId } = req.body;
    const user_id = req.user && req.user.userId;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: 'deviceId wajib diisi',
      });
    }

    if (!user_id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: user_id tidak ditemukan di token',
      });
    }

    const deviceRef = firestore.collection('devices').doc(deviceId);
    const deviceSnap = await deviceRef.get();

    if (!deviceSnap.exists) {
      return res
        .status(404)
        .json({ success: false, message: 'Device tidak ditemukan' });
    }

    const deviceData = deviceSnap.data(); // Check if device is assigned to current user
    if (deviceData.user_id !== user_id) {
      return res.status(403).json({
        success: false,
        message: 'Device tidak di-assign ke user ini',
      });
    }

    // Unassign device (make it public/available)
    await deviceRef.update({ user_id: null });

    // Check if the unassigned device was the user's selectedDevice
    // If so, update user config to null the selectedDevice
    try {
      const userConfig = await getUserConfig(user_id);
      if (userConfig && userConfig.selectedDevice === deviceId) {
        const updatedConfig = {
          ...userConfig,
          selectedDevice: null,
          assignedDevices: userConfig.assignedDevices
            ? userConfig.assignedDevices.filter((id) => id !== deviceId)
            : [],
        };
        await saveUserConfig(user_id, updatedConfig);
      }
    } catch (configError) {
      console.error(
        'Error updating user config after unassigning device:',
        configError,
      );
      // Don't fail the whole operation if config update fails
    }

    res.status(200).json({
      success: true,
      message: 'Device berhasil di-unassign dan menjadi public',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function setCameraStreamUrl(req, res) {
  try {
    const { deviceName } = req.params;
    const { cameraStreamUrl } = req.body;

    if (!deviceName || !cameraStreamUrl) {
      return res.status(400).json({
        success: false,
        message:
          'deviceName (in URL) and cameraStreamUrl (in body) are required',
      });
    }

    // Validate URL format (basic validation)
    const urlPattern = /^(https?|ws|wss):\/\/.+/;
    if (!urlPattern.test(cameraStreamUrl)) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid camera stream URL format. Must start with http://, https://, ws://, or wss://',
      });
    }

    // Find device by deviceName
    const deviceSnapshot = await firestore
      .collection('devices')
      .where('deviceName', '==', deviceName)
      .get();

    if (deviceSnapshot.empty) {
      return res.status(404).json({
        success: false,
        message: `Device '${deviceName}' not found`,
      });
    }

    // Update the device's cameraStreamUrl
    const deviceDoc = deviceSnapshot.docs[0];
    const deviceRef = firestore.collection('devices').doc(deviceDoc.id);
    await deviceRef.update({
      cameraStreamUrl: cameraStreamUrl,
      updatedAt: new Date(),
    });

    // Clear cache for this device to ensure fresh data on next request
    clearDeviceCacheByDeviceId(deviceDoc.id);

    const updatedDevice = {
      id: deviceDoc.id,
      ...deviceDoc.data(),
      cameraStreamUrl: cameraStreamUrl,
      updatedAt: new Date(),
    };

    res.status(200).json({
      success: true,
      message: `Camera stream URL updated successfully for device '${deviceName}'`,
      data: updatedDevice,
    });
  } catch (error) {
    console.error('Error updating camera stream URL:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update camera stream URL',
    });
  }
}

// Add new function for getting device status by deviceName
async function getDeviceStatusByName(req, res) {
  try {
    const { deviceName } = req.query;

    if (!deviceName) {
      return res.status(400).json({
        success: false,
        message: 'deviceName parameter is required',
      });
    }

    // Query device by deviceName
    const deviceQuery = await firestore
      .collection('devices')
      .where('deviceName', '==', deviceName)
      .limit(1)
      .get();

    if (deviceQuery.empty) {
      return res.status(404).json({
        success: false,
        message: `Device with name '${deviceName}' not found`,
      });
    }

    const deviceDoc = deviceQuery.docs[0];
    const deviceData = deviceDoc.data();

    // Ensure we return consistent status format
    let status = deviceData.status;

    // Handle legacy string status format
    if (typeof status === 'string') {
      const legacyStatus = status.toUpperCase();
      status = {
        main: legacyStatus,
        camera: legacyStatus,
        ultrasonic: legacyStatus,
        imu: legacyStatus,
      };
    }

    // Ensure all required components exist
    const componentStatus = {
      main: status?.main || 'OFF',
      camera: status?.camera || 'OFF',
      ultrasonic: status?.ultrasonic || 'OFF',
      imu: status?.imu || 'OFF',
    };

    const response = {
      id: deviceDoc.id,
      deviceName: deviceData.deviceName,
      status: componentStatus,
      cameraStreamUrl: deviceData.cameraStreamUrl || null,
      user_id: deviceData.user_id || null,
      updatedAt: deviceData.updatedAt?.toDate?.()?.toISOString() || null,
    };

    res.status(200).json({
      success: true,
      message: `Device status retrieved successfully for '${deviceName}'`,
      data: response,
    });
  } catch (error) {
    console.error('Error getting device status:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get device status',
    });
  }
}

/**
 * Update device component status by deviceName
 * Supports updating individual components or multiple components at once
 */
async function updateDeviceComponentStatus(req, res) {
  try {
    const { deviceName } = req.query;
    const statusUpdates = req.body;

    // Validate deviceName parameter
    if (!deviceName) {
      return res.status(400).json({
        success: false,
        message: 'deviceName query parameter is required',
      });
    }

    // Validate request body
    if (!statusUpdates || typeof statusUpdates !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Request body must contain status updates object',
      });
    }

    // Find device by deviceName
    const deviceSnapshot = await firestore
      .collection('devices')
      .where('deviceName', '==', deviceName)
      .get();

    if (deviceSnapshot.empty) {
      return res.status(404).json({
        success: false,
        message: `Device with name '${deviceName}' not found`,
      });
    }

    const deviceDoc = deviceSnapshot.docs[0];
    const deviceData = deviceDoc.data();
    let currentStatus = deviceData.status;

    // Convert legacy string status to object if needed
    if (typeof currentStatus === 'string') {
      const legacyStatus = currentStatus.toUpperCase();
      currentStatus = {
        main: legacyStatus,
        camera: legacyStatus,
        ultrasonic: legacyStatus,
        imu: legacyStatus,
      };
    }

    // Validate and update status
    const validComponents = ['main', 'camera', 'ultrasonic', 'imu'];
    const updatedStatus = { ...currentStatus };

    for (const [component, status] of Object.entries(statusUpdates)) {
      if (!validComponents.includes(component)) {
        return res.status(400).json({
          success: false,
          message: `Invalid component '${component}'. Valid components are: ${validComponents.join(
            ', ',
          )}`,
        });
      }

      const normalizedStatus = status.toString().toUpperCase();
      if (normalizedStatus !== 'ON' && normalizedStatus !== 'OFF') {
        return res.status(400).json({
          success: false,
          message: `Status for '${component}' must be either 'ON' or 'OFF'`,
        });
      }
      updatedStatus[component] = normalizedStatus;
    } // Apply component dependency logic
    const finalUpdatedStatus = applyComponentDependencies(
      updatedStatus,
      statusUpdates,
    );

    // Update device in database
    const deviceRef = firestore.collection('devices').doc(deviceDoc.id);
    await deviceRef.update({
      status: finalUpdatedStatus,
      updatedAt: new Date(),
    });

    // Clear cache if device was assigned to a user
    if (deviceData.user_id) {
      await clearDeviceCacheByDeviceId(deviceDoc.id);
    }

    const response = {
      id: deviceDoc.id,
      deviceName: deviceData.deviceName,
      status: finalUpdatedStatus,
      cameraStreamUrl: deviceData.cameraStreamUrl || null,
      updatedAt: new Date(),
    };

    res.status(200).json({
      success: true,
      message: `Device '${deviceName}' component status updated successfully`,
      data: response,
    });
  } catch (error) {
    console.error('Error updating device component status:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update device component status',
    });
  }
}

module.exports = {
  getAllDevices,
  addDevice,
  assignUserToDevice,
  getDevicesByUser,
  getUnassignedDevices,
  getDevicesByUserId,
  unassignDeviceFromUser,
  setCameraStreamUrl,
  getDeviceStatusByName, // Add new function to exports
  updateDeviceComponentStatus, // Add new function to exports
};
