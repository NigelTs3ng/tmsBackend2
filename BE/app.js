const express = require("express")
const app = express()
const Routes = require("./routes/Routes")
const cors = require("cors")

// app.set("case sensitive routing", true)

app.use(express.json())

// Configure CORS
app.use(
  cors({
    origin: "http://localhost:8090",
    methods: ["GET", "POST", "DELETE", "UPDATE", "PUT", "PATCH"]
  })
)

app.use((req, res, next) => {
  // Middleware for valid endpoint check
  console.log(req.originalUrl)
  const isValidURIPattern = /^(\/?[a-zA-Z0-9])+$/

  if (!isValidURIPattern.test(req.originalUrl)) {
    return res.json({
      code: "RS001"
    })
  }
  next()
})
// User Routes
app.use("", Routes)
app.use("", (req, res, next) => {
  return res.json({
    code: "RS001"
  })
})

// A3 routes
// app.use("/")

const PORT = process.env.PORT // Default to 3000 if process.env.PORT is not set
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}!`)
})
