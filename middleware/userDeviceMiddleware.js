/**
 * Middleware to extract device context from deviceName query parameter
 * and automatically resolve user_id and device_id from database
 * This replaces the header-based approach with ESP32-friendly query parameters
 */

const { firestore } = require('../controllers/database');

// Cache for device lookups to reduce database queries
const deviceCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function deviceNameMiddleware(req, res, next) {
  try {
    // Extract deviceName from query parameters
    const deviceName = req.query.deviceName;

    if (!deviceName) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'deviceName parameter is required',
      });
    }

    console.log(`Device lookup: deviceName=${deviceName}`);

    // Check cache first
    const cacheKey = deviceName;
    const cachedData = deviceCache.get(cacheKey);

    if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
      req.user = {
        userId: cachedData.userId,
        selectedDevice: cachedData.deviceId,
        deviceName: deviceName,
      };
      console.log(
        `Cache hit: userId=${cachedData.userId}, deviceId=${cachedData.deviceId}`,
      );
      return next();
    }

    // Query database for device information
    const deviceQuery = await firestore
      .collection('devices')
      .where('deviceName', '==', deviceName)
      .limit(1)
      .get();

    if (deviceQuery.empty) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: `Device with name '${deviceName}' not found. Please register the device first.`,
      });
    }

    const deviceDoc = deviceQuery.docs[0];
    const deviceData = deviceDoc.data();
    const deviceId = deviceDoc.id;
    const userId = deviceData.user_id || deviceData.userId;

    if (!userId) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: `Device '${deviceName}' is not assigned to any user. Please assign the device first.`,
      });
    }

    // Cache the result
    deviceCache.set(cacheKey, {
      userId: userId,
      deviceId: deviceId,
      timestamp: Date.now(),
    });

    // Set user context
    req.user = {
      userId: userId,
      selectedDevice: deviceId,
      deviceName: deviceName,
    };

    console.log(
      `Database lookup: userId=${userId}, deviceId=${deviceId}, deviceName=${deviceName}`,
    );
    next();
  } catch (error) {
    console.error('Error in deviceNameMiddleware:', error);
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Internal server error while resolving device context',
    });
  }
}

module.exports = deviceNameMiddleware;
