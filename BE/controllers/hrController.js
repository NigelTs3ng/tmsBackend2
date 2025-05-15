const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const db = require("../utils/supabaseQueries");
const ErrorHandler = require("../utils/errorHandlers");
const { verifyUser } = require("./userController");
const supabase = require("../config/supabase");

// Function to verify admin access
async function verifyAdminAccess(token) {
  if (!token) {
    return { error: "Token must be provided!" };
  }

  // Verify token
  let username = await verifyUser(token);
  if (!username) {
    return { error: "Token is invalid!" };
  }

  // Check if user is admin
  const [userDetails] = await db.select('users', '*', { username });
  if (!userDetails || userDetails.length === 0) {
    return { error: "User not found" };
  }

  // Check if user is admin group
  const [userGroup] = await db.select('groups', '*', { id: userDetails[0].usergroup });
  if (!userGroup || userGroup.length === 0 || userGroup[0].usergroup !== 'admin') {
    return { error: "Only admin users can access this endpoint" };
  }

  return { error: null, username };
}

/*------------------------------- Department Management ------------------------------*/

// Get all departments
exports.getAllDepartments = catchAsyncErrors(async (req, res, next) => {
  const token = req.headers.authorization;
  
  try {
    const [departments] = await db.select('departments', '*');
    return res.json({ error: null, departments });
  } catch (err) {
    return next(new ErrorHandler("Failed to fetch departments", 500));
  }
});

// Create a department
exports.createDepartment = catchAsyncErrors(async (req, res, next) => {
  const token = req.headers.authorization;
  const { name, description, manager_id } = req.body;
  
  // Verify token & admin access
  const verification = await verifyAdminAccess(token);
  if (verification.error) {
    return res.status(401).json({ error: verification.error });
  }
  
  if (!name) {
    return res.status(400).json({ error: "Department name is required" });
  }
  
  try {
    const [department, error] = await db.insert('departments', {
      name,
      description,
      manager_id
    });
    
    if (error) {
      return next(new ErrorHandler("Failed to create department", 500));
    }
    
    return res.status(201).json({ 
      error: null, 
      message: "Department created successfully", 
      department 
    });
  } catch (err) {
    return next(new ErrorHandler("Internal Server Error", 500));
  }
});

// Update a department
exports.updateDepartment = catchAsyncErrors(async (req, res, next) => {
  const token = req.headers.authorization;
  const { department_id, name, description, manager_id } = req.body;
  
  // Verify token & admin access
  const verification = await verifyAdminAccess(token);
  if (verification.error) {
    return res.status(401).json({ error: verification.error });
  }
  
  if (!department_id) {
    return res.status(400).json({ error: "Department ID is required" });
  }
  
  try {
    // Construct update object with only provided fields
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (manager_id !== undefined) updateData.manager_id = manager_id;
    updateData.updated_at = new Date();
    
    const [updatedDepartment, error] = await db.update(
      'departments', 
      updateData, 
      { department_id }
    );
    
    if (error) {
      return next(new ErrorHandler("Failed to update department", 500));
    }
    
    return res.json({ 
      error: null, 
      message: "Department updated successfully", 
      department: updatedDepartment 
    });
  } catch (err) {
    return next(new ErrorHandler("Internal Server Error", 500));
  }
});

// Delete a department
exports.deleteDepartment = catchAsyncErrors(async (req, res, next) => {
  const token = req.headers.authorization;
  const { department_id } = req.body;
  
  // Verify token & admin access
  const verification = await verifyAdminAccess(token);
  if (verification.error) {
    return res.status(401).json({ error: verification.error });
  }
  
  if (!department_id) {
    return res.status(400).json({ error: "Department ID is required" });
  }
  
  try {
    const [result, error] = await db.remove('departments', { department_id });
    
    if (error) {
      return next(new ErrorHandler("Failed to delete department", 500));
    }
    
    return res.json({ 
      error: null, 
      message: "Department deleted successfully"
    });
  } catch (err) {
    return next(new ErrorHandler("Internal Server Error", 500));
  }
});

/*------------------------------- Position Management ------------------------------*/

// Get all positions
exports.getAllPositions = catchAsyncErrors(async (req, res, next) => {
  const token = req.headers.authorization;
  
  try {
    const [positions] = await db.select('positions', '*');
    return res.json({ error: null, positions });
  } catch (err) {
    return next(new ErrorHandler("Failed to fetch positions", 500));
  }
});

// Create a position
exports.createPosition = catchAsyncErrors(async (req, res, next) => {
  const token = req.headers.authorization;
  const { title, department_id, salary_min, salary_max, description } = req.body;
  
  // Verify token & admin access
  const verification = await verifyAdminAccess(token);
  if (verification.error) {
    return res.status(401).json({ error: verification.error });
  }
  
  if (!title) {
    return res.status(400).json({ error: "Position title is required" });
  }
  
  try {
    const [position, error] = await db.insert('positions', {
      title,
      department_id,
      salary_min,
      salary_max,
      description
    });
    
    if (error) {
      return next(new ErrorHandler("Failed to create position", 500));
    }
    
    return res.status(201).json({ 
      error: null, 
      message: "Position created successfully", 
      position 
    });
  } catch (err) {
    return next(new ErrorHandler("Internal Server Error", 500));
  }
});

// Update a position
exports.updatePosition = catchAsyncErrors(async (req, res, next) => {
  const token = req.headers.authorization;
  const { position_id, title, department_id, salary_min, salary_max, description } = req.body;
  
  // Verify token & admin access
  const verification = await verifyAdminAccess(token);
  if (verification.error) {
    return res.status(401).json({ error: verification.error });
  }
  
  if (!position_id) {
    return res.status(400).json({ error: "Position ID is required" });
  }
  
  try {
    // Construct update object with only provided fields
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (department_id !== undefined) updateData.department_id = department_id;
    if (salary_min !== undefined) updateData.salary_min = salary_min;
    if (salary_max !== undefined) updateData.salary_max = salary_max;
    if (description !== undefined) updateData.description = description;
    updateData.updated_at = new Date();
    
    const [updatedPosition, error] = await db.update(
      'positions', 
      updateData, 
      { position_id }
    );
    
    if (error) {
      return next(new ErrorHandler("Failed to update position", 500));
    }
    
    return res.json({ 
      error: null, 
      message: "Position updated successfully", 
      position: updatedPosition 
    });
  } catch (err) {
    return next(new ErrorHandler("Internal Server Error", 500));
  }
});

/*------------------------------- Employee Management ------------------------------*/

// Get all employees
exports.getAllEmployees = catchAsyncErrors(async (req, res, next) => {
  const token = req.headers.authorization;
  
  try {
    // Get employees with department and position information
    const [employees] = await db.select('employee_directory', '*');
    
    return res.json({ error: null, employees });
  } catch (err) {
    return next(new ErrorHandler("Failed to fetch employees", 500));
  }
});

// Create an employee
exports.createEmployee = catchAsyncErrors(async (req, res, next) => {
  const token = req.headers.authorization;
  const { 
    employee_id, first_name, last_name, email, phone, 
    position_id, department_id, manager_id, hire_date,
    status, employment_type, probation_end_date, username
  } = req.body;
  
  // Verify token & admin access
  const verification = await verifyAdminAccess(token);
  if (verification.error) {
    return res.status(401).json({ error: verification.error });
  }
  
  // Validate required fields
  if (!employee_id || !first_name || !last_name || !email || !hire_date) {
    return res.status(400).json({ 
      error: "Employee ID, first name, last name, email, and hire date are required" 
    });
  }
  
  try {
    const [employee, error] = await db.insert('employees', {
      employee_id,
      first_name,
      last_name,
      email,
      phone,
      position_id,
      department_id,
      manager_id,
      hire_date,
      status: status || 'Active',
      employment_type: employment_type || 'Full-time',
      probation_end_date,
      username
    });
    
    if (error) {
      return next(new ErrorHandler("Failed to create employee", 500));
    }
    
    return res.status(201).json({ 
      error: null, 
      message: "Employee created successfully", 
      employee 
    });
  } catch (err) {
    return next(new ErrorHandler("Internal Server Error", 500));
  }
});

// Update an employee
exports.updateEmployee = catchAsyncErrors(async (req, res, next) => {
  const token = req.headers.authorization;
  const { 
    employee_id, first_name, last_name, email, phone, 
    position_id, department_id, manager_id, hire_date,
    status, employment_type, probation_end_date, username
  } = req.body;
  
  // Verify token & admin access
  const verification = await verifyAdminAccess(token);
  if (verification.error) {
    return res.status(401).json({ error: verification.error });
  }
  
  if (!employee_id) {
    return res.status(400).json({ error: "Employee ID is required" });
  }
  
  try {
    // Construct update object with only provided fields
    const updateData = {};
    if (first_name !== undefined) updateData.first_name = first_name;
    if (last_name !== undefined) updateData.last_name = last_name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (position_id !== undefined) updateData.position_id = position_id;
    if (department_id !== undefined) updateData.department_id = department_id;
    if (manager_id !== undefined) updateData.manager_id = manager_id;
    if (hire_date !== undefined) updateData.hire_date = hire_date;
    if (status !== undefined) updateData.status = status;
    if (employment_type !== undefined) updateData.employment_type = employment_type;
    if (probation_end_date !== undefined) updateData.probation_end_date = probation_end_date;
    if (username !== undefined) updateData.username = username;
    updateData.updated_at = new Date();
    
    const [updatedEmployee, error] = await db.update(
      'employees', 
      updateData, 
      { employee_id }
    );
    
    if (error) {
      return next(new ErrorHandler("Failed to update employee", 500));
    }
    
    return res.json({ 
      error: null, 
      message: "Employee updated successfully", 
      employee: updatedEmployee 
    });
  } catch (err) {
    return next(new ErrorHandler("Internal Server Error", 500));
  }
});

// Delete an employee
exports.deleteEmployee = catchAsyncErrors(async (req, res, next) => {
  const token = req.headers.authorization;
  const { employee_id } = req.body;
  
  // Verify token & admin access
  const verification = await verifyAdminAccess(token);
  if (verification.error) {
    return res.status(401).json({ error: verification.error });
  }
  
  if (!employee_id) {
    return res.status(400).json({ error: "Employee ID is required" });
  }
  
  try {
    const [result, error] = await db.remove('employees', { employee_id });
    
    if (error) {
      return next(new ErrorHandler("Failed to delete employee", 500));
    }
    
    return res.json({ 
      error: null, 
      message: "Employee deleted successfully"
    });
  } catch (err) {
    return next(new ErrorHandler("Internal Server Error", 500));
  }
});

/*------------------------------- Leave Management ------------------------------*/

// Get all leave types
exports.getLeaveTypes = catchAsyncErrors(async (req, res, next) => {
  const token = req.headers.authorization;
  
  try {
    const [leaveTypes] = await db.select('leave_types', '*');
    return res.json({ error: null, leaveTypes });
  } catch (err) {
    return next(new ErrorHandler("Failed to fetch leave types", 500));
  }
});

// Create a leave type
exports.createLeaveType = catchAsyncErrors(async (req, res, next) => {
  const token = req.headers.authorization;
  const { name, description, paid, days_per_year } = req.body;
  
  // Verify token & admin access
  const verification = await verifyAdminAccess(token);
  if (verification.error) {
    return res.status(401).json({ error: verification.error });
  }
  
  if (!name) {
    return res.status(400).json({ error: "Leave type name is required" });
  }
  
  try {
    const [leaveType, error] = await db.insert('leave_types', {
      name,
      description,
      paid: paid !== undefined ? paid : true,
      days_per_year
    });
    
    if (error) {
      return next(new ErrorHandler("Failed to create leave type", 500));
    }
    
    return res.status(201).json({ 
      error: null, 
      message: "Leave type created successfully", 
      leaveType 
    });
  } catch (err) {
    return next(new ErrorHandler("Internal Server Error", 500));
  }
});

// Get leave balances for an employee
exports.getEmployeeLeaveBalance = catchAsyncErrors(async (req, res, next) => {
  const token = req.headers.authorization;
  const { employee_id } = req.params;
  
  try {
    const [leaveBalances] = await db.select(
      'leave_summary', 
      '*', 
      { employee_id }
    );
    
    return res.json({ error: null, leaveBalances });
  } catch (err) {
    return next(new ErrorHandler("Failed to fetch leave balances", 500));
  }
});

// Submit a leave request
exports.submitLeaveRequest = catchAsyncErrors(async (req, res, next) => {
  const token = req.headers.authorization;
  const { 
    employee_id, leave_type_id, start_date, 
    end_date, days, reason 
  } = req.body;
  
  // Verify user
  const username = await verifyUser(token);
  if (!username) {
    return res.status(401).json({ error: "Invalid token" });
  }
  
  // Required fields validation
  if (!employee_id || !leave_type_id || !start_date || !end_date || !days) {
    return res.status(400).json({ 
      error: "Employee ID, leave type, start date, end date, and days are required" 
    });
  }
  
  try {
    const [leaveRequest, error] = await db.insert('leave_requests', {
      employee_id,
      leave_type_id,
      start_date,
      end_date,
      days,
      status: 'Pending',
      reason
    });
    
    if (error) {
      return next(new ErrorHandler("Failed to submit leave request", 500));
    }
    
    return res.status(201).json({ 
      error: null, 
      message: "Leave request submitted successfully", 
      leaveRequest 
    });
  } catch (err) {
    return next(new ErrorHandler("Internal Server Error", 500));
  }
});

// Approve/Reject a leave request
exports.processLeaveRequest = catchAsyncErrors(async (req, res, next) => {
  const token = req.headers.authorization;
  const { request_id, status, comments } = req.body;
  
  // Verify user is admin or manager
  const username = await verifyUser(token);
  if (!username) {
    return res.status(401).json({ error: "Invalid token" });
  }
  
  if (!request_id || !status) {
    return res.status(400).json({ error: "Request ID and status are required" });
  }
  
  if (status !== 'Approved' && status !== 'Rejected') {
    return res.status(400).json({ error: "Status must be 'Approved' or 'Rejected'" });
  }
  
  try {
    // Get the employee ID from username
    const [userResults] = await db.select('employees', 'employee_id', { username });
    if (!userResults || userResults.length === 0) {
      return res.status(404).json({ error: "User not found in employees" });
    }
    
    const approved_by = userResults[0].employee_id;
    
    const [updatedRequest, error] = await db.update(
      'leave_requests',
      {
        status,
        approved_by,
        comments,
        updated_at: new Date()
      },
      { request_id }
    );
    
    if (error) {
      return next(new ErrorHandler("Failed to process leave request", 500));
    }
    
    // If approved, update leave balance
    if (status === 'Approved') {
      const [leaveRequest] = await db.select('leave_requests', '*', { request_id });
      
      if (leaveRequest && leaveRequest.length > 0) {
        const { employee_id, leave_type_id, days } = leaveRequest[0];
        const currentYear = new Date().getFullYear();
        
        // Get current balance
        const [leaveBalance] = await db.select(
          'leave_balances',
          '*',
          { 
            employee_id, 
            leave_type_id, 
            year: currentYear 
          }
        );
        
        if (leaveBalance && leaveBalance.length > 0) {
          // Update existing balance
          await db.update(
            'leave_balances',
            {
              used: leaveBalance[0].used + days,
              updated_at: new Date()
            },
            {
              balance_id: leaveBalance[0].balance_id
            }
          );
        }
      }
    }
    
    return res.json({ 
      error: null, 
      message: `Leave request ${status.toLowerCase()}`, 
      request: updatedRequest 
    });
  } catch (err) {
    return next(new ErrorHandler("Internal Server Error", 500));
  }
});

/*------------------------------- Attendance Management ------------------------------*/

// Record attendance
exports.recordAttendance = catchAsyncErrors(async (req, res, next) => {
  const token = req.headers.authorization;
  const { employee_id, status, notes } = req.body;
  const now = new Date();
  const date = now.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  
  // Verify user
  const username = await verifyUser(token);
  if (!username) {
    return res.status(401).json({ error: "Invalid token" });
  }
  
  if (!employee_id) {
    return res.status(400).json({ error: "Employee ID is required" });
  }
  
  try {
    // Check if attendance record for today already exists
    const [existingRecord] = await db.select(
      'attendance',
      '*',
      { employee_id, date }
    );
    
    if (existingRecord && existingRecord.length > 0) {
      // Update the existing record (check-out)
      const [updatedAttendance, error] = await db.update(
        'attendance',
        {
          time_out: now,
          status: status || existingRecord[0].status,
          notes: notes || existingRecord[0].notes,
          updated_at: now
        },
        { attendance_id: existingRecord[0].attendance_id }
      );
      
      if (error) {
        return next(new ErrorHandler("Failed to update attendance", 500));
      }
      
      return res.json({ 
        error: null, 
        message: "Check-out recorded successfully", 
        attendance: updatedAttendance 
      });
    } else {
      // Create a new record (check-in)
      const [attendance, error] = await db.insert('attendance', {
        employee_id,
        date,
        time_in: now,
        status: status || 'Present',
        notes
      });
      
      if (error) {
        return next(new ErrorHandler("Failed to record attendance", 500));
      }
      
      return res.status(201).json({ 
        error: null, 
        message: "Check-in recorded successfully", 
        attendance 
      });
    }
  } catch (err) {
    return next(new ErrorHandler("Internal Server Error", 500));
  }
});

// Get attendance records for an employee
exports.getEmployeeAttendance = catchAsyncErrors(async (req, res, next) => {
  const token = req.headers.authorization;
  const { employee_id, start_date, end_date } = req.query;
  
  try {
    let query = supabase.from('attendance').select('*');
    
    if (employee_id) {
      query = query.eq('employee_id', employee_id);
    }
    
    if (start_date) {
      query = query.gte('date', start_date);
    }
    
    if (end_date) {
      query = query.lte('date', end_date);
    }
    
    const { data, error } = await query.order('date', { ascending: false });
    
    if (error) {
      return next(new ErrorHandler("Failed to fetch attendance records", 500));
    }
    
    return res.json({ error: null, attendance: data });
  } catch (err) {
    return next(new ErrorHandler("Internal Server Error", 500));
  }
});

/*------------------------------- Recruitment Management ------------------------------*/

// Get all job openings
exports.getJobOpenings = catchAsyncErrors(async (req, res, next) => {
  const token = req.headers.authorization;
  
  try {
    const { data, error } = await supabase
      .from('job_openings')
      .select(`
        *,
        positions(*),
        departments(*)
      `)
      .eq('status', 'Open');
    
    if (error) {
      return next(new ErrorHandler("Failed to fetch job openings", 500));
    }
    
    return res.json({ error: null, jobOpenings: data });
  } catch (err) {
    return next(new ErrorHandler("Internal Server Error", 500));
  }
});

// Create a job opening
exports.createJobOpening = catchAsyncErrors(async (req, res, next) => {
  const token = req.headers.authorization;
  const { 
    position_id, department_id, num_positions, 
    start_date, end_date, description, requirements 
  } = req.body;
  
  // Verify admin access
  const verification = await verifyAdminAccess(token);
  if (verification.error) {
    return res.status(401).json({ error: verification.error });
  }
  
  if (!position_id || !department_id || !start_date) {
    return res.status(400).json({ 
      error: "Position ID, department ID, and start date are required" 
    });
  }
  
  try {
    const [jobOpening, error] = await db.insert('job_openings', {
      position_id,
      department_id,
      num_positions: num_positions || 1,
      status: 'Open',
      start_date,
      end_date,
      description,
      requirements
    });
    
    if (error) {
      return next(new ErrorHandler("Failed to create job opening", 500));
    }
    
    return res.status(201).json({ 
      error: null, 
      message: "Job opening created successfully", 
      jobOpening 
    });
  } catch (err) {
    return next(new ErrorHandler("Internal Server Error", 500));
  }
});

// Submit a job application
exports.submitApplication = catchAsyncErrors(async (req, res, next) => {
  const {
    job_id, first_name, last_name, email, phone, 
    resume_url, source
  } = req.body;
  
  if (!job_id || !first_name || !last_name || !email) {
    return res.status(400).json({ 
      error: "Job ID, first name, last name, and email are required" 
    });
  }
  
  try {
    // First create the candidate
    const [candidate, candidateError] = await db.insert('candidates', {
      first_name,
      last_name,
      email,
      phone,
      resume_url,
      source
    });
    
    if (candidateError) {
      return next(new ErrorHandler("Failed to create candidate", 500));
    }
    
    // Then create the application
    const [application, applicationError] = await db.insert('job_applications', {
      job_id,
      candidate_id: candidate[0].candidate_id,
      status: 'Applied',
      application_date: new Date().toISOString().split('T')[0]
    });
    
    if (applicationError) {
      return next(new ErrorHandler("Failed to submit application", 500));
    }
    
    return res.status(201).json({ 
      error: null, 
      message: "Application submitted successfully", 
      application 
    });
  } catch (err) {
    return next(new ErrorHandler("Internal Server Error", 500));
  }
});

// Get all job applications (admin only)
exports.getApplications = catchAsyncErrors(async (req, res, next) => {
  const token = req.headers.authorization;
  const { job_id, status } = req.query;
  
  // Verify admin access
  const verification = await verifyAdminAccess(token);
  if (verification.error) {
    return res.status(401).json({ error: verification.error });
  }
  
  try {
    let query = supabase
      .from('job_applications')
      .select(`
        *,
        candidates(*),
        job_openings(
          *,
          positions(*),
          departments(*)
        )
      `);
    
    if (job_id) {
      query = query.eq('job_id', job_id);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query.order('application_date', { ascending: false });
    
    if (error) {
      return next(new ErrorHandler("Failed to fetch applications", 500));
    }
    
    return res.json({ error: null, applications: data });
  } catch (err) {
    return next(new ErrorHandler("Internal Server Error", 500));
  }
});

/*------------------------------- User Profile Management ------------------------------*/

// Get logged-in user's employee profile
exports.getUserProfile = catchAsyncErrors(async (req, res, next) => {
  // req.user is populated by the middleware
  const { username, isAdmin, employee_id } = req.user;
  
  try {
    // If user is an employee, get employee details
    if (employee_id) {
      // Get detailed employee info
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          departments(*),
          positions(*),
          manager:employees!employees_manager_id_fkey(
            employee_id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('employee_id', employee_id)
        .single();
      
      if (error) {
        return next(new ErrorHandler("Failed to fetch employee profile", 500));
      }
      
      // Get leave balances
      const [leaveBalances] = await db.select(
        'leave_summary',
        '*',
        { employee_id }
      );
      
      // Get recent attendance
      const currentDate = new Date().toISOString().split('T')[0];
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
      
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', employee_id)
        .gte('date', thirtyDaysAgoStr)
        .lte('date', currentDate)
        .order('date', { ascending: false });
      
      return res.json({
        error: null,
        profile: {
          ...data,
          leave_balances: leaveBalances || [],
          recent_attendance: attendanceData || [],
          is_admin: isAdmin
        }
      });
    } 
    // If admin with no employee record
    else if (isAdmin) {
      const [userDetails] = await db.select('users', '*', { username });
      
      return res.json({
        error: null,
        profile: {
          username,
          email: userDetails[0].email,
          is_admin: true,
          // No employee-specific fields
        }
      });
    }
    // Should never reach here due to middleware
    else {
      return res.status(404).json({
        error: "User profile not found"
      });
    }
  } catch (err) {
    return next(new ErrorHandler("Failed to fetch user profile", 500));
  }
}); 