const { firestore } = require("../database");
const {
  getUserConfig,
  saveUserConfig,
} = require('../auth/userConfigController');

async function getAllDevices(req, res) {
  try {
    const snapshot = await firestore.collection('devices').get();
    const devices = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        user_id: data.user_id || null,
        deviceName: data.deviceName || null,
        status: data.status || null,
      };
    });
    res.status(200).json({ success: true, data: devices });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function addDevice(req, res) {
  try {
    const { user_id, deviceName, status } = req.body;
    if (!deviceName || !status) {
      return res.status(400).json({
        success: false,
        message: 'deviceName and status are required',
      });
    }

    // Check if device name already exists
    const existingDeviceSnapshot = await firestore
      .collection('devices')
      .where('deviceName', '==', deviceName)
      .get();

    if (!existingDeviceSnapshot.empty) {
      return res.status(400).json({
        success: false,
        message:
          'Device with this name already exists. Please use a different name.',
      });
    }

    if (user_id) {
      const userRef = await firestore.collection('users').doc(user_id).get();
      if (!userRef.exists) {
        return res
          .status(404)
          .json({ success: false, message: 'User tidak ditemukan' });
      }
    }
    const newDevice = {
      user_id: user_id || null,
      deviceName,
      status,
      createdAt: new Date(),
    };
    const ref = await firestore.collection('devices').add(newDevice);
    res.status(201).json({ success: true, id: ref.id, ...newDevice });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function assignUserToDevice(req, res) {
  try {
    let { deviceId, user_id } = req.body;

    if (!user_id && req.user && req.user.userId) {
      user_id = req.user.userId;
    }
    if (!deviceId || !user_id) {
      return res.status(400).json({
        success: false,
        message: 'deviceId dan user_id wajib diisi (user_id bisa dari token)',
      });
    }

    const userRef = await firestore.collection('users').doc(user_id).get();
    if (!userRef.exists) {
      return res
        .status(404)
        .json({ success: false, message: 'User tidak ditemukan' });
    }

    const deviceRef = firestore.collection('devices').doc(deviceId);
    const deviceSnap = await deviceRef.get();
    if (!deviceSnap.exists) {
      return res
        .status(404)
        .json({ success: false, message: 'Device tidak ditemukan' });
    }
    await deviceRef.update({ user_id });
    res
      .status(200)
      .json({ success: true, message: 'User berhasil di-assign ke device' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getDevicesByUser(req, res) {
  try {
    const user_id = req.user && req.user.userId;
    if (!user_id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: user_id tidak ditemukan di token',
      });
    }
    const snapshot = await firestore
      .collection('devices')
      .where('user_id', '==', user_id)
      .get();
    const devices = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        user_id: data.user_id || null,
        deviceName: data.deviceName || null,
        status: data.status || null,
      };
    });
    res.status(200).json({ success: true, data: devices });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getUnassignedDevices(req, res) {
  try {
    const snapshot = await firestore
      .collection('devices')
      .where('user_id', '==', null)
      .get();
    const devices = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        user_id: data.user_id || null,
        deviceName: data.deviceName || null,
        status: data.status || null,
      };
    });
    res.status(200).json({ success: true, data: devices });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getDevicesByUserId(userId) {
  try {
    const snapshot = await firestore
      .collection('devices')
      .where('user_id', '==', userId)
      .get();

    const devices = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        user_id: data.user_id || null,
        deviceName: data.deviceName || null,
        status: data.status || null,
      };
    });

    return devices;
  } catch (error) {
    throw new Error(
      `Failed to get devices for user ${userId}: ${error.message}`,
    );
  }
}

async function unassignDeviceFromUser(req, res) {
  try {
    const { deviceId } = req.body;
    const user_id = req.user && req.user.userId;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: 'deviceId wajib diisi',
      });
    }

    if (!user_id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: user_id tidak ditemukan di token',
      });
    }

    const deviceRef = firestore.collection('devices').doc(deviceId);
    const deviceSnap = await deviceRef.get();

    if (!deviceSnap.exists) {
      return res
        .status(404)
        .json({ success: false, message: 'Device tidak ditemukan' });
    }

    const deviceData = deviceSnap.data(); // Check if device is assigned to current user
    if (deviceData.user_id !== user_id) {
      return res.status(403).json({
        success: false,
        message: 'Device tidak di-assign ke user ini',
      });
    }

    // Unassign device (make it public/available)
    await deviceRef.update({ user_id: null });

    // Check if the unassigned device was the user's selectedDevice
    // If so, update user config to null the selectedDevice
    try {
      const userConfig = await getUserConfig(user_id);
      if (userConfig && userConfig.selectedDevice === deviceId) {
        const updatedConfig = {
          ...userConfig,
          selectedDevice: null,
          assignedDevices: userConfig.assignedDevices
            ? userConfig.assignedDevices.filter((id) => id !== deviceId)
            : [],
        };
        await saveUserConfig(user_id, updatedConfig);
      }
    } catch (configError) {
      console.error(
        'Error updating user config after unassigning device:',
        configError,
      );
      // Don't fail the whole operation if config update fails
    }

    res.status(200).json({
      success: true,
      message: 'Device berhasil di-unassign dan menjadi public',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  getAllDevices,
  addDevice,
  assignUserToDevice,
  getDevicesByUser,
  getUnassignedDevices,
  getDevicesByUserId,
  unassignDeviceFromUser,
};
