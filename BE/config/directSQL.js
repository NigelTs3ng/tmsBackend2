const supabase = require('./supabase');
const fs = require('fs');
const path = require('path');

/**
 * This script attempts to execute the migration.sql file directly
 * Use this if the regular migration script doesn't work
 */
async function executeSql() {
  try {
    console.log('Attempting to execute SQL directly...');
    
    // Read SQL file
    const sqlFilePath = path.join(__dirname, 'migration.sql');
    
    if (!fs.existsSync(sqlFilePath)) {
      console.error(`Migration SQL file not found: ${sqlFilePath}`);
      console.log('Please make sure the migration.sql file exists in the config directory.');
      return;
    }
    
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Split SQL content into separate statements
    const statements = sqlContent
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);
    
    console.log(`Found ${statements.length} SQL statements to execute.`);
    
    // Instead of using supabase.sql, we'll create tables one by one
    // First, let's create the basic tables
    console.log('Creating users table...');
    await executeCreateTable('users', `
      username TEXT PRIMARY KEY,
      email TEXT,
      password TEXT NOT NULL,
      userGroup TEXT,
      isActive INTEGER DEFAULT 1
    `);
    
    console.log('Creating groups table...');
    await executeCreateTable('groups', `
      userGroup TEXT PRIMARY KEY
    `);
    
    console.log('Creating application table...');
    await executeCreateTable('application', `
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
    `);
    
    console.log('Creating plan table...');
    await executeCreateTable('plan', `
      Plan_MVP_name TEXT PRIMARY KEY,
      Plan_startDate TIMESTAMP,
      Plan_endDate TIMESTAMP,
      Plan_app_Acronym TEXT,
      FOREIGN KEY (Plan_app_Acronym) REFERENCES application(App_Acronym)
    `);
    
    console.log('Creating task table...');
    await executeCreateTable('task', `
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
    `);
    
    // Set up RLS policies
    console.log('Setting up RLS policies...');
    
    // Enable RLS
    for (const table of ['users', 'groups', 'application', 'plan', 'task']) {
      const { error } = await supabase.rpc('execute_statement', { 
        statement: `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;` 
      });
      
      if (error) {
        console.log(`Warning: Could not enable RLS on ${table}: ${error.message}`);
      }
    }
    
    // Create policies
    for (const table of ['users', 'groups', 'application', 'plan', 'task']) {
      const { error } = await supabase.rpc('execute_statement', { 
        statement: `CREATE POLICY "Allow full access" ON ${table} FOR ALL TO authenticated USING (true);` 
      });
      
      if (error) {
        console.log(`Warning: Could not create policy on ${table}: ${error.message}`);
      }
    }
    
    console.log('SQL execution completed!');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

async function executeCreateTable(tableName, definition) {
  try {
    const { error } = await supabase.rpc('execute_statement', { 
      statement: `
        CREATE TABLE IF NOT EXISTS ${tableName} (
          ${definition}
        );
      `
    });
    
    if (error) {
      console.error(`Error creating table ${tableName}:`, error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`Error creating table ${tableName}:`, error);
    return false;
  }
}

// Execute the SQL
executeSql(); 