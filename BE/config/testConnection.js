const supabase = require('./supabase');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: './config/config.env' });

/**
 * Simple test script to verify Supabase connection
 */
async function testConnection() {
  try {
    console.log('Testing Supabase connection...');
    
    // Test connection to Supabase with a simple query
    // Just check the health of the API
    const { data, error } = await supabase.from('_postgres_config').select('*').limit(1);
    
    if (error) {
      if (error.code === '42P01') {
        // This is fine - the table doesn't exist but connection works
        console.log('Successfully connected to Supabase!');
      } else {
        console.error('Error connecting to Supabase:', error);
        return;
      }
    } else {
      console.log('Successfully connected to Supabase!');
    }
    
    // Try to check if our tables exist
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (tablesError) {
      console.log('Unable to list tables, but connection is working.');
      return;
    }
    
    // Display available tables
    console.log('\nAvailable tables in Supabase:');
    if (tables && tables.length > 0) {
      tables.forEach(table => {
        console.log(`- ${table.table_name}`);
      });
    } else {
      console.log('No tables found. You may need to run the migration script.');
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the test
testConnection();

// Export the function for potential reuse
module.exports = testConnection; 