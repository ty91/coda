use serde::Serialize;

mod docs_watcher;
mod plan_viewer;

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
        .invoke_handler(tauri::generate_handler![
            get_health_message,
            plan_viewer::list_doc_summaries,
            plan_viewer::get_doc_document
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            docs_watcher::start_docs_watcher(app.handle().clone())?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
