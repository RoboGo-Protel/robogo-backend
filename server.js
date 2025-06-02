const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const axios = require("axios");

const {
  startRecording,
  stopRecording,
  isRecording,
} = require("./utils/ffmpeg-utils");

const usersRoutes = require("./routes/auth/usersRoutes");
const realtimeRoutes = require("./routes/monitoring/realtimeRoutes");
const logsRoutes = require("./routes/monitoring/logsRoutes");
const imageRoutes = require("./routes/reports/imageRoutes");
const ultrasonicRoutes = require("./routes/reports/ultrasonicRoutes");
const imuRoutes = require("./routes/reports/imuRoutes");
const pathRoutes = require("./routes/reports/pathRoutes");
const { streamHandler } = require("./routes/monitoring/cameraRoutes");
const captureRoutes = require("./routes/monitoring/captureRoutes");
const galleryRoutes = require("./routes/reports/v2/galleryRoutes");
const obstacleAnalyzerRoutes = require("./routes/analyze/obstacleRoutes");
const deviceRoutes = require("./routes/others/deviceRoutes");

const app = express();
const PORT = 4000;

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN || "*",
  })
);
app.use(express.json());

app.use("/images", express.static(path.join(__dirname, "public/images")));

app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.originalUrl}`);
  next();
});

const v1 = express.Router();

v1.get("/", (req, res) => {
  res.json({
    status: "success",
    code: 200,
    message: "API is running",
  });
});

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

v1.use("/auth", usersRoutes);
v1.use("/monitoring/logs", logsRoutes);
v1.use("/reports/gallery", galleryRoutes);
v1.use("/reports/ultrasonic", ultrasonicRoutes);
v1.use("/reports/imu", imuRoutes);
v1.use("/reports/paths", pathRoutes);
v1.use("/monitoring/camera-stream", streamHandler);
v1.use("/monitoring/capture", captureRoutes);
v1.use("/monitoring/realtime", realtimeRoutes);
v1.use("/analyze/obstacle", obstacleAnalyzerRoutes);
v1.use("/others/devices", deviceRoutes);

app.use("/api/v1", v1);

app.listen(PORT, () => {
  console.log(`🎯 REST API ready at http://localhost:${PORT}/api/v1`);
});
