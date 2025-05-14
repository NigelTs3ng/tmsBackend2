const supabase = require('./supabase');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: './config/config.env' });

/**
 * This script handles the migration from MySQL to Supabase
 * It creates all the necessary tables with proper relationships
 */

async function migrate() {
  console.log('Starting migration to Supabase...');
  
  try {
    // Check if we already have a users table
    const { data: existingUsers, error: checkError } = await supabase
      .from('users')
      .select('username')
      .limit(1);
      
    if (!checkError && existingUsers.length > 0) {
      console.log('Migration appears to have been already performed.');
      console.log('Skipping to prevent duplicate data. To force migration, drop tables first.');
      return;
    }
    
    // Create users table - primary for authentication
    console.log('Creating users table...');
    const { error: usersError } = await supabase.rpc('create_table_if_not_exists', {
      table_name: 'users',
      definition: `
        username TEXT PRIMARY KEY,
        email TEXT,
        password TEXT NOT NULL,
        userGroup TEXT,
        isActive INTEGER DEFAULT 1
      `
    });
    
    if (usersError) throw usersError;
    
    // Create groups table
    console.log('Creating groups table...');
    const { error: groupsError } = await supabase.rpc('create_table_if_not_exists', {
      table_name: 'groups',
      definition: `
        userGroup TEXT PRIMARY KEY
      `
    });
    
    if (groupsError) throw groupsError;
    
    // Create application table
    console.log('Creating application table...');
    const { error: applicationError } = await supabase.rpc('create_table_if_not_exists', {
      table_name: 'application',
      definition: `
        App_Acronym TEXT PRIMARY KEY,
        App_Description TEXT,
        App_Rnumber INTEGER,
        App_startDate TIMESTAMP,
        App_endDate TIMESTAMP,
        App_permit_Open TEXT,
        App_permit_toDoList TEXT,
        App_permit_Doing TEXT,
        App_permit_Done TEXT,
        App_permit_Create TEXT
      `
    });
    
    if (applicationError) throw applicationError;
    
    // Create plan table
    console.log('Creating plan table...');
    const { error: planError } = await supabase.rpc('create_table_if_not_exists', {
      table_name: 'plan',
      definition: `
        Plan_MVP_name TEXT PRIMARY KEY,
        Plan_startDate TIMESTAMP,
        Plan_endDate TIMESTAMP,
        Plan_app_Acronym TEXT,
        FOREIGN KEY (Plan_app_Acronym) REFERENCES application(App_Acronym)
      `
    });
    
    if (planError) throw planError;
    
    // Create task table
    console.log('Creating task table...');
    const { error: taskError } = await supabase.rpc('create_table_if_not_exists', {
      table_name: 'task',
      definition: `
        Task_id TEXT PRIMARY KEY,
        Task_name TEXT,
        Task_description TEXT,
        Task_notes TEXT,
        Task_plan TEXT,
        Task_app_Acronym TEXT,
        Task_state TEXT,
        Task_creator TEXT,
        Task_owner TEXT,
        Task_createDate TIMESTAMP,
        FOREIGN KEY (Task_app_Acronym) REFERENCES application(App_Acronym),
        FOREIGN KEY (Task_plan) REFERENCES plan(Plan_MVP_name)
      `
    });
    
    if (taskError) throw taskError;
    
    console.log('Migration completed successfully!');
    console.log('Now you need to populate your Supabase database with data from your MySQL database.');
    
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Execute migration
migrate();

// Export the function for potential reuse
module.exports = migrate; 