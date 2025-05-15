const { verifyUser } = require("../controllers/userController");
const db = require("../utils/supabaseQueries");
const ErrorHandler = require("../utils/errorHandlers");

/**
 * Middleware to verify different user roles and permissions
 */

// Verify if the user is an admin
exports.verifyAdmin = async (req, res, next) => {
  const token = req.headers.authorization;
  
  if (!token) {
    return res.status(401).json({
      error: "Authentication required. Please log in."
    });
  }
  
  try {
    // Verify token
    const username = await verifyUser(token);
    if (!username) {
      return res.status(401).json({
        error: "Invalid or expired token."
      });
    }
    
    // Get user details
    const [userDetails] = await db.select('users', '*', { username });
    if (!userDetails || userDetails.length === 0) {
      return res.status(404).json({
        error: "User not found."
      });
    }
    
    // Check if user is active
    if (userDetails[0].isactive === 0) {
      return res.status(403).json({
        error: "User account is inactive."
      });
    }
    
    // Check if user is admin
    const [userGroup] = await db.select('groups', '*', { id: userDetails[0].usergroup });
    if (!userGroup || userGroup.length === 0 || userGroup[0].usergroup !== 'admin') {
      return res.status(403).json({
        error: "Admin access required for this operation."
      });
    }
    
    // Add user data to request for controllers to use
    req.user = {
      username,
      isAdmin: true,
      userGroup: userGroup[0].usergroup
    };
    
    next();
  } catch (err) {
    return next(new ErrorHandler("Authentication error", 500));
  }
};

// Verify if the user is an employee or admin
exports.verifyEmployee = async (req, res, next) => {
  const token = req.headers.authorization;
  
  if (!token) {
    return res.status(401).json({
      error: "Authentication required. Please log in."
    });
  }
  
  try {
    // Verify token
    const username = await verifyUser(token);
    if (!username) {
      return res.status(401).json({
        error: "Invalid or expired token."
      });
    }
    
    // Get user details
    const [userDetails] = await db.select('users', '*', { username });
    if (!userDetails || userDetails.length === 0) {
      return res.status(404).json({
        error: "User not found."
      });
    }
    
    // Check if user is active
    if (userDetails[0].isactive === 0) {
      return res.status(403).json({
        error: "User account is inactive."
      });
    }
    
    // Check if user is linked to an employee record
    const [employeeDetails] = await db.select('employees', '*', { username });
    let isAdmin = false;
    let employee_id = null;
    
    // Check if user is admin (admins don't need to be employees to access)
    const [userGroup] = await db.select('groups', '*', { id: userDetails[0].usergroup });
    if (userGroup && userGroup.length > 0 && userGroup[0].usergroup === 'admin') {
      isAdmin = true;
    }
    
    if (!isAdmin && (!employeeDetails || employeeDetails.length === 0)) {
      return res.status(403).json({
        error: "Employee access required for this operation."
      });
    }
    
    if (employeeDetails && employeeDetails.length > 0) {
      employee_id = employeeDetails[0].employee_id;
    }
    
    // Add user data to request for controllers to use
    req.user = {
      username,
      isAdmin,
      employee_id,
      userGroup: userGroup && userGroup.length > 0 ? userGroup[0].usergroup : null
    };
    
    next();
  } catch (err) {
    return next(new ErrorHandler("Authentication error", 500));
  }
};

// Verify if the user is a manager (either has direct reports or is admin)
exports.verifyManager = async (req, res, next) => {
  const token = req.headers.authorization;
  
  if (!token) {
    return res.status(401).json({
      error: "Authentication required. Please log in."
    });
  }
  
  try {
    // Verify token
    const username = await verifyUser(token);
    if (!username) {
      return res.status(401).json({
        error: "Invalid or expired token."
      });
    }
    
    // Get user details
    const [userDetails] = await db.select('users', '*', { username });
    if (!userDetails || userDetails.length === 0) {
      return res.status(404).json({
        error: "User not found."
      });
    }
    
    // Check if user is active
    if (userDetails[0].isactive === 0) {
      return res.status(403).json({
        error: "User account is inactive."
      });
    }
    
    let isAdmin = false;
    let isManager = false;
    
    // Check if user is admin
    const [userGroup] = await db.select('groups', '*', { id: userDetails[0].usergroup });
    if (userGroup && userGroup.length > 0 && userGroup[0].usergroup === 'admin') {
      isAdmin = true;
    }
    
    // If not admin, check if user is a manager with direct reports
    if (!isAdmin) {
      // Get employee record for this user
      const [employeeDetails] = await db.select('employees', '*', { username });
      if (!employeeDetails || employeeDetails.length === 0) {
        return res.status(403).json({
          error: "Manager access required for this operation."
        });
      }
      
      // Check if this employee is a manager (has direct reports)
      const employee_id = employeeDetails[0].employee_id;
      const [directReports] = await db.select('employees', '*', { manager_id: employee_id });
      
      if (directReports && directReports.length > 0) {
        isManager = true;
      } else {
        // Also check if this employee is assigned as a department manager
        const [managedDept] = await db.select('departments', '*', { manager_id: employee_id });
        if (managedDept && managedDept.length > 0) {
          isManager = true;
        }
      }
      
      if (!isManager) {
        return res.status(403).json({
          error: "Manager access required for this operation."
        });
      }
      
      // Add user data to request for controllers to use
      req.user = {
        username,
        isAdmin,
        isManager,
        employee_id,
        userGroup: userGroup && userGroup.length > 0 ? userGroup[0].usergroup : null
      };
    } else {
      // If admin, they automatically have manager privileges
      req.user = {
        username,
        isAdmin,
        isManager: true,
        userGroup: userGroup[0].usergroup
      };
    }
    
    next();
  } catch (err) {
    return next(new ErrorHandler("Authentication error", 500));
  }
}; 