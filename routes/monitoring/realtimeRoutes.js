const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer();
const deviceNameMiddleware = require('../../middleware/userDeviceMiddleware');
const secureDeviceMiddleware = require('../../middleware/secureDeviceMiddleware');

// Apply device name middleware to data collection routes (ESP32)
// Apply secure device middleware to control routes (Web Dashboard)
// Default: use device name middleware for backward compatibility
router.use(deviceNameMiddleware);

const {
  saveRealtime,
  getAllRealtime,
  getAllRealtimeWithImage,
  getRealtimeById,
  getAllRealtimeByDate,
  deleteRealtimeByID,
  uploadImageToStorage,
  getLastDataRealtime,
} = require('../../controllers/monitoring/realtimeController');

const {
  startMonitoring,
  stopMonitoring,
} = require('../../controllers/monitoring/rtdb/userScopedRealtimeController');

router.post('/', upload.single('image'), async (req, res) => {
  try {
    const file = req.file;
    const obstacle = req.body.obstacle === 'true';
    const takenWith = req.body.takenWith || null;

    // Check if no parameters are provided, set default deviceName
    const hasAnyParams = Object.keys(req.body).length > 0 || file;
    if (!hasAnyParams) {
      // Set default device name if no parameters provided
      req.headers['x-device-name'] = 'esp32-48BB88';
      console.log(
        'No parameters provided, using default deviceName: esp32-48BB88',
      );
    }

    const metadataKeys = [
      'ultrasonic',
      'heading',
      'direction',
      'accelerationMagnitude',
      'rotationRate',
      'distanceTraveled',
      'linearAcceleration',
      'distTotal',
      'distX',
      'distY',
      'velocity',
      'velocityX',
      'velocityY',
      'magnetometerX',
      'magnetometerY',
      'magnetometerZ',
      'positionX',
      'positionY',
      'pitch',
      'roll',
      'yaw',
      'gps_lat',
      'gps_lon',
      'gps_alt',
    ];

    let metadata = null;
    const hasMetadata = metadataKeys.some((key) => req.body[key] !== undefined);
    const rssi = parseInt(req.body.rssi, 10) || 0;
    const rssiDistance = parseFloat(req.body.rssiDistance) || 0;
    const sessionStatus =
      (req.body.sessionStatus || '').toUpperCase() === 'ON' ? true : false;

    if (hasMetadata) {
      metadata = {
        ultrasonic: parseFloat(req.body.ultrasonic) || 0,
        heading: parseFloat(req.body.heading) || 0,
        direction: req.body.direction || 'Unknown',
        accelerationMagnitude: parseFloat(req.body.accelerationMagnitude) || 0,
        rotationRate: parseFloat(req.body.rotationRate) || 0,
        distanceTraveled: parseFloat(req.body.distanceTraveled) || 0,
        linearAcceleration: parseFloat(req.body.linearAcceleration) || 0,
        distances: {
          distTotal: parseFloat(req.body.distTotal) || 0,
          distX: parseFloat(req.body.distX) || 0,
          distY: parseFloat(req.body.distY) || 0,
        },
        velocity: {
          velocity: parseFloat(req.body.velocity) || 0,
          velocityX: parseFloat(req.body.velocityX) || 0,
          velocityY: parseFloat(req.body.velocityY) || 0,
        },
        magnetometer: {
          magnetometerX: parseFloat(req.body.magnetometerX) || 0,
          magnetometerY: parseFloat(req.body.magnetometerY) || 0,
          magnetometerZ: parseFloat(req.body.magnetometerZ) || 0,
        },
        position: {
          positionX: parseFloat(req.body.positionX) || 0,
          positionY: parseFloat(req.body.positionY) || 0,
        },
        pitch: parseFloat(req.body.pitch) || 0,
        roll: parseFloat(req.body.roll) || 0,
        yaw: parseFloat(req.body.yaw) || 0,
        gps: {
          gps_lat: parseFloat(req.body.gps_lat) || 0,
          gps_lon: parseFloat(req.body.gps_lon) || 0,
          gps_alt: parseFloat(req.body.gps_alt) || 0,
        },
      };
    }

    let filename = null;
    let path = null;
    let imageUrl = null;

    if (file) {
      const uploadResult = await uploadImageToStorage(file);
      filename = uploadResult.filename;
      path = uploadResult.path;
      imageUrl = uploadResult.imageUrl;
    }
    const saved = await saveRealtime(
      {
        filename,
        path,
        imageUrl,
        timestamp: new Date(),
        obstacle,
        takenWith,
        rssi,
        rssiDistance,
        sessionStatus,
        ...(metadata ? { metadata } : {}),
      },
      req.user,
    );
    let message = 'Metadata saved successfully';
    if (file && metadata) message = 'Image and metadata saved successfully';
    else if (file && !metadata) message = 'Image saved successfully';

    // Add note if default device name was used
    if (!hasAnyParams) {
      message += ' (using default device: esp32-48BB88)';
    }

    res.status(201).json({
      status: 'success',
      code: 201,
      message,
      data: saved,
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Upload failed',
    });
  }
});

router.get('/', async (req, res) => {
  try {
    const result = await getAllRealtime(req.user);

    if (result.count === 0) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'No realtime data found',
      });
    }

    res.status(200).json({
      status: 'success',
      code: 200,
      message: 'Data retrieved successfully',
      total: result.count,
      data: result.data,
    });
  } catch (err) {
    console.error('Error retrieving data:', err);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Failed to retrieve data',
      error: err.message,
    });
  }
});

router.get('/last', async (req, res) => {
  try {
    const data = await getLastDataRealtime(req.user);

    if (!data) {
      return res.status(404).json({ message: 'No data found' });
    }

    res.status(200).json({
      status: 'success',
      code: 200,
      message: 'Last data retrieved successfully',
      data: data,
    });
  } catch (err) {
    console.error('Error retrieving last data:', err);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Failed to retrieve last data',
      error: err.message,
    });
  }
});

router.get('/images', async (req, res) => {
  try {
    const data = await getAllRealtimeWithImage(req.user);

    if (data.length === 0) {
      return res.status(404).json({ message: 'No images found' });
    }

    res.status(200).json({
      status: 'success',
      code: 200,
      message: 'Images retrieved successfully',
      data: data,
    });
  } catch (err) {
    console.error('Error retrieving images:', err);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Failed to retrieve images',
      error: err.message,
    });
  }
});

router.get('/date/:date', async (req, res) => {
  try {
    const data = await getAllRealtimeByDate(req.params.date, req.user);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SECURE MONITORING CONTROL ENDPOINTS - Require Bearer Token + Device Ownership
router.get('/start-monitoring', secureDeviceMiddleware, async (req, res) => {
  try {
    const result = await startMonitoring(req);
    res.json({
      success: true,
      message: 'Monitoring started successfully',
      data: result,
    });
  } catch (err) {
    console.error('Error starting monitoring:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to start monitoring',
      details: err.message,
    });
  }
});

// Stop monitoring endpoint - properly authenticated (must be before /:id route)
router.get('/stop-monitoring', secureDeviceMiddleware, async (req, res) => {
  try {
    const result = await stopMonitoring(req);
    res.json({
      success: true,
      message: 'Monitoring stopped successfully',
      data: result,
    });
  } catch (err) {
    console.error('Error stopping monitoring:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to stop monitoring',
      details: err.message,
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const data = await getRealtimeById(req.params.id, req.user);
    if (!data) return res.status(404).json({ message: 'Not found' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const success = await deleteRealtimeByID(req.params.id, req.user);
    if (!success) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
