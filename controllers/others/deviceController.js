const { firestore } = require("../database");

async function getAllDevices(req, res) {
  try {
    const snapshot = await firestore.collection("devices").get();
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
        message: "deviceName dan status wajib diisi",
      });
    }

    if (user_id) {
      const userRef = await firestore.collection("users").doc(user_id).get();
      if (!userRef.exists) {
        return res
          .status(404)
          .json({ success: false, message: "User tidak ditemukan" });
      }
    }
    const newDevice = {
      user_id: user_id || null,
      deviceName,
      status,
      createdAt: new Date(),
    };
    const ref = await firestore.collection("devices").add(newDevice);
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
        message: "deviceId dan user_id wajib diisi (user_id bisa dari token)",
      });
    }

    const userRef = await firestore.collection("users").doc(user_id).get();
    if (!userRef.exists) {
      return res
        .status(404)
        .json({ success: false, message: "User tidak ditemukan" });
    }

    const deviceRef = firestore.collection("devices").doc(deviceId);
    const deviceSnap = await deviceRef.get();
    if (!deviceSnap.exists) {
      return res
        .status(404)
        .json({ success: false, message: "Device tidak ditemukan" });
    }
    await deviceRef.update({ user_id });
    res
      .status(200)
      .json({ success: true, message: "User berhasil di-assign ke device" });
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
        message: "Unauthorized: user_id tidak ditemukan di token",
      });
    }
    const snapshot = await firestore
      .collection("devices")
      .where("user_id", "==", user_id)
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
      .collection("devices")
      .where("user_id", "==", null)
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

module.exports = {
  getAllDevices,
  addDevice,
  assignUserToDevice,
  getDevicesByUser,
  getUnassignedDevices,
};
