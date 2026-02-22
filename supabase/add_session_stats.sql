-- Add session statistics to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS total_sessions INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_time_seconds INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS best_score FLOAT DEFAULT 0;

-- Update RLS if necessary (though existing policies should cover updates to own profile)
-- Ensure the new columns are accessible
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
