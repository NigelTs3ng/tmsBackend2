# Supabase Schema Migration Guide

This document explains how to modify the database schema while preserving data.

## Prerequisites

1. Make sure you have set up the database connection correctly in `config.env`
2. Ensure the `execute_statement` function is created in your Supabase project (see `setup-functions.sql`)

## Tools Provided

We've created several tools to help with schema management:

1. **schemaHelpers.js** - A library of helper functions for common schema operations
2. **modifySchema.js** - A template script for making schema changes
3. **schemaExample.js** - Examples of different types of schema changes

## Running Schema Modifications

To run the example schema modifications:

```bash
npm run schema:example
```

To run your custom schema modifications:

```bash
npm run modify:schema
```

## Best Practices for Schema Migrations

### 1. Always Back Up Data First

```javascript
// Back up a table before making changes
await schemaHelpers.backupTable('users', 'users_backup');
```

### 2. Use Transaction-Like Patterns

```javascript
try {
  // Disable foreign keys
  await schemaHelpers.disableForeignKeys();
  
  // Make changes...
  
  // Re-enable foreign keys
  await schemaHelpers.enableForeignKeys();
} catch (error) {
  // Handle errors and ensure foreign keys are re-enabled
  await schemaHelpers.enableForeignKeys();
  console.error(error);
}
```

### 3. Handling Foreign Keys When Deleting Tables

If you need to delete a table with foreign key relationships:

```javascript
// Use CASCADE to automatically delete related records
await schemaHelpers.dropTable('application', true);

// Or modify foreign keys to use ON DELETE SET NULL to keep related records
await schemaHelpers.executeSQL(`
  ALTER TABLE task DROP CONSTRAINT IF EXISTS task_task_app_acronym_fkey;
  ALTER TABLE task ADD CONSTRAINT task_task_app_acronym_fkey 
  FOREIGN KEY (Task_app_Acronym) REFERENCES application(App_Acronym) 
  ON DELETE SET NULL;
`);
```

### 4. Adding Columns Safely

```javascript
// Add with a default value to handle existing records
await schemaHelpers.addColumn('users', 'active', 'BOOLEAN', true, 'true');

// Or make the column nullable
await schemaHelpers.addColumn('users', 'phone_number', 'TEXT');
```

## Common Schema Operations

### Add a Column

```javascript
await schemaHelpers.addColumn('users', 'phone_number', 'TEXT');
```

### Drop a Column

```javascript
await schemaHelpers.dropColumn('users', 'unused_field');
```

### Create a Table

```javascript
await schemaHelpers.createTable('new_table', `
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
`);
```

### Drop a Table

```javascript
await schemaHelpers.dropTable('old_table', true); // true enables CASCADE
```

### Modify a Foreign Key

```javascript
await schemaHelpers.executeSQL(`
  ALTER TABLE task DROP CONSTRAINT IF EXISTS task_task_app_acronym_fkey;
  ALTER TABLE task ADD CONSTRAINT task_task_app_acronym_fkey 
  FOREIGN KEY (Task_app_Acronym) REFERENCES application(App_Acronym) 
  ON DELETE CASCADE;
`);
```

## Preserving Data

### Using Views

If you need to restructure tables but preserve the same API interface, consider using views:

```javascript
await schemaHelpers.executeSQL(`
  CREATE OR REPLACE VIEW user_details AS
  SELECT u.username, u.email, s.theme, s.notifications
  FROM users u
  LEFT JOIN user_settings s ON u.username = s.username;
`);
```

### Temporary Tables

For complex migrations, use temporary tables:

```javascript
// 1. Create temporary table with new structure
await schemaHelpers.createTable('users_new', `
  username TEXT PRIMARY KEY,
  email TEXT,
  password TEXT NOT NULL,
  userGroup TEXT,
  isActive INTEGER DEFAULT 1,
  phone_number TEXT
`);

// 2. Copy data
await schemaHelpers.executeSQL(`
  INSERT INTO users_new(username, email, password, userGroup, isActive)
  SELECT username, email, password, userGroup, isActive
  FROM users;
`);

// 3. Swap tables
await schemaHelpers.disableForeignKeys();
await schemaHelpers.dropTable('users', true);
await schemaHelpers.executeSQL('ALTER TABLE users_new RENAME TO users;');
await schemaHelpers.enableForeignKeys();
```

## Validating Your Changes

After making schema changes, validate that your tables are as expected:

```bash
npm run check:tables
```

## Need Help?

If you encounter issues with your schema migrations, check:

1. Supabase error logs in the dashboard
2. That all SQL statements are valid PostgreSQL syntax
3. That the `execute_statement` function exists in your database 