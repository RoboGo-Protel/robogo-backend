require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const WebSocket = require('ws');

const {
  startRecording,
  stopRecording,
  isRecording,
} = require('./utils/ffmpeg-utils');

const usersRoutes = require('./routes/auth/usersRoutes');
const realtimeRoutes = require('./routes/monitoring/realtimeRoutes');
const logsRoutes = require('./routes/monitoring/logsRoutes');
const imageRoutes = require('./routes/reports/imageRoutes');
const ultrasonicRoutes = require('./routes/reports/ultrasonicRoutes');
const imuRoutes = require('./routes/reports/imuRoutes');
const pathRoutes = require('./routes/reports/pathRoutes');
const galleryRoutes = require('./routes/reports/v2/galleryRoutes');
const obstacleAnalyzerRoutes = require('./routes/analyze/obstacleRoutes');
const deviceRoutes = require('./routes/devices/deviceRoutes');
const userRoutes = require('./routes/others/userRoutes');

const app = express();
const server = http.createServer(app);
const PORT = 4000;

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN || '*',
  }),
);
app.use(express.json());

app.use('/images', express.static(path.join(__dirname, 'public/images')));

app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.originalUrl}`);
  next();
});

const v1 = express.Router();

v1.get('/', (req, res) => {
  res.json({
    status: 'success',
    code: 200,
    message: 'API is running',
  });
});

v1.get('/capture', async (req, res) => {
  try {
    const response = await axios.get('http://localhost:3001/capture');
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to capture from stream server' });
  }
});

v1.get('/record/start', async (req, res) => {
  const started = await startRecording();
  res.json(
    started
      ? { success: true, status: 'recording started' }
      : { success: false, message: 'already recording' },
  );
});

v1.get('/record/stop', async (req, res) => {
  const filePath = await stopRecording();
  res.json(
    filePath
      ? { success: true, saved: filePath }
      : { success: false, message: 'not recording' },
  );
});

v1.get('/status', (req, res) => {
  res.json({ recording: isRecording() });
});

v1.use('/auth', usersRoutes);
v1.use('/monitoring/logs', logsRoutes);
v1.use('/reports/gallery', galleryRoutes);
v1.use('/reports/ultrasonic', ultrasonicRoutes);
v1.use('/reports/imu', imuRoutes);
v1.use('/reports/paths', pathRoutes);
v1.use('/monitoring/realtime', realtimeRoutes);
v1.use('/analyze/obstacle', obstacleAnalyzerRoutes);
v1.use('/devices', deviceRoutes);
v1.use('/others/user', userRoutes);

app.use('/api/v1', v1);

// WebSocket Server untuk ESP32-CAM
const wss = new WebSocket.Server({ server, path: '/esp' });

wss.on('connection', function connection(ws, req) {
  console.log('📡 ESP32-CAM connected from:', req.socket.remoteAddress);

  ws.on('message', function incoming(data) {
    console.log(`📷 Frame received - size: ${data.length} bytes`);

    // Broadcast frame to all connected clients (dashboard, monitoring, etc.)
    wss.clients.forEach(function each(client) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  });

  ws.on('close', () => {
    console.log('❌ ESP32-CAM disconnected');
  });

  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });

  // Send ping to keep connection alive
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    } else {
      clearInterval(pingInterval);
    }
  }, 30000); // ping every 30 seconds
});

server.listen(PORT, () => {
  console.log(`🎯 REST API ready at http://localhost:${PORT}/api/v1`);
  console.log(`📡 WebSocket Server ready at ws://localhost:${PORT}/esp`);
});
