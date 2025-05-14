const supabase = require('../config/supabase')

/**
 * Helper functions to migrate from MySQL to Supabase
 */

// Equivalent to SELECT queries
async function select(table, columns = '*', filters = {}) {
  try {
    let query = supabase.from(table).select(columns)
    
    // Apply filters if any (WHERE clauses)
    Object.keys(filters).forEach(key => {
      query = query.eq(key, filters[key])
    })
    
    const { data, error } = await query
    
    if (error) throw error
    return [data, null] // Format to match MySQL's [rows, fields] return format
  } catch (error) {
    console.error(`Error selecting from ${table}:`, error)
    return [[], error]
  }
}

// Equivalent to INSERT queries
async function insert(table, values) {
  try {
    const { data, error } = await supabase
      .from(table)
      .insert(values)
      .select()
      
    if (error) throw error
    return [data, null]
  } catch (error) {
    console.error(`Error inserting into ${table}:`, error)
    return [null, error]
  }
}

// Equivalent to UPDATE queries
async function update(table, values, filters) {
  try {
    let query = supabase
      .from(table)
      .update(values)
    
    // Apply filters
    Object.keys(filters).forEach(key => {
      query = query.eq(key, filters[key])
    })
    
    const { data, error } = await query.select()
    
    if (error) throw error
    return [data, null]
  } catch (error) {
    console.error(`Error updating ${table}:`, error)
    return [null, error]
  }
}

// Equivalent to DELETE queries
async function remove(table, filters) {
  try {
    let query = supabase
      .from(table)
      .delete()
    
    // Apply filters
    Object.keys(filters).forEach(key => {
      query = query.eq(key, filters[key])
    })
    
    const { data, error } = await query.select()
    
    if (error) throw error
    return [data, null]
  } catch (error) {
    console.error(`Error deleting from ${table}:`, error)
    return [null, error]
  }
}

// Execute raw SQL (use sparingly, as it bypasses Supabase's security)
async function rawQuery(query, params = []) {
  console.warn('Raw SQL execution with Supabase is discouraged. Using built-in methods is preferred.')
  try {
    const { data, error } = await supabase.rpc('execute_sql', { 
      sql_query: query,
      params: params 
    })
    
    if (error) throw error
    return [data, null]
  } catch (error) {
    console.error('Error executing raw query:', error)
    return [null, error]
  }
}

module.exports = {
  select,
  insert,
  update,
  remove,
  rawQuery,
  supabase
} 