use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::{Path, PathBuf};

const DOCS_DIR_NAME: &str = "docs";

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectSummary {
    pub project_id: String,
    pub display_name: String,
    pub root_path: String,
    pub docs_path: String,
    pub has_local_override: bool,
}

#[derive(Debug, Clone)]
pub struct ProjectContext {
    pub project_id: String,
    pub display_name: String,
    pub root_path: PathBuf,
    pub docs_path: PathBuf,
    pub has_local_override: bool,
}

#[derive(Debug, Clone)]
pub struct ProjectRegistry {
    pub projects: Vec<ProjectContext>,
    pub preferred_active_project_id: Option<String>,
}

#[derive(Debug, Clone)]
struct ProjectCandidate {
    project_id: String,
    display_name: Option<String>,
    root_path: PathBuf,
    has_local_override: bool,
}

#[derive(Debug, Deserialize, Default)]
struct GlobalConfigFile {
    projects: Option<BTreeMap<String, GlobalProjectConfig>>,
    app: Option<GlobalAppConfig>,
}

#[derive(Debug, Deserialize)]
struct GlobalProjectConfig {
    path: String,
    display_name: Option<String>,
}

#[derive(Debug, Deserialize)]
struct GlobalAppConfig {
    active_project_id: Option<String>,
}

#[derive(Debug, Deserialize, Default)]
struct LocalConfigFile {
    project: Option<LocalProjectOverride>,
}

#[derive(Debug, Deserialize, Default)]
struct LocalProjectOverride {
    id: Option<String>,
    display_name: Option<String>,
}

pub fn load_project_registry_from_paths(
    current_workspace_root: &Path,
    global_config_path: &Path,
    local_config_path: &Path,
) -> Result<ProjectRegistry, String> {
    let global = read_global_config(global_config_path)?;
    let local = read_local_config(local_config_path)?;

    let mut candidates = global_project_candidates(&global)?;
    let current_workspace_canonical = current_workspace_root.canonicalize().map_err(|error| {
        format!(
            "project registration failed: cannot resolve current workspace root {}: {error}",
            current_workspace_root.display()
        )
    })?;

    ensure_current_project_candidate(&mut candidates, &current_workspace_canonical);
    apply_local_override(&mut candidates, &current_workspace_canonical, &local)?;

    let projects = validate_project_candidates(candidates)?;
    let preferred_active_project_id = global
        .app
        .and_then(|app| normalize_optional_text(app.active_project_id));

    Ok(ProjectRegistry {
        projects,
        preferred_active_project_id,
    })
}

pub fn validate_project_selection(
    registry: &ProjectRegistry,
    project_id: &str,
) -> Result<ProjectContext, String> {
    let normalized = normalize_required_text(project_id, "project_id")?;
    registry
        .projects
        .iter()
        .find(|project| project.project_id == normalized)
        .cloned()
        .ok_or_else(|| {
            format!(
                "project selection failed: unknown project_id '{}'.",
                normalized
            )
        })
}

#[cfg_attr(not(test), allow(dead_code))]
pub fn validate_project_removal(
    registry: &ProjectRegistry,
    active_project_id: &str,
    removed_project_id: &str,
) -> Result<(), String> {
    let removed_project = validate_project_selection(registry, removed_project_id)?;
    let active_project = validate_project_selection(registry, active_project_id)?;

    if registry.projects.len() == 1 {
        return Err(
            "project removal failed: cannot remove the last registered project.".to_string(),
        );
    }

    if removed_project.project_id == active_project.project_id {
        return Err(format!(
            "project removal failed: cannot remove active project '{}'; select another project first.",
            removed_project.project_id
        ));
    }

    Ok(())
}

pub fn workspace_root_path() -> Result<PathBuf, String> {
    let manifest_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    manifest_path
        .ancestors()
        .nth(3)
        .map(Path::to_path_buf)
        .ok_or_else(|| "failed to resolve workspace root".to_string())
}

fn global_project_candidates(global: &GlobalConfigFile) -> Result<Vec<ProjectCandidate>, String> {
    let mut candidates = Vec::new();

    if let Some(projects) = &global.projects {
        for (project_id, project) in projects {
            candidates.push(ProjectCandidate {
                project_id: normalize_required_text(project_id, "project_id")?,
                display_name: normalize_optional_text(project.display_name.clone()),
                root_path: PathBuf::from(project.path.trim()),
                has_local_override: false,
            });
        }
    }

    Ok(candidates)
}

fn ensure_current_project_candidate(
    candidates: &mut Vec<ProjectCandidate>,
    current_workspace_root: &Path,
) {
    let current_workspace_root_string = current_workspace_root.to_string_lossy().to_string();

    let mut found = false;
    for candidate in candidates.iter() {
        let candidate_path = candidate.root_path.canonicalize().ok();
        if candidate_path.as_deref() == Some(current_workspace_root) {
            found = true;
            break;
        }
    }

    if found {
        return;
    }

    let existing_ids = candidates
        .iter()
        .map(|candidate| candidate.project_id.clone())
        .collect::<BTreeSet<String>>();

    candidates.push(ProjectCandidate {
        project_id: derive_default_project_id(current_workspace_root, &existing_ids),
        display_name: Some(derive_default_display_name(current_workspace_root)),
        root_path: PathBuf::from(current_workspace_root_string),
        has_local_override: false,
    });
}

fn apply_local_override(
    candidates: &mut [ProjectCandidate],
    current_workspace_root: &Path,
    local: &LocalConfigFile,
) -> Result<(), String> {
    let Some(project_override) = &local.project else {
        return Ok(());
    };

    let Some(current_project) = candidates.iter_mut().find(|candidate| {
        candidate.root_path.canonicalize().ok().as_deref() == Some(current_workspace_root)
    }) else {
        return Err(format!(
            "project registration failed: current workspace {} is not registered.",
            current_workspace_root.display()
        ));
    };

    if let Some(local_id) = normalize_optional_text(project_override.id.clone()) {
        current_project.project_id = local_id;
    }

    if let Some(local_display_name) = normalize_optional_text(project_override.display_name.clone())
    {
        current_project.display_name = Some(local_display_name);
    }

    current_project.has_local_override = true;
    Ok(())
}

fn validate_project_candidates(
    candidates: Vec<ProjectCandidate>,
) -> Result<Vec<ProjectContext>, String> {
    let mut seen_ids = BTreeSet::<String>::new();
    let mut seen_paths = BTreeSet::<PathBuf>::new();
    let mut projects = Vec::new();

    for candidate in candidates {
        validate_project_id(&candidate.project_id)?;
        let root_path = canonicalize_project_root(&candidate.root_path)?;

        if !seen_ids.insert(candidate.project_id.clone()) {
            return Err(format!(
                "project registration failed: duplicate project_id '{}'.",
                candidate.project_id
            ));
        }

        if !seen_paths.insert(root_path.clone()) {
            return Err(format!(
                "project registration failed: duplicate root path '{}'.",
                root_path.display()
            ));
        }

        let docs_path = root_path.join(DOCS_DIR_NAME);
        if !docs_path.exists() || !docs_path.is_dir() {
            return Err(format!(
                "project registration failed: docs directory does not exist under root path '{}'.",
                root_path.display()
            ));
        }

        projects.push(ProjectContext {
            project_id: candidate.project_id,
            display_name: candidate
                .display_name
                .unwrap_or_else(|| derive_default_display_name(&root_path)),
            root_path,
            docs_path,
            has_local_override: candidate.has_local_override,
        });
    }

    projects.sort_by(|left, right| {
        left.display_name
            .to_lowercase()
            .cmp(&right.display_name.to_lowercase())
            .then_with(|| left.project_id.cmp(&right.project_id))
    });

    Ok(projects)
}

fn canonicalize_project_root(root_path: &Path) -> Result<PathBuf, String> {
    if !root_path.exists() {
        return Err(format!(
            "project registration failed: root path does not exist: {}",
            root_path.display()
        ));
    }

    if !root_path.is_dir() {
        return Err(format!(
            "project registration failed: root path must be a directory: {}",
            root_path.display()
        ));
    }

    root_path.canonicalize().map_err(|error| {
        format!(
            "project registration failed: cannot resolve root path {}: {error}",
            root_path.display()
        )
    })
}

fn validate_project_id(project_id: &str) -> Result<(), String> {
    if project_id.is_empty() {
        return Err("project registration failed: project_id must not be empty".to_string());
    }

    let is_valid = project_id.chars().all(|character| {
        character.is_ascii_lowercase()
            || character.is_ascii_digit()
            || character == '-'
            || character == '_'
    });

    if !is_valid {
        return Err(format!(
            "project registration failed: invalid project_id '{}'. Use lowercase letters, numbers, '-' or '_'.",
            project_id
        ));
    }

    Ok(())
}

fn derive_default_project_id(root_path: &Path, existing_ids: &BTreeSet<String>) -> String {
    let base_name = root_path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("project");

    let mut normalized = base_name
        .to_lowercase()
        .chars()
        .map(|character| {
            if character.is_ascii_lowercase() || character.is_ascii_digit() {
                character
            } else {
                '-'
            }
        })
        .collect::<String>()
        .trim_matches('-')
        .to_string();

    if normalized.is_empty() {
        normalized = "project".to_string();
    }

    if !existing_ids.contains(&normalized) {
        return normalized;
    }

    let mut suffix = 2_u32;
    loop {
        let next = format!("{}-{}", normalized, suffix);
        if !existing_ids.contains(&next) {
            return next;
        }
        suffix = suffix.saturating_add(1);
    }
}

fn derive_default_display_name(root_path: &Path) -> String {
    root_path
        .file_name()
        .and_then(|value| value.to_str())
        .map(|value| value.to_string())
        .unwrap_or_else(|| "Project".to_string())
}

fn read_global_config(config_path: &Path) -> Result<GlobalConfigFile, String> {
    if !config_path.exists() {
        return Ok(GlobalConfigFile::default());
    }

    let contents = fs::read_to_string(config_path).map_err(|error| {
        format!(
            "project registration failed: cannot read global config {}: {error}",
            config_path.display()
        )
    })?;

    toml::from_str::<GlobalConfigFile>(&contents).map_err(|error| {
        format!(
            "project registration failed: cannot parse global config {}: {error}",
            config_path.display()
        )
    })
}

fn read_local_config(config_path: &Path) -> Result<LocalConfigFile, String> {
    if !config_path.exists() {
        return Ok(LocalConfigFile::default());
    }

    let contents = fs::read_to_string(config_path).map_err(|error| {
        format!(
            "project registration failed: cannot read local config {}: {error}",
            config_path.display()
        )
    })?;

    toml::from_str::<LocalConfigFile>(&contents).map_err(|error| {
        format!(
            "project registration failed: cannot parse local config {}: {error}",
            config_path.display()
        )
    })
}

fn normalize_required_text(value: &str, label: &str) -> Result<String, String> {
    let normalized = value.trim().to_string();
    if normalized.is_empty() {
        return Err(format!(
            "project registration failed: {} must not be empty",
            label
        ));
    }

    Ok(normalized)
}

fn normalize_optional_text(value: Option<String>) -> Option<String> {
    value
        .map(|raw| raw.trim().to_string())
        .filter(|raw| !raw.is_empty())
}

impl ProjectContext {
    pub fn to_summary(&self) -> ProjectSummary {
        ProjectSummary {
            project_id: self.project_id.clone(),
            display_name: self.display_name.clone(),
            root_path: self.root_path.to_string_lossy().to_string(),
            docs_path: self.docs_path.to_string_lossy().to_string(),
            has_local_override: self.has_local_override,
        }
    }
}

#[cfg(test)]
#[path = "project_registry_tests.rs"]
mod tests;
