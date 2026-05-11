-- Activity log table — records every meaningful user action for admin audit trail
CREATE TABLE IF NOT EXISTS public.user_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name   TEXT        NOT NULL,
  user_role   TEXT        NOT NULL,
  category    TEXT        NOT NULL,
  action      TEXT        NOT NULL,
  description TEXT        NOT NULL,
  changes     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_logs FORCE ROW LEVEL SECURITY;

-- Only admins can read logs
CREATE POLICY "logs_read_admin"
  ON public.user_logs FOR SELECT
  TO authenticated
  USING (public.is_admin_user());

-- Any active user can write their own log entries
CREATE POLICY "logs_insert_active"
  ON public.user_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_active_app_user() AND user_id = auth.uid());

-- Enable real-time so the admin log page updates live
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_logs;
