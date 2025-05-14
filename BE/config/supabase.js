const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')

// Set up config.env file variables
dotenv.config({ path: './config/config.env' })

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or API key. Please check your environment variables.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('Supabase client initialized successfully')

module.exports = supabase 