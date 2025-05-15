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
2. Copy the "Project URL" and "API Key" (use the service_role key for server applications)
3. Update the `BE/config/config.env` file with your credentials:

```
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_service_role_key
```

### 3. Test Your Connection

Before migrating, test that your connection to Supabase is working:

```bash
npm run test:connection
```

If successful, you'll see a confirmation that the connection is working.

### 4. Set Up Required Functions in Supabase

Before creating tables, you need to set up a helper function in Supabase:

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Create a new query
4. Copy the contents of `BE/config/setup-functions.sql` and paste it into the SQL Editor
5. Run the query

### 5. Set Up Database Tables

You have two options to set up the database schema:

#### Option 1: Manual SQL Execution

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Create a new query
4. Copy the contents of `BE/config/migration.sql` and paste it into the SQL Editor
5. Run the query

#### Option 2: Automated Script (After setting up functions)

```bash
npm run migrate:sql
```

### 6. Start the Application

```bash
npm run dev
```

## Key Files Modified in Migration

- `config/supabase.js` - Supabase client configuration
- `utils/supabaseQueries.js` - Helper functions for database operations
- Controllers modified to use Supabase instead of MySQL
- Migration utilities in `config/migrate.js` and `config/directSQL.js`
- SQL schema in `config/migration.sql`
- Helper functions in `config/setup-functions.sql`

## Usage Notes

- The application will automatically connect to Supabase instead of MySQL
- All existing functionality should work exactly the same
- For development, use `npm run dev` to start with nodemon for auto-reload
- Database operations now go through the Supabase client instead of direct SQL

## Troubleshooting

- If you encounter CORS issues, make sure to configure the correct origins in your Supabase project settings
- Check Supabase logs in the project dashboard for any database errors
- Make sure your RLS (Row Level Security) policies in Supabase allow the operations you need
- If you get "Invalid API key" errors, make sure you're using the complete service_role key from the Supabase dashboard
- If you get function not found errors, ensure you've run the setup-functions.sql script first 