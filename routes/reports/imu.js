const express = require("express");
const router = express.Router();
const {
  saveIMULog,
  getAllIMULogs,
  getIMULogsByDate,
  getIMULogsByDateAndSessionId,
  getIMULogById,
  deleteIMULogByID,
} = require("../../firebase/imu");

router.post("/", async (req, res) => {
  try {
    const saved = await saveIMULog(req.body);
    res.status(201).json(saved);
  } catch (err) {
    console.error("Save IMU error:", err);
    res.status(500).json({ error: "Gagal menyimpan log IMU" });
  }
});

router.get("/", async (req, res) => {
  const logs = await getAllIMULogs();
  res.json(logs);
});

router.get("/date/:date/session/:sessionId", async (req, res) => {
  const date = req.params.date;
  const sessionId = req.params.sessionId;
  const logs = await getIMULogsByDateAndSessionId(date, sessionId);
  if (!logs || logs.length === 0)
    return res.status(404).json({ error: "Not found" });
  res.json(logs);
});

router.get("/date/:date", async (req, res) => {
  const date = req.params.date;
  const logs = await getIMULogsByDate(date);
  if (!logs || logs.length === 0)
    return res.status(404).json({ error: "Not found" });
  res.json(logs);
});

router.get("/:id", async (req, res) => {
  const log = await getIMULogById(req.params.id);
  if (!log) return res.status(404).json({ error: "Not found" });
  res.json(log);
});

router.delete("/:id", async (req, res) => {
  const success = await deleteIMULogByID(req.params.id);
  if (!success) return res.status(404).json({ error: "Not found" });
  res.json({ success: true });
});

module.exports = router;
