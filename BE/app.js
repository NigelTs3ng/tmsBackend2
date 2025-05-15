const express = require("express")
const app = express()
const Routes = require("./routes/Routes")
const HRRoutes = require("./routes/hrRoutes")
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
  const isValidURIPattern = /^(\/?[a-zA-Z0-9\-_\/])+$/  // Updated pattern to allow more route characters

  if (!isValidURIPattern.test(req.originalUrl)) {
    return res.json({
      code: "RS001"
    })
  }
  next()
})

// User and TMS Routes
app.use("", Routes)

// HR Routes with /hr prefix
app.use("/hr", HRRoutes)

// Default 404 route
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
