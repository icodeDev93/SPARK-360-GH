import { supabase } from '@/lib/supabase';
import type { AuthUser } from '@/hooks/useAuth';
import { sanitizeText } from '@/lib/sanitize';
import { ACTIVE_BUSINESS_KEY } from '@/lib/businessScope';
import { createLocalId, isNetworkError, loadLocalCollection, queueLocalMutation, saveLocalCollection } from './localCache';

export interface LogChange {
  field: string;
  old: string;
  new: string;
}

export type LogCategory =
  | 'sales' | 'inventory' | 'expenses' | 'customers'
  | 'credit' | 'bank-deposit' | 'purchases' | 'suppliers'
  | 'users' | 'settings' | 'auth';

export type LogAction =
  | 'create' | 'edit' | 'delete' | 'login' | 'logout' | 'refund' | 'complete';

export interface LogEntry {
  category: LogCategory;
  action: LogAction;
  description: string;
  changes?: LogChange[];
}

export function cleanLogText(value: unknown) {
  return sanitizeText(String(value ?? ''))
    .replace(/Ã¢â€šÂµ|â‚µ/g, '₵')
    .replace(/â€”|â€“/g, '-')
    .replace(/â€¦/g, '...')
    .replace(/â€˜|â€™/g, "'")
    .replace(/â€œ|â€�/g, '"')
    .replace(/Â·/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function writeLog(user: AuthUser, entry: LogEntry): Promise<void> {
  const businessId = localStorage.getItem(ACTIVE_BUSINESS_KEY);
  const localLog = {
    id: createLocalId(),
    business_id: businessId,
    user_id: user.id,
    user_name: cleanLogText(user.name),
    user_role: user.role,
    category: cleanLogText(entry.category),
    action: cleanLogText(entry.action),
    description: cleanLogText(entry.description),
    changes: entry.changes?.length ? entry.changes.map((change) => ({
      field: cleanLogText(change.field),
      old: cleanLogText(change.old),
      new: cleanLogText(change.new),
    })) : null,
    created_at: new Date().toISOString(),
  };
  try {
    const current = await loadLocalCollection<typeof localLog>('user_logs');
    await saveLocalCollection('user_logs', [localLog, ...current].slice(0, 1000));
    if (!businessId) return;
    const { error } = await supabase.from('user_logs').insert(localLog);
    if (error && isNetworkError(error)) await queueLocalMutation('user_logs', localLog.id, 'create', localLog);
  } catch {
    // Logging failures never block the main action
  }
}

// Compares two plain objects and returns only the fields that changed.
// `labels` maps object keys → human-readable field names.
// `formatters` optionally format values for display (e.g. currency).
export function diffFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  labels: Record<string, string>,
  formatters?: Record<string, (v: unknown) => string>,
): LogChange[] {
  const changes: LogChange[] = [];
  for (const key of Object.keys(labels)) {
    const oldVal = before[key];
    const newVal = after[key];
    if (String(oldVal ?? '') !== String(newVal ?? '')) {
      const fmt = formatters?.[key] ?? ((v: unknown) => String(v ?? ''));
      changes.push({ field: labels[key], old: fmt(oldVal), new: fmt(newVal) });
    }
  }
  return changes;
}
