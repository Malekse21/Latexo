-- Session Workflow Migration
-- Extends existing tables + adds turns & live_sessions
-- Run this in your Supabase SQL Editor

-- First, drop the old tables if they were previously created
DROP TABLE IF EXISTS public.feedback CASCADE;
DROP TABLE IF EXISTS public.weak_topics CASCADE;
DROP TABLE IF EXISTS public.sessions CASCADE;

-- Also drop these so they recreate with the correct simulation_id column
DROP TABLE IF EXISTS public.turns CASCADE;
DROP TABLE IF EXISTS public.live_sessions CASCADE;

-- ══════════════════════════════════════════════════════
-- 1. Extend simulations table (absorbs "sessions" role)
-- ══════════════════════════════════════════════════════
ALTER TABLE public.simulations
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
ADD COLUMN IF NOT EXISTS duration_minutes INT,
ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;

-- Service role needs full access for server-side operations
DROP POLICY IF EXISTS "Service role full access on simulations" ON public.simulations;
CREATE POLICY "Service role full access on simulations"
  ON public.simulations FOR ALL
  USING (auth.role() = 'service_role');

-- ══════════════════════════════════════════════════════
-- 2. Extend profiles table (absorbs "weak_topics" role)
-- ══════════════════════════════════════════════════════
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS weak_topics JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS session_history JSONB DEFAULT '[]'::jsonb;

-- ══════════════════════════════════════════════════════
-- 3. Turns table (individual Q&A turns within a session)
--    Needed for: turn-by-turn workflow, building the
--    full transcript at evaluation time
-- ══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.turns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  simulation_id UUID REFERENCES public.simulations(id) ON DELETE CASCADE NOT NULL,
  agent_id INT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT,
  is_follow_up BOOLEAN DEFAULT false,
  was_interrupted BOOLEAN DEFAULT false,
  silence_duration FLOAT DEFAULT 0,
  turn_index INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.turns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on turns" ON public.turns;
CREATE POLICY "Service role full access on turns"
  ON public.turns FOR ALL
  USING (auth.role() = 'service_role');

CREATE INDEX idx_turns_simulation_id ON public.turns(simulation_id);
CREATE INDEX idx_turns_turn_index ON public.turns(simulation_id, turn_index);

-- ══════════════════════════════════════════════════════
-- 4. Live Sessions table (active session state)
--    Needed for: storing live game state during a session
--    Cleaned up when the session ends
-- ══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.live_sessions (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL PRIMARY KEY,
  simulation_id UUID NOT NULL,
  state JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on live_sessions" ON public.live_sessions;
CREATE POLICY "Service role full access on live_sessions"
  ON public.live_sessions FOR ALL
  USING (auth.role() = 'service_role');
