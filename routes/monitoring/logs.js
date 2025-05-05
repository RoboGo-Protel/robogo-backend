const express = require("express");
const router = express.Router();
const {
  saveLog,
  getAllLogs,
  getCurrentSessionLogs,
} = require("../../firebase/monitoring/logs");

router.post("/", async (req, res) => {
  try {
    const saved = await saveLog(req.body);
    if (!saved) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Failed to save log",
      });
    }
    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Log saved successfully",
      data: { id: saved },
    });
  } catch (error) {
    console.error("Error saving log:", error);
    return res.status(500).json({
      status: "error",
      code: 500,
      message: "Internal server error",
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const logs = await getAllLogs();
    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Logs retrieved successfully",
      data: logs,
    });
  } catch (error) {
    console.error("Error retrieving logs:", error);
    return res.status(500).json({
      status: "error",
      code: 500,
      message: "Internal server error",
    });
  }
});

router.get("/session/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  try {
    const logs = await getCurrentSessionLogs(sessionId);
    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Logs retrieved successfully",
      data: logs,
    });
  } catch (error) {
    console.error("Error retrieving session logs:", error);
    return res.status(500).json({
      status: "error",
      code: 500,
      message: "Internal server error",
    });
  }
});

module.exports = router;
