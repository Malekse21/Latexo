-- Latexo Database Schema Migration
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Profiles table (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  full_name text,
  gender text check (gender in ('male', 'female')),
  avatar_url text,
  university text,
  specialty text,
  defense_date date,
  credits int default 10,
  active_report_id uuid,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. PDF Reports table
create table public.reports (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  file_path text not null,
  size_bytes bigint,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_scanned_at timestamp with time zone
);

-- 3. Transactions table (Future use)
create table public.transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  amount int not null,
  cost_currency text,
  cost_amount numeric,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Add circular foreign key for active_report_id
alter table public.profiles 
  add constraint fk_active_report 
  foreign key (active_report_id) 
  references public.reports(id) 
  on delete set null;

-- 5. Enable RLS
alter table public.profiles enable row level security;
alter table public.reports enable row level security;
alter table public.transactions enable row level security;

-- 6. RLS Policies for Profiles
create policy "Users can view own profile" 
  on public.profiles for select 
  using (auth.uid() = id);

create policy "Users can update own profile" 
  on public.profiles for update 
  using (auth.uid() = id);

create policy "Users can insert own profile" 
  on public.profiles for insert 
  with check (auth.uid() = id);

-- 7. RLS Policies for Reports
create policy "Users can view own reports" 
  on public.reports for select 
  using (auth.uid() = user_id);

create policy "Users can insert own reports" 
  on public.reports for insert 
  with check (auth.uid() = user_id);

create policy "Users can delete own reports" 
  on public.reports for delete 
  using (auth.uid() = user_id);

create policy "Users can update own reports" 
  on public.reports for update 
  using (auth.uid() = user_id);

-- 8. RLS Policies for Transactions
create policy "Users can view own transactions" 
  on public.transactions for select 
  using (auth.uid() = user_id);

-- 9. Function to handle new user signup
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, credits)
  values (new.id, 10);
  return new;
end;
$$ language plpgsql security definer;

-- 10. Trigger to auto-create profile on signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 11. Storage bucket for PDFs (create via UI or uncomment below)
-- insert into storage.buckets (id, name, public) values ('pfes', 'pfes', false);

-- 12. Storage policies (adjust as needed)
-- create policy "Users can upload own PDFs"
--   on storage.objects for insert
--   with check (bucket_id = 'pfes' and auth.uid()::text = (storage.foldername(name))[1]);
