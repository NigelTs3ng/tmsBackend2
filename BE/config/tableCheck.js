const supabase = require('./supabase');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: './config/config.env' });

/**
 * Script to check if the required tables exist
 */
async function checkTables() {
  const expectedTables = ['users', 'groups', 'application', 'plan', 'task'];
  let foundTables = 0;
  
  console.log('Checking for tables in Supabase...');
  
  for (const table of expectedTables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        if (error.code === '42P01') { // Relation does not exist
          console.log(`❌ Table '${table}' does not exist.`);
        } else {
          console.log(`❌ Error checking table '${table}': ${error.message}`);
        }
      } else {
        console.log(`✅ Table '${table}' exists with ${count} rows.`);
        foundTables++;
      }
    } catch (error) {
      console.log(`❌ Error checking table '${table}': ${error.message}`);
    }
  }
  
  console.log(`\nFound ${foundTables} out of ${expectedTables.length} expected tables.`);
  
  if (foundTables === expectedTables.length) {
    console.log('All tables have been successfully created! Your database is ready to use.');
  } else {
    console.log('Some tables are missing. Please run the migration script again.');
  }
}

// Run the check
checkTables(); 