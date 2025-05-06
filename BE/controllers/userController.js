const catchAsyncErrors = require("../middlewares/catchAsyncErrors")
const db = require("../config/firebase") // Use Firebase Firestore
const bcrypt = require("bcrypt")
const ErrorHandler = require("../utils/errorHandlers")
const jwt = require("jsonwebtoken")
const checkGroup = require("../controllers/checkGroup")

/*---------------------------Creating a user for db (initial setup)------------------------------------------*/

// Seed data for initial setup
async function seedData() {
  const hashedPassword = await bcrypt.hash("hello", 10); // Hash the password before storing it

  await db.collection("users").doc("admin@example.com").set({ // Use "admin@example.com" as the document ID
    email: "admin@example.com",
    password: hashedPassword, // Store the hashed password
    userGroup: "admin",
    isActive: 1
  });

  await db.collection("groups").doc("admin").set({});
  console.log("Data seeded successfully!");
}

// Uncomment the following line to run the seed function
// seedData();

/*--------------------------------------Auth Functions------------------------------------------*/

const getToken = user => {
  return jwt.sign({ user: user }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRY_TIME })
}

async function verifyToken(token) {
  let verify = await jwt.verify(token, process.env.JWT_SECRET)
  return verify
}

async function verifyUser(token) {
  try {
    let results = await verifyToken(token)
    if (results) {
      return results.user
    }
  } catch (err) {
    console.log("error: " + err)
    return null
  }
}

/*--------------------------------------Register User------------------------------------------*/
exports.registerUser = catchAsyncErrors(async (req, res) => {
  const { username, email, password, userGroup, isActive } = req.body
  const token = req.headers.authorization

  if (!token) {
    return res.json({ error: "Token must be provided!" })
  }

  // Verify token
  let verify = await verifyUser(token)
  if (!verify) {
    return res.json({ error: "Token is invalid!" })
  }

  // Check Active
  const userDoc = await db.collection("users").doc(verify).get()
  if (!userDoc.exists || userDoc.data().isActive === 0) {
    return res.status(400).json({ error: "User is inactive!" })
  }

  // Check group if admin
  let group = "admin"
  let checkGroupResult = await checkGroup(verify, group)
  if (!checkGroupResult) {
    return res.status(400).json({ error: "Invalid access to view this!" })
  }

  try {
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,10}$/
    if (!passwordRegex.test(password)) {
      return res.json({ error: "Email and/or password is invalid" })
    }

    // Hashing password with bcrypt
    const hashedPassword = await bcrypt.hash(password, 10)

    // Add user to Firestore
    await db.collection("users").doc(username).set({
      email: email || null,
      password: hashedPassword,
      userGroup: userGroup || null,
      isActive: isActive || null
    })

    res.status(200).json({
      success: true,
      message: "User registered successfully!"
    })
  } catch (err) {
    res.status(400).json({
      success: false,
      message: "User not registered",
      error: err.message
    })
  }
})

/*--------------------------------------Login User------------------------------------------*/
// filepath: /Users/werkspace/Desktop/Code Projs/hr-fe-be/tmsBackend2/BE/controllers/userController.js
// filepath: /Users/werkspace/Desktop/Code Projs/hr-fe-be/tmsBackend2/BE/controllers/userController.js
exports.loginUser = catchAsyncErrors(async (req, res, next) => {
  const { username, password } = req.body;

  console.log("Login attempt:", { username, password }); // Log the input payload

  if (!username || !password) {
    return res.json({ error: "Username and/or password is incorrect!" });
  }

  try {
    const userDoc = await db.collection("users").doc(username).get();
    console.log("Fetched user document:", userDoc.exists ? userDoc.data() : "User not found"); // Log the fetched user data

    if (!userDoc.exists) {
      return res.json({ error: "Username and/or password is incorrect!" });
    }

    const userData = userDoc.data();
    if (userData.isActive === 0) {
      return res.json({ error: "User is inactive!" });
    }

    const match = bcrypt.compareSync(password, userData.password);
    console.log("Password match:", match); // Log whether the password matches

    if (!match) {
      return res.json({ error: "Username and/or password is incorrect!" });
    }

    const token = getToken(username);
    return res.json({ error: null, response: "Login Successful!", token: token });
  } catch (err) {
    console.error("Error during login:", err); // Log any errors
    return next(new ErrorHandler("Internal Server Error!", 500));
  }
});

/*--------------------------------------View all users---------------------------------------*/
exports.viewAllUsers = catchAsyncErrors(async (req, res, next) => {
  const token = req.headers.authorization
  if (!token) {
    return res.json({ error: "Token must be provided!" })
  }

  let verify = await verifyUser(token)
  if (!verify) {
    return res.json({ error: "Token is invalid!" })
  }

  const userDoc = await db.collection("users").doc(verify).get()
  if (!userDoc.exists || userDoc.data().isActive === 0) {
    return res.json({ error: "User is inactive!" })
  }

  let group = "admin"
  let checkGroupResult = await checkGroup(verify, group)
  if (!checkGroupResult) {
    return res.json({ error: "Invalid access to view this!" })
  }

  try {
    const usersSnapshot = await db.collection("users").get()
    const users = usersSnapshot.docs.map(doc => doc.data())
    res.json({ error: null, response: users })
  } catch (err) {
    return next(new ErrorHandler("Internal Server Error!", 500))
  }
})

/*--------------------------------------View all Usergroups--------------------------------*/
exports.viewAllGroups = catchAsyncErrors(async (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.json({ error: "Token must be provided!" });
  }

  let verify = await verifyUser(token);
  if (!verify) {
    return res.json({ error: "Token is invalid!" });
  }

  try {
    const groupsSnapshot = await db.collection("groups").get();
    const groups = groupsSnapshot.docs.map(doc => ({
      id: doc.id, 
      ...doc.data(), 
    }));
    res.json({ error: null, response: groups });
  } catch (err) {
    return next(new ErrorHandler("Internal Server Error!", 500));
  }
});

/*--------------------------------------Create New Usergroups-------------------------------------*/

exports.createGroup = catchAsyncErrors(async (req, res, next) => {
  const { userGroup } = req.body; // Only take the userGroup from the body
  const token = req.headers.authorization; // Take the token from the headers

  if (!token) {
    return res.json({ error: "Token must be provided!" });
  }

  let verify = await verifyUser(token); // Verify the token
  if (!verify) {
    return res.json({ error: "Token is invalid!" });
  }

  let group = "admin";
  let checkGroupResult = await checkGroup(verify, group); // Check if the user belongs to the admin group
  if (!checkGroupResult) {
    return res.json({ error: "Invalid access to create a group!" });
  }

  try {
    const groupDoc = await db.collection("groups").doc(userGroup).get();

    if (groupDoc.exists) {
      return res.json({
        error: "This user group already exists!"
      });
    }

    await db.collection("groups").doc(userGroup).set({});
    res.json({ error: null, message: "User group has been added!" });
  } catch (err) {
    return next(new ErrorHandler("Internal Server Error!", 500));
  }
});

/*--------------------------------------Change User Details--------------------------------------*/

exports.editDetails = catchAsyncErrors(async (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.json({
      error: "Token is required!"
    });
  }

  let verify = await verifyUser(token);
  if (!verify) {
    return res.json({ error: "Token is invalid" });
  }

  let group = "admin";
  let checkGroupResult = await checkGroup(verify, group);
  if (!checkGroupResult) {
    return res.json({ error: "Invalid access to view this!" });
  }

  const { username, newPassword, newEmail, newUsergroup, isActive } = req.body;

  try {
    const userDoc = await db.collection("users").doc(username).get();

    if (!userDoc.exists) {
      return res.json({
        error: "This user does not exist!"
      });
    }

    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,10}$/;

    const hashedPassword = newPassword && passwordRegex.test(newPassword)
      ? bcrypt.hashSync(newPassword, 10)
      : undefined;

    // Build the updatedData object, excluding undefined values
    const updatedData = {};
    if (hashedPassword) updatedData.password = hashedPassword;
    if (newEmail) updatedData.email = newEmail;
    if (newUsergroup) updatedData.userGroup = newUsergroup;
    if (typeof isActive !== "undefined") updatedData.isActive = isActive;

    // Check if updatedData is empty
    if (Object.keys(updatedData).length === 0) {
      return res.json({
        error: "No valid fields provided for update!"
      });
    }

    await db.collection("users").doc(username).update(updatedData);
    return res.json({
      error: null,
      message: "Details changed successfully!",
      username: verify.user
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/*--------------------------------------Check group--------------------------------------*/

exports.checkGroup = catchAsyncErrors(async (req, res, next) => {
  const { token, userGroup } = req.body;

  try {
    // Verify the token to extract the username
    const verify = await verifyToken(token);

    // Fetch the user's document from Firestore
    const userDoc = await db.collection("users").doc(verify.user).get();

    // Check if the user exists and belongs to the specified group
    if (userDoc.exists && userDoc.data().userGroup === userGroup) {
      return res.json({
        error: null,
        message: "User is valid!",
        response: true
      });
    } else {
      return res.json({
        error: "User is invalid",
        response: false
      });
    }
  } catch (err) {
    console.error("Internal Server Error: ", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/*--------------------------------------Profile--------------------------------------*/

exports.viewProfile = catchAsyncErrors(async (req, res, next) => {
  const token = req.headers.authorization

  if (!token) {
    return res.json({ error: "Token must be provided" })
  }

  let verify = await verifyUser(token)

  if (!verify) {
    return res.json({ error: "Token is invalid!" })
  }

  try {
    const userDoc = await db.collection("users").doc(verify).get()

    if (!userDoc.exists) {
      return res.json({ error: "User not found" })
    }

    const user = userDoc.data()
    res.json({ error: null, response: user })
  } catch (err) {
    return next(new ErrorHandler("Internal Server Error!", 500))
  }
})

/*---------------------------------Edit Profile--------------------------------------*/

exports.editProfile = catchAsyncErrors(async (req, res, next) => {
  const token = req.headers.authorization
  if (!token) {
    return res.json({
      error: "Token is required!"
    })
  }

  const { newPassword, newEmail } = req.body

  try {
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,10}$/
    const verify = await verifyToken(token)
    const userDoc = await db.collection("users").doc(verify.user).get()

    if (!userDoc.exists || userDoc.data().isActive === 0) {
      return res.status(400).json({
        error: "User is inactive!"
      })
    }

    const hashedPassword = newPassword ? bcrypt.hashSync(newPassword, 10) : userDoc.data().password

    const updatedData = {}

    if (newPassword && passwordRegex.test(newPassword)) {
      updatedData.password = hashedPassword
    }

    if (newEmail) {
      updatedData.email = newEmail
    }

    await db.collection("users").doc(verify.user).update(updatedData)
    return res.json({
      error: null,
      message: "Password/Username changed successfully!",
      username: verify.user
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/*---------------------------------A2 starts here--------------------------------------*/
