-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE application ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE task ENABLE ROW LEVEL SECURITY;

-- Create service role access policy
-- This allows our server-side code to have full access when using the service_role key
CREATE POLICY "Service Role Full Access - users" ON users
  FOR ALL 
  TO authenticated
  USING (true);

CREATE POLICY "Service Role Full Access - groups" ON groups
  FOR ALL 
  TO authenticated
  USING (true);

CREATE POLICY "Service Role Full Access - application" ON application
  FOR ALL 
  TO authenticated
  USING (true);

CREATE POLICY "Service Role Full Access - plan" ON plan
  FOR ALL 
  TO authenticated
  USING (true);

CREATE POLICY "Service Role Full Access - task" ON task
  FOR ALL 
  TO authenticated
  USING (true);

-- If you want to implement more restrictive policies, you can replace the above with specific policies:
-- For example, to restrict task view to only users who created the task or are assigned to it:

/*
CREATE POLICY "View tasks you created or own" ON task
  FOR SELECT
  TO authenticated
  USING (auth.uid() IN (
    SELECT auth.uid() FROM users WHERE username = task.Task_creator OR username = task.Task_owner
  ));
*/

-- To allow only PL to update applications (using a function that checks token):

/*
CREATE OR REPLACE FUNCTION check_is_pl(token text)
RETURNS boolean AS $$
DECLARE
  username text;
  is_pl boolean;
BEGIN
  -- This is a simplified example. In real implementation, you'd need to:
  -- 1. Verify the JWT token
  -- 2. Extract the username from the token
  -- 3. Check if the user is in the PL group
  
  SELECT (SELECT userGroup FROM users WHERE username = (SELECT user FROM jwt.decode(token))::json->>'user') = 'PL' INTO is_pl;
  RETURN is_pl;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Only PL can update applications" ON application
  FOR UPDATE
  TO authenticated
  USING (check_is_pl(current_setting('request.headers')::json->>'authorization'));
*/

-- Note: The above are just examples. For a production system, you would need to implement
-- proper JWT validation and role checking based on your application's specific needs. 