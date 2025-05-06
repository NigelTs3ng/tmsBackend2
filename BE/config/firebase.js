const admin = require("firebase-admin");

// Load the service account key
const serviceAccount = require("./firestore-key.json");

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
});

// Initialize Firestore
const db = admin.firestore();

module.exports = db;