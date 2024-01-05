const catchAsyncErrors = require("../middlewares/catchAsyncErrors")
const connection = require("../config/database")
// const session = require("express-session")
const bcrypt = require("bcrypt")
const ErrorHandler = require("../utils/errorHandlers")
const jwt = require("jsonwebtoken")
const checkGroup = require("../controllers/checkGroup")

/*--------------------------------------Session Config-----------------------------------------*/

// app.use(
//   session({
//     secret: "secret_key",
//     resave: false,
//     saveUninitialized: true
//   })
// )

/*--------------------------------------Auth Functions------------------------------------------*/

//Check out no. of hops here:

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

async function checkUserActive(res, req, next) {
  const token = req.body.token
  const user = await verifyUser(token)

  if (!user) {
    return res.json({ error: "Invalid user/token!" })
  }

  const [results] = connection.execute("SELECT userGroup FROM users WHERE username ?", [user])
  if (results.length < 1 || results[0].userGroup == 0) {
    return res.json({ error: "User has been disabled!" })
  }
  next()
}

/*--------------------------------------Register User------------------------------------------*/
exports.registerUser = catchAsyncErrors(async (req, res) => {
  const { username, email, password, userGroup, isActive } = req.body
  console.log(req.body)
  const token = req.headers.authorization

  if (!token) {
    return res.json({
      error: "Token must be provided!"
    })
  }

  // Verify token
  let verify = await verifyUser(token)
  console.log("verify: " + verify)
  if (!verify) {
    console.log("verify: " + verify)
    return res.json({ error: "Token is invalid!" })
  }

  // Check Active
  const [resultsActive] = await connection.execute("SELECT isActive FROM users WHERE username = ?", [verify])
  if (resultsActive[0].isActive === 0) {
    return res.status(400).json({
      error: "User is inactive!"
    })
  }

  // Check group if admin
  let group = "admin"
  let checkGroupResult = await checkGroup(verify, group)
  if (!checkGroupResult) {
    return res.status(400).json({ error: "Invalid access to view this!" })
  } else {
    try {
      const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,10}$/

      if (!passwordRegex.test(password)) {
        res.json({ error: "Email and/or password is invalid" })
        return
      }

      // Hashing password with bcrypt
      const hashedPassword = await bcrypt.hash(password, 10)

      const sql = "INSERT INTO users (username, email, password, userGroup, isActive) VALUES (?, ?, ?, ?, ?)"
      const [rows] = await connection.execute(sql, [username, email || null, hashedPassword, userGroup || null, isActive || null])
      // console.log(rows)

      res.status(200).json({
        success: true,
        message: "User registered successfully!",
        data: rows
      })
    } catch (err) {
      // Send the error message in the response
      res.status(400).json({
        success: false,
        message: "User not registered",
        error: err.message // Include the error message for debugging
      })
      console.log("Error registering!", err)
    }
  }

  //Do another conditional here to check if username and password is there
})

/*--------------------------------------Login User------------------------------------------*/
exports.loginUser = catchAsyncErrors(async (req, res, next) => {
  const { username, password } = req.body

  //Check username or password empty
  if (!username || !password) {
    return res.json({
      error: "Username and/or password is incorrect!"
    })
  }

  // Password length validation
  if (password.length < 8 || password.length > 10) {
    return res.json({
      error: "Username and/or password is incorrect!"
    })
  }

  try {
    // Check if user exist & password validity
    const [results] = await connection.execute("SELECT * FROM users WHERE username = ?", [username])
    if (results.length < 1) {
      return res.json({
        error: "Username and/or password is incorrect!"
      })
    }

    // Check Active
    const [resultsActive] = await connection.execute("SELECT isActive FROM users WHERE username = ?", [username])
    if (resultsActive[0].isActive === 0) {
      return res.json({
        error: "User is inactive!"
      })
    }

    //Check if password is correct
    const match = bcrypt.compareSync(password, results[0].password)
    if (!match) {
      return res.json({
        error: "Username and/or password is incorrect!"
      })
    }

    //If user is verified, create JWT for user
    const token = getToken(username)

    //Session settings
    // req.session.isLoggedIn = true
    // req.session.username = username

    //Return token in response
    return res.json({ error: null, response: "Login Successful!", token: token })
  } catch (err) {
    return next(new ErrorHandler("Internal Server Error!", 500))
  }
})

/*--------------------------------------View all users---------------------------------------*/
exports.viewAllUsers = catchAsyncErrors(async (req, res, next) => {
  // Get token from request headers
  const token = req.headers.authorization // Use 'authorization' header for the token

  if (!token) {
    return res.json({ error: "Token must be provided!" })
  }

  // Verify token
  let verify = await verifyUser(token)
  if (!verify) {
    return res.json({ error: "Token is invalid!" })
  }

  const [resultsActive] = await connection.execute("SELECT isActive FROM users WHERE username = ?", [verify])
  if (resultsActive[0].isActive === 0) {
    return res.json({
      error: "User is inactive!"
    })
  }

  // Check group if admin
  let group = "admin"
  let checkGroupResult = await checkGroup(verify, group)
  if (!checkGroupResult) {
    return res.json({ error: "Invalid access to view this!" })
  }

  try {
    const [results] = await connection.execute("SELECT username, password, email, userGroup, isActive FROM users")
    res.json({ error: null, response: results })
  } catch (err) {
    return next(new ErrorHandler("Internal Server Error!", 500))
  }
})

/*--------------------------------------View all Usergroups--------------------------------*/
exports.viewAllGroups = catchAsyncErrors(async (req, res, next) => {
  // Get token from request headers
  const token = req.headers.authorization // Use 'authorization' header for the token
  console.log("request headers here: ", req.headers.authorization)

  if (!token) {
    return res.json({ error: "Token must be provided!" })
  }

  // Verify token
  let verify = await verifyUser(token)
  if (!verify) {
    console.log("verify: " + verify)
    return res.json({ error: "Token is invalid!" })
  }

  // // Check group if admin
  // let group = "admin"
  // let checkGroupResult = await checkGroup(verify, group)
  // if (!checkGroupResult) {
  //   return res.json({ error: "Invalid access to view this!" })
  // }

  try {
    const [results] = await connection.execute("SELECT * from `groups`")
    res.json({ error: null, response: results })
  } catch (err) {
    return next(new ErrorHandler("Internal Server Error!", 500))
  }
})

/*--------------------------------------Create New Usergroups-------------------------------------*/

exports.createGroup = catchAsyncErrors(async (req, res, next) => {
  const { userGroup, token } = req.body

  // Verify token
  let verify = await verifyUser(token)
  if (!verify) {
    console.log("verify: " + verify)
    return res.json({ error: "Token is invalid" })
  }

  // Check group if admin (Try not to hardcode admin into create group)
  let group = "admin"
  let checkGroupResult = await checkGroup(verify, group)
  if (!checkGroupResult) {
    res.json({ error: "Invalid access to view this!" })
  }

  try {
    const [results] = await connection.execute("SELECT * from `groups` WHERE userGroup = ?", [userGroup])

    if (results.length > 0) {
      res.json({
        error: "This user group already exists!"
      })
    }
    const [replace] = await connection.execute("INSERT INTO `groups` (userGroup) VALUES (?)", [userGroup])
    res.json({ error: null, message: "User group has been added!" })
  } catch (err) {
    return next(new ErrorHandler("Internal Server Error!", 500))
  }
})

/*--------------------------------------Change User Details--------------------------------------*/

exports.editDetails = catchAsyncErrors(async (req, res, next) => {
  const token = req.headers.authorization
  if (!token) {
    return res.json({
      error: "Token is required!"
    })
  }

  // Verify token
  let verify = await verifyUser(token)
  if (!verify) {
    return res.json({ error: "Token is invalid" })
  }

  // Check group if admin
  let group = "admin"
  let checkGroupResult = await checkGroup(verify, group)
  if (!checkGroupResult) {
    return res.json({ error: "Invalid access to view this!" })
  }

  const { username, newPassword, newEmail, newUsergroup, isActive } = req.body
  console.log("body here: ", req.body)

  try {
    const verify = await verifyUser(token)
    console.log("verify here: ", verify)

    const [results] = await connection.execute("SELECT * FROM users WHERE username = ?", [username])

    // Check if user exists in the database
    if (results.length < 1) {
      res.json({
        error: "This user does not exist!"
      })
    }

    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,10}$/

    // Encrypt new password, else return old password
    const hashedPassword = newPassword ? bcrypt.hashSync(newPassword, 10) : results[0].password

    // Main body of query
    let query = "UPDATE users SET "
    let params = []

    // Password length validation
    if (newPassword !== undefined && newPassword !== null && newPassword !== "") {
      if (!passwordRegex.test(newPassword)) {
        res.json({ error: "Email and/or password is invalid" })
        return
      } else {
        query += "password = ?, "
        params.push(hashedPassword)
      }
    }

    if (newEmail || newEmail === "") {
      query += "email = ?, "
      params.push(newEmail)
    }

    if (newUsergroup || newUsergroup === "") {
      query += "userGroup = ?, "
      params.push(newUsergroup)
    }

    query += "isActive = ?, "
    params.push(isActive)

    // Remove the trailing comma and space
    query = query.slice(0, -2)
    console.log("query here: ", query)

    query += " WHERE username = ?"
    params.push(username)

    console.log(query, params)
    await connection.execute(query, params)
    return res.json({
      error: null,
      message: "Details changed successfully!",
      username: verify.user
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/*--------------------------------------Check group--------------------------------------*/

exports.checkGroup = catchAsyncErrors(async (req, res, next) => {
  const { token, userGroup } = req.body

  try {
    const verify = await verifyToken(token)
    const CheckUser = await checkGroup(verify.user, userGroup)
    if (CheckUser) {
      return res.json({
        error: null,
        message: "User is valid!",
        response: true
      })
    } else {
      return res.json({
        error: "User is invalid",
        response: false
      })
    }
  } catch (err) {
    console.error("Internal Server Error: ", err)
    return res.status(500).json({ error: "Internal Server Error" })
  }
})

/*--------------------------------------Profile--------------------------------------*/

exports.viewProfile = catchAsyncErrors(async (req, res, next) => {
  // Get token from request headers
  const token = req.headers.authorization

  if (!token) {
    return res.json({ error: "Token must be provided" })
  }

  // Verify token
  let verify = await verifyUser(token)

  if (!verify) {
    return res.json({ error: "Token is invalid!" })
  }

  try {
    // Use a prepared statement to prevent SQL injection
    const [results] = await connection.execute("SELECT username, email FROM users WHERE username = ?", [verify])

    if (results.length === 0) {
      return res.json({ error: "User not found" })
    }

    const user = results[0]
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
    const [resultsActive] = await connection.execute("SELECT isActive FROM users WHERE username = ?", [verify.user])
    if (resultsActive[0].isActive === 0) {
      return res.status(400).json({
        error: "User is inactive!"
      })
    }
    const [results] = await connection.execute("SELECT * FROM users WHERE username = ?", [verify.user])

    // Check if user exists in db
    if (results.length < 1) {
      res.json({
        error: "This user does not exist!"
      })
    }

    // Encrypt new password, else return old password
    const hashedPassword = newPassword ? bcrypt.hashSync(newPassword, 10) : results[0].password

    // Main body of the query
    let query = "UPDATE users SET"
    let params = []

    // Password length validation
    if (newPassword !== undefined && newPassword !== null && newPassword !== "") {
      if (!passwordRegex.test(newPassword)) {
        res.json({ error: "Email and/or password is invalid" })
        return
      } else {
        query += " password = ?,"
        params.push(hashedPassword || null)
      }
    }

    if (newEmail !== undefined) {
      query += " email = ?,"
      params.push(newEmail)
    }

    // Remove trailing comma
    query = query.slice(0, -1)
    query += " WHERE username = ?"
    params.push(verify.user)

    await connection.execute(query, params)
    return res.json({
      error: null,
      message: "Password/Username changed successfully!",
      username: verify.username // Corrected the response
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/*---------------------------------A2 starts here--------------------------------------*/
