const express = require("express");
const router = express.Router();
const HRController = require("../controllers/hrController");
const { verifyAdmin, verifyEmployee, verifyManager } = require("../middlewares/roleAuth");

// User profile route (available to any authenticated employee or admin)
router.get("/profile", verifyEmployee, HRController.getUserProfile);

// Department routes - Admin access
router.get("/departments", HRController.getAllDepartments); // Open to all for viewing
router.post("/departments", verifyAdmin, HRController.createDepartment);
router.put("/departments", verifyAdmin, HRController.updateDepartment);
router.delete("/departments", verifyAdmin, HRController.deleteDepartment);

// Position routes - Admin access
router.get("/positions", HRController.getAllPositions); // Open to all for viewing
router.post("/positions", verifyAdmin, HRController.createPosition);
router.put("/positions", verifyAdmin, HRController.updatePosition);

// Employee routes - Admin access for create/update/delete
router.get("/employees", verifyEmployee, HRController.getAllEmployees); // Available to all employees
router.post("/employees", verifyAdmin, HRController.createEmployee);
router.put("/employees", verifyAdmin, HRController.updateEmployee);
router.delete("/employees", verifyAdmin, HRController.deleteEmployee);

// Leave management routes
router.get("/leave-types", verifyEmployee, HRController.getLeaveTypes);
router.post("/leave-types", verifyAdmin, HRController.createLeaveType);
router.get("/leave-balance/:employee_id", verifyEmployee, HRController.getEmployeeLeaveBalance);
router.post("/leave-requests", verifyEmployee, HRController.submitLeaveRequest);
router.put("/leave-requests", verifyManager, HRController.processLeaveRequest); // Only managers can approve

// Attendance routes
router.post("/attendance", verifyEmployee, HRController.recordAttendance);
router.get("/attendance", verifyEmployee, HRController.getEmployeeAttendance);

// Recruitment routes
router.get("/job-openings", HRController.getJobOpenings); // Open to all for viewing
router.post("/job-openings", verifyAdmin, HRController.createJobOpening);
router.post("/applications", HRController.submitApplication); // Open to all for job applicants
router.get("/applications", verifyAdmin, HRController.getApplications); // Admin only for viewing applications

module.exports = router; 