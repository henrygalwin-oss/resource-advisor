-- ─────────────────────────────────────────────────────────────────────────────
-- ResourceAdvisor — Scoped Role-Based Access Migration
-- Adds role & department columns, updates demo admin, and provisions demo manager
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Create or update public.users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'manager' CHECK (role IN ('admin', 'manager')),
  department TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure columns exist if table was already created
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'manager' CHECK (role IN ('admin', 'manager'));

ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS department TEXT NULL;

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Allow authenticated and service roles full access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Allow public read and write on users'
  ) THEN
    CREATE POLICY "Allow public read and write on users"
      ON public.users
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- 2. Seed / Update demo admin and demo manager in public.users
INSERT INTO public.users (email, name, role, department)
VALUES ('demo.resourceadvisor.app@gmail.com', 'Demo Admin', 'admin', NULL)
ON CONFLICT (email) DO UPDATE
SET role = 'admin', department = NULL, updated_at = now();

INSERT INTO public.users (email, name, role, department)
VALUES ('demo.manager@resourceadvisor.app', 'Demo Manager (Block A)', 'manager', 'Block A')
ON CONFLICT (email) DO UPDATE
SET role = 'manager', department = 'Block A', updated_at = now();

-- 3. Synchronize Supabase auth.users metadata for Demo Admin
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{role}', '"admin"'),
  '{department}', 'null'
) || jsonb_build_object('is_admin', true, 'full_name', 'Demo Admin')
WHERE email = 'demo.resourceadvisor.app@gmail.com';

-- 4. Create / Provision Demo Manager in Supabase auth.users
-- (Email: demo.manager@resourceadvisor.app | Password: DemoManager1234!)
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'demo.manager@resourceadvisor.app',
  extensions.crypt('DemoManager1234!', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Demo Manager (Block A)","role":"manager","department":"Block A","is_admin":false}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  ''
)
ON CONFLICT (email) DO UPDATE
SET
  encrypted_password = extensions.crypt('DemoManager1234!', extensions.gen_salt('bf')),
  raw_user_meta_data = '{"full_name":"Demo Manager (Block A)","role":"manager","department":"Block A","is_admin":false}'::jsonb,
  email_confirmed_at = COALESCE(auth.users.email_confirmed_at, now()),
  updated_at = now();
