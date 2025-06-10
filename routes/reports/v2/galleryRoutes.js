const express = require("express");
const router = express.Router();
const deviceNameMiddleware = require('../../../middleware/userDeviceMiddleware');

// Apply device name middleware to all routes
router.use(deviceNameMiddleware);

const {
  getAllWithImage,
  getImageById,
  getAllImagesByDate,
  downloadImageByID,
  deleteImageByID,
} = require('../../../controllers/reports/v2/galleryController');

router.get('/download/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const image = await downloadImageByID(id, req.user);

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
      message: 'Image downloaded successfully',
      data: image,
    });
  } catch (err) {
    console.error('Error downloading image:', err);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Failed to download image',
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
    const images = await getAllImagesByDate(dateStr, req.user);

    if (images.length === 0) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'No images found for the given date',
      });
    }

    res.status(200).json({
      status: 'success',
      code: 200,
      message: 'Images for the given date retrieved successfully',
      data: images,
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
  const { id } = req.params;

  try {
    const image = await getImageById(id, req.user);

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

router.get('/', async (req, res) => {
  try {
    const images = await getAllWithImage(req.user);

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

router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const deleted = await deleteImageByID(id, req.user);

    if (!deleted) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Image not found',
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
