# Task Management System - Supabase Migration

This branch contains the migration of the backend from MySQL to Supabase.

## Prerequisites

1. [Supabase Account](https://supabase.io) - Create a free account
2. Supabase Project - Create a new project in Supabase 
3. Node.js 14+ installed

## Setup Instructions

### 1. Install Dependencies

```bash
cd BE
npm install
```

### 2. Set Up Supabase Credentials

1. In your Supabase project dashboard, go to Settings > API
2. Copy the "Project URL" and "API Key" (use the anon public key)
3. Update the `BE/config/config.env` file with your credentials:

```
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
```

### 3. Create Database Functions in Supabase

For the migration script to work, you need to create a SQL function in Supabase:

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Create a new query and paste the following SQL:

```sql
CREATE OR REPLACE FUNCTION create_table_if_not_exists(
    table_name text,
    definition text
) RETURNS void AS $$
BEGIN
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I (
            %s
        );
    ', table_name, definition);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

4. Run the query to create the function

### 4. Running the Migration

To create the table structure in Supabase:

```bash
npm run migrate:schema
```

To migrate data from MySQL to Supabase (requires existing MySQL connection):

```bash
npm run migrate:data
```

Or run both steps together:

```bash
npm run migrate
```

### 5. Start the Application

```bash
npm run dev
```

## Key Files Modified in Migration

- `config/supabase.js` - Supabase client configuration
- `utils/supabaseQueries.js` - Helper functions for database operations
- Controllers modified to use Supabase instead of MySQL
- Migration utilities in `config/migrate.js` and `config/migrateData.js`

## Usage Notes

- The application will automatically connect to Supabase instead of MySQL
- All existing functionality should work exactly the same
- For development, use `npm run dev` to start with nodemon for auto-reload
- Database operations now go through the Supabase client instead of direct SQL

## Troubleshooting

- If you encounter CORS issues, make sure to configure the correct origins in your Supabase project settings
- Check Supabase logs in the project dashboard for any database errors
- Make sure your RLS (Row Level Security) policies in Supabase allow the operations you need 