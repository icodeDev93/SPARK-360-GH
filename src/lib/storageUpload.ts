import { supabase } from '@/lib/supabase';
import { checkClientRateLimit, rateLimitErrorMessage } from '@/lib/rateLimit';
import { extensionForUpload, validateUploadFile, type UploadLimitKey } from '@/lib/uploadLimits';

type PublicBucket = 'product-images' | 'profile-images' | 'store-logos' | 'expense-proofs';

export interface UploadedFile {
  bucket: PublicBucket;
  path: string;
  publicUrl: string;
}

interface UploadPublicFileOptions {
  bucket: PublicBucket;
  file: File;
  limitKey: UploadLimitKey;
  pathPrefix?: string;
  baseName?: string;
  rateLimitKey?: string;
  rateLimitScope?: string;
  upsert?: boolean;
  cacheControl?: string;
}

function safeFileName(value: string | undefined, fallback: string) {
  const cleaned = (value || fallback)
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return cleaned || fallback;
}

export async function uploadPublicFile({
  bucket,
  file,
  limitKey,
  pathPrefix,
  baseName,
  rateLimitKey,
  rateLimitScope,
  upsert = false,
  cacheControl = '3600',
}: UploadPublicFileOptions): Promise<UploadedFile> {
  const validationError = validateUploadFile(file, limitKey);
  if (validationError) throw new Error(validationError);

  if (rateLimitKey) {
    const rateError = checkClientRateLimit(rateLimitKey, rateLimitScope || baseName || file.name);
    if (rateError) throw new Error(rateError);
  }

  const ext = extensionForUpload(file);
  const prefix = pathPrefix ? `${pathPrefix.replace(/\/+$/g, '')}/` : '';
  const path = `${prefix}${safeFileName(baseName || file.name, 'file')}-${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl,
    contentType: file.type,
    upsert,
  });
  if (error) throw new Error(rateLimitErrorMessage(error) || error.message || 'Upload failed. Please try again.');

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  if (!data.publicUrl) throw new Error('Upload completed, but no public URL was returned.');

  return { bucket, path, publicUrl: data.publicUrl };
}

export async function removeUploadedFile(uploaded: UploadedFile | null | undefined) {
  if (!uploaded) return;
  const { error } = await supabase.storage.from(uploaded.bucket).remove([uploaded.path]);
  if (error) console.warn('Unable to remove uploaded file after failed save.', error);
}
