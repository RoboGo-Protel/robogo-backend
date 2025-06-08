const { firestore } = require('./controllers/database');
const { getUserConfig, saveUserConfig } = require('./controllers/auth/userConfigController');

async function testUserConfig() {
  console.log('Testing user configuration database operations...\n');

  const testUserId = 'test-user-123';
  const testConfig = {
    selectedDevice: 'device-001',
    cameraStreamUrl: 'http://192.168.1.100/stream',
    streamQuality: 'high',
    assignedDevices: ['device-001', 'device-002']
  };

  try {
    // Test 1: Get default config for new user
    console.log('1. Testing get config for new user (should return defaults)...');
    const defaultConfig = await getUserConfig(testUserId);
    console.log('Default config:', JSON.stringify(defaultConfig, null, 2));

    // Test 2: Save config
    console.log('\n2. Testing save config...');
    const savedConfig = await saveUserConfig(testUserId, testConfig);
    console.log('Saved config:', JSON.stringify(savedConfig, null, 2));

    // Test 3: Get saved config
    console.log('\n3. Testing get saved config...');
    const retrievedConfig = await getUserConfig(testUserId);
    console.log('Retrieved config:', JSON.stringify(retrievedConfig, null, 2));

    // Test 4: Update config
    console.log('\n4. Testing update config...');
    const updatedConfig = {
      ...testConfig,
      streamQuality: 'low',
      selectedDevice: 'device-002'
    };
    const savedUpdatedConfig = await saveUserConfig(testUserId, updatedConfig);
    console.log('Updated config:', JSON.stringify(savedUpdatedConfig, null, 2));

    // Test 5: Verify update
    console.log('\n5. Testing get updated config...');
    const finalConfig = await getUserConfig(testUserId);
    console.log('Final config:', JSON.stringify(finalConfig, null, 2));

    // Clean up - delete test config
    console.log('\n6. Cleaning up test data...');
    await firestore.collection('userConfigs').doc(testUserId).delete();
    console.log('Test data cleaned up successfully');

    console.log('\n✅ All tests passed! User configuration database is working correctly.');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testUserConfig().then(() => {
  console.log('\nTest completed. Exiting...');
  process.exit(0);
}).catch((error) => {
  console.error('Test error:', error);
  process.exit(1);
});
