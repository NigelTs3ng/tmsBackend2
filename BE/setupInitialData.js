const supabase = require('./config/supabase');
const bcrypt = require('bcrypt');

async function setupInitialData() {
  try {
    console.log('Setting up initial database data...');
    
    // 1. Create groups
    console.log('Creating user groups...');
    
    // Check if groups already exist
    const { data: existingGroups, error: groupCheckError } = await supabase
      .from('groups')
      .select('*');
      
    if (groupCheckError) {
      console.error('Error checking groups:', groupCheckError);
      return;
    }
    
    // Create admin group if it doesn't exist
    if (!existingGroups || !existingGroups.some(g => g.usergroup === 'admin')) {
      const { data: adminGroup, error: adminError } = await supabase
        .from('groups')
        .insert({ usergroup: 'admin' })
        .select();
        
      if (adminError) {
        console.error('Error creating admin group:', adminError);
        return;
      }
      console.log('Admin group created:', adminGroup);
    } else {
      console.log('Admin group already exists.');
    }
    
    // Create employee group if it doesn't exist
    if (!existingGroups || !existingGroups.some(g => g.usergroup === 'employee')) {
      const { data: employeeGroup, error: employeeError } = await supabase
        .from('groups')
        .insert({ usergroup: 'employee' })
        .select();
        
      if (employeeError) {
        console.error('Error creating employee group:', employeeError);
        return;
      }
      console.log('Employee group created:', employeeGroup);
    } else {
      console.log('Employee group already exists.');
    }
    
    // Get the groups to get their IDs
    const { data: groups, error: getGroupsError } = await supabase
      .from('groups')
      .select('*');
      
    if (getGroupsError) {
      console.error('Error getting groups:', getGroupsError);
      return;
    }
    
    const adminGroup = groups.find(g => g.usergroup === 'admin');
    if (!adminGroup) {
      console.error('Could not find admin group after creation');
      return;
    }
    
    // 2. Create admin user
    console.log('Creating admin user...');
    
    // Check if admin user already exists
    const { data: existingUsers, error: userCheckError } = await supabase
      .from('users')
      .select('*')
      .eq('username', 'admin');
      
    if (userCheckError) {
      console.error('Error checking users:', userCheckError);
      return;
    }
    
    if (!existingUsers || existingUsers.length === 0) {
      // Create default admin user
      const password = 'Admin123!'; // Default password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const { data: adminUser, error: adminUserError } = await supabase
        .from('users')
        .insert({
          username: 'admin',
          email: 'admin@example.com',
          password: hashedPassword,
          usergroup: adminGroup.id, // Reference to admin group ID
          isactive: 1
        })
        .select();
        
      if (adminUserError) {
        console.error('Error creating admin user:', adminUserError);
        return;
      }
      
      console.log('Admin user created successfully!');
      console.log('Username: admin');
      console.log('Password: Admin123!');
    } else {
      console.log('Admin user already exists.');
    }
    
    console.log('\nInitial setup complete. You can now log in with:');
    console.log('Username: admin');
    console.log('Password: Admin123!');
    
  } catch (err) {
    console.error('Error during setup:', err);
  }
}

// Run if executed directly
if (require.main === module) {
  setupInitialData();
}

module.exports = setupInitialData; 