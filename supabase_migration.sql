-- Run this in Supabase Dashboard → SQL Editor
-- Adds all columns needed by the profiles table

alter table profiles
  add column if not exists full_name text,
  add column if not exists phone text,
  add column if not exists education jsonb default '[]',
  add column if not exists work_experience jsonb default '[]',
  add column if not exists base_resume text,
  add column if not exists onboarding_done boolean default false,
  add column if not exists locations jsonb default '[]',
  add column if not exists types jsonb default '["Full-time"]',
  add column if not exists min_salary integer default 0,
  add column if not exists experience integer default 0,
  add column if not exists updated_at timestamptz;

-- Verify existing RLS policies
select * from pg_policies where tablename = 'profiles';

-- If there is no write policy, add one:
-- create policy "Users can upsert own profile"
--   on profiles for all
--   using (auth.uid() = id)
--   with check (auth.uid() = id);
