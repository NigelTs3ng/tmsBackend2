const admin = require("firebase-admin");
const db = require("../config/firebase"); // Firestore instance

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

async function checkGroup(username, groupToCheck) {
  try {
    // Fetch the user document from Firestore
    const userDoc = await db.collection("users").doc(username).get();

    // Check if the user exists
    if (!userDoc.exists) {
      console.error(`User ${username} not found in Firestore.`);
      return false;
    }

    // Get the user's group and check if it matches the groupToCheck
    const userData = userDoc.data();
    const userGroup = userData.userGroup || "";

    return userGroup === groupToCheck;
  } catch (err) {
    console.error("Error in checkGroup:", err);
    throw err; // Throw the error to be handled in the calling function
  }
}

module.exports = checkGroup;
