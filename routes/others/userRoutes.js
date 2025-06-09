const express = require('express');
const router = express.Router();
const { firestore } = require('../../controllers/database');
const {
  getUserConfig,
  getUserConfigWithDevices,
  saveUserConfig,
  deleteUserConfig,
  getAllUserConfigs,
} = require('../../controllers/auth/userConfigController');
const authenticateToken = require('../../middleware/authMiddleware');

router.get('/config', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const config = await getUserConfig(userId);

    res.status(200).json({
      status: 'success',
      code: 200,
      message: 'User configuration retrieved successfully',
      data: config,
    });
  } catch (error) {
    console.error('Error retrieving user config:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message || 'Failed to retrieve user configuration',
    });
  }
});

router.put('/config', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const configData = req.body;

    if (!configData || typeof configData !== 'object') {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Invalid configuration data provided',
      });
    }

    const savedConfig = await saveUserConfig(userId, configData);

    res.status(200).json({
      status: 'success',
      code: 200,
      message: 'User configuration saved successfully',
      data: savedConfig,
    });
  } catch (error) {
    console.error('Error saving user config:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message || 'Failed to save user configuration',
    });
  }
});

router.delete('/config', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await deleteUserConfig(userId);

    res.status(200).json({
      status: 'success',
      code: 200,
      message: result.message,
      data: { userId },
    });
  } catch (error) {
    console.error('Error deleting user config:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message || 'Failed to delete user configuration',
    });
  }
});

router.get('/configs', authenticateToken, async (req, res) => {
  try {
    const configs = await getAllUserConfigs();

    res.status(200).json({
      status: 'success',
      code: 200,
      message: 'All user configurations retrieved successfully',
      data: configs,
    });
  } catch (error) {
    console.error('Error retrieving all user configs:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message || 'Failed to retrieve user configurations',
    });
  }
});

router.get('/onboarding-status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const userDoc = await firestore.collection('users').doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : {};
    const onboardingSkippedInUser = userData.onboarding_skipped === true;

    const config = await getUserConfig(userId);

    const {
      getDevicesByUserId,
    } = require('../../controllers/others/deviceController');
    const userDevices = await getDevicesByUserId(userId);

    const onboardingCompletedInConfig =
      config && config.onboardingCompleted === true;
    const onboardingSkippedInConfig =
      config && config.onboardingSkipped === true;

    const hasCompletedOnboarding =
      onboardingSkippedInUser ||
      onboardingCompletedInConfig ||
      onboardingSkippedInConfig ||
      (config &&
        userDevices &&
        userDevices.length > 0 &&
        config.selectedDevice);

    const needsOnboarding = !hasCompletedOnboarding;

    res.status(200).json({
      status: 'success',
      code: 200,
      message: 'Onboarding status retrieved successfully',
      data: {
        needsOnboarding,
        hasConfig: !!config,
        hasDevices: userDevices && userDevices.length > 0,
        deviceCount: userDevices ? userDevices.length : 0,
        onboardingCompleted: hasCompletedOnboarding,
        onboardingSkipped: onboardingSkippedInUser || onboardingSkippedInConfig,
        debug: {
          onboardingSkippedInUser,
          onboardingCompletedInConfig,
          onboardingSkippedInConfig,
          hasProperDeviceSetup: !!(
            config &&
            userDevices &&
            userDevices.length > 0 &&
            config.selectedDevice
          ),
        },
      },
    });
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message || 'Failed to check onboarding status',
    });
  }
});

router.put('/skip-onboarding', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    await firestore.collection('users').doc(userId).update({
      onboarding_skipped: true,
      onboarding_skipped_at: new Date(),
    });

    await saveUserConfig(userId, {
      onboardingCompleted: true,
      onboardingSkipped: true,
      selectedDevice: null,
      cameraStreamUrl: '',
      streamQuality: 'medium',
      assignedDevices: [],
    });

    res.status(200).json({
      status: 'success',
      code: 200,
      message: 'Onboarding skipped successfully',
      data: {
        userId,
        skipped: true,
      },
    });
  } catch (error) {
    console.error('Error skipping onboarding:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message || 'Failed to skip onboarding',
    });
  }
});

// Get user config with all assigned devices' camera URLs included
router.get('/config/with-devices', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const configWithDevices = await getUserConfigWithDevices(userId);

    res.status(200).json({
      status: 'success',
      code: 200,
      message: 'User configuration with devices retrieved successfully',
      data: configWithDevices,
    });
  } catch (error) {
    console.error('Error retrieving user config with devices:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message:
        error.message || 'Failed to retrieve user configuration with devices',
    });
  }
});

module.exports = router;
