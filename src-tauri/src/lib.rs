use tauri::Manager;
use tauri_plugin_updater::UpdaterExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_updater::Builder::new().build())
    .plugin(tauri_plugin_dialog::init())
    .setup(|app| {
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
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
