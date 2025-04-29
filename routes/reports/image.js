const express = require("express");
const router = express.Router();
const multer = require("multer");

const {
  saveImage,
  getAllImages,
  getImageById,
  getAllImagesByDate,
  deleteImageByID,
  uploadImageToStorage,
} = require("../../firebase/image");

const upload = multer({ storage: multer.memoryStorage() });

router.post("/", upload.single("image"), async (req, res) => {
  try {
    const file = req.file;

    const { imageUrl, filename, path } = await uploadImageToStorage(file);

    const obstacle = req.body.obstacle === "true";

    const saved = await saveImage({
      filename: file.originalname,
      path: path,
      imageUrl: imageUrl,
      timestamp: new Date(),
      sessionId: parseInt(req.body.sessionId) || 0,
      obstacle: obstacle,
      takenWith: req.body.takenWith || "ESP32-CAM",
      metadata: {
        ultrasonic: parseFloat(req.body.ultrasonic || 0),
        heading: parseFloat(req.body.heading || 0),
        direction: req.body.direction || "North",
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
      },
    });

    res.status(201).json({
      status: "success",
      code: 201,
      message: "Image uploaded successfully",
      data: saved,
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({
      status: "error",
      code: 500,
      message: "Upload failed",
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const images = await getAllImages();

    if (images.length === 0) {
      return res.status(204).json({
        status: "success",
        code: 204,
        message: "No images found",
        data: [],
      });
    }

    res.status(200).json({
      status: "success",
      code: 200,
      message: "Images retrieved successfully",
      data: images,
    });
  } catch (err) {
    console.error("Error retrieving images:", err);
    res.status(500).json({
      status: "error",
      code: 500,
      message: "Failed to retrieve images",
    });
  }
});

router.get("/date/:date", async (req, res) => {
  const date = req.params.date;

  const datePattern = /^\d{2}-\d{2}-\d{4}$/;
  if (!datePattern.test(date)) {
    return res.status(400).json({
      status: "error",
      code: 400,
      message: "Invalid date format. The correct format is DD-MM-YYYY.",
    });
  }

  const [day, month, year] = date.split("-").map((num) => parseInt(num, 10));

  const validDate = new Date(year, month - 1, day);

  if (
    validDate.getFullYear() !== year ||
    validDate.getMonth() !== month - 1 ||
    validDate.getDate() !== day
  ) {
    return res.status(400).json({
      status: "error",
      code: 400,
      message:
        "Invalid date. Please provide a valid date (e.g., no 31st February).",
    });
  }

  const startOfDay = new Date(validDate.setHours(0, 0, 0, 0));
  const endOfDay = new Date(validDate.setHours(23, 59, 59, 999));

  try {
    const images = await getAllImagesByDate(startOfDay, endOfDay);

    if (images.length === 0) {
      return res.status(204).json({
        status: "success",
        code: 204,
        message: "No images found for the given date",
        data: [],
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
      status: "success",
      code: 200,
      message: "Images for the given date retrieved successfully",
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
      status: "error",
      code: 500,
      message: "An error occurred while retrieving the images.",
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const image = await getImageById(req.params.id);

    if (!image) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Image not found",
      });
    }

    res.status(200).json({
      status: "success",
      code: 200,
      message: "Image retrieved successfully",
      data: image,
    });
  } catch (err) {
    console.error("Error retrieving image:", err);
    res.status(500).json({
      status: "error",
      code: 500,
      message: "Failed to retrieve image",
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const success = await deleteImageByID(req.params.id);

    if (!success) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Image not found or failed to delete",
      });
    }

    res.status(200).json({
      status: "success",
      code: 200,
      message: "Image deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting image:", err);
    res.status(500).json({
      status: "error",
      code: 500,
      message: "Failed to delete image",
    });
  }
});

module.exports = router;
