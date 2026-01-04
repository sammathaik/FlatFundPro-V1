/*
  # Fix Collection Status Summary Public Access
  
  1. Problem
    - The function `get_collection_status_summary` returns 404 for anonymous users
    - Public collection status page needs access to this function
    
  2. Changes
    - Grant EXECUTE permission to anon role for public access
    
  3. Security
    - Function uses SECURITY DEFINER with RLS checks
    - Safe for public access when used with valid share codes
*/

-- Grant execution to anonymous users for public collection status page
GRANT EXECUTE ON FUNCTION get_collection_status_summary(uuid) TO anon;

COMMENT ON FUNCTION get_collection_status_summary IS 'Returns payment status summary for a specific collection, grouped by flat. Accessible to authenticated admins and anonymous users with valid share codes.';
