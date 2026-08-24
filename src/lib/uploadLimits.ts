export const MB = 1024 * 1024;

export const UPLOAD_LIMITS = {
  avatar: {
    maxBytes: 2 * MB,
    label: '2 MB',
    accept: ['image/jpeg', 'image/png', 'image/webp'],
    acceptInput: 'image/jpeg,image/png,image/webp',
    description: 'JPEG, PNG or WebP image, up to 2 MB.',
  },
  productImage: {
    maxBytes: 3 * MB,
    label: '3 MB',
    accept: ['image/jpeg', 'image/png', 'image/webp'],
    acceptInput: 'image/jpeg,image/png,image/webp',
    description: 'JPEG, PNG or WebP image, up to 3 MB.',
  },
  storeLogo: {
    maxBytes: 2 * MB,
    label: '2 MB',
    accept: ['image/jpeg', 'image/png', 'image/webp'],
    acceptInput: 'image/jpeg,image/png,image/webp',
    description: 'JPEG, PNG or WebP logo, up to 2 MB.',
  },
  expenseProof: {
    maxBytes: 5 * MB,
    label: '5 MB',
    accept: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    acceptInput: 'image/jpeg,image/png,image/webp,application/pdf',
    description: 'JPEG, PNG, WebP or PDF, up to 5 MB.',
  },
} as const;

export type UploadLimitKey = keyof typeof UPLOAD_LIMITS;

export function validateUploadFile(file: File, key: UploadLimitKey): string | null {
  const rule = UPLOAD_LIMITS[key];
  if (!(rule.accept as readonly string[]).includes(file.type)) {
    return `${rule.description}`;
  }
  if (file.size > rule.maxBytes) {
    return `File must be ${rule.label} or smaller.`;
  }
  return null;
}

export function extensionForUpload(file: File) {
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  if (file.type === 'application/pdf') return 'pdf';
  return 'jpg';
}
