const express = require("express");
const router = express.Router();
const {
  getAllDevices,
  addDevice,
  assignUserToDevice,
  getDevicesByUser,
  getUnassignedDevices,
} = require("../../controllers/others/deviceController");
const authenticateToken = require("../../middleware/authMiddleware");

router.get("/", getAllDevices);

router.post("/", addDevice);

router.put("/assign", authenticateToken, assignUserToDevice);

router.get("/user", authenticateToken, getDevicesByUser);

router.get("/unassigned", getUnassignedDevices);

module.exports = router;
