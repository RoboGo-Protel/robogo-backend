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

  const validCommands = [
    'flash_dim',
    'flash_bright',
    'flash_low',
    'flash_medium',
    'flash_on',
    'flash_off',
    'start',
    'stop',
    'stats',
    'fast',
    'normal',
    'slow',
  ];
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

v1.post('/esp32/flash/medium', (req, res) => {
  let commandSent = false;
  esp32Connections.forEach(function each(esp32Client) {
    if (esp32Client.readyState === WebSocket.OPEN) {
      esp32Client.send('flash_medium');
      commandSent = true;
    }
  });
  res.json({ success: commandSent, command: 'flash_medium' });
});

v1.post('/esp32/flash/low', (req, res) => {
  let commandSent = false;
  esp32Connections.forEach(function each(esp32Client) {
    if (esp32Client.readyState === WebSocket.OPEN) {
      esp32Client.send('flash_low');
      commandSent = true;
    }
  });
  res.json({ success: commandSent, command: 'flash_low' });
});

v1.post('/esp32/flash/on', (req, res) => {
  let commandSent = false;
  esp32Connections.forEach(function each(esp32Client) {
    if (esp32Client.readyState === WebSocket.OPEN) {
      esp32Client.send('flash_on');
      commandSent = true;
    }
  });
  res.json({ success: commandSent, command: 'flash_on' });
});

v1.post('/esp32/flash/off', (req, res) => {
  let commandSent = false;
  esp32Connections.forEach(function each(esp32Client) {
    if (esp32Client.readyState === WebSocket.OPEN) {
      esp32Client.send('flash_off');
      commandSent = true;
    }
  });
  res.json({ success: commandSent, command: 'flash_off' });
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

v1.post('/esp32/fps/fast', (req, res) => {
  let commandSent = false;
  esp32Connections.forEach(function each(esp32Client) {
    if (esp32Client.readyState === WebSocket.OPEN) {
      esp32Client.send('fast');
      commandSent = true;
    }
  });
  res.json({ success: commandSent, command: 'fast', fps: '~20 FPS' });
});

v1.post('/esp32/fps/normal', (req, res) => {
  let commandSent = false;
  esp32Connections.forEach(function each(esp32Client) {
    if (esp32Client.readyState === WebSocket.OPEN) {
      esp32Client.send('normal');
      commandSent = true;
    }
  });
  res.json({ success: commandSent, command: 'normal', fps: '~10 FPS' });
});

v1.post('/esp32/fps/slow', (req, res) => {
  let commandSent = false;
  esp32Connections.forEach(function each(esp32Client) {
    if (esp32Client.readyState === WebSocket.OPEN) {
      esp32Client.send('slow');
      commandSent = true;
    }
  });
  res.json({ success: commandSent, command: 'slow', fps: '~5 FPS' });
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
    connectedClients: dashboardConnections.size,
  });
});

v1.get('/esp32/status', (req, res) => {
  res.json({
    esp32Connected: esp32Connections.size > 0,
    esp32Count: esp32Connections.size,
    dashboardCount: dashboardConnections.size,
    totalConnections: esp32Connections.size + dashboardConnections.size,
    legacyMode: enableLegacyMode,
    allConnections: wss.clients.size,
  });
});

// Debug and control endpoints
v1.post('/esp32/legacy-mode', (req, res) => {
  const { enabled } = req.body;
  enableLegacyMode = enabled !== false; // default to true
  res.json({ legacyMode: enableLegacyMode, message: 'Legacy mode updated' });
});

v1.get('/esp32/debug', (req, res) => {
  const connections = [];
  wss.clients.forEach((client, index) => {
    connections.push({
      id: index,
      deviceType: client.deviceType || 'unknown',
      readyState: client.readyState === WebSocket.OPEN ? 'OPEN' : 'CLOSED',
      isAlive: client.readyState === WebSocket.OPEN,
    });
  });

  res.json({
    legacyMode: enableLegacyMode,
    totalClients: wss.clients.size,
    esp32Connections: esp32Connections.size,
    dashboardConnections: dashboardConnections.size,
    connections,
    broadcastMode: enableLegacyMode ? 'ALL_CLIENTS' : 'DEVICE_SPECIFIC',
    status: esp32Connections.size > 0 ? 'ESP32_CONNECTED' : 'NO_ESP32',
  });
});

// Simple endpoint to test WebSocket broadcasting
v1.get('/esp32/test-broadcast', (req, res) => {
  const testMessage = `🧪 Test broadcast at ${new Date().toISOString()}`;
  let sent = 0;

  if (enableLegacyMode) {
    // Broadcast to all clients
    wss.clients.forEach(function each(client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(testMessage);
        sent++;
      }
    });
  } else {
    // Send only to dashboard clients
    dashboardConnections.forEach(function each(client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(testMessage);
        sent++;
      }
    });
  }

  res.json({
    message: 'Test broadcast sent',
    clientsReached: sent,
    testMessage,
    legacyMode: enableLegacyMode,
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

// Backward compatibility: broadcast to all clients if device detection fails
let enableLegacyMode = true; // Set to false to use strict device separation

wss.on('connection', function connection(ws, req) {
  console.log('📡 New WebSocket connection from:', req.socket.remoteAddress);
  console.log('📋 Headers:', {
    'user-agent': req.headers['user-agent'],
    origin: req.headers['origin'],
  });

  // Simplified ESP32 detection - assume ESP32 if no typical browser headers
  const userAgent = req.headers['user-agent'] || '';
  const origin = req.headers['origin'] || '';

  // More conservative detection - prioritize backward compatibility
  const isBrowser =
    userAgent.includes('Mozilla') ||
    userAgent.includes('Chrome') ||
    userAgent.includes('Safari') ||
    userAgent.includes('Firefox') ||
    userAgent.includes('Edge') ||
    origin; // Browsers usually send Origin header

  if (!isBrowser) {
    // Likely ESP32-CAM or other device
    esp32Connections.add(ws);
    console.log('📡 ESP32-CAM connected (auto-detected)');
    ws.deviceType = 'esp32';
  } else {
    // Likely dashboard/browser client
    dashboardConnections.add(ws);
    console.log('📱 Dashboard client connected');
    ws.deviceType = 'dashboard';
  }
  ws.on('message', function incoming(data) {
    // Detect data type
    const isBinaryData = data instanceof Buffer && data.length > 1000;

    if (isBinaryData) {
      // This is video frame data from ESP32-CAM
      if (ws.deviceType === 'dashboard') {
        // Auto-correct device type if we detected wrong initially
        dashboardConnections.delete(ws);
        esp32Connections.add(ws);
        ws.deviceType = 'esp32';
        console.log(
          '📡 Device type corrected to ESP32-CAM based on binary data',
        );
      }

      console.log(`📷 Frame received - size: ${data.length} bytes`);

      // In legacy mode, broadcast to ALL other clients (backward compatibility)
      if (enableLegacyMode) {
        wss.clients.forEach(function each(client) {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(data);
          }
        });
      } else {
        // Strict mode: only send to dashboard clients
        dashboardConnections.forEach(function each(client) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(data);
          }
        });
      }
    } else {
      // Text command or response
      const message = data.toString();

      if (ws.deviceType === 'esp32') {
        // Response from ESP32-CAM (like stats)
        console.log(`📡 ESP32-CAM response: ${message}`);

        // Forward to dashboard clients
        if (enableLegacyMode) {
          // Legacy: send to all other clients
          wss.clients.forEach(function each(client) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(message);
            }
          });
        } else {
          // Strict: only to dashboard clients
          dashboardConnections.forEach(function each(client) {
            if (client.readyState === WebSocket.OPEN) {
              client.send(
                JSON.stringify({
                  type: 'esp32_response',
                  data: message,
                  timestamp: Date.now(),
                }),
              );
            }
          });
        }
      } else {
        // Command from dashboard client
        console.log(`📱 Command from dashboard: ${message}`);

        // Forward to ESP32-CAM devices
        esp32Connections.forEach(function each(esp32Client) {
          if (esp32Client.readyState === WebSocket.OPEN) {
            esp32Client.send(message);
            console.log(`📡 Command sent to ESP32-CAM: ${message}`);
          }
        });
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
  console.log(
    `🔐 ESP32-CAM should connect to: ws://api.robogo.website:${PORT}/esp`,
  );
  console.log(`🔐 With Cloudflare: wss://api.robogo.website/esp (auto SSL)`);
  console.log(
    `🔄 Legacy mode: ${
      enableLegacyMode
        ? 'ENABLED (broadcast to all)'
        : 'DISABLED (device-specific)'
    }`,
  );
  console.log(`🎮 ESP32-CAM Control endpoints:`);
  console.log(`   📡 General:`);
  console.log(`     POST /api/v1/esp32/command - Send custom command`);
  console.log(`     GET  /api/v1/esp32/stats - Get ESP32 stats`);
  console.log(`     GET  /api/v1/esp32/status - Get connection status`);
  console.log(`   💡 Flash Control:`);
  console.log(`     POST /api/v1/esp32/flash/bright - Max brightness (255)`);
  console.log(`     POST /api/v1/esp32/flash/medium - Medium (128)`);
  console.log(`     POST /api/v1/esp32/flash/low - Low (64)`);
  console.log(`     POST /api/v1/esp32/flash/dim - Dim (0)`);
  console.log(`     POST /api/v1/esp32/flash/on - Enable flash`);
  console.log(`     POST /api/v1/esp32/flash/off - Disable flash`);
  console.log(`   📹 Stream Control:`);
  console.log(`     POST /api/v1/esp32/stream/start - Start streaming`);
  console.log(`     POST /api/v1/esp32/stream/stop - Stop streaming`);
  console.log(`   🚀 FPS Control:`);
  console.log(`     POST /api/v1/esp32/fps/fast - ~20 FPS`);
  console.log(`     POST /api/v1/esp32/fps/normal - ~10 FPS`);
  console.log(`     POST /api/v1/esp32/fps/slow - ~5 FPS`);
  console.log(`   🔧 Debug & Testing:`);
  console.log(`     GET  /api/v1/esp32/debug - Debug connection info`);
  console.log(
    `     GET  /api/v1/esp32/test-broadcast - Test WebSocket broadcast`,
  );
  console.log(`     POST /api/v1/esp32/legacy-mode - Toggle legacy mode`);
  console.log(`\n🚀 Ready to receive ESP32-CAM connections!`);
});
