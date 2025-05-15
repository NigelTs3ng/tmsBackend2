const catchAsyncErrors = require("../middlewares/catchAsyncErrors")
const db = require("../utils/supabaseQueries")
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

// Export verifyUser for use in other controllers
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
// Export the function
exports.verifyUser = verifyUser

async function checkUserActive(res, req, next) {
  const token = req.body.token
  const user = await verifyUser(token)

  if (!user) {
    return res.json({ error: "Invalid user/token!" })
  }

  const [results, error] = await db.select('users', '*', { username: user })
  if (results.length < 1 || results[0].userGroup == 0) {
    return res.json({ error: "User has been disabled!" })
  }
  next()
}

/*--------------------------------------Register User------------------------------------------*/
exports.registerUser = catchAsyncErrors(async (req, res) => {
  const { username, email, password, usergroup, isactive } = req.body
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

  // Check Active - Modified to use Supabase
  const [resultsActive, activeError] = await db.select('users', 'isactive', { username: verify })
  if (activeError || resultsActive[0].isactive === 0) {
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

      // Modified to use Supabase with correct field casing
      const [rows, insertError] = await db.insert('users', {
        username, 
        email: email || null,
        password: hashedPassword,
        usergroup: usergroup || null,
        isactive: isactive || null
      })
      
      if (insertError) {
        throw insertError
      }

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

  try {
    // Check if user exist & password validity - Modified to use Supabase
    const [results, userError] = await db.select('users', '*', { username })
    if (userError || results.length < 1) {
      return res.json({
        error: "Username and/or password is incorrect! 1"
      })
    }

    // Check Active - Modified to use Supabase with lowercase field name
    const [resultsActive, activeError] = await db.select('users', 'isactive', { username })
    if (activeError || resultsActive[0].isactive === 0) {
      return res.json({
        error: "User is inactive!"
      })
    }

    //Check if password is correct
    const match = bcrypt.compareSync(password, results[0].password)
    if (!match) {
      return res.json({
        error: "Username and/or password is incorrect! 2"
      })
    }

    //If user is verified, create JWT for user
    const token = getToken(username)

    // Get user's role information
    const userGroup = results[0].usergroup
    let role = "employee";
    let isAdmin = false;
    
    if (userGroup) {
      const [groupResult] = await db.select('groups', '*', { id: userGroup });
      if (groupResult && groupResult.length > 0 && groupResult[0].usergroup === 'admin') {
        role = "admin";
        isAdmin = true;
      }
    }
    
    // Check if user is linked to an employee
    let employeeData = null;
    const [employeeResults] = await db.select('employees', '*', { username });
    if (employeeResults && employeeResults.length > 0) {
      employeeData = {
        employee_id: employeeResults[0].employee_id,
        first_name: employeeResults[0].first_name,
        last_name: employeeResults[0].last_name
      };
    }

    //Return token and user role in response
    return res.json({ 
      error: null, 
      response: "Login Successful!", 
      token: token,
      user: {
        username,
        role,
        isAdmin,
        employee: employeeData
      }
    })
  } catch (err) {
    console.error('Login error:', err);
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

  const [resultsActive] = await db.select('users', 'isactive', { username: verify })
  if (resultsActive[0].isactive === 0) {
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
    const [results] = await db.select('users', '*')
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
    const [results] = await db.select('groups', '*')
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
    const [results] = await db.select('groups', '*', { userGroup })

    if (results.length > 0) {
      res.json({
        error: "This user group already exists!"
      })
    }
    const [replace] = await db.insert('groups', { userGroup })
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

    const [results] = await db.select('users', '*', { username })

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
    await db.execute(query, params)
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
    const [results] = await db.select('users', '*', { username: verify })

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
    const [resultsActive] = await db.select('users', 'isActive', { username: verify.user })
    if (resultsActive[0].isActive === 0) {
      return res.status(400).json({
        error: "User is inactive!"
      })
    }
    const [results] = await db.select('users', '*', { username: verify.user })

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

    await db.execute(query, params)
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

/*--------------------------------------Register Employee User------------------------------------------*/
exports.registerEmployeeUser = catchAsyncErrors(async (req, res, next) => {
  const { 
    username, 
    email, 
    password, 
    employee_id, 
    isActive = 1,
    // If linking to an existing employee, we need the employee_id
    // If creating a new employee record, we need these details
    first_name, 
    last_name,
    phone,
    department_id,
    position_id,
    hire_date
  } = req.body;
  
  const token = req.headers.authorization;

  // Verify admin token
  if (!token) {
    return res.status(401).json({
      error: "Token must be provided!"
    });
  }

  // Verify token
  let verify = await verifyUser(token);
  if (!verify) {
    return res.status(401).json({ error: "Token is invalid!" });
  }

  // Check Active
  const [resultsActive, activeError] = await db.select('users', 'isActive', { username: verify });
  if (activeError || resultsActive[0].isActive === 0) {
    return res.status(403).json({
      error: "User is inactive!"
    });
  }

  // Check if admin
  let group = "admin";
  let checkGroupResult = await checkGroup(verify, group);
  if (!checkGroupResult) {
    return res.status(403).json({ error: "Admin privileges required!" });
  }

  try {
    // Password validation
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,10}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ 
        error: "Password must be 8-10 characters with at least one letter, one number, and one special character" 
      });
    }

    // Check if username already exists
    const [existingUser] = await db.select('users', '*', { username });
    if (existingUser && existingUser.length > 0) {
      return res.status(400).json({
        error: "Username already exists"
      });
    }

    // Get employee group ID (non-admin)
    const [employeeGroup] = await db.select('groups', '*', { userGroup: 'employee' });
    if (!employeeGroup || employeeGroup.length === 0) {
      // Create employee group if it doesn't exist
      const [newGroup] = await db.insert('groups', { userGroup: 'employee' });
      var employeeGroupId = newGroup[0].id;
    } else {
      var employeeGroupId = employeeGroup[0].id;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user account
    const [newUser, userError] = await db.insert('users', {
      username,
      email: email || null,
      password: hashedPassword,
      userGroup: employeeGroupId,
      isActive: isActive
    });

    if (userError) {
      throw userError;
    }

    // Check if we're linking to an existing employee or creating a new one
    if (employee_id) {
      // Link user to existing employee
      const [updatedEmployee, empError] = await db.update(
        'employees',
        { username },
        { employee_id }
      );

      if (empError) {
        throw new Error(`Failed to link user to employee record: ${empError.message}`);
      }

      return res.status(200).json({
        success: true,
        message: "Employee user registered and linked to existing employee record",
        data: {
          user: newUser[0],
          employee_id
        }
      });
    } 
    // Create new employee record
    else if (first_name && last_name && hire_date) {
      // Generate a unique employee ID if not provided
      const newEmployeeId = employee_id || `EMP${Math.floor(100000 + Math.random() * 900000)}`;
      
      const [newEmployee, empError] = await db.insert('employees', {
        employee_id: newEmployeeId,
        first_name,
        last_name,
        email: email || null,
        phone: phone || null,
        department_id: department_id || null,
        position_id: position_id || null,
        hire_date,
        status: 'Active',
        username
      });

      if (empError) {
        throw new Error(`Failed to create employee record: ${empError.message}`);
      }

      return res.status(200).json({
        success: true,
        message: "Employee user registered with new employee record",
        data: {
          user: newUser[0],
          employee: newEmployee[0]
        }
      });
    } 
    else {
      return res.status(400).json({
        error: "Either employee_id for existing employee or new employee details (first_name, last_name, hire_date) must be provided"
      });
    }
  } catch (err) {
    console.error("Error registering employee user:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to register employee user",
      error: err.message
    });
  }
});
