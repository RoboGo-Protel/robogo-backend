const { firestore } = require("./database");
const storage = require("./storage");

async function saveImage(data) {
  const ref = firestore.collection("images").doc();
  await ref.set({
    filename: data.filename,
    path: data.path,
    timestamp: data.timestamp,
    category: data.category || "normal",
    takenWith: data.takenWith || "ESP32-CAM",
    metadata: data.metadata || {},
    createdAt: new Date(),
  });
  return { id: ref.id, ...data };
}

async function getAllImages() {
  const snapshot = await firestore
    .collection("images")
    .orderBy("createdAt", "desc")
    .get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function getImageById(id) {
  const doc = await firestore.collection("images").doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

async function deleteImage(id) {
  const docRef = firestore.collection("images").doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return null;

  const image = doc.data();
  const filename = image.path?.split("/").pop();
  if (filename) {
    await storage
      .file(`images/${filename}`)
      .delete()
      .catch(() => {});
  }

  await docRef.delete();
  return true;
}

async function uploadImageToStorage(file) {
  const filename = `${Date.now()}_${file.originalname}`;
  const destination = `images/${filename}`;
  const fileRef = storage.file(destination);

  await fileRef.save(file.buffer, {
    metadata: {
      contentType: file.mimetype,
    },
  });

  const [url] = await fileRef.getSignedUrl({
    action: "read",
    expires: "03-01-2100",
  });

  return { url, filename };
}

module.exports = {
  saveImage,
  getAllImages,
  getImageById,
  deleteImage,
  uploadImageToStorage,
};
