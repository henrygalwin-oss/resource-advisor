-- ─────────────────────────────────────────────────────────────────────────────
-- ResourceAdvisor — Settings / Thresholds Table Migration
-- Run this in your Supabase SQL Editor (https://app.supabase.com → SQL Editor)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Create the settings table
CREATE TABLE IF NOT EXISTS public.settings (
  id            bigserial PRIMARY KEY,
  department    text        NOT NULL,
  resource_type text        NOT NULL CHECK (resource_type IN ('electricity', 'water', 'waste')),
  threshold     numeric     NOT NULL DEFAULT 0,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT settings_dept_type_unique UNIQUE (department, resource_type)
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- 3. Open Policy for CRUD operations
DROP POLICY IF EXISTS "Allow all operations on settings" ON public.settings;
CREATE POLICY "Allow all operations on settings"
  ON public.settings
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 4. Index for fast lookups by department
CREATE INDEX IF NOT EXISTS settings_dept_idx ON public.settings (department);

-- 5. Initial Seed: Baseline operational thresholds for Block A, B, and C
INSERT INTO public.settings (department, resource_type, threshold, updated_at)
VALUES
  ('Block A', 'electricity', 35000, now()),
  ('Block A', 'water',       15000, now()),
  ('Block A', 'waste',        2500, now()),
  ('Block B', 'electricity', 40000, now()),
  ('Block B', 'water',       18000, now()),
  ('Block B', 'waste',        3000, now()),
  ('Block C', 'electricity', 30000, now()),
  ('Block C', 'water',       12000, now()),
  ('Block C', 'waste',        2000, now())
ON CONFLICT (department, resource_type) DO NOTHING;
