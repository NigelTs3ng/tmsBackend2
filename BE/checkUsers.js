const supabase = require('./config/supabase');

async function checkUsers() {
  try {
    console.log('Checking users table...');
    
    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*');
    
    if (usersError) {
      console.error('Error fetching users:', usersError);
      return;
    }
    
    console.log(`Total users found: ${users ? users.length : 0}`);
    if (users && users.length > 0) {
      console.log('User records:');
      users.forEach(user => {
        // Don't show full password
        const safeUser = { ...user };
        if (safeUser.password) {
          safeUser.password = `${safeUser.password.substring(0, 10)}...`;
        }
        console.log(JSON.stringify(safeUser, null, 2));
      });
    } else {
      console.log('No users found in the database.');
    }
    
    // Check groups table
    const { data: groups, error: groupsError } = await supabase
      .from('groups')
      .select('*');
      
    if (groupsError) {
      console.error('Error fetching groups:', groupsError);
    } else {
      console.log(`\nTotal groups found: ${groups ? groups.length : 0}`);
      if (groups && groups.length > 0) {
        console.log('Group records:');
        groups.forEach(group => {
          console.log(JSON.stringify(group, null, 2));
        });
      } else {
        console.log('No groups found in the database.');
      }
    }
  } catch (err) {
    console.error('Error checking database:', err);
  }
}

// Run if executed directly
if (require.main === module) {
  checkUsers();
}

module.exports = checkUsers; 