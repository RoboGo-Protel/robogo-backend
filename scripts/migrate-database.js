const { rtdb, firestore } = require('../controllers/database');

/**
 * Migration script to restructure Firebase Realtime Database
 * From: realtime_monitoring/{sessionId}/{data}
 * To: users/{user_id}/{device_id}/{current_session, realtime_monitoring/{sessionId}, logs/{sessionId}}
 */

async function migrateRealtimeDatabase() {
  console.log('Starting Realtime Database migration...');

  try {
    // Get all current realtime monitoring data
    const snapshot = await rtdb.ref('realtime_monitoring').once('value');
    const currentData = snapshot.val();

    if (!currentData) {
      console.log('No data to migrate in realtime_monitoring');
      return;
    }

    // Get all devices with their user assignments
    const devicesSnapshot = await firestore.collection('devices').get();
    const deviceUserMap = {};

    devicesSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.user_id) {
        deviceUserMap[doc.id] = data.user_id;
      }
    });

    console.log(`Found ${Object.keys(deviceUserMap).length} assigned devices`);

    // For this migration, we'll need to assign unassigned sessions to a default user/device
    // In a real scenario, you'd need business logic to determine the correct assignments
    const DEFAULT_USER_ID = 'migration_user';
    const DEFAULT_DEVICE_ID = 'migration_device';

    let migratedCount = 0;

    // Migrate each session
    for (const [sessionId, sessionData] of Object.entries(currentData)) {
      if (typeof sessionData !== 'object') continue;

      // For now, assign to default user/device (you'll need to modify this based on your business logic)
      const userId = DEFAULT_USER_ID;
      const deviceId = DEFAULT_DEVICE_ID;

      // Create new structure
      const newPath = `users/${userId}/${deviceId}/realtime_monitoring/${sessionId}`;

      // Migrate the session data
      await rtdb.ref(newPath).set(sessionData);

      // Set current_session for this user/device (use the highest sessionId as current)
      const currentSessionPath = `users/${userId}/${deviceId}/current_session`;
      const currentSessionSnap = await rtdb
        .ref(currentSessionPath)
        .once('value');
      const currentSessionValue = currentSessionSnap.val() || 0;

      if (parseInt(sessionId) > currentSessionValue) {
        await rtdb.ref(currentSessionPath).set(parseInt(sessionId));
      }

      migratedCount++;
      console.log(`Migrated session ${sessionId} to ${newPath}`);
    }

    console.log(`Migration completed. Migrated ${migratedCount} sessions.`);
    console.log(
      '⚠️  Note: All sessions were assigned to default user/device. You may need to manually reassign them based on your business logic.',
    );
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

async function addUserDeviceFieldsToFirestore() {
  console.log('Starting Firestore collections migration...');

  const collections = [
    'images',
    'imu_logs',
    'logs',
    'path_logs',
    'ultrasonic_logs',
  ];

  try {
    for (const collectionName of collections) {
      console.log(`Migrating collection: ${collectionName}`);

      const snapshot = await firestore.collection(collectionName).get();
      const batch = firestore.batch();
      let updateCount = 0;

      snapshot.docs.forEach((doc) => {
        const data = doc.data();

        // Only update documents that don't have user_id and device_id
        if (!data.user_id || !data.device_id) {
          // For migration, assign default values
          // In production, you'd determine these based on sessionId or other business logic
          const updates = {};

          if (!data.user_id) {
            updates.user_id = 'migration_user';
          }

          if (!data.device_id) {
            updates.device_id = 'migration_device';
          }

          batch.update(doc.ref, updates);
          updateCount++;
        }
      });

      if (updateCount > 0) {
        await batch.commit();
        console.log(`Updated ${updateCount} documents in ${collectionName}`);
      } else {
        console.log(`No documents to update in ${collectionName}`);
      }
    }

    console.log('Firestore migration completed!');
  } catch (error) {
    console.error('Firestore migration failed:', error);
    throw error;
  }
}

async function createBackup() {
  console.log('Creating backup of current data...');

  try {
    // Backup realtime database
    const rtdbSnapshot = await rtdb.ref('realtime_monitoring').once('value');
    const rtdbData = rtdbSnapshot.val();

    if (rtdbData) {
      await rtdb.ref('backup/realtime_monitoring').set(rtdbData);
      console.log(
        'Realtime Database backup created at backup/realtime_monitoring',
      );
    }

    // Backup current_session
    const currentSessionSnapshot = await rtdb
      .ref('current_session')
      .once('value');
    const currentSessionData = currentSessionSnapshot.val();

    if (currentSessionData) {
      await rtdb.ref('backup/current_session').set(currentSessionData);
      console.log('Current session backup created at backup/current_session');
    }

    console.log('Backup completed!');
  } catch (error) {
    console.error('Backup failed:', error);
    throw error;
  }
}

async function runMigration() {
  console.log('🚀 Starting database migration process...');
  console.log(
    '⚠️  This will restructure your database. Make sure you have a backup!',
  );

  try {
    // Step 1: Create backup
    await createBackup();

    // Step 2: Migrate Realtime Database
    await migrateRealtimeDatabase();

    // Step 3: Add user_id and device_id to Firestore collections
    await addUserDeviceFieldsToFirestore();

    console.log('✅ Migration completed successfully!');
    console.log('📝 Next steps:');
    console.log('1. Update your controllers to use the new database structure');
    console.log('2. Test all functionality with the new structure');
    console.log(
      '3. Update frontend components to work with user/device-scoped data',
    );
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.log('💡 You can restore from backup if needed.');
    process.exit(1);
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  runMigration();
}

module.exports = {
  migrateRealtimeDatabase,
  addUserDeviceFieldsToFirestore,
  createBackup,
  runMigration,
};
