const supabase = require('./supabase');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: './config/config.env' });

/**
 * Example script to modify the database schema while preserving data
 * This is just a template - modify according to your specific needs
 */
async function modifySchema() {
  try {
    console.log('Starting schema modifications...');
    
    // 1. Create backup tables as needed
    console.log('Creating backups of existing data...');
    await supabase.rpc('execute_statement', { 
      statement: `CREATE TABLE IF NOT EXISTS task_backup AS SELECT * FROM task;`
    });
    
    // 2. Disable foreign key constraints temporarily
    console.log('Temporarily disabling foreign key constraints...');
    await supabase.rpc('execute_statement', { 
      statement: `SET session_replication_role = 'replica';`
    });
    
    // 3. Make schema changes (examples)
    console.log('Making schema changes...');
    
    // Example: Add a new column to users table
    await supabase.rpc('execute_statement', { 
      statement: `ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number TEXT;`
    });
    
    // Example: Modify a column
    await supabase.rpc('execute_statement', { 
      statement: `ALTER TABLE users ALTER COLUMN email DROP NOT NULL;`
    });
    
    // Example: Change a foreign key to use CASCADE delete
    await supabase.rpc('execute_statement', { 
      statement: `
        ALTER TABLE task DROP CONSTRAINT IF EXISTS task_task_app_acronym_fkey;
        ALTER TABLE task ADD CONSTRAINT task_task_app_acronym_fkey 
        FOREIGN KEY (Task_app_Acronym) REFERENCES application(App_Acronym) 
        ON DELETE CASCADE;
      `
    });
    
    // 4. Re-enable foreign key constraints
    console.log('Re-enabling foreign key constraints...');
    await supabase.rpc('execute_statement', { 
      statement: `SET session_replication_role = 'origin';`
    });
    
    console.log('Schema modifications completed successfully!');
    
  } catch (error) {
    console.error('Error modifying schema:', error);
  }
}

// If this script is run directly, execute the function
if (require.main === module) {
  modifySchema();
}

// Export for use in other scripts
module.exports = modifySchema; 