-- Add INSERT policy for scan_results to allow service role to insert results
CREATE POLICY "Service can insert scan results"
ON scan_results
FOR INSERT
TO service_role
WITH CHECK (true);

-- Also add a policy for authenticated users to insert their own scan results
CREATE POLICY "Users can insert results for their own scans"
ON scan_results
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM idescan_scans
    WHERE idescan_scans.id = scan_results.scan_id
    AND idescan_scans.user_id = auth.uid()
  )
);