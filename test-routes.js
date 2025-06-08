const axios = require('axios');

async function testRoutes() {
  const baseUrl = 'http://localhost:4000/api/v1';

  console.log('Testing user config routes...\n');

  // Test 1: Check if the route exists (should return 401 without auth)
  try {
    console.log('1. Testing GET /others/user/config without auth...');
    const response = await axios.get(`${baseUrl}/others/user/config`);
    console.log('❌ Unexpected success:', response.status);
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('✅ Route exists - returns 401 as expected (no auth)');
    } else {
      console.log(
        '❌ Unexpected error:',
        error.response?.status,
        error.message,
      );
    }
  }

  // Test 2: Test with fake token (should return 403)
  try {
    console.log('\n2. Testing GET /others/user/config with fake auth...');
    const response = await axios.get(`${baseUrl}/others/user/config`, {
      headers: {
        Authorization: 'Bearer fake-token',
      },
    });
    console.log('❌ Unexpected success:', response.status);
  } catch (error) {
    if (error.response && error.response.status === 403) {
      console.log('✅ Route exists - returns 403 as expected (invalid token)');
    } else {
      console.log(
        '❌ Unexpected error:',
        error.response?.status,
        error.message,
      );
    }
  }

  // Test 3: Test PUT endpoint
  try {
    console.log('\n3. Testing PUT /others/user/config without auth...');
    const response = await axios.put(`${baseUrl}/others/user/config`, {
      selectedDevice: 'test',
    });
    console.log('❌ Unexpected success:', response.status);
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('✅ PUT Route exists - returns 401 as expected (no auth)');
    } else {
      console.log(
        '❌ Unexpected error:',
        error.response?.status,
        error.message,
      );
    }
  }

  console.log('\nRoute testing completed.');
}

testRoutes().catch(console.error);
