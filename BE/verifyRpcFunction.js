const supabase = require('./config/supabase');

async function verifyRpcFunction() {
  try {
    // Try to call the RPC function with a simple query
    const { data, error } = await supabase.rpc('execute_statement', { 
      statement: 'SELECT current_timestamp' 
    });
    
    if (error) {
      console.error('Error calling execute_statement RPC function:', error);
      console.log('\nThe execute_statement function might not exist in your Supabase instance.');
      console.log('You need to create this function in the Supabase SQL editor. Here is the SQL:');
      console.log(`
CREATE OR REPLACE FUNCTION execute_statement(statement text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE statement;
END;
$$;
      `);
      return false;
    }
    
    console.log('Successfully called execute_statement RPC function!');
    console.log('You can now run the HR schema migration script.');
    return true;
  } catch (error) {
    console.error('Exception when verifying RPC function:', error);
    return false;
  }
}

// Run if executed directly
if (require.main === module) {
  verifyRpcFunction();
}

module.exports = verifyRpcFunction;