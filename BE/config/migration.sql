-- This SQL file creates all the necessary tables for the application
-- Run this in the Supabase SQL Editor

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  username TEXT PRIMARY KEY,
  email TEXT,
  password TEXT NOT NULL,
  userGroup TEXT,
  isActive INTEGER DEFAULT 1
);

-- Create groups table
CREATE TABLE IF NOT EXISTS groups (
  userGroup TEXT PRIMARY KEY
);

-- Create application table
CREATE TABLE IF NOT EXISTS application (
  App_Acronym TEXT PRIMARY KEY,
  App_Description TEXT,
  App_Rnumber INTEGER,
  App_startDate TIMESTAMP,
  App_endDate TIMESTAMP,
  App_permit_Open TEXT,
  App_permit_toDoList TEXT,
  App_permit_Doing TEXT,
  App_permit_Done TEXT,
  App_permit_Create TEXT
);

-- Create plan table
CREATE TABLE IF NOT EXISTS plan (
  Plan_MVP_name TEXT PRIMARY KEY,
  Plan_startDate TIMESTAMP,
  Plan_endDate TIMESTAMP,
  Plan_app_Acronym TEXT,
  FOREIGN KEY (Plan_app_Acronym) REFERENCES application(App_Acronym)
);

-- Create task table
CREATE TABLE IF NOT EXISTS task (
  Task_id TEXT PRIMARY KEY,
  Task_name TEXT,
  Task_description TEXT,
  Task_notes TEXT,
  Task_plan TEXT,
  Task_app_Acronym TEXT,
  Task_state TEXT,
  Task_creator TEXT,
  Task_owner TEXT,
  Task_createDate TIMESTAMP,
  FOREIGN KEY (Task_app_Acronym) REFERENCES application(App_Acronym),
  FOREIGN KEY (Task_plan) REFERENCES plan(Plan_MVP_name)
);

-- Create basic RLS policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE application ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE task ENABLE ROW LEVEL SECURITY;

-- Allow authenticated access to all tables
CREATE POLICY "Allow full access" ON users FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow full access" ON groups FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow full access" ON application FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow full access" ON plan FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow full access" ON task FOR ALL TO authenticated USING (true); 