const express = require('express');
const router = express.Router();
const { firestore } = require('../../controllers/database');
const {
  getUserConfig,
  saveUserConfig,
  deleteUserConfig,
  getAllUserConfigs,
} = require('../../controllers/auth/userConfigController');
const authenticateToken = require('../../middleware/authMiddleware');

// GET /api/v1/others/user/config - Get user configuration
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

// PUT /api/v1/others/user/config - Save/Update user configuration
router.put('/config', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const configData = req.body;

    // Validate required fields if needed
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

// DELETE /api/v1/others/user/config - Delete user configuration
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

// GET /api/v1/others/user/configs - Get all user configurations (admin only)
router.get('/configs', authenticateToken, async (req, res) => {
  try {
    // Note: You might want to add admin role check here
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

// GET /api/v1/others/user/onboarding-status - Check if user needs onboarding
router.get('/onboarding-status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Check user document for onboarding skip status
    const userDoc = await firestore.collection('users').doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : {};
    const onboardingSkippedInUser = userData.onboarding_skipped === true;

    // Check if user has config and assigned devices
    const config = await getUserConfig(userId);

    // Also check if user has any assigned devices
    const {
      getDevicesByUserId,
    } = require('../../controllers/others/deviceController');
    const userDevices = await getDevicesByUserId(userId);

    // Check if user has explicitly completed onboarding (either by full setup or skip)
    const onboardingCompletedInConfig =
      config && config.onboardingCompleted === true;
    const onboardingSkippedInConfig =
      config && config.onboardingSkipped === true;

    // User is considered to have completed onboarding if:
    // 1. They have skipped it in user collection OR
    // 2. They have completed it in config OR
    // 3. They have skipped it in config OR
    // 4. They have proper device setup
    const hasCompletedOnboarding =
      onboardingSkippedInUser ||
      onboardingCompletedInConfig ||
      onboardingSkippedInConfig ||
      (config &&
        userDevices &&
        userDevices.length > 0 &&
        config.selectedDevice);

    // User needs onboarding only if they haven't completed it in any way
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

// PUT /api/v1/others/user/skip-onboarding - Mark onboarding as skipped
router.put('/skip-onboarding', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Update user document to mark onboarding as skipped
    await firestore.collection('users').doc(userId).update({
      onboarding_skipped: true,
      onboarding_skipped_at: new Date(),
    });

    // Also save minimal config to indicate completion
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

module.exports = router;
