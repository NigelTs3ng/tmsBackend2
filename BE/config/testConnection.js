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
    
    // Attempt to get Supabase version
    const { data, error } = await supabase.rpc('version');
    
    if (error) {
      console.error('Error connecting to Supabase:', error);
      return;
    }
    
    console.log('Successfully connected to Supabase!');
    console.log('Supabase connection information:', data);
    
    // Try to list tables
    const { data: tables, error: tablesError } = await supabase
      .from('pg_catalog.pg_tables')
      .select('tablename')
      .eq('schemaname', 'public');
    
    if (tablesError) {
      console.error('Error listing tables:', tablesError);
      return;
    }
    
    console.log('Available tables in Supabase:');
    if (tables && tables.length > 0) {
      tables.forEach(table => {
        console.log(`- ${table.tablename}`);
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