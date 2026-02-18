use serde::Serialize;

#[derive(Serialize)]
struct HealthMessage {
  message: String,
}

#[tauri::command]
fn get_health_message(project_name: String) -> HealthMessage {
  HealthMessage {
    message: format!("Rust backend online for project: {project_name}"),
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![get_health_message])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
