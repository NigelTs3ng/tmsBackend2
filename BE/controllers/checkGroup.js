const connection = require("../config/database")

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

module.exports = checkGroup
 