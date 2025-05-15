const supabase = require('./config/supabase');

async function verifyTables() {
  const tablesToCheck = [
    'departments', 
    'positions', 
    'employees',
    'attendance',
    'leave_types',
    'payroll_periods',
    'job_openings',
    'training_courses'
  ];
  
  console.log('Verifying HR schema tables in Supabase...\n');
  
  let allTablesExist = true;
  
  for (const table of tablesToCheck) {
    try {
      // Try to select from the table
      const { data, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.error(`❌ Table "${table}" check failed:`, error.message);
        allTablesExist = false;
      } else {
        console.log(`✅ Table "${table}" exists.`);
      }
    } catch (error) {
      console.error(`❌ Error checking table "${table}":`, error.message);
      allTablesExist = false;
    }
  }
  
  console.log('\nChecking database views...');
  
  // Check if views exist by querying them
  const viewsToCheck = [
    'employee_directory',
    'leave_summary',
    'department_headcount'
  ];
  
  for (const view of viewsToCheck) {
    try {
      const { data, error } = await supabase
        .from(view)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.error(`❌ View "${view}" check failed:`, error.message);
      } else {
        console.log(`✅ View "${view}" exists.`);
      }
    } catch (error) {
      console.error(`❌ Error checking view "${view}":`, error.message);
    }
  }
  
  if (allTablesExist) {
    console.log('\n✅ All HR schema tables have been created successfully!');
    console.log('\nYou can now start using the HR database schema for your application.');
  } else {
    console.log('\n⚠️ Some tables may be missing. Please check the errors above.');
  }
}

// Run if executed directly
if (require.main === module) {
  verifyTables();
}

module.exports = verifyTables; 