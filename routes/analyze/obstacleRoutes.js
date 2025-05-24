const express = require("express");
const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const pythonUrl = "http://localhost:5000/analyze";

    const response = await fetch(pythonUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    res.status(200).json({
      status: "success",
      code: 200,
      message: "Image analyzed successfully",
      data: data,
    });
  } catch (err) {
    console.error("Error forwarding request to Python:", err);

    res.status(500).json({
      status: "error",
      code: 500,
      message: "Failed to analyze image",
      error: err.message,
    });
  }
});

module.exports = router;