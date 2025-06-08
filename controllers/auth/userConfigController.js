const { firestore } = require('../database');


const DEFAULT_CONFIG = {
  selectedDevice: null,
  cameraStreamUrl: '',
  streamQuality: 'medium',
  assignedDevices: [],
  onboardingCompleted: false,
};

async function getUserConfig(userId) {
  try {
    const configDoc = await firestore
      .collection('userConfigs')
      .doc(userId)
      .get();

    if (!configDoc.exists) {
      return DEFAULT_CONFIG;
    }
    const configData = configDoc.data();

    return {
      ...DEFAULT_CONFIG,
      ...configData,
      updatedAt: configData.updatedAt?.toDate
        ? configData.updatedAt.toDate()
        : configData.updatedAt,
      createdAt: configData.createdAt?.toDate
        ? configData.createdAt.toDate()
        : configData.createdAt,
    };
  } catch (error) {
    console.error('Error fetching user config:', error);
    throw new Error('Failed to fetch user configuration');
  }
}

async function saveUserConfig(userId, configData) {
  try {
    const now = new Date();

    const existingConfig = await firestore
      .collection('userConfigs')
      .doc(userId)
      .get();

    const updateData = {
      ...configData,
      updatedAt: now,
    };

    if (!existingConfig.exists) {
      updateData.createdAt = now;
    }

    await firestore
      .collection('userConfigs')
      .doc(userId)
      .set(updateData, { merge: true });

    return {
      ...updateData,
      userId,
      updatedAt: updateData.updatedAt,
      createdAt: updateData.createdAt || existingConfig.data()?.createdAt,
    };
  } catch (error) {
    console.error('Error saving user config:', error);
    throw new Error('Failed to save user configuration');
  }
}

async function deleteUserConfig(userId) {
  try {
    await firestore.collection('userConfigs').doc(userId).delete();

    return {
      success: true,
      message: 'User configuration deleted successfully',
    };
  } catch (error) {
    console.error('Error deleting user config:', error);
    throw new Error('Failed to delete user configuration');
  }
}

async function getAllUserConfigs() {
  try {
    const snapshot = await firestore.collection('userConfigs').get();

    const configs = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      configs.push({
        userId: doc.id,
        ...data,
        updatedAt: data.updatedAt?.toDate(),
        createdAt: data.createdAt?.toDate(),
      });
    });

    return configs;
  } catch (error) {
    console.error('Error fetching all user configs:', error);
    throw new Error('Failed to fetch user configurations');
  }
}

module.exports = {
  getUserConfig,
  saveUserConfig,
  deleteUserConfig,
  getAllUserConfigs,
  DEFAULT_CONFIG,
};
