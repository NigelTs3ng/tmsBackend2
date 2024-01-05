const express = require("express")
const router = express.Router()
const UserController = require("../controllers/userController")
const TMScontroller = require("../controllers/TMScontroller")
const a3Microservice = require("../controllers/a3Microservices")

// User routes
router.post("/register", UserController.registerUser)
router.post("/login", UserController.loginUser)
router.post("/viewUsers", UserController.viewAllUsers)
router.get("/viewGroups", UserController.viewAllGroups)
router.post("/createGroup", UserController.createGroup)
router.post("/editDetails", UserController.editDetails)
router.post("/checkGroup", UserController.checkGroup)
router.post("/viewProfile", UserController.viewProfile)
router.post("/editProfile", UserController.editProfile)

// TMS routes
router.post("/createApp", TMScontroller.createApplication)
router.post("/viewAllApps", TMScontroller.viewAllApplication)
router.post("/editApp", TMScontroller.editApplication)
router.post("/createPlan", TMScontroller.createPlan)
router.post("/viewPlans", TMScontroller.viewPlans)
router.post("/viewTasks", TMScontroller.viewAllTasks)
// Changed here
router.post("/createTasks", TMScontroller.createTask)
router.post("/editTask", TMScontroller.editTask)
router.post("/promoteTask", TMScontroller.promoteTask)
router.post("/editPlan", TMScontroller.editPlan)
router.post("/viewPlanDetails", TMScontroller.viewPlanDetails)
router.post("/checkCreatePermit", TMScontroller.checkPermitCreate)
router.post("/checkTaskPermit", TMScontroller.checkTaskPermit)

// A3 routes
router.post("/CreateTask", a3Microservice.createTask)
router.post("/GetTaskbyState", a3Microservice.GetTasksbyState)
router.post("/PromoteTask2Done", a3Microservice.promoteToDone)

module.exports = router
