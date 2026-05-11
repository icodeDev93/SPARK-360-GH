-- Role permissions table — admin configures which pages each role can access
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role        TEXT        PRIMARY KEY CHECK (role IN ('manager', 'cashier')),
  permissions TEXT[]      NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read (so the app can load their own permissions)
CREATE POLICY "rp_read" ON public.role_permissions
  FOR SELECT TO authenticated USING (true);

-- Only admin profiles can insert / update / delete
CREATE POLICY "rp_write" ON public.role_permissions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Seed defaults
INSERT INTO public.role_permissions (role, permissions) VALUES
  ('manager', ARRAY['dashboard','pos','customers','purchases','inventory','expenses','reports','sales-history']),
  ('cashier',  ARRAY['pos','customers','sales-history'])
ON CONFLICT (role) DO NOTHING;

-- Enable Supabase real-time so changes broadcast instantly to logged-in users
ALTER PUBLICATION supabase_realtime ADD TABLE public.role_permissions;
