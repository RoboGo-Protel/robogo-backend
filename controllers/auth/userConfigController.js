const { firestore } = require('../database');

// Default user configuration structure
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
      // Return default config if none exists
      return DEFAULT_CONFIG;
    }
    const configData = configDoc.data();

    // Merge with default config to ensure all required fields exist
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

    // Get existing config to check if it exists
    const existingConfig = await firestore
      .collection('userConfigs')
      .doc(userId)
      .get();

    const updateData = {
      ...configData,
      updatedAt: now,
    };

    // Add createdAt if this is a new config
    if (!existingConfig.exists) {
      updateData.createdAt = now;
    }

    // Save to Firestore
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
