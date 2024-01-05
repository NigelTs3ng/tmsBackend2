const bcrypt = require("bcrypt")
const connection = require("../config/database")
const nodemailer = require("nodemailer")
const dotenv = require("dotenv")

// Set up config.env file variables
dotenv.config({ path: "./config/config.env" })

//========================= CheckGroup function ==============================//

async function checkGroup(username, groupToCheck) {
  try {
    const sql = "SELECT * FROM users WHERE username = ? AND usergroup LIKE ?"
    const [results] = await connection.execute(sql, [username, `%${groupToCheck}%`])
    if (results.length > 0) {
      return true
    } else {
      return false
    }
  } catch (err) {
    console.error("Error in checkGroup:", err)
    throw err // You can throw the error to be handled in the calling function
  }
}

//========================= Create Task ==============================//

exports.createTask = async function (req, res) {
  // Get response body
  const { username, password, taskName, taskAppAcronym, taskDescription, taskPlan } = req.body

  // Check mandatory fields are filled
  if (username == undefined || password == undefined || taskName == undefined || taskAppAcronym == undefined) {
    return res.json({ code: "RS002" })
  }

  // Check proper types for input fields
  if (
    typeof username !== "string" ||
    typeof password !== "string" ||
    typeof taskName !== "string" ||
    (taskDescription !== undefined && taskDescription !== null && typeof taskDescription !== "string") ||
    typeof taskAppAcronym !== "string" ||
    (taskPlan !== undefined && taskPlan !== null && typeof taskPlan !== "string")
  ) {
    return res.json({
      code: "RS002"
    })
  }

  // Check if user exist & password validity
  let results
  try {
    ;[results] = await connection.execute("SELECT * FROM users WHERE username = ?", [username])
    if (results.length < 1) {
      return res.json({
        code: "AC001"
      })
    }
  } catch (error) {
    return res.json({
      code: "E001"
    })
  }

  // Check Active
  let resultsActive
  try {
    ;[resultsActive] = await connection.execute("SELECT isActive FROM users WHERE username = ?", [username])
    console.log(resultsActive[0].isActive)
    if (resultsActive[0].isActive === 0) {
      return res.json({
        code: "AC002"
      })
    }
  } catch (error) {
    return res.json({
      code: "E001"
    })
  }

  //Check if password is correct
  const match = bcrypt.compareSync(password, results[0].password)
  if (!match) {
    return res.json({
      code: "AC001"
    })
  }

  // Check if application is valid
  try {
    const [appRows] = await connection.execute("SELECT * FROM application WHERE App_Acronym = ?", [taskAppAcronym])
    if (appRows.length < 1) {
      return res.json({
        code: "R001"
      })
    }
  } catch (error) {
    console.log(error)
    return res.json({
      code: "E001"
    })
  }

  // Check if user is permitted
  try {
    const [permittedGroup] = await connection.execute("SELECT App_permit_Create FROM application WHERE App_Acronym = ?", [taskAppAcronym])
    if (!(await checkGroup(username, permittedGroup[0].App_permit_Create))) {
      return res.json({
        code: "AC002"
      })
    }
  } catch (error) {
    console.log(error)
    return res.json({
      code: "E001"
    })
  }

  // Check task plan exists
  if (taskName == "") {
    return res.json({
      code: "R005"
    })
  }
  if (taskPlan !== undefined && taskPlan !== null) {
    try {
      const [planExists] = await connection.execute("SELECT * FROM plan WHERE Plan_MVP_name = ?", [taskPlan])
      if (planExists.length === 0) {
        return res.json({
          code: "R003"
        })
      }
    } catch (error) {
      console.log(error)
      return res.json({
        code: "E001"
      })
    }
  }

  // Construction of Task_id
  let idComponents
  try {
    idComponents = await connection.execute("SELECT App_Rnumber FROM application WHERE App_Acronym = ?", [taskAppAcronym])
  } catch (error) {
    console.log(error)
    return res.json({
      code: "E001"
    })
  }

  // Set TaskId
  const TaskId = `${taskAppAcronym}_${idComponents[0][0].App_Rnumber}`

  // Set Task_creator as username of user
  let Task_creator = username

  // Set Task_owner as username of user
  let Task_owner = username

  // Set current date
  const currentDate = new Date().toISOString().slice(0, 19).replace("T", " ")

  // Set initial audit trail
  let Task_notes = `Task was created on ${currentDate} by ${username}`

  // Set task state
  let currentState = "open"
  const Task_state = currentState

  try {
    const response = await connection.execute(
      "INSERT INTO task (Task_name, Task_description, Task_notes, Task_id, Task_plan, Task_app_Acronym, Task_state, Task_creator, Task_owner, Task_createDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [taskName, taskDescription || null, Task_notes || null, TaskId, taskPlan || null, taskAppAcronym, Task_state, Task_creator, Task_owner, currentDate]
    )
    // Update Rnumber in Application
    const updateRnumber = await connection.execute("UPDATE application SET App_Rnumber = App_Rnumber + 1 WHERE App_Acronym = ?", [taskAppAcronym])
    return res.json({
      taskID: TaskId
    })
  } catch (error) {
    return res.json({
      code: "E001"
    })
  }
}

//========================= PromoteTask2Done ==============================//

exports.promoteToDone = async function (req, res, next) {
  // ==================== VALID PAYLOAD CHECK ====================
  const { username, password, taskID } = req.body

  // Mandatory fields present
  if (username === undefined || password === undefined || taskID === undefined) {
    return res.json({
      code: "RS002"
    })
  }
  console.log("Mandatory fields present")

  // Check mandatory field types
  if (typeof username !== "string" || typeof password !== "string" || typeof taskID !== "string") {
    return res.json({
      code: "RS002"
    })
  }
  console.log("Mandatory fields correct type")

  // ==================== AUTHENTICATE USER ======================
  console.log(`\n========== Logging in for User: ${username}`)

  // Fetch user
  try {
    var [userRow] = await connection.execute(
      `
      SELECT 
        *
      FROM users
      WHERE username = ?
    `,
      [username]
    )
  } catch (error) {
    console.log(error)
    return res.json({
      code: "E001"
    })
  }
  console.log("User credentials fetched")
  console.log(userRow)

  // PasswordHash or empty if username wrong
  const passwordHash = userRow[0] ? userRow[0].password : ""
  const isActive = userRow[0] ? userRow[0].isActive : ""

  // Check user is active
  if (!isActive) {
    console.log("User is not active")
    return res.json({
      code: "AC001"
    })
  }
  console.log("User is active")

  // Check password
  const passwordMatch = await bcrypt.compare(password, passwordHash)
  if (!passwordMatch) {
    return res.json({
      code: "AC001"
    })
  }

  console.log("User is authenticated")
  // ==================== USER AUTHENTICATED =====================

  // ==================== CHECK USER AUTHORISED ==================
  console.log("\n*** Checking user is authorised")
  try {
    // Get app permits
    var [taskRow] = await connection.execute(
      `
			SELECT * 
			FROM task
			WHERE Task_id = ?
		`,
      [taskID]
    )

    if (taskRow.length === 0) {
      console.log("Task does not exist")
      return res.json({
        code: "R002"
      })
    }

    console.log("Fetched task")

    var task = taskRow[0]
    const appAcronym = task.Task_app_Acronym

    var [doingPermRow] = await connection.execute(
      `
			SELECT App_permit_Doing
			FROM application
			WHERE App_Acronym = ?
		`,
      [appAcronym]
    )

    if (doingPermRow.length === 0) {
      console.log("App does not exist")
      return res.json({
        code: "R001"
      })
    }

    var doingPerm = doingPermRow[0].App_permit_Doing
    if (!(await checkGroup(username, doingPerm))) {
      console.log("User not authorised")
      return res.json({
        code: "AC002"
      })
    }
    console.log("Doing permit:", doingPerm)
  } catch (error) {
    console.error(error)
    return res.json({
      code: "E001"
    })
  }

  console.log("User authorised")

  // ====================== USER AUTHORISED ==================

  // ====================== PROMOTE ========================
  console.log("\n*** Promoting")
  // Check task state valid for promotion to done
  if (task.Task_state !== "doing") {
    console.log(`Invalid task state to promote to doing: ${task.Task_state}`)
    return res.json({
      code: "R004"
    })
  }
  console.log("Valid task state")

  // Promote
  try {
    await connection.execute(
      `
				UPDATE task 
				SET Task_state = 'done'
				WHERE Task_id = ?
			`,
      [taskID]
    )
  } catch (error) {
    console.log(error)
    return res.json({
      code: "E001"
    })
  }
  console.log("Task promoted")

  // Building audit trail
  const [currentNotes] = await connection.execute("SELECT Task_notes FROM task WHERE Task_id = ?", [taskID])
  const currentDate = new Date().toISOString().slice(0, 19).replace("T", " ")
  let additionalNotes = `Task has been updated from doing state to done state by ${username} on ${currentDate}\n------------------------------`
  const updatedNotes = `${additionalNotes}\n${currentNotes[0]?.Task_notes}`
  if (!updatedNotes) {
    console.log(error)
    return res.json({
      code: "E001"
    })
  }
  console.log("Generated audit trail")

  // Push new audit trail
  const newAudit = await connection.execute("UPDATE task SET Task_notes = ? WHERE Task_id = ?", [updatedNotes, taskID])
  if (!newAudit) {
    console.log(error)
    return res.json({
      code: "E001"
    })
  }

  // Query all groups in App_permit_Done
  const [emailGroupList] = await connection.execute("SELECT App_permit_Done FROM application WHERE App_Acronym = ?", [task.Task_app_Acronym])
  console.log("here 1", emailGroupList[0].App_permit_Done)

  // Get email
  const [plEmails] = await connection.execute("SELECT email FROM users WHERE username LIKE ?", [emailGroupList[0].App_permit_Done])
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
      from: "dev",
      to: to,
      subject: subject,
      text: text
    }

    await transport.sendMail(mailOptions)
  }

  if (plEmails.length > 0) {
    sendEmail(plEmails.map(row => row.email).join(", "), "task completed", `Task ${taskID} has been completed by ${username}!`)
  }

  return res.json({
    code: "S001"
  })
}

//========================= GetTaskByState ================================//
exports.GetTasksbyState = async (req, res) => {
  const { username, password, taskAppAcronym, taskState } = req.body
  const input_App_Acronym = taskAppAcronym
  const input_userid = username
  const input_password = password
  const input_taskState = taskState

  // check if the input is empty/undefined/string \\
  if (input_userid == undefined || input_password == undefined || input_App_Acronym == undefined || input_taskState == undefined) {
    return res.json({ code: "RS002" })
  }
  if (typeof input_userid != "string" || typeof input_password != "string" || typeof input_App_Acronym != "string" || typeof input_taskState != "string") {
    return res.json({ code: "RS002" })
  }

  // check for invalid user \\
  let users
  try {
    ;[users] = await connection.execute("SELECT username, password, isActive, userGroup FROM users WHERE username = ?", [input_userid])
    if (!users || users == null || users.length == 0) {
      return res.json({ code: "AC001" })
    }
  } catch (error) {
    return res.json({ code: "E001" })
  }
  const user = users[0]
  const isValid = user && (await bcrypt.compare(input_password, user.password))
  const isUserActive = user.isActive
  //if user exists and password is correct && check if user is active \\
  if (!isValid) {
    return res.json({ code: "AC001" })
  }
  if (isUserActive === "0") {
    return res.json({ code: "AC001" })
  }
  // need to check if input app acronym got error
  let checkAcronym
  try {
    ;[checkAcronym] = await connection.execute("SELECT * FROM application WHERE App_Acronym = ?", [input_App_Acronym])
    if (!checkAcronym || checkAcronym.length == 0) {
      return res.json({ code: "R001" })
    }
  } catch (error) {
    return res.json({ code: "E001" })
  }

  let taskState2
  switch (input_taskState) {
    case "open": {
      taskState2 = "open"
      break
    }
    case "todo": {
      taskState2 = "todo"
      break
    }
    case "doing": {
      taskState2 = "doing"
      break
    }
    case "done": {
      taskState2 = "done"
      break
    }
    case "closed": {
      taskState2 = "closed"
      break
    }
    default:
      return res.json({ code: "R004" })
  }

  try {
    const [getTaskState] = await connection.execute("SELECT * FROM task WHERE Task_state = ? AND Task_app_Acronym =?", [taskState2, input_App_Acronym])
    return res.json({ tasks: getTaskState })
  } catch (error) {
    return res.json({ code: "E001" })
  }
}
