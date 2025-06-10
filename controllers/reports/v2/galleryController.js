const { firestore } = require("../../database");
const storage = require("../../storage");

async function getAllWithImage(userContext) {
  const snapshot = await firestore
    .collection('realtime_monitoring')
    .where('user_id', '==', userContext.userId)
    .where('device_id', '==', userContext.selectedDevice)
    .where('imageUrl', '!=', '')
    .orderBy('createdAt', 'desc')
    .get();

  return snapshot.docs
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: data.timestamp?.toDate?.()?.toISOString() || null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      };
    })
    .filter((item) => item.imageUrl);
}

async function getImageById(id, userContext) {
  const doc = await firestore.collection('realtime_monitoring').doc(id).get();
  if (!doc.exists) {
    return null;
  }

  const data = doc.data();

  // Verify ownership
  if (
    data.user_id !== userContext.userId ||
    data.device_id !== userContext.selectedDevice
  ) {
    return null;
  }

  return {
    id: doc.id,
    ...data,
    timestamp: data.timestamp?.toDate?.()?.toISOString() || null,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
  };
}

async function getAllImagesByDate(date, userContext) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const snapshot = await firestore
    .collection('realtime_monitoring')
    .where('user_id', '==', userContext.userId)
    .where('device_id', '==', userContext.selectedDevice)
    .where('createdAt', '>=', startOfDay)
    .where('createdAt', '<=', endOfDay)
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      timestamp: data.timestamp?.toDate?.()?.toISOString() || null,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
    };
  });
}

async function downloadImageByID(id, userContext) {
  const docRef = firestore.collection('realtime_monitoring').doc(id);
  const doc = await docRef.get();

  if (!doc.exists) {
    return null;
  }

  const image = doc.data();

  // Verify ownership
  if (
    image.user_id !== userContext.userId ||
    image.device_id !== userContext.selectedDevice
  ) {
    return null;
  }

  const filename = decodeURIComponent(image.path?.split('/').pop());

  if (filename) {
    try {
      const file = storage.file(`images/${filename}`);
      const [exists] = await file.exists();

      if (!exists) {
        throw new Error('File does not exist in storage.');
      }

      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 24 * 60 * 60 * 1000,
      });

      return url;
    } catch (err) {
      console.error('Error downloading file from storage:', err);
      throw new Error('Error downloading file from storage');
    }
  }

  return null;
}

async function deleteImageByID(id, userContext) {
  const docRef = firestore.collection('realtime_monitoring').doc(id);
  const doc = await docRef.get();

  if (!doc.exists) {
    return null;
  }

  const image = doc.data();

  // Verify ownership
  if (
    image.user_id !== userContext.userId ||
    image.device_id !== userContext.selectedDevice
  ) {
    return null;
  }

  const filename = decodeURIComponent(image.path?.split('/').pop());

  if (filename) {
    try {
      const file = storage.file(`images/${filename}`);
      const [exists] = await file.exists();

      if (!exists) {
        throw new Error('File does not exist in storage.');
      }

      await file.delete();
      console.log(`File ${filename} deleted from storage.`);
    } catch (err) {
      console.error('Error deleting file from storage:', err);
      throw new Error('Error deleting file from storage');
    }
  }

  await docRef.delete();
  console.log(`Document with ID ${id} deleted from Firestore.`);

  const checkDoc = await docRef.get();
  if (!checkDoc.exists) {
    return true;
  }

  return false;
}

module.exports = {
  getAllWithImage,
  getImageById,
  getAllImagesByDate,
  downloadImageByID,
  deleteImageByID,
};
