const express = require("express")
const app = express()
const Routes = require("./routes/Routes")
const HRRoutes = require("./routes/hrRoutes")
const cors = require("cors")

// app.set("case sensitive routing", true)

app.use(express.json())

// Configure CORS to work in both development and production
app.use(
  cors({
    origin: process.env.NODE_ENV === 'production' 
      ? [process.env.FRONTEND_URL || 'https://your-frontend-domain.com', 'http://localhost:9000'] // Allow both deployed frontend and local development
      : ["http://localhost:8090", "http://localhost:9000"],
    methods: ["GET", "POST", "DELETE", "UPDATE", "PUT", "PATCH"],
    credentials: true
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

const PORT = process.env.PORT || 8090 // Use environment PORT or default to 8090
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}!`)
})
