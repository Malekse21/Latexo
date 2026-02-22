-- Drop the reports table and related objects
DROP TABLE IF EXISTS public.reports CASCADE;

-- Note: We cannot easily drop storage buckets via SQL migration in Supabase without using the API or dashboard,
-- but we can remove the policies.
DROP POLICY IF EXISTS "Authenticated users can upload reports" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read reports" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete reports" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update reports" ON storage.objects;

-- Remove active_report_id from profiles if it exists
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'active_report_id') THEN
        ALTER TABLE public.profiles DROP COLUMN active_report_id;
    END IF;
END $$;
