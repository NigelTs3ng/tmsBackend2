const supabase = require('./config/supabase');

async function testConnection() {
  try {
    // Simple query to check connection
    const { data, error } = await supabase.from('users').select('*').limit(1);
    
    if (error) {
      console.error('Error connecting to Supabase:', error);
      return false;
    }
    
    console.log('Successfully connected to Supabase!');
    console.log('Sample data:', data);
    return true;
  } catch (error) {
    console.error('Exception when connecting to Supabase:', error);
    return false;
  }
}

// Run if executed directly
if (require.main === module) {
  testConnection();
}

module.exports = testConnection; 