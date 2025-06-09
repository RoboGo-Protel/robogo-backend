const express = require("express");
const router = express.Router();
const multer = require("multer");

const {
  saveImage,
  getAllImages,
  getAllImagesWithImage,
  getImageById,
  getAllImagesByDate,
  deleteImageByID,
  uploadImageToStorage,
} = require('../../controllers/reports/userScopedImageController');

const userDeviceMiddleware = require('../../middleware/userDeviceMiddleware');

const upload = multer({ storage: multer.memoryStorage() });

// Apply user/device middleware to all routes
router.use(userDeviceMiddleware);

router.post('/metadata', async (req, res) => {
  try {
    // Set the image data in the request body for the controller
    req.body = {
      filename: null,
      path: null,
      imageUrl: null,
      timestamp: new Date(),
      sessionId: parseInt(req.body.sessionId) || 0,
      obstacle: req.body.obstacle === 'true',
      takenWith: req.body.takenWith || 'ESP32-CAM',
      metadata: {
        ultrasonic: parseFloat(req.body.ultrasonic || 0),
        heading: parseFloat(req.body.heading || 0),
        direction: req.body.direction || 'North',
        accelerationMagnitude: parseFloat(req.body.accelerationMagnitude || 0),
        rotationRate: parseFloat(req.body.rotationRate || 0),
        distanceTraveled: parseFloat(req.body.distanceTraveled || 0),
        linearAcceleration: parseFloat(req.body.linearAcceleration || 0),
        distances: {
          distTotal: parseFloat(req.body.distTotal || 0),
          distX: parseFloat(req.body.distX || 0),
          distY: parseFloat(req.body.distY || 0),
        },
        velocity: {
          velocity: parseFloat(req.body.velocity || 0),
          velocityX: parseFloat(req.body.velocityX || 0),
          velocityY: parseFloat(req.body.velocityY || 0),
        },
        magnetometer: {
          magnetometerX: parseFloat(req.body.magnetometerX || 0),
          magnetometerY: parseFloat(req.body.magnetometerY || 0),
          magnetometerZ: parseFloat(req.body.magnetometerZ || 0),
        },
        position: {
          positionX: parseFloat(req.body.positionX || 0),
          positionY: parseFloat(req.body.positionY || 0),
        },
        pitch: parseFloat(req.body.pitch || 0),
        roll: parseFloat(req.body.roll || 0),
        yaw: parseFloat(req.body.yaw || 0),
      },
    };

    const saved = await saveImage(req);

    res.status(201).json({
      status: 'success',
      code: 201,
      message: 'Metadata saved successfully',
      data: saved,
    });
  } catch (err) {
    console.error('Metadata save error:', err);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Metadata save failed',
    });
  }
});

router.post('/image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'No image file uploaded',
      });
    }

    const { imageUrl, filename, path } = await uploadImageToStorage(req.file);

    // Set the image data in the request body for the controller
    req.body = {
      filename: req.file.originalname,
      path: path,
      imageUrl: imageUrl,
      timestamp: new Date(),
    };

    const saved = await saveImage(req);

    res.status(201).json({
      status: 'success',
      code: 201,
      message: 'Image uploaded successfully',
      data: saved,
    });
  } catch (err) {
    console.error('Image upload error:', err);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Image upload failed',
    });
  }
});

router.post('/', upload.single('image'), async (req, res) => {
  try {
    const file = req.file;

    const { imageUrl, filename, path } = await uploadImageToStorage(file);

    const obstacle = req.body.obstacle === 'true';

    // Set the image data in the request body for the controller
    req.body = {
      filename: file.originalname,
      path: path,
      imageUrl: imageUrl,
      timestamp: new Date(),
      sessionId: parseInt(req.body.sessionId) || 0,
      obstacle: obstacle,
      takenWith: req.body.takenWith || 'ESP32-CAM',
      metadata: {
        ultrasonic: parseFloat(req.body.ultrasonic || 0),
        heading: parseFloat(req.body.heading || 0),
        direction: req.body.direction || 'North',
        accelerationMagnitude: parseFloat(req.body.accelerationMagnitude || 0),
        rotationRate: parseFloat(req.body.rotationRate || 0),
        distanceTraveled: parseFloat(req.body.distanceTraveled || 0),
        linearAcceleration: parseFloat(req.body.linearAcceleration || 0),
        distances: {
          distTotal: parseFloat(req.body.distTotal || 0),
          distX: parseFloat(req.body.distX || 0),
          distY: parseFloat(req.body.distY || 0),
        },
        velocity: {
          velocity: parseFloat(req.body.velocity || 0),
          velocityX: parseFloat(req.body.velocityX || 0),
          velocityY: parseFloat(req.body.velocityY || 0),
        },
        magnetometer: {
          magnetometerX: parseFloat(req.body.magnetometerX || 0),
          magnetometerY: parseFloat(req.body.magnetometerY || 0),
          magnetometerZ: parseFloat(req.body.magnetometerZ || 0),
        },
        position: {
          positionX: parseFloat(req.body.positionX || 0),
          positionY: parseFloat(req.body.positionY || 0),
        },
        pitch: parseFloat(req.body.pitch || 0),
        roll: parseFloat(req.body.roll || 0),
        yaw: parseFloat(req.body.yaw || 0),
      },
    };

    const saved = await saveImage(req);
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Request body cannot be empty',
      });
    }
    if (!saved) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Failed to save image',
      });
    }
    res.status(201).json({
      status: 'success',
      code: 201,
      message: 'Image uploaded successfully',
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
    const images = await getAllImages(req);

    if (images.length === 0) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'No images found',
      });
    }

    res.status(200).json({
      status: 'success',
      code: 200,
      message: 'Images retrieved successfully',
      data: images,
    });
  } catch (err) {
    console.error('Error retrieving images:', err);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Failed to retrieve images',
    });
  }
});

router.get('/available-images', async (req, res) => {
  try {
    const images = await getAllImagesWithImage(req);

    if (images.length === 0) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'No images found',
      });
    }

    res.status(200).json({
      status: 'success',
      code: 200,
      message: 'Images retrieved successfully',
      data: images,
    });
  } catch (err) {
    console.error('Error retrieving images:', err);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Failed to retrieve images',
    });
  }
});

router.get('/date/:date', async (req, res) => {
  const dateStr = req.params.date;

  if (!dateStr) {
    return res.status(400).json({
      status: 'error',
      code: 400,
      message: 'Date is required',
    });
  }

  const [year, month, day] = dateStr.split('-').map((num) => parseInt(num, 10));
  const validDate = new Date(dateStr);
  if (isNaN(validDate)) {
    return res.status(400).json({
      status: 'error',
      code: 400,
      message: 'Invalid date. Expected format: yyyy-mm-dd',
    });
  }

  if (
    validDate.getFullYear() !== year ||
    validDate.getMonth() !== month - 1 ||
    validDate.getDate() !== day
  ) {
    return res.status(400).json({
      status: 'error',
      code: 400,
      message:
        'Invalid date. Please provide a valid date (e.g., no 31st February).',
    });
  }

  const startOfDay = new Date(validDate.setHours(0, 0, 0, 0));
  const endOfDay = new Date(validDate.setHours(23, 59, 59, 999));
  try {
    const images = await getAllImagesByDate(req);

    if (images.length === 0) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'No images found for the given date',
        meta: {
          pagination: {
            current_page: 1,
            total_pages: 1,
            total_items: 0,
          },
        },
      });
    }

    res.status(200).json({
      status: 'success',
      code: 200,
      message: 'Images for the given date retrieved successfully',
      data: images,
      meta: {
        pagination: {
          current_page: 1,
          total_pages: 1,
          total_items: images.length,
        },
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: 'An error occurred while retrieving the images.',
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const image = await getImageById(req);

    if (!image) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Image not found',
      });
    }

    res.status(200).json({
      status: 'success',
      code: 200,
      message: 'Image retrieved successfully',
      data: image,
    });
  } catch (err) {
    console.error('Error retrieving image:', err);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Failed to retrieve image',
    });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const success = await deleteImageByID(req);

    if (!success) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Image not found or failed to delete',
      });
    }

    res.status(200).json({
      status: 'success',
      code: 200,
      message: 'Image deleted successfully',
    });
  } catch (err) {
    console.error('Error deleting image:', err);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Failed to delete image',
    });
  }
});

module.exports = router;
