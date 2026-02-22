-- Arena Revamp Migration
-- Adds new evaluation columns to simulations table
-- Adds memory column to profiles table
-- Run this in your Supabase SQL Editor

-- 1. Add new columns to simulations table
ALTER TABLE public.simulations
ADD COLUMN IF NOT EXISTS evaluation JSONB,
ADD COLUMN IF NOT EXISTS feedback JSONB,
ADD COLUMN IF NOT EXISTS sticker_caption TEXT,
ADD COLUMN IF NOT EXISTS memory_snapshot TEXT,
ADD COLUMN IF NOT EXISTS mention TEXT;

-- 2. Add memory column to profiles for cross-session persistence
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS memory JSONB DEFAULT '{}'::jsonb;
