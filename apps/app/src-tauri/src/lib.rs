use serde::Serialize;

mod ask_runtime;
mod docs_watcher;
mod plan_viewer;
mod project_registry;
mod project_runtime;

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
    let project_registry_state = project_runtime::ProjectRegistryState::new()
        .expect("failed to initialize project registry runtime");
    let docs_watcher_state = docs_watcher::DocsWatcherState::new();
    let project_registry_state_for_setup = project_registry_state.clone();
    let docs_watcher_state_for_setup = docs_watcher_state.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .manage(ask_runtime_state.clone())
        .manage(project_registry_state.clone())
        .manage(docs_watcher_state.clone())
        .invoke_handler(tauri::generate_handler![
            get_health_message,
            project_runtime::list_projects,
            project_runtime::get_active_project,
            project_runtime::set_active_project,
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
            docs_watcher::start_docs_watcher(
                app.handle().clone(),
                &docs_watcher_state_for_setup,
                &project_registry_state_for_setup,
            )?;
            ask_runtime::start_ask_socket_server(ask_runtime_state.clone(), app.handle().clone())?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
