const express = require("express");
const router = express.Router();
const {
  saveIMULog,
  getAllSummaries,
  getSummariesByDate,
  getSummariesByDateAndSessionId,
  getAllIMULogs,
  getIMULogsByDate,
  getIMULogsByDateAndSessionId,
  getIMULogById,
  getAvailableDates,
  getAvailableSessionIdsFromDate,
  getAvailableDatesWithSessions,
  deleteIMULogByID,
  deleteIMULogByDate,
  deleteIMULogByDateAndSessionId,
} = require("../../controllers/reports/rtdb/newIMUController");

router.post("/", async (req, res) => {
  try {
    const saved = await saveIMULog(req.body);
    if (!saved) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Failed to save IMU log",
      });
    }
    res.status(201).json({
      status: "success",
      code: 201,
      message: "IMU log saved successfully",
      data: saved,
    });
  } catch (err) {
    console.error("Save IMU error:", err);
    res.status(500).json({
      status: "error",
      code: 500,
      message: "Failed to save IMU log",
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const logs = await getAllIMULogs();
    if (logs.length === 0) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "No IMU logs found",
      });
    }
    res.status(200).json({
      status: "success",
      code: 200,
      message: "IMU logs retrieved successfully",
      data: logs,
    });
  } catch (err) {
    console.error("Error retrieving IMU logs:", err);
    res.status(500).json({
      status: "error",
      code: 500,
      message: "Failed to retrieve IMU logs",
    });
  }
});

router.get("/dates-with-sessions", async (req, res) => {
  try {
    const dates = await getAvailableDatesWithSessions();
    if (!dates || dates.length === 0) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "No available dates with sessions found",
      });
    }
    res.status(200).json({
      status: "success",
      code: 200,
      message: "Available dates with sessions retrieved successfully",
      data: dates,
    });
  } catch (err) {
    console.error("Error retrieving available dates with sessions:", err);
    res.status(500).json({
      status: "error",
      code: 500,
      message: "Failed to retrieve available dates with sessions",
    });
  }
});

router.get("/summaries", async (req, res) => {
  try {
    const summaries = await getAllSummaries();
    if (!summaries || summaries.length === 0) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "No IMU summaries found",
      });
    }
    res.status(200).json({
      status: "success",
      code: 200,
      message: "IMU summaries retrieved successfully",
      data: summaries,
    });
  } catch (err) {
    console.error("Error retrieving IMU summaries:", err);
    res.status(500).json({
      status: "error",
      code: 500,
      message: "Failed to retrieve IMU summaries",
    });
  }
});

router.get("/summaries/:date", async (req, res) => {
  const dateStr = req.params.date;
  if (!dateStr) {
    return res.status(400).json({
      status: "error",
      code: 400,
      message: "Date is required",
    });
  }

  const [year, month, day] = dateStr.split("-").map((num) => parseInt(num, 10));
  const validDate = new Date(dateStr);
  if (isNaN(validDate)) {
    return res.status(400).json({
      status: "error",
      code: 400,
      message: "Invalid date. Expected format: yyyy-mm-dd",
    });
  }

  if (
    validDate.getFullYear() !== year ||
    validDate.getMonth() !== month - 1 ||
    validDate.getDate() !== day
  ) {
    return res.status(400).json({
      status: "error",
      code: 400,
      message:
        "Invalid date. Please provide a valid date (e.g., no 31st February).",
    });
  }

  const startOfDay = new Date(validDate.setHours(0, 0, 0, 0));
  const endOfDay = new Date(validDate.setHours(23, 59, 59, 999));

  try {
    const summary = await getSummariesByDate(startOfDay, endOfDay);

    if (summary.length === 0) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "No summaries found for this date",
      });
    }
    res.status(200).json({
      status: "success",
      code: 200,
      message: "Summaries retrieved successfully",
      data: summary,
    });
  } catch (err) {
    console.error("Summary by date error:", err);
    res.status(500).json({
      status: "error",
      code: 500,
      message: "Failed to retrieve summaries by date",
    });
  }
});

router.get("/summaries/date/:date/session/:sessionId", async (req, res) => {
  const dateStr = req.params.date;
  const sessionId = req.params.sessionId;

  if (!sessionId) {
    return res.status(400).json({
      status: "error",
      code: 400,
      message: "Session ID is required",
    });
  }

  const [year, month, day] = dateStr.split("-").map((num) => parseInt(num, 10));
  const validDate = new Date(dateStr);
  if (isNaN(validDate)) {
    return res.status(400).json({
      status: "error",
      code: 400,
      message: "Invalid date. Expected format: yyyy-mm-dd",
    });
  }

  if (
    validDate.getFullYear() !== year ||
    validDate.getMonth() !== month - 1 ||
    validDate.getDate() !== day
  ) {
    return res.status(400).json({
      status: "error",
      code: 400,
      message:
        "Invalid date. Please provide a valid date (e.g., no 31st February).",
    });
  }

  try {
    // Panggil fungsi dengan parameter yang sesuai
    const summary = await getSummariesByDateAndSessionId(dateStr, sessionId);

    if (!summary) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "No summaries found for the given date and session ID",
      });
    }
    res.status(200).json({
      status: "success",
      code: 200,
      message: "Summaries retrieved successfully",
      data: summary,
    });
  } catch (err) {
    console.error("Error retrieving summaries:", err);
    res.status(500).json({
      status: "error",
      code: 500,
      message: "Failed to retrieve summaries",
    });
  }
});

router.get("/date/:date/session/:sessionId", async (req, res) => {
  const dateStr = req.params.date;
  const sessionId = req.params.sessionId;

  if (!sessionId) {
    return res.status(400).json({
      status: "error",
      code: 400,
      message: "Session ID is required",
    });
  }

  const [year, month, day] = dateStr.split("-").map((num) => parseInt(num, 10));
  const validDate = new Date(dateStr);
  if (isNaN(validDate)) {
    return res.status(400).json({
      status: "error",
      code: 400,
      message: "Invalid date. Expected format: yyyy-mm-dd",
    });
  }

  if (
    validDate.getFullYear() !== year ||
    validDate.getMonth() !== month - 1 ||
    validDate.getDate() !== day
  ) {
    return res.status(400).json({
      status: "error",
      code: 400,
      message:
        "Invalid date. Please provide a valid date (e.g., no 31st February).",
    });
  }

  const startOfDay = new Date(validDate.setHours(0, 0, 0, 0));
  const endOfDay = new Date(validDate.setHours(23, 59, 59, 999));
  try {
    const logs = await getIMULogsByDateAndSessionId(
      startOfDay,
      endOfDay,
      sessionId
    );

    if (!logs || logs.length === 0) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "No IMU logs found for the given date and session ID",
      });
    }
    res.status(200).json({
      status: "success",
      code: 200,
      message: "IMU logs retrieved successfully",
      data: logs,
    });
  } catch (err) {
    console.error("Error retrieving IMU logs:", err);
    res.status(500).json({
      status: "error",
      code: 500,
      message: "Failed to retrieve IMU logs",
    });
  }
});

router.get("/date/:date", async (req, res) => {
  const dateStr = req.params.date;

  if (!dateStr) {
    return res.status(400).json({
      status: "error",
      code: 400,
      message: "Date is required",
    });
  }

  const [year, month, day] = dateStr.split("-").map((num) => parseInt(num, 10));
  const validDate = new Date(dateStr);
  if (isNaN(validDate)) {
    return res.status(400).json({
      status: "error",
      code: 400,
      message: "Invalid date. Expected format: yyyy-mm-dd",
    });
  }

  if (
    validDate.getFullYear() !== year ||
    validDate.getMonth() !== month - 1 ||
    validDate.getDate() !== day
  ) {
    return res.status(400).json({
      status: "error",
      code: 400,
      message:
        "Invalid date. Please provide a valid date (e.g., no 31st February).",
    });
  }

  const startOfDay = new Date(validDate.setHours(0, 0, 0, 0));
  const endOfDay = new Date(validDate.setHours(23, 59, 59, 999));

  try {
    const logs = await getIMULogsByDate(startOfDay, endOfDay);
    if (!logs || logs.length === 0) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "No IMU logs found for the given date",
      });
    }
    res.status(200).json({
      status: "success",
      code: 200,
      message: "IMU logs retrieved successfully",
      data: logs,
    });
  } catch (err) {
    console.error("Error retrieving IMU logs:", err);
    res.status(500).json({
      status: "error",
      code: 500,
      message: "Failed to retrieve IMU logs",
    });
  }
});

router.get("/dates/:date/sessions", async (req, res) => {
  const dateStr = req.params.date;

  if (!dateStr) {
    return res.status(400).json({
      status: "error",
      code: 400,
      message: "Date is required",
    });
  }

  const [year, month, day] = dateStr.split("-").map((num) => parseInt(num, 10));
  const validDate = new Date(dateStr);
  if (isNaN(validDate)) {
    return res.status(400).json({
      status: "error",
      code: 400,
      message: "Invalid date. Expected format: yyyy-mm-dd",
    });
  }

  if (
    validDate.getFullYear() !== year ||
    validDate.getMonth() !== month - 1 ||
    validDate.getDate() !== day
  ) {
    return res.status(400).json({
      status: "error",
      code: 400,
      message:
        "Invalid date. Please provide a valid date (e.g., no 31st February).",
    });
  }

  const startOfDay = new Date(validDate.setHours(0, 0, 0, 0));
  const endOfDay = new Date(validDate.setHours(23, 59, 59, 999));
  try {
    const sessionIds = await getAvailableSessionIdsFromDate(
      startOfDay,
      endOfDay
    );
    if (!sessionIds || sessionIds.length === 0) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "No available session IDs found for the given date",
      });
    }
    res.status(200).json({
      status: "success",
      code: 200,
      message: "Available session IDs retrieved successfully",
      data: sessionIds,
    });
  } catch (err) {
    console.error("Error retrieving available session IDs:", err);
    res.status(500).json({
      status: "error",
      code: 500,
      message: "Failed to retrieve available session IDs",
    });
  }
});

router.get("/dates", async (req, res) => {
  try {
    const dates = await getAvailableDates();
    if (!dates || dates.length === 0) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "No available dates found",
      });
    }
    res.status(200).json({
      status: "success",
      code: 200,
      message: "Available dates retrieved successfully",
      data: dates,
    });
  } catch (err) {
    console.error("Error retrieving available dates:", err);
    res.status(500).json({
      status: "error",
      code: 500,
      message: "Failed to retrieve available dates",
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const log = await getIMULogById(req.params.id);
    if (!log) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "IMU log not found",
      });
    }
    res.status(200).json({
      status: "success",
      code: 200,
      message: "IMU log retrieved successfully",
      data: log,
    });
  } catch (err) {
    console.error("Error retrieving IMU log:", err);
    res.status(500).json({
      status: "error",
      code: 500,
      message: "Failed to retrieve IMU log",
    });
  }
});

router.delete("/date/:date/session/:sessionId", async (req, res) => {
  const dateStr = req.params.date;
  const sessionId = req.params.sessionId;

  if (!sessionId) {
    return res.status(400).json({
      status: "error",
      code: 400,
      message: "Session ID is required",
    });
  }

  const [year, month, day] = dateStr.split("-").map((num) => parseInt(num, 10));
  const validDate = new Date(dateStr);
  if (isNaN(validDate)) {
    return res.status(400).json({
      status: "error",
      code: 400,
      message: "Invalid date. Expected format: yyyy-mm-dd",
    });
  }

  if (
    validDate.getFullYear() !== year ||
    validDate.getMonth() !== month - 1 ||
    validDate.getDate() !== day
  ) {
    return res.status(400).json({
      status: "error",
      code: 400,
      message:
        "Invalid date. Please provide a valid date (e.g., no 31st February).",
    });
  }

  const startOfDay = new Date(validDate.setHours(0, 0, 0, 0));
  const endOfDay = new Date(validDate.setHours(23, 59, 59, 999));
  try {
    const deleted = await deleteIMULogByDateAndSessionId(
      startOfDay,
      endOfDay,
      sessionId
    );
    if (!deleted) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "IMU log not found for the given date and session ID",
      });
    }
    res.status(200).json({
      status: "success",
      code: 200,
      message: "IMU log deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting IMU log:", err);
    res.status(500).json({
      status: "error",
      code: 500,
      message: "Failed to delete IMU log",
    });
  }
});

router.delete("/date/:date", async (req, res) => {
  const dateStr = req.params.date;

  if (!dateStr) {
    return res.status(400).json({
      status: "error",
      code: 400,
      message: "Date is required",
    });
  }

  const [year, month, day] = dateStr.split("-").map((num) => parseInt(num, 10));
  const validDate = new Date(dateStr);
  if (isNaN(validDate)) {
    return res.status(400).json({
      status: "error",
      code: 400,
      message: "Invalid date. Expected format: yyyy-mm-dd",
    });
  }

  if (
    validDate.getFullYear() !== year ||
    validDate.getMonth() !== month - 1 ||
    validDate.getDate() !== day
  ) {
    return res.status(400).json({
      status: "error",
      code: 400,
      message:
        "Invalid date. Please provide a valid date (e.g., no 31st February).",
    });
  }

  const startOfDay = new Date(validDate.setHours(0, 0, 0, 0));
  const endOfDay = new Date(validDate.setHours(23, 59, 59, 999));
  try {
    const deleted = await deleteIMULogByDate(startOfDay, endOfDay);
    if (!deleted) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "IMU log not found for the given date",
      });
    }
    res.status(200).json({
      status: "success",
      code: 200,
      message: "IMU log deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting IMU log:", err);
    res.status(500).json({
      status: "error",
      code: 500,
      message: "Failed to delete IMU log",
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const deleted = await deleteIMULogByID(req.params.id);
    if (!deleted) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "IMU log not found",
      });
    }
    res.status(200).json({
      status: "success",
      code: 200,
      message: "IMU log deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting IMU log:", err);
    res.status(500).json({
      status: "error",
      code: 500,
      message: "Failed to delete IMU log",
    });
  }
});

module.exports = router;
