const { firestore } = require('../database');

// Cache for device camera URLs to reduce database queries
const deviceCameraCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const DEFAULT_CONFIG = {
  selectedDevice: null,
  cameraStreamUrl: '',
  streamQuality: 'medium',
  assignedDevices: [],
  onboardingCompleted: false,
  hideMonitoringControls: false,
};

async function getUserConfig(userId) {
  try {
    const configDoc = await firestore
      .collection('userConfigs')
      .doc(userId)
      .get();

    if (!configDoc.exists) {
      return DEFAULT_CONFIG;
    }
    const configData = configDoc.data();

    let config = {
      ...DEFAULT_CONFIG,
      ...configData,
      updatedAt: configData.updatedAt?.toDate
        ? configData.updatedAt.toDate()
        : configData.updatedAt,
      createdAt: configData.createdAt?.toDate
        ? configData.createdAt.toDate()
        : configData.createdAt,
    };

    // If user has a selected device, get the cameraStreamUrl from that device
    if (config.selectedDevice) {
      try {
        // Check cache first
        const cacheKey = config.selectedDevice;
        const cachedData = deviceCameraCache.get(cacheKey);
        
        if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
          config.cameraStreamUrl = cachedData.cameraStreamUrl;
        } else {
          // Fetch from database if not cached or expired
          const deviceDoc = await firestore
            .collection('devices')
            .doc(config.selectedDevice)
            .get();

          if (deviceDoc.exists) {
            const deviceData = deviceDoc.data();
            // Override cameraStreamUrl with device's URL if available
            if (deviceData.cameraStreamUrl) {
              config.cameraStreamUrl = deviceData.cameraStreamUrl;
              
              // Cache the result
              deviceCameraCache.set(cacheKey, {
                cameraStreamUrl: deviceData.cameraStreamUrl,
                timestamp: Date.now(),
              });
            }
          }
        }
      } catch (deviceError) {
        console.error('Error fetching device camera URL:', deviceError);
        // Continue with existing config if device fetch fails
      }
    }

    return config;
  } catch (error) {
    console.error('Error fetching user config:', error);
    throw new Error('Failed to fetch user configuration');
  }
}

// Add function to get user config with all assigned devices' camera URLs
async function getUserConfigWithDevices(userId) {
  try {
    const config = await getUserConfig(userId);
    
    if (!config.assignedDevices || config.assignedDevices.length === 0) {
      return {
        ...config,
        assignedDevicesWithUrls: []
      };
    }

    // Batch fetch all assigned devices
    const devicePromises = config.assignedDevices.map(async (deviceId) => {
      try {
        const deviceDoc = await firestore
          .collection('devices')
          .doc(deviceId)
          .get();
          if (deviceDoc.exists) {
          const deviceData = deviceDoc.data();
          
          // Handle legacy status format
          let deviceStatus = deviceData.status;
          if (typeof deviceStatus === 'string') {
            // Convert legacy format to new component format
            const legacyStatus = deviceStatus.toUpperCase();
            deviceStatus = {
              main: legacyStatus,
              camera: legacyStatus,
              ultrasonic: legacyStatus,
              imu: legacyStatus
            };
          }
          
          // Ensure all components exist
          const normalizedStatus = {
            main: deviceStatus?.main || 'OFF',
            camera: deviceStatus?.camera || 'OFF',
            ultrasonic: deviceStatus?.ultrasonic || 'OFF',
            imu: deviceStatus?.imu || 'OFF'
          };
          
          return {
            deviceId: deviceId,
            deviceName: deviceData.deviceName || '',
            cameraStreamUrl: deviceData.cameraStreamUrl || '',
            status: normalizedStatus
          };
        }
        return null;
      } catch (error) {
        console.error(`Error fetching device ${deviceId}:`, error);
        return null;
      }
    });

    const assignedDevicesWithUrls = (await Promise.all(devicePromises))
      .filter(device => device !== null);

    return {
      ...config,
      assignedDevicesWithUrls
    };
  } catch (error) {
    console.error('Error fetching user config with devices:', error);
    throw new Error('Failed to fetch user configuration with devices');
  }
}

async function saveUserConfig(userId, configData) {
  try {
    const now = new Date();

    const existingConfig = await firestore
      .collection('userConfigs')
      .doc(userId)
      .get();

    const updateData = {
      ...configData,
      updatedAt: now,
    };

    if (!existingConfig.exists) {
      updateData.createdAt = now;
    }

    await firestore
      .collection('userConfigs')
      .doc(userId)
      .set(updateData, { merge: true });

    return {
      ...updateData,
      userId,
      updatedAt: updateData.updatedAt,
      createdAt: updateData.createdAt || existingConfig.data()?.createdAt,
    };
  } catch (error) {
    console.error('Error saving user config:', error);
    throw new Error('Failed to save user configuration');
  }
}

async function deleteUserConfig(userId) {
  try {
    await firestore.collection('userConfigs').doc(userId).delete();

    return {
      success: true,
      message: 'User configuration deleted successfully',
    };
  } catch (error) {
    console.error('Error deleting user config:', error);
    throw new Error('Failed to delete user configuration');
  }
}

async function getAllUserConfigs() {
  try {
    const snapshot = await firestore.collection('userConfigs').get();

    const configs = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      configs.push({
        userId: doc.id,
        ...data,
        updatedAt: data.updatedAt?.toDate(),
        createdAt: data.createdAt?.toDate(),
      });
    });

    return configs;
  } catch (error) {
    console.error('Error fetching all user configs:', error);
    throw new Error('Failed to fetch user configurations');
  }
}

function clearDeviceCacheByDeviceId(deviceId) {
  deviceCameraCache.delete(deviceId);
  console.log(`🗑️ Cleared cache for device: ${deviceId}`);
}

function clearAllDeviceCache() {
  deviceCameraCache.clear();
  console.log('🗑️ Cleared all device camera cache');
}

module.exports = {
  getUserConfig,
  getUserConfigWithDevices,
  saveUserConfig,
  deleteUserConfig,
  getAllUserConfigs,
  clearDeviceCacheByDeviceId,
  clearAllDeviceCache,
  DEFAULT_CONFIG,
};
