const express = require("express");
const router = express.Router();
const {
  savePathLog,
  getAllPathLogs,
  getPathLogById,
  getPathLogsBySessionId,
  getPathLogsByDate,
  getPathLogsByDateAndSessionId,
  getAvailableDates,
  getAvailableSessionIdsFromDate,
  getAvailableDatesWithSessions,
  deletePathLogByID,
  deletePathLogByDate,
  deletePathLogByDateAndSessionId,
} = require("../../firebase/reports/path");

router.post("/", async (req, res) => {
  try {
    const saved = await savePathLog(req.body);
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Request body cannot be empty",
      });
    }
    if (!saved) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Failed to save path log",
      });
    }
    res.status(201).json({
      status: "success",
      code: 201,
      message: "Path log saved successfully",
      data: saved,
    });
  } catch (err) {
    console.error("Save Path error:", err);
    res.status(500).json({
      status: "error",
      code: 500,
      message: "Failed to save path log",
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const logs = await getAllPathLogs();
    if (logs.length === 0) {
      return res.status(404).json({
        status: "success",
        code: 404,
        message: "No path logs found",
      });
    }
    res.status(200).json({
      status: "success",
      code: 200,
      message: "Path logs retrieved successfully",
      data: logs,
    });
  } catch (err) {
    console.error("Get Path error:", err);
    res.status(500).json({
      status: "error",
      code: 500,
      message: "Failed to retrieve path logs",
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

router.get("/date/:date/session/:sessionId", async (req, res) => {
  const dateStr = req.params.date;
  const sessionId = req.params.sessionId;

  if (!sessionId) {
    return res.status(400).json({
      status: "error",
      code: 400,
      message: "Session ID cannot be empty",
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
    const logs = await getPathLogsByDateAndSessionId(
      startOfDay,
      endOfDay,
      sessionId
    );
    if (!logs || logs.length === 0) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "No path logs found for the given date and session ID",
      });
    }
    res.status(200).json({
      status: "success",
      code: 200,
      message: "Path logs retrieved successfully",
      data: logs,
    });
  } catch (err) {
    console.error("Get Path by date and session ID error:", err);
    res.status(500).json({
      status: "error",
      code: 500,
      message: "Failed to retrieve path logs",
    });
  }
});

router.get("/date/:date", async (req, res) => {
  const dateStr = req.params.date;
  if (!dateStr) {
    return res.status(400).json({
      status: "error",
      code: 400,
      message: "Date parameter is required",
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
    const logs = await getPathLogsByDate(startOfDay, endOfDay);
    if (!logs || logs.length === 0) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "No path logs found for the given date",
      });
    }
    res.status(200).json({
      status: "success",
      code: 200,
      message: "Path logs retrieved successfully",
      data: logs,
    });
  } catch (err) {
    console.error("Get Path by date error:", err);
    res.status(500).json({
      status: "error",
      code: 500,
      message: "Failed to retrieve path logs",
    });
  }
});

router.get("/session/:sessionId", async (req, res) => {
  const sessionId = req.params.sessionId;
  if (!sessionId) {
    return res.status(400).json({
      status: "error",
      code: 400,
      message: "Session ID cannot be empty",
    });
  }

  try {
    const logs = await getPathLogsBySessionId(sessionId);
    if (!logs || logs.length === 0) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "No path logs found for the given session ID",
      });
    }
    res.status(200).json({
      status: "success",
      code: 200,
      message: "Path logs retrieved successfully",
      data: logs,
    });
  } catch (err) {
    console.error("Get Path by session ID error:", err);
    res.status(500).json({
      status: "error",
      code: 500,
      message: "Failed to retrieve path logs",
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
    const log = await getPathLogById(req.params.id);
    if (!log) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Path log not found",
      });
    }
    res.status(200).json({
      status: "success",
      code: 200,
      message: "Path log retrieved successfully",
      data: log,
    });
  } catch (err) {
    console.error("Get Path by ID error:", err);
    res.status(500).json({
      status: "error",
      code: 500,
      message: "Failed to retrieve path log",
    });
  }
});

router.delete("/:id", async (req, res) => {
  if (!req.params.id) {
    return res.status(400).json({
      status: "error",
      code: 400,
      message: "Path log ID cannot be empty",
    });
  }
  try {
    const success = await deletePathLogByID(req.params.id);
    if (!success)
      return res.status(404).json({
        status: "error",
        code: 404,
        error: "No path logs found to delete for the given ID",
      });
    res.status(200).json({
      status: "success",
      code: 200,
      message: "Path log deleted successfully",
    });
  } catch (err) {
    console.error("Delete Path error:", err);
    res.status(500).json({
      status: "error",
      code: 500,
      error: "Failed to delete path logs",
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
      message: "Session ID cannot be empty",
    });
  }

  if (!dateStr) {
    return res.status(400).json({
      status: "error",
      code: 400,
      message: "Date parameter is required",
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
    const success = await deletePathLogByDateAndSessionId(
      startOfDay,
      endOfDay,
      sessionId
    );
    if (!success)
      return res.status(404).json({
        status: "error",
        code: 404,
        message:
          "No path logs found to delete for the given date and session ID",
      });
    res.status(200).json({
      status: "success",
      code: 200,
      message: "Path log deleted successfully",
    });
  } catch (err) {
    console.error("Delete Path by date and session error:", err);
    res.status(500).json({
      status: "error",
      code: 500,
      error: "Failed to delete path logs",
    });
  }
});

router.delete("/date/:date", async (req, res) => {
  const dateStr = req.params.date;

  if (!dateStr) {
    return res.status(400).json({
      status: "error",
      code: 400,
      message: "Date parameter is required",
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
    const success = await deletePathLogByDate(startOfDay, endOfDay);
    if (!success) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "No path logs found to delete for the given date",
      });
    }
    res.status(200).json({
      status: "success",
      code: 200,
      message: "Path log deleted successfully",
    });
  } catch (err) {
    console.error("Delete Path by date error:", err);
    res.status(500).json({
      status: "error",
      code: 500,
      message: "Failed to delete path logs",
    });
  }
});

module.exports = router;
