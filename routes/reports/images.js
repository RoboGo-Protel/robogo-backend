const express = require("express");
const router = express.Router();
const multer = require("multer");

const {
  saveImage,
  getAllImages,
  getImageById,
  deleteImage,
  uploadImageToStorage,
} = require("../../firebase/image");

const upload = multer({ storage: multer.memoryStorage() });

router.post("/", upload.single("image"), async (req, res) => {
  try {
    const file = req.file;
    const { url, filename } = await uploadImageToStorage(file);

    const saved = await saveImage({
      filename: file.originalname,
      path: url,
      timestamp: new Date(),
      category: req.body.category,
      takenWith: req.body.takenWith || "ESP32-CAM",
      metadata: {
        ultrasonic: req.body.ultrasonic || 0,
        heading: req.body.heading || 0,
        distances: {
          distTotal: parseFloat(req.body.distTotal || 0),
          distX: parseFloat(req.body.distX || 0),
          distY: parseFloat(req.body.distY || 0),
        },
        velocity: {
          velTotal: parseFloat(req.body.velTotal || 0),
          velX: parseFloat(req.body.velX || 0),
          velY: parseFloat(req.body.velY || 0),
        },
        position: {
          posX: parseFloat(req.body.posX || 0),
          posY: parseFloat(req.body.posY || 0),
        },
      },
    });

    res.status(201).json(saved);
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Upload gagal" });
  }
});

router.get("/", async (req, res) => {
  const images = await getAllImages();
  res.json(images);
});

router.get("/:id", async (req, res) => {
  const image = await getImageById(req.params.id);
  if (!image) return res.status(404).json({ error: "Not found" });
  res.json(image);
});

router.delete("/:id", async (req, res) => {
  const success = await deleteImage(req.params.id);
  if (!success) return res.status(404).json({ error: "Not found" });
  res.json({ success: true });
});

module.exports = router;
