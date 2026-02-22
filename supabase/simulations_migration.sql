-- Simulations Table Migration
-- Tab 3 - The Aftermath Metrics Engine
-- Run this in your Supabase SQL Editor

-- Create simulations table
CREATE TABLE IF NOT EXISTS public.simulations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID REFERENCES public.reports(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  final_grade FLOAT CHECK (final_grade >= 0 AND final_grade <= 20),
  
  -- Metrics: { technical, academic, market, fluency, stress }
  metrics JSONB,
  
  -- Behavioral stats: { filler_count, avg_response_time, total_duration }
  behavioral_stats JSONB,
  
  -- Jury feedback: { tech_quote, strict_quote, business_quote }
  jury_feedback JSONB,
  
  -- Full transcript: Array of { speaker, text, timestamp }
  transcript JSONB,
  
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.simulations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own simulations"
  ON public.simulations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own simulations"
  ON public.simulations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own simulations"
  ON public.simulations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own simulations"
  ON public.simulations FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_simulations_user_id ON public.simulations(user_id);
CREATE INDEX idx_simulations_report_id ON public.simulations(report_id);
CREATE INDEX idx_simulations_created_at ON public.simulations(created_at DESC);
