const schemaHelpers = require('./schemaHelpers');
const dotenv = require('dotenv');
const supabase = require('./supabase');

// Load environment variables
dotenv.config({ path: './config/config.env' });

/**
 * HR System Database Schema Migration
 * This script creates a comprehensive schema for an HR application
 * with proper relationships between tables
 */
async function migrateHRSchema() {
  try {
    console.log('Starting HR schema migration...');
    
    // Create backups if tables exist
    await backupExistingTables();

    // Disable foreign key constraints during migration
    await schemaHelpers.disableForeignKeys();
    
    try {
      // Create core tables first
      await createCoreTables();
      
      // Create module-specific tables
      await createAttendanceTables();
      await createLeaveRequestTables();
      await createPayrollTables();
      await createPerformanceTables();
      await createRecruitmentTables();
      await createTrainingTables();

      // Create views for common queries
      await createViews();
      
      console.log('HR schema migration completed successfully!');
    } catch (error) {
      console.error('Error during schema migration:', error);
    } finally {
      // Always re-enable foreign key constraints
      await schemaHelpers.enableForeignKeys();
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

async function backupExistingTables() {
  console.log('Backing up existing tables...');
  
  const tables = ['users', 'groups', 'application', 'plan', 'task'];
  
  for (const table of tables) {
    try {
      // Check if table exists before backup
      const { data, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
        
      if (!error) {
        await schemaHelpers.backupTable(table, `${table}_backup`);
        console.log(`Table ${table} backed up successfully.`);
      }
    } catch (error) {
      console.log(`Table ${table} does not exist or couldn't be backed up.`);
    }
  }
}

async function createCoreTables() {
  console.log('Creating core tables...');
  
  // Departments table
  await schemaHelpers.createTable('departments', `
    department_id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    manager_id TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  `);
  
  // Positions/Job Titles table
  await schemaHelpers.createTable('positions', `
    position_id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    department_id INTEGER REFERENCES departments(department_id) ON DELETE SET NULL,
    salary_min DECIMAL(12,2),
    salary_max DECIMAL(12,2),
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  `);
  
  // Enhanced Employees table
  await schemaHelpers.createTable('employees', `
    employee_id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    position_id INTEGER REFERENCES positions(position_id) ON DELETE SET NULL,
    department_id INTEGER REFERENCES departments(department_id) ON DELETE SET NULL,
    manager_id TEXT REFERENCES employees(employee_id) ON DELETE SET NULL,
    hire_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'Active',
    employment_type TEXT DEFAULT 'Full-time',
    probation_end_date DATE,
    username TEXT UNIQUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  `);
  
  // Update departments table with foreign key reference to employees
  await schemaHelpers.executeSQL(`
    ALTER TABLE departments ADD CONSTRAINT fk_departments_manager
    FOREIGN KEY (manager_id) REFERENCES employees(employee_id) ON DELETE SET NULL
  `);
}

async function createAttendanceTables() {
  console.log('Creating attendance tables...');
  
  // Attendance records
  await schemaHelpers.createTable('attendance', `
    attendance_id SERIAL PRIMARY KEY,
    employee_id TEXT REFERENCES employees(employee_id) ON DELETE CASCADE,
    date DATE NOT NULL,
    time_in TIMESTAMP,
    time_out TIMESTAMP,
    status TEXT DEFAULT 'Present',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(employee_id, date)
  `);
  
  // Work schedules
  await schemaHelpers.createTable('work_schedules', `
    schedule_id SERIAL PRIMARY KEY,
    employee_id TEXT REFERENCES employees(employee_id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL, -- 0=Sunday, 1=Monday, etc.
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    effective_from DATE NOT NULL,
    effective_to DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  `);
}

async function createLeaveRequestTables() {
  console.log('Creating leave request tables...');
  
  // Leave types
  await schemaHelpers.createTable('leave_types', `
    leave_type_id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    paid BOOLEAN DEFAULT true,
    days_per_year INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  `);
  
  // Leave balances
  await schemaHelpers.createTable('leave_balances', `
    balance_id SERIAL PRIMARY KEY,
    employee_id TEXT REFERENCES employees(employee_id) ON DELETE CASCADE,
    leave_type_id INTEGER REFERENCES leave_types(leave_type_id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    balance DECIMAL(5,1) NOT NULL,
    used DECIMAL(5,1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(employee_id, leave_type_id, year)
  `);
  
  // Leave requests
  await schemaHelpers.createTable('leave_requests', `
    request_id SERIAL PRIMARY KEY,
    employee_id TEXT REFERENCES employees(employee_id) ON DELETE CASCADE,
    leave_type_id INTEGER REFERENCES leave_types(leave_type_id) ON DELETE SET NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days DECIMAL(5,1) NOT NULL,
    status TEXT DEFAULT 'Pending',
    approved_by TEXT REFERENCES employees(employee_id) ON DELETE SET NULL,
    reason TEXT,
    comments TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  `);
}

async function createPayrollTables() {
  console.log('Creating payroll tables...');
  
  // Salary structures
  await schemaHelpers.createTable('salary_structures', `
    structure_id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  `);
  
  // Salary components
  await schemaHelpers.createTable('salary_components', `
    component_id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- Basic, Allowance, Deduction, Bonus, etc.
    taxable BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  `);
  
  // Employee salaries
  await schemaHelpers.createTable('employee_salaries', `
    salary_id SERIAL PRIMARY KEY,
    employee_id TEXT REFERENCES employees(employee_id) ON DELETE CASCADE,
    structure_id INTEGER REFERENCES salary_structures(structure_id) ON DELETE SET NULL,
    effective_from DATE NOT NULL,
    effective_to DATE,
    currency TEXT DEFAULT 'USD',
    payment_frequency TEXT DEFAULT 'Monthly',
    bank_account TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  `);
  
  // Salary details
  await schemaHelpers.createTable('salary_details', `
    detail_id SERIAL PRIMARY KEY,
    salary_id INTEGER REFERENCES employee_salaries(salary_id) ON DELETE CASCADE,
    component_id INTEGER REFERENCES salary_components(component_id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  `);
  
  // Payroll periods
  await schemaHelpers.createTable('payroll_periods', `
    period_id SERIAL PRIMARY KEY,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    payment_date DATE NOT NULL,
    status TEXT DEFAULT 'Open',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  `);
  
  // Payslips
  await schemaHelpers.createTable('payslips', `
    payslip_id SERIAL PRIMARY KEY,
    employee_id TEXT REFERENCES employees(employee_id) ON DELETE CASCADE,
    period_id INTEGER REFERENCES payroll_periods(period_id) ON DELETE CASCADE,
    gross_pay DECIMAL(12,2) NOT NULL,
    total_deductions DECIMAL(12,2) NOT NULL,
    net_pay DECIMAL(12,2) NOT NULL,
    generated_on TIMESTAMP DEFAULT NOW(),
    status TEXT DEFAULT 'Generated',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(employee_id, period_id)
  `);
  
  // Payslip details
  await schemaHelpers.createTable('payslip_details', `
    detail_id SERIAL PRIMARY KEY,
    payslip_id INTEGER REFERENCES payslips(payslip_id) ON DELETE CASCADE,
    component_id INTEGER REFERENCES salary_components(component_id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  `);
}

async function createPerformanceTables() {
  console.log('Creating performance tables...');
  
  // Performance review cycles
  await schemaHelpers.createTable('review_cycles', `
    cycle_id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT DEFAULT 'Draft',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  `);
  
  // Performance criteria
  await schemaHelpers.createTable('performance_criteria', `
    criteria_id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    weight DECIMAL(5,2) DEFAULT 1.0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  `);
  
  // Employee reviews
  await schemaHelpers.createTable('employee_reviews', `
    review_id SERIAL PRIMARY KEY,
    employee_id TEXT REFERENCES employees(employee_id) ON DELETE CASCADE,
    reviewer_id TEXT REFERENCES employees(employee_id) ON DELETE SET NULL,
    cycle_id INTEGER REFERENCES review_cycles(cycle_id) ON DELETE CASCADE,
    overall_rating DECIMAL(3,2),
    status TEXT DEFAULT 'Not Started',
    submission_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  `);
  
  // Review details
  await schemaHelpers.createTable('review_details', `
    detail_id SERIAL PRIMARY KEY,
    review_id INTEGER REFERENCES employee_reviews(review_id) ON DELETE CASCADE,
    criteria_id INTEGER REFERENCES performance_criteria(criteria_id) ON DELETE CASCADE,
    rating DECIMAL(3,2),
    comments TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  `);
}

async function createRecruitmentTables() {
  console.log('Creating recruitment tables...');
  
  // Job openings
  await schemaHelpers.createTable('job_openings', `
    job_id SERIAL PRIMARY KEY,
    position_id INTEGER REFERENCES positions(position_id) ON DELETE CASCADE,
    department_id INTEGER REFERENCES departments(department_id) ON DELETE CASCADE,
    num_positions INTEGER DEFAULT 1,
    status TEXT DEFAULT 'Open',
    start_date DATE NOT NULL,
    end_date DATE,
    description TEXT,
    requirements TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  `);
  
  // Candidates
  await schemaHelpers.createTable('candidates', `
    candidate_id SERIAL PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    resume_url TEXT,
    source TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  `);
  
  // Applications
  await schemaHelpers.createTable('job_applications', `
    application_id SERIAL PRIMARY KEY,
    job_id INTEGER REFERENCES job_openings(job_id) ON DELETE CASCADE,
    candidate_id INTEGER REFERENCES candidates(candidate_id) ON DELETE CASCADE,
    status TEXT DEFAULT 'Applied',
    application_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  `);
  
  // Interview stages
  await schemaHelpers.createTable('interview_stages', `
    stage_id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    order_num INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  `);
  
  // Interviews
  await schemaHelpers.createTable('interviews', `
    interview_id SERIAL PRIMARY KEY,
    application_id INTEGER REFERENCES job_applications(application_id) ON DELETE CASCADE,
    stage_id INTEGER REFERENCES interview_stages(stage_id) ON DELETE SET NULL,
    interviewer_id TEXT REFERENCES employees(employee_id) ON DELETE SET NULL,
    scheduled_date TIMESTAMP,
    duration INTEGER, -- in minutes
    status TEXT DEFAULT 'Scheduled',
    feedback TEXT,
    rating INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  `);
}

async function createTrainingTables() {
  console.log('Creating training tables...');
  
  // Training courses
  await schemaHelpers.createTable('training_courses', `
    course_id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    duration INTEGER, -- in hours
    cost DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  `);
  
  // Training sessions
  await schemaHelpers.createTable('training_sessions', `
    session_id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES training_courses(course_id) ON DELETE CASCADE,
    trainer_name TEXT,
    trainer_id TEXT REFERENCES employees(employee_id) ON DELETE SET NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    location TEXT,
    max_participants INTEGER,
    status TEXT DEFAULT 'Scheduled',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  `);
  
  // Training enrollments
  await schemaHelpers.createTable('training_enrollments', `
    enrollment_id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES training_sessions(session_id) ON DELETE CASCADE,
    employee_id TEXT REFERENCES employees(employee_id) ON DELETE CASCADE,
    status TEXT DEFAULT 'Enrolled',
    completion_date DATE,
    attendance BOOLEAN,
    score DECIMAL(5,2),
    feedback TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(session_id, employee_id)
  `);
  
  // Employee skills
  await schemaHelpers.createTable('skills', `
    skill_id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  `);
  
  // Employee skills mapping
  await schemaHelpers.createTable('employee_skills', `
    id SERIAL PRIMARY KEY,
    employee_id TEXT REFERENCES employees(employee_id) ON DELETE CASCADE,
    skill_id INTEGER REFERENCES skills(skill_id) ON DELETE CASCADE,
    proficiency_level INTEGER, -- 1-5
    acquired_date DATE,
    certification TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(employee_id, skill_id)
  `);
}

async function createViews() {
  console.log('Creating views...');
  
  // Employee directory view
  await schemaHelpers.executeSQL(`
    CREATE OR REPLACE VIEW employee_directory AS
    SELECT 
      e.employee_id,
      e.first_name,
      e.last_name,
      e.email,
      e.phone,
      e.status,
      p.title as position,
      d.name as department,
      e.hire_date,
      e.employment_type
    FROM 
      employees e
    LEFT JOIN 
      positions p ON e.position_id = p.position_id
    LEFT JOIN 
      departments d ON e.department_id = d.department_id
    WHERE 
      e.status = 'Active';
  `);
  
  // Leave summary view
  await schemaHelpers.executeSQL(`
    CREATE OR REPLACE VIEW leave_summary AS
    SELECT 
      e.employee_id,
      e.first_name,
      e.last_name,
      lt.name as leave_type,
      lb.year,
      lb.balance,
      lb.used,
      (lb.balance - lb.used) as remaining
    FROM 
      employees e
    JOIN 
      leave_balances lb ON e.employee_id = lb.employee_id
    JOIN 
      leave_types lt ON lb.leave_type_id = lt.leave_type_id;
  `);
  
  // Department headcount view
  await schemaHelpers.executeSQL(`
    CREATE OR REPLACE VIEW department_headcount AS
    SELECT 
      d.name as department,
      COUNT(e.employee_id) as headcount,
      SUM(CASE WHEN e.status = 'Active' THEN 1 ELSE 0 END) as active_employees
    FROM 
      departments d
    LEFT JOIN 
      employees e ON d.department_id = e.department_id
    GROUP BY 
      d.department_id, d.name;
  `);
}

// Run if executed directly
if (require.main === module) {
  migrateHRSchema();
}

module.exports = migrateHRSchema; 