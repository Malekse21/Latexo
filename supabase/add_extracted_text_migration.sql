-- Add extracted_text column to reports table for storing full document text
ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS extracted_text TEXT;

-- Create GIN index for full-text search on extracted_text
CREATE INDEX IF NOT EXISTS idx_reports_extracted_text_gin 
ON public.reports USING GIN (to_tsvector('english', extracted_text));
