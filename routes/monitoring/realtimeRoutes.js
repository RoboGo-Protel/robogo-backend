const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer();

const {
  restructureRealtimeData,
  saveRealtime,
  getAllRealtime,
  getAllRealtimeWithImage,
  getAllRealtimeIncludingMetadata,
  getRealtimeById,
  getAllRealtimeByDate,
  deleteRealtimeByID,
  uploadImageToStorage,
  getLastDataRealtime,
  startMonitoring,
  stopMonitoring,
} = require("../../controllers/monitoring/rtdb/newRealtimeController");

router.post("/", upload.single("image"), async (req, res) => {
  try {
    const file = req.file;
    const obstacle = req.body.obstacle === "true";
    const takenWith = req.body.takenWith || null;

    const metadataKeys = [
      "ultrasonic",
      "heading",
      "direction",
      "accelerationMagnitude",
      "rotationRate",
      "distanceTraveled",
      "linearAcceleration",
      "distTotal",
      "distX",
      "distY",
      "velocity",
      "velocityX",
      "velocityY",
      "magnetometerX",
      "magnetometerY",
      "magnetometerZ",
      "positionX",
      "positionY",
      "pitch",
      "roll",
      "yaw",
    ];

    let metadata = null;
    const hasMetadata = metadataKeys.some((key) => req.body[key] !== undefined);

    if (hasMetadata) {
      metadata = {
        ultrasonic: parseFloat(req.body.ultrasonic) || 0,
        heading: parseFloat(req.body.heading) || 0,
        direction: req.body.direction || "Unknown",
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

    const saved = await saveRealtime({
      filename,
      path,
      imageUrl,
      timestamp: new Date(),
      obstacle,
      takenWith,
      ...(metadata ? { metadata } : {}),
    });

    let message = "Metadata saved successfully";
    if (file && metadata) message = "Image and metadata saved successfully";
    else if (file && !metadata) message = "Image saved successfully";

    res.status(201).json({
      status: "success",
      code: 201,
      message,
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
    const result = await getAllRealtime();

    if (result.count === 0) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "No realtime data found",
      });
    }

    res.status(200).json({
      status: "success",
      code: 200,
      message: "Data retrieved successfully",
      total: result.count,
      data: result.data,
    });
  } catch (err) {
    console.error("Error retrieving data:", err);
    res.status(500).json({
      status: "error",
      code: 500,
      message: "Failed to retrieve data",
      error: err.message,
    });
  }
});

router.get("/last", async (req, res) => {
  try {
    const data = await getLastDataRealtime();

    if (!data) {
      return res.status(404).json({ message: "No data found" });
    }

    res.status(200).json({
      status: "success",
      code: 200,
      message: "Last data retrieved successfully",
      data: data,
    });
  } catch (err) {
    console.error("Error retrieving last data:", err);
    res.status(500).json({
      status: "error",
      code: 500,
      message: "Failed to retrieve last data",
      error: err.message,
    });
  }
});

router.get("/images", async (req, res) => {
  try {
    const data = await getAllRealtimeWithImage();

    if (data.length === 0) {
      return res.status(404).json({ message: "No images found" });
    }

    res.status(200).json({
      status: "success",
      code: 200,
      message: "Images retrieved successfully",
      data: data,
    });
  } catch (err) {
    console.error("Error retrieving images:", err);
    res.status(500).json({
      status: "error",
      code: 500,
      message: "Failed to retrieve images",
      error: err.message,
    });
  }
});

router.get("/metadatas", async (req, res) => {
  try {
    const data = await getAllRealtimeIncludingMetadata();

    if (data.length === 0) {
      return res.status(404).json({ message: "No metadata found" });
    }

    res.status(200).json({
      status: "success",
      code: 200,
      message: "Metadata retrieved successfully",
      data: data,
    });
  } catch (err) {
    console.error("Error retrieving metadata:", err);
    res.status(500).json({
      status: "error",
      code: 500,
      message: "Failed to retrieve metadata",
      error: err.message,
    });
  }
});

router.get("/restructure", async (req, res) => {
  try {
    const data = await restructureRealtimeData();

    if (data.length === 0) {
      return res.status(404).json({ message: "No data found" });
    }

    res.status(200).json({
      status: "success",
      code: 200,
      message: "Data restructured successfully",
      data: data,
    });
  } catch (err) {
    console.error("Error restructuring data:", err);
    res.status(500).json({
      status: "error",
      code: 500,
      message: "Failed to restructure data",
      error: err.message,
    });
  }
});

router.get("/date/:date", async (req, res) => {
  try {
    const data = await getAllRealtimeByDate(req.params.date);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/start-monitoring", async (req, res) => {
  try {
    const result = await startMonitoring();
    res.status(200).json(result);
  } catch (err) {
    console.error("Error starting monitoring:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/stop-monitoring", async (req, res) => {
  try {
    const result = await stopMonitoring();
    if (!result) {
      return res
        .status(404)
        .json({ message: "No active monitoring session found" });
    }
    res.status(200).json(result);
  } catch (err) {
    console.error("Stop monitoring error:", err);
    res.status(500).json({ error: "Failed to stop monitoring" });
  }
});


router.get("/:id", async (req, res) => {
  try {
    const data = await getRealtimeById(req.params.id);
    if (!data) return res.status(404).json({ message: "Not found" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const success = await deleteRealtimeByID(req.params.id);
    if (!success) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
