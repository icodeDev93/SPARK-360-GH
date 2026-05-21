import {
  enqueueSyncOperation,
  isOfflineStoreAvailable,
  listLocalRecords,
  upsertLocalRecord,
  type SyncOperationType,
} from './offlineStore';

const COLLECTION_ID = '__collection__';

function storageKey(entity: string) {
  return `spark360:${entity}`;
}

export function createLocalId(prefix = '') {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}${crypto.randomUUID()}`;
  }
  return `${prefix}${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function loadLocalCollection<T>(entity: string): Promise<T[]> {
  try {
    if (isOfflineStoreAvailable()) {
      const records = await listLocalRecords<T[]>(entity);
      const collection = records.find((record) => record.recordId === COLLECTION_ID);
      return Array.isArray(collection?.payload) ? collection.payload : [];
    }
  } catch (error) {
    console.warn(`Unable to read desktop cache for ${entity}`, error);
  }

  try {
    const raw = localStorage.getItem(storageKey(entity));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveLocalCollection<T>(entity: string, records: T[]) {
  localStorage.setItem(storageKey(entity), JSON.stringify(records));
  try {
    if (isOfflineStoreAvailable()) {
      await upsertLocalRecord(entity, COLLECTION_ID, records);
    }
  } catch (error) {
    console.warn(`Unable to write desktop cache for ${entity}`, error);
  }
}

export async function queueLocalMutation<T>(
  entity: string,
  recordId: string,
  operation: SyncOperationType,
  payload: T,
) {
  try {
    if (isOfflineStoreAvailable()) {
      await enqueueSyncOperation(entity, recordId, operation, payload);
    }
  } catch (error) {
    console.warn(`Unable to queue offline mutation for ${entity}`, error);
  }
}

export function isNetworkError(error: unknown) {
  if (!error) return false;
  const message = error instanceof Error ? error.message : String(error);
  return /failed to fetch|network|load failed|fetch/i.test(message);
}
