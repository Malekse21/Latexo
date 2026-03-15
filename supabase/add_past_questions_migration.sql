-- Cross-Simulation Question Continuity Migration
-- Adds a past_questions JSONB array to the reports table so that
-- previously asked questions are tracked and avoided in future simulations.

ALTER TABLE public.reports
ADD COLUMN IF NOT EXISTS past_questions JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.reports.past_questions IS 'Array of question strings asked across all past simulations for this report. Used to prevent repetition.';
