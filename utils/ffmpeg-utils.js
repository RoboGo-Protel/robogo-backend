const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

let segments = [];
let currentProcess = null;
let logStream = null;

function logToFile(msg) {
  if (logStream) {
    logStream.write(`[${new Date().toISOString()}] ${msg}\n`);
  }
}

function initLogger() {
  const logDir = path.join(__dirname, "../logs");
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

  const logFile = path.join(logDir, `recording_${Date.now()}.log`);
  logStream = fs.createWriteStream(logFile, { flags: "a" });
  logToFile("🚀 Logger initialized.");
}

function closeLogger() {
  if (logStream) {
    logToFile("🛑 Logger closed.");
    logStream.end();
    logStream = null;
  }
}

async function startRecording() {
  if (currentProcess) return false;

  initLogger();
  logToFile("🎥 startRecording() called");

  try {
    await fetch("http://localhost:3001/stream/stop");
    logToFile("⛔ Stream stopped before recording");
  } catch (err) {
    logToFile("⚠️ Failed to stop stream: " + err.message);
  }

  const filename = `segment_${Date.now()}.mp4`;
  const tempDir = path.join(__dirname, "../public/temp");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const filepath = path.join(tempDir, filename);
  segments.push(filepath);

  logToFile(`🎥 Starting new recording at: ${filepath}`);
  console.log("🎥 Mulai merekam ke:", filepath);

  currentProcess = spawn("ffmpeg", [
    "-f",
    "dshow",
    "-i",
    "video=HD User Facing",
    "-vcodec",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-preset",
    "veryfast",
    "-crf",
    "23",
    "-movflags",
    "faststart+frag_keyframe+empty_moov",
    "-f",
    "mp4",
    filepath,
  ]);

  currentProcess.stderr.on("data", (data) => {
    logToFile(`[FFMPEG STDERR] ${data.toString()}`);
  });

  currentProcess.on("error", (err) => {
    logToFile(`[FFMPEG ERROR] ${err}`);
  });

  return true;
}

async function stopRecording() {
  logToFile("🛑 stopRecording() called");

  return new Promise(async (resolve, reject) => {
    if (currentProcess) {
      const proc = currentProcess;
      currentProcess = null;

      proc.on("close", () => {
        logToFile("✅ Recording process closed.");

        const finalName = `record_${Date.now()}.mp4`;
        const finalPath = path.join(__dirname, "../public/videos", finalName);
        const listPath = path.join(__dirname, "../temp_list.txt");

        const validSegments = segments.filter((f) => {
          const exists = fs.existsSync(f);
          logToFile(`📦 Segment ${f} exists: ${exists}`);
          return exists;
        });

        if (validSegments.length === 0) {
          logToFile("⚠️ No valid segments found.");
          closeLogger();
          return resolve(null);
        }

        const fileContent = validSegments
          .map((seg) => `file '${seg.replace(/\\/g, "/")}'`)
          .join("\n");
        fs.writeFileSync(listPath, fileContent);
        logToFile(`📝 Created concat list at ${listPath}`);

        const concat = spawn("ffmpeg", [
          "-f",
          "concat",
          "-safe",
          "0",
          "-i",
          listPath,
          "-c",
          "copy",
          finalPath,
        ]);

        concat.stderr.on("data", (data) => {
          logToFile(`[FFMPEG CONCAT] ${data.toString()}`);
        });

        concat.on("close", async (code) => {
          logToFile(`🎬 FFmpeg concat exited with code: ${code}`);
          validSegments.forEach((f) => {
            try {
              fs.unlinkSync(f);
              logToFile(`🧹 Deleted segment: ${f}`);
            } catch (err) {
              logToFile(`❌ Failed to delete segment ${f}: ${err}`);
            }
          });

          if (fs.existsSync(listPath)) fs.unlinkSync(listPath);
          logToFile("🧹 Deleted list file.");

          try {
            await fetch("http://localhost:3001/stream/start");
            logToFile("✅ Stream restarted after recording");
          } catch (err) {
            logToFile("⚠️ Failed to restart stream: " + err.message);
          }

          segments = [];
          closeLogger();
          resolve(finalPath);
        });

        concat.on("error", (err) => {
          logToFile(`❌ Concat process error: ${err}`);
          closeLogger();
          reject(err);
        });
      });

      proc.kill("SIGINT");
    } else {
      logToFile("⛔ No process to stop.");
      closeLogger();
      resolve(null);
    }
  });
}

function isRecording() {
  return currentProcess !== null;
}

module.exports = {
  startRecording,
  stopRecording,
  isRecording,
};
