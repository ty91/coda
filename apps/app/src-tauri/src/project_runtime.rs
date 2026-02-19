use crate::docs_watcher::DocsWatcherState;
use crate::project_registry::{
    load_project_registry_from_paths, validate_project_selection, workspace_root_path,
    ProjectContext, ProjectRegistry, ProjectSummary,
};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, State};

const CONFIG_PATH_SEGMENTS: [&str; 2] = [".coda", "config.toml"];
const ACTIVE_PROJECT_STATE_PATH_SEGMENTS: [&str; 2] = [".coda", "app-state.toml"];

#[derive(Debug, Clone)]
struct ProjectRuntimeInner {
    registry: ProjectRegistry,
    active_project_id: String,
    active_state_path: PathBuf,
}

#[derive(Debug, Clone)]
pub struct ProjectRegistryState {
    inner: Arc<Mutex<ProjectRuntimeInner>>,
}

#[derive(Debug, Default, Deserialize, Serialize)]
struct ActiveProjectStateFile {
    app: Option<ActiveProjectStateApp>,
}

#[derive(Debug, Default, Deserialize, Serialize)]
struct ActiveProjectStateApp {
    active_project_id: Option<String>,
}

impl ProjectRegistryState {
    pub fn new() -> Result<Self, String> {
        let current_workspace_root = workspace_root_path()?;
        let home_dir = std::env::var_os("HOME")
            .map(PathBuf::from)
            .ok_or_else(|| "failed to resolve HOME".to_string())?;

        let global_config_path = CONFIG_PATH_SEGMENTS
            .iter()
            .fold(home_dir.clone(), |current, segment| current.join(segment));
        let local_config_path = CONFIG_PATH_SEGMENTS
            .iter()
            .fold(current_workspace_root.clone(), |current, segment| {
                current.join(segment)
            });
        let active_state_path = ACTIVE_PROJECT_STATE_PATH_SEGMENTS
            .iter()
            .fold(home_dir, |current, segment| current.join(segment));

        Self::from_paths(
            &current_workspace_root,
            &global_config_path,
            &local_config_path,
            &active_state_path,
        )
    }

    pub fn from_paths(
        current_workspace_root: &Path,
        global_config_path: &Path,
        local_config_path: &Path,
        active_state_path: &Path,
    ) -> Result<Self, String> {
        let registry = load_project_registry_from_paths(
            current_workspace_root,
            global_config_path,
            local_config_path,
        )?;

        if registry.projects.is_empty() {
            return Err("project registry is empty; register at least one project".to_string());
        }

        let persisted_active_project_id = read_active_project_id(active_state_path)?;
        let active_project_id =
            resolve_initial_active_project_id(&registry, persisted_active_project_id);

        Ok(Self {
            inner: Arc::new(Mutex::new(ProjectRuntimeInner {
                registry,
                active_project_id,
                active_state_path: active_state_path.to_path_buf(),
            })),
        })
    }

    pub fn list_project_summaries(&self) -> Result<Vec<ProjectSummary>, String> {
        let inner = self
            .inner
            .lock()
            .map_err(|_| "project runtime state lock poisoned".to_string())?;

        Ok(inner
            .registry
            .projects
            .iter()
            .map(ProjectContext::to_summary)
            .collect())
    }

    pub fn active_project_summary(&self) -> Result<ProjectSummary, String> {
        Ok(self.active_project_context()?.to_summary())
    }

    pub fn active_project_context(&self) -> Result<ProjectContext, String> {
        let inner = self
            .inner
            .lock()
            .map_err(|_| "project runtime state lock poisoned".to_string())?;

        validate_project_selection(&inner.registry, &inner.active_project_id)
    }

    pub fn set_active_project_by_id(&self, project_id: &str) -> Result<ProjectSummary, String> {
        let (next_project, active_state_path) = {
            let mut inner = self
                .inner
                .lock()
                .map_err(|_| "project runtime state lock poisoned".to_string())?;

            let next_project = validate_project_selection(&inner.registry, project_id)?;
            inner.active_project_id = next_project.project_id.clone();
            (next_project, inner.active_state_path.clone())
        };

        write_active_project_id(&active_state_path, &next_project.project_id)?;
        Ok(next_project.to_summary())
    }
}

#[tauri::command]
pub fn list_projects(
    state: State<'_, ProjectRegistryState>,
) -> Result<Vec<ProjectSummary>, String> {
    state.list_project_summaries()
}

#[tauri::command]
pub fn get_active_project(
    state: State<'_, ProjectRegistryState>,
) -> Result<ProjectSummary, String> {
    state.active_project_summary()
}

#[tauri::command]
pub fn set_active_project(
    project_id: String,
    state: State<'_, ProjectRegistryState>,
    watcher_state: State<'_, DocsWatcherState>,
    app_handle: AppHandle,
) -> Result<ProjectSummary, String> {
    let selected_project = state.set_active_project_by_id(&project_id)?;
    let active_project = state.active_project_context()?;
    watcher_state.switch_to_project(app_handle, &active_project)?;
    Ok(selected_project)
}

fn resolve_initial_active_project_id(
    registry: &ProjectRegistry,
    persisted_active_project_id: Option<String>,
) -> String {
    if let Some(project_id) = persisted_active_project_id {
        if has_project_id(registry, &project_id) {
            return project_id;
        }
    }

    if let Some(preferred) = &registry.preferred_active_project_id {
        if has_project_id(registry, preferred) {
            return preferred.clone();
        }
    }

    registry
        .projects
        .first()
        .map(|project| project.project_id.clone())
        .unwrap_or_default()
}

fn has_project_id(registry: &ProjectRegistry, project_id: &str) -> bool {
    registry
        .projects
        .iter()
        .any(|project| project.project_id == project_id)
}

fn read_active_project_id(state_path: &Path) -> Result<Option<String>, String> {
    if !state_path.exists() {
        return Ok(None);
    }

    let contents = fs::read_to_string(state_path).map_err(|error| {
        format!(
            "project selection failed: cannot read active project state {}: {error}",
            state_path.display()
        )
    })?;

    let parsed = toml::from_str::<ActiveProjectStateFile>(&contents).map_err(|error| {
        format!(
            "project selection failed: cannot parse active project state {}: {error}",
            state_path.display()
        )
    })?;

    Ok(parsed
        .app
        .and_then(|app| app.active_project_id)
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty()))
}

fn write_active_project_id(state_path: &Path, project_id: &str) -> Result<(), String> {
    if let Some(parent) = state_path.parent() {
        fs::create_dir_all(parent).map_err(|error| {
            format!(
                "project selection failed: cannot prepare active project state directory {}: {error}",
                parent.display()
            )
        })?;
    }

    let payload = ActiveProjectStateFile {
        app: Some(ActiveProjectStateApp {
            active_project_id: Some(project_id.to_string()),
        }),
    };

    let serialized = toml::to_string(&payload).map_err(|error| {
        format!(
            "project selection failed: cannot serialize active project state {}: {error}",
            state_path.display()
        )
    })?;

    fs::write(state_path, serialized).map_err(|error| {
        format!(
            "project selection failed: cannot persist active project state {}: {error}",
            state_path.display()
        )
    })
}

#[cfg(test)]
#[path = "project_runtime_tests.rs"]
mod tests;
