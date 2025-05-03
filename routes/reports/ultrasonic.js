const express = require("express");
const router = express.Router();
const {
  saveUltrasonicLog,
  getAllSummaries,
  getSummariesByDate,
  getAllUltrasonicLogs,
  getUltrasonicLogsByDate,
  getUltrasonicLogsByDateAndSessionId,
  getUltrasonicLogById,
  deleteUltrasonicLogByID,
  deleteUltrasonicLogByDate,
  deleteUltrasonicLogByDateAndSessionId,
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

router.get("/summaries", async (req, res) => {
  try {
    const summary = await getAllSummaries();
    res.json(summary);
  } catch (err) {
    console.error("Summary error:", err);
    res.status(500).json({ error: "Failed to load summary" });
  }
});

router.get("/summaries/:date", async (req, res) => {
  try {
    const { date } = req.params;
    const summary = await getSummariesByDate(date);
    res.json(summary);
  } catch (err) {
    console.error("Summary by date error:", err);
    res.status(500).json({ error: "Failed to load summary" });
  }
});

router.get("/date/:date", async (req, res) => {
  const date = req.params.date;
  const logs = await getUltrasonicLogsByDate(date);
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

router.get("/:id", async (req, res) => {
  const log = await getUltrasonicLogById(req.params.id);
  if (!log) return res.status(404).json({ error: "Not found" });
  res.json(log);
});

router.delete("/:id", async (req, res) => {
  const success = await deleteUltrasonicLogByID(req.params.id);
  if (!success) return res.status(404).json({ error: "Not found" });
  res.json({ success: true });
});

router.delete("/date/:date", async (req, res) => {
  const date = req.params.date;
  const success = await deleteUltrasonicLogByDate(date);
  if (!success) return res.status(404).json({ error: "Not found" });
  res.json({ success: true });
});

router.delete("/date/:date/session/:sessionId", async (req, res) => {
  const date = req.params.date;
  const sessionId = req.params.sessionId;
  const success = await deleteUltrasonicLogByDateAndSessionId(date, sessionId);
  if (!success) return res.status(404).json({ error: "Not found" });
  res.json({ success: true });
});

module.exports = router;
