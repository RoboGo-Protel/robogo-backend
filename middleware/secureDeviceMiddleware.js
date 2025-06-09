const jwt = require('jsonwebtoken');
const { firestore } = require('../controllers/database');

const SECRET_KEY = process.env.JWT_SECRET || 'robogo_gogogo';

// Cache for device lookups to reduce database queries
const deviceCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function secureDeviceMiddleware(req, res, next) {
  return new Promise(async (resolve, reject) => {
    try {
      // 1. EXTRACT AND VERIFY JWT BEARER TOKEN
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        return res.status(401).json({
          status: 'error',
          code: 401,
          message: 'Authorization Bearer token is required',
        });
      }

      // Verify JWT token
      let decodedToken;
      try {
        decodedToken = jwt.verify(token, SECRET_KEY);
      } catch (err) {
        return res.status(403).json({
          status: 'error',
          code: 403,
          message: 'Invalid or expired token',
        });
      }

      const authenticatedUserId = decodedToken.userId;
      console.log(`Authenticated user: ${authenticatedUserId}`);

      // 2. EXTRACT AND VALIDATE DEVICE NAME
      const deviceName = req.query.deviceName;

      if (!deviceName) {
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: 'deviceName parameter is required',
        });
      }

      console.log(`Device lookup: deviceName=${deviceName}`);

      // 3. CHECK CACHE FIRST
      const cacheKey = `${authenticatedUserId}_${deviceName}`;
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

      // 4. QUERY DATABASE FOR DEVICE OWNERSHIP
      const deviceQuery = await firestore
        .collection('devices')
        .where('deviceName', '==', deviceName)
        .limit(1)
        .get();

      if (deviceQuery.empty) {
        return res.status(404).json({
          status: 'error',
          code: 404,
          message: `Device with name '${deviceName}' not found`,
        });
      }

      const deviceDoc = deviceQuery.docs[0];
      const deviceData = deviceDoc.data();
      const deviceId = deviceDoc.id;
      const deviceOwnerId = deviceData.user_id || deviceData.userId;

      if (!deviceOwnerId) {
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: `Device '${deviceName}' is not assigned to any user`,
        });
      }

      // 5. VERIFY DEVICE OWNERSHIP
      if (deviceOwnerId !== authenticatedUserId) {
        return res.status(403).json({
          status: 'error',
          code: 403,
          message: `Access denied. You don't own device '${deviceName}'`,
        });
      }

      // 6. CACHE THE VALIDATED RESULT
      deviceCache.set(cacheKey, {
        userId: authenticatedUserId,
        deviceId: deviceId,
        timestamp: Date.now(),
      });

      // 7. SET USER CONTEXT
      req.user = {
        userId: authenticatedUserId,
        selectedDevice: deviceId,
        deviceName: deviceName,
      };

      console.log(
        `✅ Secure access granted: userId=${authenticatedUserId}, deviceId=${deviceId}, deviceName=${deviceName}`,
      );
      next();
    } catch (error) {
      console.error('Error in secureDeviceMiddleware:', error);
      return res.status(500).json({
        status: 'error',
        code: 500,
        message: 'Internal server error while validating secure device access',
      });
    }
  });
}

module.exports = secureDeviceMiddleware;
