const { firestore } = require("./database");
const storage = require("./storage");

async function saveImage(data) {
  const ref = firestore.collection("images").doc();
  await ref.set({
    filename: data.filename,
    path: data.path,
    imageUrl: data.imageUrl,
    timestamp: data.timestamp,
    sessionId: data.sessionId || null,
    category: data.category || false,
    takenWith: data.takenWith || "ESP32-CAM",
    metadata: data.metadata || {},
    obstacle: data.obstacle || false,
    createdAt: new Date(),
  });

  return { id: ref.id, ...data };
}

async function getAllImages() {
  const snapshot = await firestore
    .collection("images")
    .orderBy("createdAt", "desc")
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

async function getImageById(id) {
  const doc = await firestore.collection("images").doc(id).get();
  if (!doc.exists) {
    return null; // Mengembalikan null jika dokumen tidak ditemukan
  }

  return { id: doc.id, ...doc.data() };
}

async function getAllImagesByDate(date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const snapshot = await firestore
    .collection("images")
    .where("timestamp", ">=", startOfDay)
    .where("timestamp", "<=", endOfDay)
    .orderBy("timestamp", "asc")
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

async function deleteImageByID(id) {
  const docRef = firestore.collection("images").doc(id);
  const doc = await docRef.get();

  if (!doc.exists) {
    return null; // Kembalikan null jika gambar tidak ditemukan
  }

  const image = doc.data();
  const filename = decodeURIComponent(image.path?.split("/").pop());

  if (filename) {
    try {
      const file = storage.file(`images/${filename}`);
      const [exists] = await file.exists();

      if (!exists) {
        throw new Error("File does not exist in storage.");
      }

      await file.delete();
      console.log(`File ${filename} deleted from storage.`);
    } catch (err) {
      console.error("Error deleting file from storage:", err);
      throw new Error("Error deleting file from storage");
    }
  }

  // Hapus dokumen
  await docRef.delete();
  console.log(`Document with ID ${id} deleted from Firestore.`);

  // Verifikasi apakah dokumen benar-benar hilang
  const checkDoc = await docRef.get();
  if (!checkDoc.exists) {
    return true; // Kembalikan true jika berhasil dihapus
  }

  return false; // Kembalikan false jika gagal menghapus
}

const { v4: uuidv4 } = require("uuid");

async function uploadImageToStorage(file) {
  if (!file || !file.buffer) {
    throw new Error("File buffer is missing");
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
    action: "read",
    expires: "03-01-2100",
  });

  const path = `images/${filename}`;
  return { filename, path, imageUrl: url };
}

module.exports = {
  saveImage,
  getAllImages,
  getImageById,
  getAllImagesByDate,
  deleteImageByID,
  uploadImageToStorage,
};
