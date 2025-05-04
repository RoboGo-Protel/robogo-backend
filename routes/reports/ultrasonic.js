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
        message: "Failed to save ultrasonic log",
      });
    }
    res.status(201).json({
      status: "success",
      code: 201,
      message: "Ultrasonic log saved successfully",
      data: saved,
    });
  } catch (err) {
    console.error("Save ultrasonic error:", err);
    res.status(500).json({
      status: "error",
      code: 500,
      message: "Failed to save ultrasonic log",
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const ultrasonicLogs = await getAllUltrasonicLogs();

    if (ultrasonicLogs.length === 0) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "No ultrasonic logs found",
      });
    }
    res.status(200).json({
      status: "success",
      code: 200,
      message: "Ultrasonic logs retrieved successfully",
      data: ultrasonicLogs,
    });
  } catch (err) {
    console.error("Error retrieving ultrasonic logs:", err);
    res.status(500).json({
      status: "error",
      code: 500,
      message: "Failed to retrieve ultrasonic logs",
    });
  }
});

router.get("/summaries", async (req, res) => {
  try {
    const summary = await getAllSummaries();

    if (summary.length === 0) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "No summaries found",
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

router.get("/summaries/:date", async (req, res) => {
  const date = req.params.date;

  const datePattern = /^\d{2}-\d{2}-\d{4}$/;
  if (!datePattern.test(date)) {
    return res.status(400).json({
      status: "error",
      code: 400,
      message: "Invalid date format. Expected format: dd-mm-yyyy",
    });
  }

  if (!date) {
    return res.status(400).json({
      status: "error",
      code: 400,
      message: "Date is required",
    });
  }

  const [day, month, year] = date.split("-").map((num) => parseInt(num, 10));

  const validDate = new Date(year, month - 1, day);

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
    const logs = await getUltrasonicLogsByDateAndSessionId(
      startOfDay,
      endOfDay,
      sessionId
    );
    if (!logs || logs.length === 0) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "No logs found",
      });
    }
    res.status(200).json({
      status: "success",
      code: 200,
      message: "Ultrasonic logs by date and sessionId retrieved successfully",
      data: logs,
    });
  } catch (err) {
    console.error(
      "Error retrieving ultrasonic logs by date and sessionId:",
      err
    );
    res.status(500).json({
      status: "error",
      code: 500,
      message: "Failed to retrieve ultrasonic logs by date and sessionId",
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
    const logs = await getUltrasonicLogsByDate(startOfDay, endOfDay);

    if (!logs || logs.length === 0) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "No logs found",
      });
    }
    res.status(200).json({
      status: "success",
      code: 200,
      message: "Ultrasonic logs by date retrieved successfully",
      data: logs,
    });
  } catch (err) {
    console.error("Error retrieving ultrasonic logs by date:", err);
    res.status(500).json({
      status: "error",
      code: 500,
      message: "Failed to retrieve ultrasonic logs by date",
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const log = await getUltrasonicLogById(req.params.id);
    if (!log) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Ultrasonic log not found",
      });
    }
    res.status(200).json({
      status: "success",
      code: 200,
      message: "Ultrasonic log retrieved successfully",
      data: log,
    });
  } catch (err) {
    console.error("Error retrieving ultrasonic log:", err);
    res.status(500).json({
      status: "error",
      code: 500,
      message: "Failed to retrieve ultrasonic log",
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
    const success = await deleteUltrasonicLogByDateAndSessionId(
      startOfDay,
      endOfDay,
      sessionId
    );
    if (!success) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Ultrasonic log not found",
      });
    }
    res.status(200).json({
      status: "success",
      code: 200,
      message: "Ultrasonic log deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting ultrasonic log:", err);
    res.status(500).json({
      status: "error",
      code: 500,
      message: "Failed to delete ultrasonic log",
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
    const success = await deleteUltrasonicLogByDate(startOfDay, endOfDay);
    if (!success) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Ultrasonic log not found",
      });
    }
    res.status(200).json({
      status: "success",
      code: 200,
      message: "Ultrasonic log deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting ultrasonic log:", err);
    res.status(500).json({
      status: "error",
      code: 500,
      message: "Failed to delete ultrasonic log",
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const success = await deleteUltrasonicLogByID(req.params.id);

    if (!success) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Ultrasonic log not found",
      });
    }

    res.status(200).json({
      status: "success",
      code: 200,
      message: "Ultrasonic log deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting ultrasonic log:", err);
    res.status(500).json({
      status: "error",
      code: 500,
      message: "Failed to delete ultrasonic log",
    });
  }
});

module.exports = router;
