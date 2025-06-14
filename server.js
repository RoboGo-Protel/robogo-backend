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

// ESP32-CAM Control Endpoints
v1.post('/esp32/command', (req, res) => {
  const { command } = req.body;
  
  if (!command) {
    return res.status(400).json({ error: 'Command is required' });
  }

  const validCommands = ['flash_dim', 'flash_bright', 'start', 'stop', 'stats'];
  if (!validCommands.includes(command)) {
    return res.status(400).json({ error: 'Invalid command', validCommands });
  }

  let commandSent = false;
  esp32Connections.forEach(function each(esp32Client) {
    if (esp32Client.readyState === WebSocket.OPEN) {
      esp32Client.send(command);
      commandSent = true;
      console.log(`📡 Command sent to ESP32-CAM: ${command}`);
    }
  });

  if (commandSent) {
    res.json({ success: true, command, message: 'Command sent to ESP32-CAM' });
  } else {
    res.status(503).json({ error: 'No ESP32-CAM connected' });
  }
});

// Individual command endpoints for convenience
v1.post('/esp32/flash/dim', (req, res) => {
  let commandSent = false;
  esp32Connections.forEach(function each(esp32Client) {
    if (esp32Client.readyState === WebSocket.OPEN) {
      esp32Client.send('flash_dim');
      commandSent = true;
    }
  });
  res.json({ success: commandSent, command: 'flash_dim' });
});

v1.post('/esp32/flash/bright', (req, res) => {
  let commandSent = false;
  esp32Connections.forEach(function each(esp32Client) {
    if (esp32Client.readyState === WebSocket.OPEN) {
      esp32Client.send('flash_bright');
      commandSent = true;
    }
  });
  res.json({ success: commandSent, command: 'flash_bright' });
});

v1.post('/esp32/stream/start', (req, res) => {
  let commandSent = false;
  esp32Connections.forEach(function each(esp32Client) {
    if (esp32Client.readyState === WebSocket.OPEN) {
      esp32Client.send('start');
      commandSent = true;
    }
  });
  res.json({ success: commandSent, command: 'start' });
});

v1.post('/esp32/stream/stop', (req, res) => {
  let commandSent = false;
  esp32Connections.forEach(function each(esp32Client) {
    if (esp32Client.readyState === WebSocket.OPEN) {
      esp32Client.send('stop');
      commandSent = true;
    }
  });
  res.json({ success: commandSent, command: 'stop' });
});

v1.get('/esp32/stats', (req, res) => {
  let commandSent = false;
  esp32Connections.forEach(function each(esp32Client) {
    if (esp32Client.readyState === WebSocket.OPEN) {
      esp32Client.send('stats');
      commandSent = true;
    }
  });
  res.json({ 
    success: commandSent, 
    command: 'stats',
    connectedDevices: esp32Connections.size,
    connectedClients: dashboardConnections.size
  });
});

v1.get('/esp32/status', (req, res) => {
  res.json({
    esp32Connected: esp32Connections.size > 0,
    esp32Count: esp32Connections.size,
    dashboardCount: dashboardConnections.size,
    totalConnections: esp32Connections.size + dashboardConnections.size
  });
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

// Store ESP32-CAM and dashboard client connections separately
const esp32Connections = new Set();
const dashboardConnections = new Set();

wss.on('connection', function connection(ws, req) {
  console.log('📡 New WebSocket connection from:', req.socket.remoteAddress);
  
  // Check if this is ESP32-CAM or dashboard client based on User-Agent or custom header
  const userAgent = req.headers['user-agent'] || '';
  const isESP32 = userAgent.includes('ESP32') || req.headers['x-device-type'] === 'esp32';
  
  if (isESP32) {
    esp32Connections.add(ws);
    console.log('📡 ESP32-CAM connected');
    ws.deviceType = 'esp32';
  } else {
    dashboardConnections.add(ws);
    console.log('📱 Dashboard client connected');
    ws.deviceType = 'dashboard';
  }

  ws.on('message', function incoming(data) {
    if (ws.deviceType === 'esp32') {
      // Frame data from ESP32-CAM
      console.log(`📷 Frame received - size: ${data.length} bytes`);
      
      // Broadcast frame to dashboard clients only
      dashboardConnections.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(data);
        }
      });
    } else {
      // Commands from dashboard clients
      try {
        const message = data.toString();
        console.log(`📱 Command received from dashboard: ${message}`);
        
        // Forward commands to ESP32-CAM
        esp32Connections.forEach(function each(esp32Client) {
          if (esp32Client.readyState === WebSocket.OPEN) {
            esp32Client.send(message);
            console.log(`📡 Command sent to ESP32-CAM: ${message}`);
          }
        });
      } catch (error) {
        console.error('❌ Error processing dashboard message:', error);
      }
    }
  });

  ws.on('close', () => {
    if (ws.deviceType === 'esp32') {
      esp32Connections.delete(ws);
      console.log('❌ ESP32-CAM disconnected');
    } else {
      dashboardConnections.delete(ws);
      console.log('❌ Dashboard client disconnected');
    }
  });

  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
    if (ws.deviceType === 'esp32') {
      esp32Connections.delete(ws);
    } else {
      dashboardConnections.delete(ws);
    }
  });

  // Send ping to keep connection alive
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    } else {
      clearInterval(pingInterval);
      if (ws.deviceType === 'esp32') {
        esp32Connections.delete(ws);
      } else {
        dashboardConnections.delete(ws);
      }
    }
  }, 30000); // ping every 30 seconds
});

server.listen(PORT, () => {
  console.log(`🎯 REST API ready at http://localhost:${PORT}/api/v1`);
  console.log(`📡 WebSocket Server ready at ws://localhost:${PORT}/esp`);
  console.log(`🎮 ESP32-CAM Control endpoints:`);
  console.log(`   POST /api/v1/esp32/command - Send custom command`);
  console.log(`   POST /api/v1/esp32/flash/dim - Set flash to dim`);
  console.log(`   POST /api/v1/esp32/flash/bright - Set flash to bright`);
  console.log(`   POST /api/v1/esp32/stream/start - Start streaming`);
  console.log(`   POST /api/v1/esp32/stream/stop - Stop streaming`);
  console.log(`   GET  /api/v1/esp32/stats - Get ESP32 stats`);
  console.log(`   GET  /api/v1/esp32/status - Get connection status`);
});
