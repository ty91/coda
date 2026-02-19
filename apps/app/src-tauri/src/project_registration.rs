use crate::project_registry::{ProjectContext, ProjectRegistry};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::{Path, PathBuf};

const DOCS_DIR_NAME: &str = "docs";

#[derive(Debug, Deserialize, Serialize, Default)]
struct GlobalConfigFile {
    projects: Option<BTreeMap<String, GlobalProjectConfig>>,
    app: Option<toml::Value>,
    #[serde(flatten)]
    extra: BTreeMap<String, toml::Value>,
}

#[derive(Debug, Clone, Deserialize, Serialize, Default)]
struct GlobalProjectConfig {
    path: String,
    display_name: Option<String>,
    #[serde(flatten)]
    extra: BTreeMap<String, toml::Value>,
}

pub fn build_project_registration_candidate(
    registry: &ProjectRegistry,
    root_path: &str,
) -> Result<ProjectContext, String> {
    let normalized_root_path = normalize_required_text(root_path, "root_path")?;
    let canonical_root_path = canonicalize_project_root(Path::new(&normalized_root_path))?;

    if registry
        .projects
        .iter()
        .any(|project| project.root_path == canonical_root_path)
    {
        return Err(format!(
            "project registration failed: duplicate root path '{}'.",
            canonical_root_path.display()
        ));
    }

    let docs_path = canonical_root_path.join(DOCS_DIR_NAME);
    if !docs_path.exists() || !docs_path.is_dir() {
        return Err(format!(
            "project registration failed: docs directory does not exist under root path '{}'.",
            canonical_root_path.display()
        ));
    }

    let existing_ids = registry
        .projects
        .iter()
        .map(|project| project.project_id.clone())
        .collect::<BTreeSet<String>>();
    let project_id = derive_default_project_id(&canonical_root_path, &existing_ids);

    Ok(ProjectContext {
        project_id,
        display_name: derive_default_display_name(&canonical_root_path),
        root_path: canonical_root_path,
        docs_path,
        has_local_override: false,
    })
}

pub fn persist_registered_project(
    global_config_path: &Path,
    project: &ProjectContext,
) -> Result<(), String> {
    let mut config = read_global_config(global_config_path)?;
    let projects = config.projects.get_or_insert_with(BTreeMap::new);

    if projects.contains_key(&project.project_id) {
        return Err(format!(
            "project registration failed: duplicate project_id '{}'.",
            project.project_id
        ));
    }

    projects.insert(
        project.project_id.clone(),
        GlobalProjectConfig {
            path: project.root_path.to_string_lossy().to_string(),
            display_name: Some(project.display_name.clone()),
            extra: BTreeMap::new(),
        },
    );

    write_global_config_atomic(global_config_path, &config)
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

fn write_global_config_atomic(config_path: &Path, config: &GlobalConfigFile) -> Result<(), String> {
    if let Some(parent) = config_path.parent() {
        fs::create_dir_all(parent).map_err(|error| {
            format!(
                "project registration failed: cannot prepare global config directory {}: {error}",
                parent.display()
            )
        })?;
    }

    let serialized = toml::to_string_pretty(config).map_err(|error| {
        format!(
            "project registration failed: cannot serialize global config {}: {error}",
            config_path.display()
        )
    })?;

    let temp_file_name = format!(
        ".{}.tmp",
        config_path
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("config.toml")
    );
    let temporary_path = config_path.with_file_name(temp_file_name);

    fs::write(&temporary_path, serialized).map_err(|error| {
        format!(
            "project registration failed: cannot write global config temporary file {}: {error}",
            temporary_path.display()
        )
    })?;

    fs::rename(&temporary_path, config_path).map_err(|error| {
        format!(
            "project registration failed: cannot atomically replace global config {}: {error}",
            config_path.display()
        )
    })
}
