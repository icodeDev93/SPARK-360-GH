-- Add proof_url column to expenses
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS proof_url TEXT;

-- Storage bucket for expense proof files (images + PDF, max 10 MB)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'expense-proofs',
  'expense-proofs',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

DROP POLICY IF EXISTS "expense_proofs_public_read"            ON storage.objects;
DROP POLICY IF EXISTS "expense_proofs_authenticated_insert"   ON storage.objects;
DROP POLICY IF EXISTS "expense_proofs_authenticated_update"   ON storage.objects;
DROP POLICY IF EXISTS "expense_proofs_authenticated_delete"   ON storage.objects;

CREATE POLICY "expense_proofs_public_read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'expense-proofs');

CREATE POLICY "expense_proofs_authenticated_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'expense-proofs'
    AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'pdf')
  );

CREATE POLICY "expense_proofs_authenticated_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'expense-proofs')
  WITH CHECK (bucket_id = 'expense-proofs');

CREATE POLICY "expense_proofs_authenticated_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'expense-proofs');
