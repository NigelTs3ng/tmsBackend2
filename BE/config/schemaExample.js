const schemaHelpers = require('./schemaHelpers');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: './config/config.env' });

/**
 * Example script showing how to make various schema changes
 * while preserving data
 */
async function exampleSchemaChanges() {
  try {
    console.log('Starting example schema changes...');
    
    // 1. Create a backup of the users table
    console.log('Creating backup of users table...');
    await schemaHelpers.backupTable('users', 'users_backup');
    
    // 2. Disable foreign key constraints
    console.log('Disabling foreign key constraints...');
    await schemaHelpers.disableForeignKeys();
    
    // 3. Example schema changes
    
    // Example 1: Add a new column to users
    console.log('Adding phone_number column to users...');
    await schemaHelpers.addColumn('users', 'phone_number', 'TEXT');
    
    // Example 2: Make email column nullable
    console.log('Making email column nullable...');
    await schemaHelpers.executeSQL('ALTER TABLE users ALTER COLUMN email DROP NOT NULL');
    
    // Example 3: Add a new table with foreign key
    console.log('Creating a new user_settings table...');
    await schemaHelpers.createTable('user_settings', `
      username TEXT PRIMARY KEY REFERENCES users(username) ON DELETE CASCADE,
      theme TEXT DEFAULT 'light',
      notifications BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW()
    `);
    
    // Example 4: Modify foreign key cascade behavior
    console.log('Modifying foreign key behavior in task table...');
    await schemaHelpers.executeSQL(`
      ALTER TABLE task DROP CONSTRAINT IF EXISTS task_task_app_acronym_fkey;
      ALTER TABLE task ADD CONSTRAINT task_task_app_acronym_fkey 
      FOREIGN KEY (Task_app_Acronym) REFERENCES application(App_Acronym) 
      ON DELETE CASCADE;
    `);
    
    // Example 5: Create a new view
    console.log('Creating a view for active users...');
    await schemaHelpers.executeSQL(`
      CREATE OR REPLACE VIEW active_users AS
      SELECT username, email, userGroup 
      FROM users 
      WHERE isActive = 1;
    `);
    
    // 4. Re-enable foreign key constraints
    console.log('Re-enabling foreign key constraints...');
    await schemaHelpers.enableForeignKeys();
    
    console.log('Schema changes completed successfully!');
    
  } catch (error) {
    console.error('Error during schema changes:', error);
  }
}

// Run the example if this script is executed directly
if (require.main === module) {
  exampleSchemaChanges();
}

module.exports = exampleSchemaChanges; 