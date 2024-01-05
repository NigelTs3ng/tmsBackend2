const mysql = require("mysql2/promise")
const dotenv = require("dotenv")

// Set up config.env file variables
dotenv.config({ path: "./config/config.env" })

// Set up connection to db
const connection = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})

connection.on("connection", conn => {
  console.log("Connected to MySQL as ID " + conn.threadId)
})

module.exports = connection
