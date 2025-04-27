const express = require("express");
const router = express.Router();
const {
  saveUltrasonicLog,
  getAllUltrasonicLogs,
  getUltrasonicLogsByDate,
  getUltrasonicLogsByDateAndSessionId,
  getUltrasonicLogById,
  deleteUltrasonicLog,
} = require("../../firebase/ultrasonic");

router.post("/", async (req, res) => {
  try {
    const { sessionId, distance, timestamp, imageId } = req.body;
    const saved = await saveUltrasonicLog({
      sessionId,
      distance,
      timestamp,
      imageId,
    });
    res.status(201).json(saved);
  } catch (err) {
    console.error("Save ultrasonic error:", err);
    res.status(500).json({ error: "Gagal menyimpan log" });
  }
});

router.get("/", async (req, res) => {
  const logs = await getAllUltrasonicLogs();
  if (!logs || logs.length === 0)
    return res.status(404).json({ error: "Not found" });
  res.json(logs);
});

router.get("/date/:date/session/:sessionId", async (req, res) => {
  const date = req.params.date;
  const sessionId = req.params.sessionId;
  const logs = await getUltrasonicLogsByDateAndSessionId(date, sessionId);
  if (!logs || logs.length === 0)
    return res.status(404).json({ error: "Not found" });
  res.json(logs);
});

router.get("/date/:date", async (req, res) => {
  const date = req.params.date;
  const logs = await getUltrasonicLogsByDate(date);
  if (!logs || logs.length === 0)
    return res.status(404).json({ error: "Not found" });
  res.json(logs);
});

// get log by id
router.get("/:id", async (req, res) => {
  const log = await getUltrasonicLogById(req.params.id);
  if (!log) return res.status(404).json({ error: "Not found" });
  res.json(log);
});

// delete log by id
router.delete("/:id", async (req, res) => {
  const success = await deleteUltrasonicLog(req.params.id);
  if (!success) return res.status(404).json({ error: "Not found" });
  res.json({ success: true });
});

// delete logs by date
router.delete("/date/:date", async (req, res) => {
  const date = req.params.date;
  const success = await deleteUltrasonicLogByDate(date);
  if (!success) return res.status(404).json({ error: "Not found" });
  res.json({ success: true });
});

module.exports = router;
