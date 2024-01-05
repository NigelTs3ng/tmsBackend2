const catchAsyncErrors = require("../middlewares/catchAsyncErrors")
const connection = require("../config/database")
// const session = require("express-session")
const bcrypt = require("bcrypt")
const ErrorHandler = require("../utils/errorHandlers")
const jwt = require("jsonwebtoken")
const checkGroup = require("../controllers/checkGroup")
const nodemailer = require("nodemailer")
const dotenv = require("dotenv")

// Set up config.env file variables
dotenv.config({ path: "./config/config.env" })

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

/*============================================A2 APIs=====================================================*/

/*--------------------------------------Create Application------------------------------------------*/

exports.createApplication = catchAsyncErrors(async (req, res) => {
  // POST header (Token)
  const token = req.headers.authorization
  console.log("token here bro: ", req.headers.authorization)

  // Retrive username
  let verify = await verifyUser(token)

  // Check if user is PL
  const checkAdmin = await checkGroup(verify, "PL")
  if (!checkAdmin) {
    return res.json({ error: "User does not have permission to create app!" })
  }

  // POST body (Data)
  let { App_Acronym, App_Description, App_Rnumber, App_startDate, App_endDate, App_permit_Open, App_permit_toDoList, App_permit_Doing, App_permit_Done, App_permit_Create } = req.body

  // Validify R number
  if (App_Rnumber < 0 || App_Rnumber === "") {
    res.status(400).json({
      error: "R number is invalid! (Must be entered/positive integer)"
    })
  }

  try {
    // Create application
    const [rows] = await connection.execute(
      "INSERT INTO application (App_Acronym, App_Description, App_Rnumber, App_startDate, App_endDate, App_permit_Open, App_permit_toDoList, App_permit_Doing, App_permit_Done, App_permit_Create) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        App_Acronym,
        App_Description || null,
        App_Rnumber,
        App_startDate,
        App_endDate,
        App_permit_Open || null,
        App_permit_toDoList || null,
        App_permit_Doing || null,
        App_permit_Done || null,
        App_permit_Create
      ]
    )
    res.status(200).json({
      success: true,
      message: "Application created!",
      data: rows
    })
  } catch (err) {
    res.status(401).json({
      success: false,
      message: "Error creating application!",
      error: err.message
    })
  }
})

/*--------------------------------------View all Application------------------------------------------*/

exports.viewAllApplication = catchAsyncErrors(async (req, res) => {
  try {
    // View all application
    const [results] = await connection.execute("SELECT * FROM application")
    res.status(200).json({
      success: true,
      message: "All application displayed!",
      data: results
    })
  } catch (err) {
    res.status(400).json({
      success: false,
      message: "Error viewing application!",
      error: err.message
    })
  }
})

/*------------------------------------------Edit Application------------------------------------------*/

exports.editApplication = catchAsyncErrors(async (req, res) => {
  // Fetch token from frontend
  const token = req.headers.authorization
  if (!token) {
    return res.json({ error: "Token is required!" })
  }

  let { App_Description, App_startDate, App_endDate, App_permit_Open, App_permit_toDoList, App_permit_Doing, App_permit_Done, App_permit_Create, App_Acronym } = req.body

  // Get username from token
  let verify = await verifyUser(token)
  if (!verify) {
    return res.json({
      error: "Token is invalid"
    })
  }

  // Check if group is PL
  const isPL = await checkGroup(verify, "PL")
  if (!isPL) {
    return res.status(301).json({
      success: false,
      error: "User is not a PL"
    })
  }

  try {
    const response = await connection.execute(
      "UPDATE application SET App_Description = ?, App_startDate = ?, App_endDate = ?, App_permit_Open = ?, App_permit_toDoList = ?, App_permit_Doing = ?, App_permit_Done = ?, App_permit_Create = ? WHERE App_Acronym = ?",
      [App_Description, App_startDate, App_endDate, App_permit_Open, App_permit_toDoList, App_permit_Doing, App_permit_Done, App_permit_Create, App_Acronym] // Corrected parameters
    )
    return res.status(200).json({
      success: "Application has been updated!"
    })
  } catch (error) {
    console.error(error) // Log the error for debugging
    return res.status(500).json({
      error: "An error occurred while updating the application."
    })
  }
})

/*------------------------------------------Create Plan-----------------------------------------------*/

exports.createPlan = catchAsyncErrors(async (req, res) => {
  // Get token from frontend
  const token = req.headers.authorization

  let { Plan_MVP_name, Plan_startDate, Plan_endDate, App_Acronym } = req.body

  let Plan_app_Acronym = App_Acronym

  // Get username from token
  let verify = await verifyUser(token)

  // Check if user is PM
  const isPM = await checkGroup(verify, "PM")
  if (!isPM) {
    res.status(400).json({
      success: false,
      error: "User is not a PM!"
    })
  }

  try {
    const response = await connection.execute("INSERT INTO plan (Plan_MVP_name, Plan_startDate, Plan_endDate, Plan_app_Acronym) VALUES (?, ?, ?, ?)", [
      Plan_MVP_name,
      Plan_startDate || null,
      Plan_endDate || null,
      Plan_app_Acronym
    ])
    return res.status(200).json({
      success: true,
      message: "Plan added successfully!",
      data: response
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Plan cannot be added!",
      error: error
    })
  }
})

/*------------------------------------------View all Plan by MVP Name-----------------------------------------------*/

exports.viewPlans = catchAsyncErrors(async (req, res) => {
  // Take in App_Acronym from FE
  let { App_Acronym } = req.body
  let Plan_app_Acronym = App_Acronym

  try {
    // Return all plans tagged to App_Acronym
    const [rows] = await connection.execute("SELECT Plan_MVP_name FROM plan WHERE Plan_app_Acronym = ?", [Plan_app_Acronym])
    return res.status(200).json({
      success: true,
      data: rows
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Plans cannot be viewed!"
    })
  }
})

/*------------------------------------------View all Plan Details-----------------------------------------------*/

exports.viewPlanDetails = catchAsyncErrors(async (req, res) => {
  // Take in App_Acronym from FE
  let { App_Acronym } = req.body
  let Plan_app_Acronym = App_Acronym

  try {
    // Return all plans tagged to App_Acronym
    const [rows] = await connection.execute("SELECT * FROM plan WHERE Plan_app_Acronym = ?", [Plan_app_Acronym])
    return res.status(200).json({
      success: true,
      data: rows
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Plans cannot be viewed!"
    })
  }
})

/*------------------------------------------Edit Plan-----------------------------------------------*/

exports.editPlan = catchAsyncErrors(async (req, res) => {
  // Take token in header from frontend
  const token = req.headers.authorization

  let { Plan_startDate, Plan_endDate, Plan_app_Acronym } = req.body
  console.log("here it is: ", req.body)

  let verify = await verifyUser(token)

  // Verify if user is PM
  const isPM = await checkGroup(verify, "PM")
  if (!isPM) {
    return res.status(404).json({
      success: false,
      message: "User is not a PM, cannot edit plan!"
    })
  }

  // Edit plan call
  try {
    const response = await connection.execute("UPDATE plan SET Plan_startDate = ?, Plan_endDate = ? WHERE Plan_app_Acronym = ?", [Plan_startDate || null, Plan_endDate || null, Plan_app_Acronym])
    return res.status(200).json({
      success: true,
      message: "Plan has been updated!"
    })
  } catch (error) {
    console.log("Error here: ", error)
    return res.status(500).json({
      success: false,
      messasge: "Internal Server Error!"
    })
  }
})

/*------------------------------------------Create Task-----------------------------------------------*/

exports.createTask = catchAsyncErrors(async (req, res) => {
  // Get token from frontend
  const token = req.headers.authorization

  let { Task_name, Task_description, Task_plan, App_Acronym } = req.body

  // Get username from token
  let verify = await verifyUser(token)

  // Check if user is permitted
  const permittedGroupsData = await connection.execute("SELECT App_permit_Create FROM application")
  const permittedGroups = permittedGroupsData[0].map(item => item.App_permit_Create)

  let isPermitted = false
  for (const group of permittedGroups) {
    if (await checkGroup(verify, group)) {
      isPermitted = true
      break
    }
  }

  if (!isPermitted) {
    return res.status(400).json({
      success: false,
      error: "User does not have permission to create a task!"
    })
  }

  // Construction of Task_id
  const idComponents = await connection.execute("SELECT App_Rnumber FROM application WHERE App_Acronym = ?", [App_Acronym])
  const TaskId = `${App_Acronym}_${idComponents[0][0].App_Rnumber}`

  // Set Task_app_Acronym = App_Acronym
  let Task_app_Acronym = App_Acronym

  // Set Task_creator as username of user
  let Task_creator = verify

  // Set Task_owner as username of user
  let Task_owner = verify

  // Set current date (Maybe try dayjs)
  const currentDate = new Date().toISOString().slice(0, 19).replace("T", " ")

  // Set initial audit trail
  let Task_notes = `Task was created on ${currentDate} by ${verify}`

  // Set task state
  let currentState = "open"
  const Task_state = currentState

  try {
    const response = await connection.execute(
      "INSERT INTO task (Task_name, Task_description, Task_notes, Task_id, Task_plan, Task_app_Acronym, Task_state, Task_creator, Task_owner, Task_createDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [Task_name, Task_description || null, Task_notes || null, TaskId, Task_plan || null, Task_app_Acronym, Task_state, Task_creator, Task_owner, currentDate]
    )
    // Update Rnumber in Application
    const updateRnumber = await connection.execute("UPDATE application SET App_Rnumber = App_Rnumber + 1 WHERE App_Acronym = ?", [App_Acronym])
    return res.status(200).json({
      success: true,
      message: "Task added successfully!",
      data: response.message
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Task cannot be added!",
      error: error
    })
  }
})

/*------------------------------------------Check App Create Permit-----------------------------------------------*/

exports.checkPermitCreate = catchAsyncErrors(async (req, res) => {
  // Get token from frontend
  const token = req.headers.authorization

  // Get App_Acronym from frontend
  let { App_Acronym } = req.body

  // Get username from token
  let verify = await verifyUser(token)

  try {
    // Check if user is permitted
    const permittedGroupsData = await connection.execute("SELECT App_permit_Create FROM application WHERE App_Acronym = ?", [App_Acronym])
    const permittedGroups = permittedGroupsData[0].map(item => item.App_permit_Create)

    let isPermitted = false
    for (const group of permittedGroups) {
      if (await checkGroup(verify, group)) {
        isPermitted = true
        break
      }
    }
    return res.status(200).json({
      success: true,
      data: isPermitted
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Internal Server Error!"
    })
  }
})

/*------------------------------------------Check Task Permit-----------------------------------------------*/

exports.checkTaskPermit = catchAsyncErrors(async (req, res) => {
  // Take in token from FE & find out username
  const token = req.headers.authorization
  let verify = await verifyUser(token)

  // Take in Task_id in body
  let { Task_id } = req.body

  // Retrive App_Acronym from Task_id
  let App_Acronym = Task_id.split("_")[0]

  // Check task state
  const [taskStateResult] = await connection.execute("SELECT Task_state FROM task WHERE Task_id = ?", [Task_id])
  const taskState = taskStateResult[0]?.Task_state

  // Check which group is in that task state
  let columnName
  switch (taskState) {
    case "open":
      columnName = "App_permit_Open"
      break
    case "todo":
      columnName = "App_permit_toDoList"
      break
    case "doing":
      columnName = "App_permit_Doing"
      break
    case "done":
      columnName = "App_permit_Done"
      break
    case "create":
      columnName = "App_permit_Create"
      break
    default:
      res.status(404).json({
        success: false,
        error: "Task State does not exist!"
      })
  }

  let query = `SELECT ${columnName} FROM application WHERE App_Acronym = ?`
  let params = [App_Acronym]
  const [groups] = await connection.execute(query, params)
  console.log("hiiiiii", groups)

  // checkGroup function to check if user is in that group
  let isPermitted = false
  const checkRights = await checkGroup(verify, groups[0][columnName])
  if (checkRights) {
    isPermitted = true
  }
  return res.status(200).json({
    success: true,
    data: isPermitted
  })
})

/*------------------------------------------View all Task-----------------------------------------------*/

exports.viewAllTasks = catchAsyncErrors(async (req, res) => {
  let { App_Acronym } = req.body
  try {
    const rows = await connection.execute("SELECT * FROM task WHERE Task_app_Acronym = ?", [App_Acronym])
    res.status(200).json({
      success: true,
      data: rows[0]
    })
  } catch (error) {
    console.log(error)
    res.status(500).json({
      success: false,
      message: "Plans cannot be viewed!"
    })
  }
})

/*----------------------------------------------Edit Task-----------------------------------------------*/

exports.editTask = catchAsyncErrors(async (req, res) => {
  // Take in token from FE & find out username
  const token = req.headers.authorization
  let verify = await verifyUser(token)

  // Take in Task_id in body
  let { Task_id, Task_plan, Task_add_notes } = req.body

  // Retrive App_Acronym from Task_id
  let App_Acronym = Task_id.split("_")[0]

  // Check task state
  const [taskStateResult] = await connection.execute("SELECT Task_state FROM task WHERE Task_id = ?", [Task_id])
  const taskState = taskStateResult[0]?.Task_state

  // Check which group is in that task state
  let columnName
  switch (taskState) {
    case "open":
      columnName = "App_permit_Open"
      break
    case "todo":
      columnName = "App_permit_toDoList"
      break
    case "doing":
      columnName = "App_permit_Doing"
      break
    case "done":
      columnName = "App_permit_Done"
      break
    default:
      res.status(404).json({
        success: false,
        error: "Task State does not exist!"
      })
  }

  let query = `SELECT ${columnName} FROM application WHERE App_Acronym = ?`
  let params = [App_Acronym]
  const [groups] = await connection.execute(query, params)

  // Building audit trail
  const [currentNotes] = await connection.execute("SELECT Task_notes FROM task WHERE Task_id = ?", [Task_id])
  const currentDate = new Date().toISOString().slice(0, 19).replace("T", " ")

  // Details of the edit
  let editDetails = `Task has been edited on ${currentDate} by ${verify}`
  let updatedNotes = `${editDetails}`

  // Check if there are additional notes to append
  if (Task_add_notes && Task_add_notes.trim() !== "") {
    let writtenNotes = `Additional Notes: ${Task_add_notes}`
    updatedNotes += `\n${writtenNotes}\n------------------------------`
  }

  // Append existing notes
  updatedNotes += `\n${currentNotes[0]?.Task_notes}`

  // checkGroup function to check if user is in that group
  const checkRights = await checkGroup(verify, groups[0][columnName])
  if (!checkRights) {
    res.status(400).json({
      success: false,
      error: "User does not have permission to edit this!"
    })
  }

  // Edit task call to DB & change owner to current user & update audit trail
  try {
    const [data] = await connection.execute("UPDATE task SET Task_plan = ?, Task_owner = ?, Task_notes = ? WHERE Task_id = ?", [Task_plan, verify, updatedNotes, Task_id])
    return res.json({
      success: true,
      message: "Task Updated!"
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Cannot update task!"
    })
    console.log(error)
  }
})

/*----------------------------------------------Promote & Demote Function-----------------------------------------------*/

exports.promoteTask = catchAsyncErrors(async (req, res) => {
  // Take in token from FE & find out username
  const token = req.headers.authorization
  let verify = await verifyUser(token)

  // Take in Task_id in body
  let { Task_id, PromoteTask } = req.body

  // Retrive App_Acronym from Task_id
  let App_Acronym = Task_id.split("_")[0]

  // Check task state
  const [taskStateResult] = await connection.execute("SELECT Task_state FROM task WHERE Task_id = ?", [Task_id])
  const taskState = taskStateResult[0]?.Task_state

  // Check which group is in that task state
  let columnName
  switch (taskState) {
    case "open":
      columnName = "App_permit_Open"
      break
    case "todo":
      columnName = "App_permit_toDoList"
      break
    case "doing":
      columnName = "App_permit_Doing"
      break
    case "done":
      columnName = "App_permit_Done"
      break
    default:
      res.status(404).json({
        success: false,
        error: "Task State does not exist!"
      })
  }

  let query = `SELECT ${columnName} FROM application WHERE App_Acronym = ?`
  let params = [App_Acronym]
  const [groups] = await connection.execute(query, params)

  // checkGroup function to check if user is in that group
  const checkRights = await checkGroup(verify, groups[0][columnName])
  if (!checkRights) {
    return res.status(400).json({
      success: false,
      error: "User does not have permission to edit this!"
    })
  }

  // Logic to map promote or demotion
  let promoteTo
  if (PromoteTask) {
    switch (taskState) {
      case "open":
        promoteTo = "todo"
        break
      case "todo":
        promoteTo = "doing"
        break
      case "doing":
        promoteTo = "done"
        break
      case "done":
        promoteTo = "closed"
        break
      default:
        res.status(404).json({
          success: false,
          error: error
        })
    }
  } else {
    switch (taskState) {
      case "doing":
        promoteTo = "todo"
        break
      case "done":
        promoteTo = "doing"
        break
      default:
        res.status(404).json({
          success: false,
          error: "Task state is not available!"
        })
    }
  }

  // Building audit trail
  const [currentNotes] = await connection.execute("SELECT Task_notes FROM task WHERE Task_id = ?", [Task_id])
  const currentDate = new Date().toISOString().slice(0, 19).replace("T", " ")
  let additionalNotes = `Task status has been updated to ${promoteTo} from ${taskState} by ${verify} on ${currentDate}\n------------------------------`
  const updatedNotes = `${additionalNotes}\n${currentNotes[0]?.Task_notes}`

  // Query all groups in App_permit_Done
  const [emailGroupList] = await connection.execute("SELECT App_permit_Done FROM application WHERE App_Acronym = ?", [App_Acronym])
  console.log("here 1", emailGroupList[0].App_permit_Done)

  // Get email
  const [plEmails] = await connection.execute("SELECT email FROM users WHERE userGroup LIKE ?", [emailGroupList[0].App_permit_Done])
  console.log("Emails: ", plEmails)

  // Define the sendEmail function
  async function sendEmail(to, subject, text) {
    var transport = nodemailer.createTransport({
      host: "sandbox.smtp.mailtrap.io",
      port: 2525,
      auth: {
        user: process.env.NODE_MAILER_USER,
        pass: process.env.NODE_MAILER_PW
      }
    })

    var mailOptions = {
      from: "hello",
      to: to,
      subject: subject,
      text: text
    }

    await transport.sendMail(mailOptions)
  }

  try {
    const changeState = await connection.execute("UPDATE task SET Task_state = ?, Task_owner = ?, Task_notes = ? WHERE Task_id = ?", [promoteTo, verify, updatedNotes, Task_id])
    if (promoteTo === "done") {
      console.log("Email Sent!")
      sendEmail(plEmails.map(row => row.email).join(", "), "task completed", `Task ${Task_id} has been completed by ${verify}!`)
    }
    return res.status(200).json({
      success: true,
      message: "Task status has been updated & email has been sent!"
    })
  } catch (error) {
    console.log("here is error", error)
    return res.status(500).json({
      success: false,
      error: error
    })
  }
})
