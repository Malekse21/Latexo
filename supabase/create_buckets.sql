-- Create the 'pfes' storage bucket for uploaded PDFs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('pfes', 'pfes', false)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow authenticated users to upload to 'pfes' bucket
-- (Allowing insert if the path starts with their user ID)
CREATE POLICY "Users can upload own PDFs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'pfes' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy to allow authenticated users to read their own PDFs
CREATE POLICY "Users can read own PDFs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'pfes' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy to allow users to update their own PDFs
CREATE POLICY "Users can update own PDFs"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'pfes' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy to allow users to delete their own PDFs
CREATE POLICY "Users can delete own PDFs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'pfes' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);
