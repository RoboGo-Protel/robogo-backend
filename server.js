// 🔧 Core modules
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const axios = require("axios");

// 🎥 Recording utility
const {
  startRecording,
  stopRecording,
  isRecording,
} = require("./utils/ffmpeg-utils");

// 📦 Route modules
const imageRoutes = require("./routes/reports/images");
const ultrasonicRoutes = require("./routes/reports/ultrasonic");
const imuRoutes = require("./routes/reports/imu");
const pathRoutes = require("./routes/reports/path");

const app = express();
const PORT = 4000;

// 🌐 Global Middleware
app.use(cors());
app.use(express.json());

// 📂 Public folder for image access
app.use("/images", express.static(path.join(__dirname, "public/images")));

// 🧭 Logging Middleware
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.originalUrl}`);
  next();
});

// 🚏 Define API routes under /api/v1
const v1 = express.Router();

// 🎯 System control & capture routes
v1.get("/capture", async (req, res) => {
  try {
    const response = await axios.get("http://localhost:3001/capture");
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: "Failed to capture from stream server" });
  }
});

v1.get("/record/start", async (req, res) => {
  const started = await startRecording();
  res.json(
    started
      ? { success: true, status: "recording started" }
      : { success: false, message: "already recording" }
  );
});

v1.get("/record/stop", async (req, res) => {
  const filePath = await stopRecording();
  res.json(
    filePath
      ? { success: true, saved: filePath }
      : { success: false, message: "not recording" }
  );
});

v1.get("/status", (req, res) => {
  res.json({ recording: isRecording() });
});

// 📂 Reports
v1.use("/reports/gallery/images", imageRoutes);
v1.use("/reports/ultrasonic", ultrasonicRoutes);
v1.use("/reports/imu", imuRoutes);
v1.use("/reports/paths", pathRoutes);

// ⛳ Prefix all routes under /api/v1
app.use("/api/v1", v1);

// 🚀 Start server
app.listen(PORT, () => {
  console.log(`🎯 REST API ready at http://localhost:${PORT}/api/v1`);
});
