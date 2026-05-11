import { supabase } from '@/lib/supabase';
import type { AuthUser } from '@/hooks/useAuth';

export interface LogChange {
  field: string;
  old: string;
  new: string;
}

export type LogCategory =
  | 'sales' | 'inventory' | 'expenses' | 'customers'
  | 'purchases' | 'users' | 'settings' | 'auth';

export type LogAction =
  | 'create' | 'edit' | 'delete' | 'login' | 'logout' | 'refund' | 'complete';

export interface LogEntry {
  category: LogCategory;
  action: LogAction;
  description: string;
  changes?: LogChange[];
}

export async function writeLog(user: AuthUser, entry: LogEntry): Promise<void> {
  try {
    await supabase.from('user_logs').insert({
      user_id:     user.id,
      user_name:   user.name,
      user_role:   user.role,
      category:    entry.category,
      action:      entry.action,
      description: entry.description,
      changes:     entry.changes?.length ? entry.changes : null,
    });
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
