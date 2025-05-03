const { initializeApp, cert } = require("firebase-admin/app");
const { getStorage } = require("firebase-admin/storage");
const serviceAccount = require("./serviceStorage.json");

const admin = require("firebase-admin");

let storageApp;
try {
  storageApp = admin.app("storageApp");
} catch (error) {
  storageApp = initializeApp(
    {
      credential: cert(serviceAccount),
      storageBucket: "manjaro-web-dae38.appspot.com",
    },
    "storageApp"
  );
}

const storage = getStorage(storageApp);
module.exports = storage.bucket();
