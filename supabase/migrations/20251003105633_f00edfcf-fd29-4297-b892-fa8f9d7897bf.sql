-- Drop the existing restrictive policies and create better ones
DROP POLICY IF EXISTS "Service can insert scan results" ON scan_results;
DROP POLICY IF EXISTS "Users can insert results for their own scans" ON scan_results;

-- Allow service role to bypass RLS completely for scan_results
ALTER TABLE scan_results FORCE ROW LEVEL SECURITY;

-- Policy to allow viewing results for user's own scans
CREATE POLICY "Users can view their scan results"
ON scan_results
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM idescan_scans
    WHERE idescan_scans.id = scan_results.scan_id
    AND idescan_scans.user_id = auth.uid()
  )
);

-- Allow all operations for service_role (used by edge functions)
CREATE POLICY "Service role has full access"
ON scan_results
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);