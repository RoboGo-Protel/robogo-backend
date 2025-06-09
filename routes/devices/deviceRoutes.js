const express = require("express");
const router = express.Router();
const {
  getAllDevices,
  addDevice,
  assignUserToDevice,
  getDevicesByUser,
  getUnassignedDevices,
  unassignDeviceFromUser,
  setCameraStreamUrl,
  getDeviceStatusByName, // Add new import
  updateDeviceComponentStatus, // Add new import
} = require('../../controllers/others/deviceController');
const authenticateToken = require('../../middleware/authMiddleware');

router.get('/', getAllDevices);

router.post('/', addDevice);

router.put('/assign', authenticateToken, assignUserToDevice);

router.put('/unassign', authenticateToken, unassignDeviceFromUser);

router.get('/user', authenticateToken, getDevicesByUser);

router.get('/unassigned', getUnassignedDevices);

router.post('/:deviceName/set-camera-url', setCameraStreamUrl);

// New endpoint for checking device status by deviceName
router.get('/status', getDeviceStatusByName);

// New endpoint for updating device component status
router.put('/status', updateDeviceComponentStatus);

module.exports = router;
