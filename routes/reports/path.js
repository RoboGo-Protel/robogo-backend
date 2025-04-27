const express = require("express");
const router = express.Router();
const {
  savePathLog,
  getAllPathLogs,
  getPathLogById,
  getPathLogsBySessionId,
  getPathLogsByDate,
  getPathLogsByDateAndSessionId,
  deletePathLogByID,
  deletePathLogByDate,
  deletePathLogByDateAndSessionId,
} = require("../../firebase/path");

router.post("/", async (req, res) => {
  try {
    const saved = await savePathLog(req.body);
    res.status(201).json(saved);
  } catch (err) {
    console.error("Save Path error:", err);
    res.status(500).json({ error: "Failed to save path log" });
  }
});

router.get("/", async (req, res) => {
  try {
    const logs = await getAllPathLogs();
    res.json(logs);
  } catch (err) {
    console.error("Get Path error:", err);
    res.status(500).json({ error: "Failed to retrieve path logs" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const log = await getPathLogById(req.params.id);
    if (!log) return res.status(404).json({ error: "Not found" });
    res.json(log);
  } catch (err) {
    console.error("Get Path by ID error:", err);
    res.status(500).json({ error: "Failed to retrieve path log" });
  }
});

router.get("/session/:sessionId", async (req, res) => {
  const sessionId = req.params.sessionId;
  const logs = await getPathLogsBySessionId(sessionId);
  if (!logs || logs.length === 0)
    return res.status(404).json({ error: "Not found" });
  res.json(logs);
});

router.get("/date/:date", async (req, res) => {
  const date = req.params.date;
  const logs = await getPathLogsByDate(date);
  if (!logs || logs.length === 0)
    return res.status(404).json({ error: "Not found" });
  res.json(logs);
});

router.get("/date/:date/session/:sessionId", async (req, res) => {
  const date = req.params.date;
  const sessionId = req.params.sessionId;
  const logs = await getPathLogsByDateAndSessionId(date, sessionId);
  if (!logs || logs.length === 0)
    return res.status(404).json({ error: "Not found" });
  res.json(logs);
});

router.delete("/:id", async (req, res) => {
  try {
    const success = await deletePathLogByID(req.params.id);
    if (!success)
      return res
        .status(404)
        .json({ error: "No path logs found to delete for the given ID" });
    res.json({ success: true });
  } catch (err) {
    console.error("Delete Path error:", err);
    res.status(500).json({ error: "Failed to delete path log" });
  }
});

router.delete("/date/:date", async (req, res) => {
  try {
    const date = req.params.date;
    const success = await deletePathLogByDate(date);
    if (!success)
      return res
        .status(404)
        .json({ error: "No path logs found to delete for the given date" });
    res.json({ success: true });
  } catch (err) {
    console.error("Delete Path by date error:", err);
    res.status(500).json({ error: "Failed to delete path logs" });
  }
});

router.delete("/date/:date/session/:sessionId", async (req, res) => {
  try {
    const date = req.params.date;
    const sessionId = req.params.sessionId;
    const success = await deletePathLogByDateAndSessionId(date, sessionId);
    if (!success)
      return res.status(404).json({
        error: "No path logs found to delete for the given date and session ID",
      });
    res.json({ success: true });
  } catch (err) {
    console.error("Delete Path by date and session error:", err);
    res.status(500).json({ error: "Failed to delete path logs" });
  }
});

module.exports = router;
