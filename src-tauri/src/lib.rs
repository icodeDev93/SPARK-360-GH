use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{Manager, State};
use tauri_plugin_updater::UpdaterExt;

struct OfflineDb {
  path: PathBuf,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct LocalRecord {
  entity: String,
  record_id: String,
  payload: serde_json::Value,
  sync_status: String,
  version: i64,
  updated_at: String,
  last_synced_at: Option<String>,
  deleted_at: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LocalRecordInput {
  entity: String,
  record_id: String,
  payload: serde_json::Value,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SyncOperation {
  id: i64,
  entity: String,
  record_id: String,
  operation: String,
  payload: serde_json::Value,
  attempts: i64,
  last_error: Option<String>,
  created_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SyncOperationInput {
  entity: String,
  record_id: String,
  operation: String,
  payload: serde_json::Value,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct OfflineSyncStatus {
  pending_operations: i64,
  dirty_records: i64,
}

impl OfflineDb {
  fn connect(&self) -> Result<Connection, String> {
    Connection::open(&self.path).map_err(|error| error.to_string())
  }

  fn initialize(&self) -> Result<(), String> {
    let conn = self.connect()?;
    init_schema(&conn)
  }
}

fn init_schema(conn: &Connection) -> Result<(), String> {
  conn
    .execute_batch(
      r#"
      pragma journal_mode = wal;
      pragma foreign_keys = on;

      create table if not exists local_records (
        entity text not null,
        record_id text not null,
        payload text not null,
        sync_status text not null default 'dirty',
        version integer not null default 1,
        updated_at text not null default (datetime('now')),
        last_synced_at text,
        deleted_at text,
        primary key (entity, record_id)
      );

      create table if not exists sync_queue (
        id integer primary key autoincrement,
        entity text not null,
        record_id text not null,
        operation text not null check (operation in ('create', 'update', 'delete')),
        payload text not null,
        attempts integer not null default 0,
        last_error text,
        created_at text not null default (datetime('now')),
        processed_at text
      );

      create index if not exists idx_local_records_sync_status
      on local_records(sync_status);

      create index if not exists idx_sync_queue_pending
      on sync_queue(processed_at, created_at);
      "#,
    )
    .map_err(|error| error.to_string())?;

  Ok(())
}

#[tauri::command]
fn init_offline_database(db: State<'_, OfflineDb>) -> Result<(), String> {
  db.initialize()
}

#[tauri::command]
fn upsert_local_record(db: State<'_, OfflineDb>, input: LocalRecordInput) -> Result<(), String> {
  let conn = db.connect()?;
  let payload = serde_json::to_string(&input.payload).map_err(|error| error.to_string())?;

  conn
    .execute(
      r#"
      insert into local_records (entity, record_id, payload, sync_status, updated_at)
      values (?1, ?2, ?3, 'dirty', datetime('now'))
      on conflict(entity, record_id) do update set
        payload = excluded.payload,
        sync_status = 'dirty',
        version = local_records.version + 1,
        updated_at = datetime('now'),
        deleted_at = null
      "#,
      params![input.entity, input.record_id, payload],
    )
    .map_err(|error| error.to_string())?;

  Ok(())
}

#[tauri::command]
fn list_local_records(db: State<'_, OfflineDb>, entity: String) -> Result<Vec<LocalRecord>, String> {
  let conn = db.connect()?;
  let mut stmt = conn
    .prepare(
      r#"
      select entity, record_id, payload, sync_status, version, updated_at, last_synced_at, deleted_at
      from local_records
      where entity = ?1 and deleted_at is null
      order by updated_at desc
      "#,
    )
    .map_err(|error| error.to_string())?;

  let rows = stmt
    .query_map(params![entity], |row| {
      let payload: String = row.get(2)?;
      let parsed = serde_json::from_str(&payload).unwrap_or(serde_json::Value::Null);
      Ok(LocalRecord {
        entity: row.get(0)?,
        record_id: row.get(1)?,
        payload: parsed,
        sync_status: row.get(3)?,
        version: row.get(4)?,
        updated_at: row.get(5)?,
        last_synced_at: row.get(6)?,
        deleted_at: row.get(7)?,
      })
    })
    .map_err(|error| error.to_string())?;

  rows.collect::<Result<Vec<_>, _>>().map_err(|error| error.to_string())
}

#[tauri::command]
fn mark_local_record_synced(db: State<'_, OfflineDb>, entity: String, record_id: String) -> Result<(), String> {
  let conn = db.connect()?;
  conn
    .execute(
      r#"
      update local_records
      set sync_status = 'synced', last_synced_at = datetime('now')
      where entity = ?1 and record_id = ?2
      "#,
      params![entity, record_id],
    )
    .map_err(|error| error.to_string())?;
  Ok(())
}

#[tauri::command]
fn enqueue_sync_operation(db: State<'_, OfflineDb>, input: SyncOperationInput) -> Result<(), String> {
  let conn = db.connect()?;
  let payload = serde_json::to_string(&input.payload).map_err(|error| error.to_string())?;

  conn
    .execute(
      r#"
      insert into sync_queue (entity, record_id, operation, payload)
      values (?1, ?2, ?3, ?4)
      "#,
      params![input.entity, input.record_id, input.operation, payload],
    )
    .map_err(|error| error.to_string())?;

  Ok(())
}

#[tauri::command]
fn list_pending_sync_operations(db: State<'_, OfflineDb>, limit: Option<i64>) -> Result<Vec<SyncOperation>, String> {
  let conn = db.connect()?;
  let max = limit.unwrap_or(50).clamp(1, 500);
  let mut stmt = conn
    .prepare(
      r#"
      select id, entity, record_id, operation, payload, attempts, last_error, created_at
      from sync_queue
      where processed_at is null
      order by created_at asc
      limit ?1
      "#,
    )
    .map_err(|error| error.to_string())?;

  let rows = stmt
    .query_map(params![max], |row| {
      let payload: String = row.get(4)?;
      let parsed = serde_json::from_str(&payload).unwrap_or(serde_json::Value::Null);
      Ok(SyncOperation {
        id: row.get(0)?,
        entity: row.get(1)?,
        record_id: row.get(2)?,
        operation: row.get(3)?,
        payload: parsed,
        attempts: row.get(5)?,
        last_error: row.get(6)?,
        created_at: row.get(7)?,
      })
    })
    .map_err(|error| error.to_string())?;

  rows.collect::<Result<Vec<_>, _>>().map_err(|error| error.to_string())
}

#[tauri::command]
fn mark_sync_operation_done(db: State<'_, OfflineDb>, id: i64) -> Result<(), String> {
  let conn = db.connect()?;
  conn
    .execute(
      "update sync_queue set processed_at = datetime('now') where id = ?1",
      params![id],
    )
    .map_err(|error| error.to_string())?;
  Ok(())
}

#[tauri::command]
fn mark_sync_operation_failed(db: State<'_, OfflineDb>, id: i64, error: String) -> Result<(), String> {
  let conn = db.connect()?;
  conn
    .execute(
      r#"
      update sync_queue
      set attempts = attempts + 1, last_error = ?2
      where id = ?1
      "#,
      params![id, error],
    )
    .map_err(|error| error.to_string())?;
  Ok(())
}

#[tauri::command]
fn get_offline_sync_status(db: State<'_, OfflineDb>) -> Result<OfflineSyncStatus, String> {
  let conn = db.connect()?;
  let pending_operations = conn
    .query_row("select count(*) from sync_queue where processed_at is null", [], |row| row.get(0))
    .map_err(|error| error.to_string())?;
  let dirty_records = conn
    .query_row("select count(*) from local_records where sync_status = 'dirty'", [], |row| row.get(0))
    .map_err(|error| error.to_string())?;

  Ok(OfflineSyncStatus {
    pending_operations,
    dirty_records,
  })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_updater::Builder::new().build())
    .plugin(tauri_plugin_dialog::init())
    .setup(|app| {
      let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| tauri::Error::Anyhow(error.into()))?;
      std::fs::create_dir_all(&data_dir).map_err(|error| tauri::Error::Anyhow(error.into()))?;
      let offline_db = OfflineDb {
        path: data_dir.join("spark360-offline.sqlite"),
      };
      offline_db.initialize().map_err(|error| tauri::Error::Anyhow(anyhow::anyhow!(error)))?;
      app.manage(offline_db);

      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      let handle = app.handle().clone();
      tauri::async_runtime::spawn(async move {
        if let Ok(updater) = handle.updater() {
          if let Ok(Some(update)) = updater.check().await {
            tauri_plugin_dialog::DialogExt::dialog(&handle)
              .message(format!(
                "SPARK 360 v{} is available.\n\nInstalling now — the app will restart automatically.",
                update.version
              ))
              .title("Update Available")
              .blocking_show();
            if let Ok(bytes) = update.download(|_, _| {}, || {}).await {
              if update.install(bytes).is_ok() {
                std::process::exit(0);
              }
            }
          }
        }
      });

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      init_offline_database,
      upsert_local_record,
      list_local_records,
      mark_local_record_synced,
      enqueue_sync_operation,
      list_pending_sync_operations,
      mark_sync_operation_done,
      mark_sync_operation_failed,
      get_offline_sync_status
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
