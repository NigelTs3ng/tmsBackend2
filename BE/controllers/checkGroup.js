// const connection = require("../config/database")
const db = require("../utils/supabaseQueries")

/**
 * Check if user is in specified group
 * @param {String} username - The username to check
 * @param {String} group - The group name to check against
 * @returns {Boolean} - Return boolean whether user is in group
 */
async function checkGroup(username, group) {
  try {
    const [rows, error] = await db.select('users', 'userGroup', { username })
    
    if (error || rows.length === 0) {
      return false
    }
    
    return rows[0].userGroup === group
  } catch (error) {
    console.error('Error checking group:', error)
    return false
  }
}

module.exports = checkGroup
 