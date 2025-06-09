// filepath: g:\Kuliah\Semester 6\Proyek Telematika\RoboGo\Dashboard Website\RoboGo\server\controllers\reports\userScopedImageController.js
const { firestore } = require('../database');
const storage = require('../storage');

async function saveImage(req) {
  const { user_id, device_id } = req.userDevice;
  const data = req.body;

  const ref = firestore.collection('images').doc();
  await ref.set({
    user_id: user_id,
    device_id: device_id,
    filename: data.filename || null,
    path: data.path || null,
    imageUrl: data.imageUrl || null,
    timestamp: data.timestamp || new Date(),
    sessionId: data.sessionId || null,
    takenWith: data.takenWith || 'ESP32-CAM',
    metadata: data.metadata || {},
    obstacle: data.obstacle || false,
    createdAt: new Date(),
  });

  return { id: ref.id, ...data };
}

async function getAllImages(req) {
  const { user_id, device_id } = req.userDevice;

  const snapshot = await firestore
    .collection('images')
    .where('user_id', '==', user_id)
    .where('device_id', '==', device_id)
    .orderBy('createdAt', 'desc')
    .get();

  const images = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      timestamp: data.timestamp?.toDate?.()?.toISOString() || null,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
    };
  });

  return images;
}

async function getAllImagesWithImage(req) {
  const { user_id, device_id } = req.userDevice;

  const snapshot = await firestore
    .collection('images')
    .where('user_id', '==', user_id)
    .where('device_id', '==', device_id)
    .where('imageUrl', '!=', '')
    .orderBy('createdAt', 'desc')
    .get();

  const images = snapshot.docs
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: data.timestamp?.toDate?.()?.toISOString() || null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      };
    })
    .filter((img) => img.imageUrl);

  return images;
}

async function getImageById(req) {
  const { user_id, device_id } = req.userDevice;
  const { id } = req.params;

  const doc = await firestore.collection('images').doc(id).get();
  if (!doc.exists) {
    return null;
  }

  const imageData = doc.data();

  // Verify ownership - user can only access their own device's images
  if (imageData.user_id !== user_id || imageData.device_id !== device_id) {
    return null;
  }

  return {
    id: doc.id,
    ...imageData,
    timestamp: imageData.timestamp?.toDate?.()?.toISOString() || null,
    createdAt: imageData.createdAt?.toDate?.()?.toISOString() || null,
  };
}

async function getAllImagesByDate(req) {
  const { user_id, device_id } = req.userDevice;
  const date = req.params.date;

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const snapshot = await firestore
    .collection('images')
    .where('user_id', '==', user_id)
    .where('device_id', '==', device_id)
    .where('timestamp', '>=', startOfDay)
    .where('timestamp', '<=', endOfDay)
    .orderBy('timestamp', 'asc')
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

async function deleteImageByID(req) {
  const { user_id, device_id } = req.userDevice;
  const { id } = req.params;

  const docRef = firestore.collection('images').doc(id);
  const doc = await docRef.get();

  if (!doc.exists) {
    return null;
  }

  const image = doc.data();

  // Verify ownership - user can only delete their own device's images
  if (image.user_id !== user_id || image.device_id !== device_id) {
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

const { v4: uuidv4 } = require('uuid');

async function uploadImageToStorage(file) {
  if (!file || !file.buffer) {
    throw new Error('File buffer is missing');
  }

  const uniqueId = uuidv4();
  const filename = `${uniqueId}.png`;
  const fileRef = storage.file(`images/${filename}`);

  await fileRef.save(file.buffer, {
    metadata: {
      contentType: file.mimetype,
    },
  });

  const [url] = await fileRef.getSignedUrl({
    action: 'read',
    expires: '03-01-2100',
  });

  const path = `images/${filename}`;
  return { filename, path, imageUrl: url };
}

module.exports = {
  saveImage,
  getAllImages,
  getAllImagesWithImage,
  getImageById,
  getAllImagesByDate,
  deleteImageByID,
  uploadImageToStorage,
};
