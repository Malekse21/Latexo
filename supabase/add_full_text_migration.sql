-- Add full_text column to reports table for better analysis and search
ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS full_text TEXT;
