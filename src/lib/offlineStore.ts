type JsonValue = unknown;

export type SyncOperationType = 'create' | 'update' | 'delete';

export interface LocalRecord<T = JsonValue> {
  entity: string;
  recordId: string;
  payload: T;
  syncStatus: 'dirty' | 'synced' | 'conflict';
  version: number;
  updatedAt: string;
  lastSyncedAt: string | null;
  deletedAt: string | null;
}

export interface SyncOperation<T = JsonValue> {
  id: number;
  entity: string;
  recordId: string;
  operation: SyncOperationType;
  payload: T;
  attempts: number;
  lastError: string | null;
  createdAt: string;
}

export interface OfflineSyncStatus {
  pendingOperations: number;
  dirtyRecords: number;
}

interface TauriInternalsWindow extends Window {
  __TAURI_INTERNALS__?: unknown;
}

function isDesktopRuntime() {
  return typeof window !== 'undefined' && Boolean((window as TauriInternalsWindow).__TAURI_INTERNALS__);
}

async function invokeCommand<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (!isDesktopRuntime()) {
    throw new Error('Offline desktop storage is available only inside the Tauri desktop app.');
  }
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(command, args);
}

export function isOfflineStoreAvailable() {
  return isDesktopRuntime();
}

export async function initOfflineStore() {
  if (!isOfflineStoreAvailable()) return;
  await invokeCommand<void>('init_offline_database');
}

export async function upsertLocalRecord<T>(entity: string, recordId: string, payload: T) {
  await invokeCommand<void>('upsert_local_record', {
    input: { entity, recordId, payload },
  });
}

export async function listLocalRecords<T>(entity: string): Promise<LocalRecord<T>[]> {
  return invokeCommand<LocalRecord<T>[]>('list_local_records', { entity });
}

export async function markLocalRecordSynced(entity: string, recordId: string) {
  await invokeCommand<void>('mark_local_record_synced', { entity, recordId });
}

export async function enqueueSyncOperation<T>(
  entity: string,
  recordId: string,
  operation: SyncOperationType,
  payload: T,
) {
  await invokeCommand<void>('enqueue_sync_operation', {
    input: { entity, recordId, operation, payload },
  });
}

export async function listPendingSyncOperations(limit = 50): Promise<SyncOperation[]> {
  return invokeCommand<SyncOperation[]>('list_pending_sync_operations', { limit });
}

export async function markSyncOperationDone(id: number) {
  await invokeCommand<void>('mark_sync_operation_done', { id });
}

export async function markSyncOperationFailed(id: number, error: string) {
  await invokeCommand<void>('mark_sync_operation_failed', { id, error });
}

export async function getOfflineSyncStatus(): Promise<OfflineSyncStatus> {
  if (!isOfflineStoreAvailable()) return { pendingOperations: 0, dirtyRecords: 0 };
  return invokeCommand<OfflineSyncStatus>('get_offline_sync_status');
}
