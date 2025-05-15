const supabase = require('./supabase');

/**
 * Helper functions for common schema operations
 */

/**
 * Add a column to a table
 * @param {string} table - Table name
 * @param {string} column - Column name
 * @param {string} type - Column data type
 * @param {boolean} notNull - Whether the column should be NOT NULL
 * @param {string} defaultValue - Default value for the column (optional)
 */
async function addColumn(table, column, type, notNull = false, defaultValue = null) {
  try {
    let sql = `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${type}`;
    
    if (notNull) {
      sql += ' NOT NULL';
    }
    
    if (defaultValue !== null) {
      sql += ` DEFAULT ${defaultValue}`;
    }
    
    const { error } = await supabase.rpc('execute_statement', { statement: sql });
    
    if (error) {
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error(`Error adding column ${column} to ${table}:`, error);
    return false;
  }
}

/**
 * Drop a column from a table
 * @param {string} table - Table name
 * @param {string} column - Column name to drop
 */
async function dropColumn(table, column) {
  try {
    const sql = `ALTER TABLE ${table} DROP COLUMN IF EXISTS ${column}`;
    
    const { error } = await supabase.rpc('execute_statement', { statement: sql });
    
    if (error) {
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error(`Error dropping column ${column} from ${table}:`, error);
    return false;
  }
}

/**
 * Create a new table
 * @param {string} table - Table name
 * @param {string} definition - SQL defining the table columns and constraints
 */
async function createTable(table, definition) {
  try {
    const sql = `CREATE TABLE IF NOT EXISTS ${table} (${definition})`;
    
    const { error } = await supabase.rpc('execute_statement', { statement: sql });
    
    if (error) {
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error(`Error creating table ${table}:`, error);
    return false;
  }
}

/**
 * Drop a table
 * @param {string} table - Table name to drop
 * @param {boolean} cascade - Whether to use CASCADE option
 */
async function dropTable(table, cascade = false) {
  try {
    const sql = `DROP TABLE IF EXISTS ${table}${cascade ? ' CASCADE' : ''}`;
    
    const { error } = await supabase.rpc('execute_statement', { statement: sql });
    
    if (error) {
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error(`Error dropping table ${table}:`, error);
    return false;
  }
}

/**
 * Create a backup of a table
 * @param {string} sourceTable - Table to backup
 * @param {string} backupTable - Name for the backup table
 */
async function backupTable(sourceTable, backupTable) {
  try {
    // Drop backup table if it exists
    await dropTable(backupTable);
    
    // Create backup
    const sql = `CREATE TABLE ${backupTable} AS SELECT * FROM ${sourceTable}`;
    
    const { error } = await supabase.rpc('execute_statement', { statement: sql });
    
    if (error) {
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error(`Error backing up table ${sourceTable}:`, error);
    return false;
  }
}

/**
 * Temporarily disable foreign key constraints
 */
async function disableForeignKeys() {
  try {
    const { error } = await supabase.rpc('execute_statement', { 
      statement: `SET session_replication_role = 'replica';`
    });
    
    if (error) {
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Error disabling foreign keys:', error);
    return false;
  }
}

/**
 * Re-enable foreign key constraints
 */
async function enableForeignKeys() {
  try {
    const { error } = await supabase.rpc('execute_statement', { 
      statement: `SET session_replication_role = 'origin';`
    });
    
    if (error) {
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Error enabling foreign keys:', error);
    return false;
  }
}

/**
 * Execute raw SQL
 * @param {string} sql - SQL statement to execute
 */
async function executeSQL(sql) {
  try {
    const { error } = await supabase.rpc('execute_statement', { statement: sql });
    
    if (error) {
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Error executing SQL:', error);
    console.error('SQL statement:', sql);
    return false;
  }
}

module.exports = {
  addColumn,
  dropColumn,
  createTable,
  dropTable,
  backupTable,
  disableForeignKeys,
  enableForeignKeys,
  executeSQL
}; 