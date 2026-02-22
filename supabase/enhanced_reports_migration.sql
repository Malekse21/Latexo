-- Enhanced Reports Schema for Deep Analysis
-- Run this AFTER the base migration

-- Add new columns to reports table
ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS page_count INT,
ADD COLUMN IF NOT EXISTS word_count INT,
ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'analyzing', 'completed', 'failed'));

-- Update existing records
UPDATE public.reports 
SET name = title 
WHERE name IS NULL;

-- Create storage bucket for thumbnails (if not exists)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('thumbnails', 'thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy for thumbnails
CREATE POLICY "Users can upload thumbnails"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'thumbnails' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Anyone can view thumbnails"
ON storage.objects FOR SELECT
USING (bucket_id = 'thumbnails');
