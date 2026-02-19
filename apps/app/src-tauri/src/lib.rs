use serde::Serialize;

mod ask_runtime;
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
    let ask_runtime_state = ask_runtime::AskRuntimeState::new();

    tauri::Builder::default()
        .manage(ask_runtime_state.clone())
        .invoke_handler(tauri::generate_handler![
            get_health_message,
            plan_viewer::list_doc_summaries,
            plan_viewer::get_doc_document,
            ask_runtime::list_pending_ask_sessions,
            ask_runtime::submit_ask_response
        ])
        .setup(move |app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            docs_watcher::start_docs_watcher(app.handle().clone())?;
            ask_runtime::start_ask_socket_server(ask_runtime_state.clone(), app.handle().clone())?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
