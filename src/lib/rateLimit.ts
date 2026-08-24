type ClientRateLimitRule = {
  maxRequests: number;
  windowMs: number;
};

const CLIENT_RATE_LIMITS: Record<string, ClientRateLimitRule> = {
  'auth:register': { maxRequests: 3, windowMs: 10 * 60 * 1000 },
  'upload:avatar': { maxRequests: 10, windowMs: 60 * 1000 },
  'upload:product-image': { maxRequests: 10, windowMs: 60 * 1000 },
  'upload:store-logo': { maxRequests: 10, windowMs: 60 * 1000 },
  'upload:expense-proof': { maxRequests: 10, windowMs: 60 * 1000 },
  'export:report': { maxRequests: 10, windowMs: 60 * 1000 },
  'write:default': { maxRequests: 30, windowMs: 60 * 1000 },
};

const memoryCounters = new Map<string, number[]>();

function nowMs() {
  return Date.now();
}

export function checkClientRateLimit(
  actionKey: keyof typeof CLIENT_RATE_LIMITS | string,
  scope = 'global'
): string | null {
  const rule = CLIENT_RATE_LIMITS[actionKey] ?? CLIENT_RATE_LIMITS['write:default'];
  const key = `${scope}:${actionKey}`;
  const now = nowMs();
  const recent = (memoryCounters.get(key) ?? []).filter((time) => now - time < rule.windowMs);

  if (recent.length >= rule.maxRequests) {
    const oldest = recent[0] ?? now;
    const waitSeconds = Math.max(1, Math.ceil((rule.windowMs - (now - oldest)) / 1000));
    memoryCounters.set(key, recent);
    return `Too many attempts. Please wait ${waitSeconds} seconds and try again.`;
  }

  recent.push(now);
  memoryCounters.set(key, recent);
  return null;
}

export function rateLimitErrorMessage(error: unknown) {
  const message = error instanceof Error
    ? error.message
    : typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message?: unknown }).message ?? '')
      : String(error ?? '');
  if (/rate limit exceeded/i.test(message)) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  return message;
}
