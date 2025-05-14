const mysql = require('mysql2/promise');
const supabase = require('./supabase');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: './config/config.env' });

/**
 * This script migrates data from MySQL to Supabase
 * It should be run after the tables have been created in Supabase
 */

async function migrateData() {
  console.log('Starting data migration from MySQL to Supabase...');
  
  // Create MySQL connection
  const mysqlConnection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
  });
  
  try {
    console.log('Connected to MySQL database.');
    
    // Migrate users table
    console.log('Migrating users table...');
    const [users] = await mysqlConnection.execute('SELECT * FROM users');
    
    if (users.length > 0) {
      const { error: usersError } = await supabase
        .from('users')
        .insert(users);
        
      if (usersError) throw usersError;
      console.log(`Migrated ${users.length} users.`);
    } else {
      console.log('No users to migrate.');
    }
    
    // Migrate groups table
    console.log('Migrating groups table...');
    const [groups] = await mysqlConnection.execute('SELECT * FROM `groups`');
    
    if (groups.length > 0) {
      const { error: groupsError } = await supabase
        .from('groups')
        .insert(groups);
        
      if (groupsError) throw groupsError;
      console.log(`Migrated ${groups.length} groups.`);
    } else {
      console.log('No groups to migrate.');
    }
    
    // Migrate application table
    console.log('Migrating application table...');
    const [applications] = await mysqlConnection.execute('SELECT * FROM application');
    
    if (applications.length > 0) {
      const { error: applicationsError } = await supabase
        .from('application')
        .insert(applications);
        
      if (applicationsError) throw applicationsError;
      console.log(`Migrated ${applications.length} applications.`);
    } else {
      console.log('No applications to migrate.');
    }
    
    // Migrate plan table
    console.log('Migrating plan table...');
    const [plans] = await mysqlConnection.execute('SELECT * FROM plan');
    
    if (plans.length > 0) {
      const { error: plansError } = await supabase
        .from('plan')
        .insert(plans);
        
      if (plansError) throw plansError;
      console.log(`Migrated ${plans.length} plans.`);
    } else {
      console.log('No plans to migrate.');
    }
    
    // Migrate task table
    console.log('Migrating task table...');
    const [tasks] = await mysqlConnection.execute('SELECT * FROM task');
    
    if (tasks.length > 0) {
      const { error: tasksError } = await supabase
        .from('task')
        .insert(tasks);
        
      if (tasksError) throw tasksError;
      console.log(`Migrated ${tasks.length} tasks.`);
    } else {
      console.log('No tasks to migrate.');
    }
    
    console.log('Data migration completed successfully!');
    
  } catch (error) {
    console.error('Data migration failed:', error);
  } finally {
    // Close MySQL connection
    await mysqlConnection.end();
    console.log('MySQL connection closed.');
  }
}

// Execute migration
migrateData();

// Export the function for potential reuse
module.exports = migrateData; 