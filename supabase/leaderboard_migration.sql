-- Leaderboard RLS Migration
-- Allow all authenticated users to read profiles (needed for leaderboard)
-- This works alongside the existing "Users can view own profile" policy (policies are OR'd)
CREATE POLICY "Authenticated users can read profiles for leaderboard"
  ON public.profiles FOR SELECT
  USING (auth.role() = 'authenticated');
