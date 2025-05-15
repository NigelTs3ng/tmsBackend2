-- This function allows executing arbitrary SQL statements
-- Important: This introduces security risks and should be used carefully
CREATE OR REPLACE FUNCTION execute_statement(statement text)
RETURNS void AS $$
BEGIN
  EXECUTE statement;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 