const supabase = require('./supabase');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

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
      
    if (!checkError && existingUsers && existingUsers.length > 0) {
      console.log('Migration appears to have been already performed.');
      console.log('Skipping to prevent duplicate data. To force migration, drop tables first.');
      return;
    }
    
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
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      
      const { error } = await supabase.rpc('execute_sql', { sql_query: statement });
      
      if (error) {
        // If there's an error with the execute_sql function, try direct query
        console.log('Could not execute with RPC function, trying direct query...');
        try {
          await supabase.sql(statement);
          console.log('Statement executed successfully with direct SQL.');
        } catch (sqlError) {
          console.error(`Error executing SQL statement: ${sqlError.message}`);
          console.error('Statement:', statement);
          throw sqlError;
        }
      }
    }
    
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