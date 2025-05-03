const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getDatabase } = require("firebase-admin/database");
const serviceAccount = require("./serviceDatabase.json");

const admin = require("firebase-admin");

let dbApp;
try {
  dbApp = admin.app("dbApp");
} catch (error) {
  dbApp = initializeApp(
    {
      credential: cert(serviceAccount),
      databaseURL:
        "https://robogo-62663-default-rtdb.asia-southeast1.firebasedatabase.app/",
    },
    "dbApp"
  );
}

const firestore = getFirestore(dbApp);
const rtdb = getDatabase(dbApp);

module.exports = { firestore, rtdb };
