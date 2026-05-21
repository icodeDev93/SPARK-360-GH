import {
  enqueueSyncOperation,
  isOfflineStoreAvailable,
  listPendingSyncOperations,
  markLocalRecordSynced,
  markSyncOperationDone,
  markSyncOperationFailed,
  upsertLocalRecord,
  type SyncOperation,
  type SyncOperationType,
} from './offlineStore';

export type EntitySyncHandler = (operation: SyncOperation) => Promise<void>;

export interface SyncEngineOptions {
  batchSize?: number;
  handlers: Record<string, EntitySyncHandler>;
}

export async function queueOfflineMutation<T>(
  entity: string,
  recordId: string,
  operation: SyncOperationType,
  payload: T,
) {
  if (!isOfflineStoreAvailable()) return false;

  if (operation !== 'delete') {
    await upsertLocalRecord(entity, recordId, payload);
  }
  await enqueueSyncOperation(entity, recordId, operation, payload);
  return true;
}

export async function syncPendingChanges({ batchSize = 50, handlers }: SyncEngineOptions) {
  if (!isOfflineStoreAvailable() || !navigator.onLine) {
    return { processed: 0, failed: 0 };
  }

  const operations = await listPendingSyncOperations(batchSize);
  let processed = 0;
  let failed = 0;

  for (const operation of operations) {
    const handler = handlers[operation.entity];
    if (!handler) {
      failed += 1;
      await markSyncOperationFailed(operation.id, `No sync handler registered for "${operation.entity}".`);
      continue;
    }

    try {
      await handler(operation);
      await markSyncOperationDone(operation.id);
      await markLocalRecordSynced(operation.entity, operation.recordId);
      processed += 1;
    } catch (error) {
      failed += 1;
      await markSyncOperationFailed(operation.id, error instanceof Error ? error.message : String(error));
    }
  }

  return { processed, failed };
}
