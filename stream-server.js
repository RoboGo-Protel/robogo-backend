const express = require("express");
const { WebSocketServer } = require("ws");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const http = require("http");
const cors = require("cors");
const { startRecording, stopRecording } = require("./utils/ffmpeg-utils");

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: "*" }));
let latestFrame = null;

const wss = new WebSocketServer({ noServer: true });
let streamInfo = { resolution: "N/A", fps: "N/A", device: "N/A" };
let streamingFFmpeg = null;
let connectedWS = null;

function startStreaming(ws) {
  if (streamingFFmpeg) return;
  connectedWS = ws;
  streamingFFmpeg = spawn("ffmpeg", [
    "-f",
    "dshow",
    "-i",
    "video=HD User Facing",
    "-vf",
    "scale=640:360",
    "-pix_fmt",
    "yuvj422p",
    "-f",
    "image2pipe",
    "-vcodec",
    "mjpeg",
    "-q:v",
    "5",
    "pipe:1",
  ]);

  streamingFFmpeg.stdout.on("data", (data) => {
    const base64 = `data:image/jpeg;base64,${data.toString("base64")}`;
    latestFrame = base64;
    const message = JSON.stringify({
      type: "frame",
      data: base64,
      meta: streamInfo,
    });
    if (ws.readyState === ws.OPEN) {
      try {
        ws.send(message);
      } catch (err) {
        console.error("❌ WS Send error:", err);
      }
    }
  });

  streamingFFmpeg.stderr.on("data", (data) => {
    const msg = data.toString();
    const match = msg.match(/(\d{3,4})x(\d{3,4}),\s+(\d+)\s+fps/);
    if (match) {
      const [, width, height, fps] = match;
      streamInfo = {
        resolution: `${width}x${height}`,
        fps: `${fps} FPS`,
        device: "HD User Facing",
      };
    }
  });

  streamingFFmpeg.on("close", () => {
    console.log("🧹 FFmpeg streaming process ended");
    streamingFFmpeg = null;
  });

  console.log("📡 Streaming started");
}

function stopStreaming() {
  if (streamingFFmpeg) {
    streamingFFmpeg.kill("SIGINT");
    streamingFFmpeg = null;
    console.log("🛑 Streaming stopped");
  }
}

server.on("upgrade", (request, socket, head) => {
  if (request.url === "/ws") {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  } else {
    socket.destroy();
  }
});

wss.on("connection", (ws) => {
  console.log("🔌 Client connected");
  startStreaming(ws);

  ws.on("close", () => {
    console.log("❌ Client disconnected");
    stopStreaming();
  });
});

app.get("/capture", (req, res) => {
  if (!latestFrame) {
    return res
      .status(500)
      .json({ success: false, message: "No frame available" });
  }

  const base64Data = latestFrame.replace(/^data:image\/jpeg;base64,/, "");
  const filename = `snapshot_${Date.now()}.jpg`;
  const filePath = path.join(__dirname, "public", "images", filename);

  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  fs.writeFile(filePath, base64Data, "base64", (err) => {
    if (err) {
      console.error("❌ Save error:", err);
      return res.status(500).json({ success: false });
    }
    console.log("📸 Saved:", filename);
    res.json({ success: true, path: `/public/images/${filename}` });
  });
});

app.get("/info", (req, res) => {
  res.json({
    resolution: streamInfo.resolution,
    fps: streamInfo.fps,
    device: streamInfo.device,
  });
});

app.get("/record/start", async (req, res) => {
  try {
    stopStreaming();
    const started = await startRecording();
    res.json({ success: started });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/record/stop", async (req, res) => {
  try {
    const savedPath = await stopRecording();
    if (connectedWS) startStreaming(connectedWS);
    res.json({ success: !!savedPath, saved: savedPath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

server.listen(3001, () => {
  console.log("📡 Streaming + Capture server running at http://localhost:3001");
});
