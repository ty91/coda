use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::{Path, PathBuf};

const DOCS_DIR_NAME: &str = "docs";
const GLOBAL_CONFIG_PATH_SEGMENTS: [&str; 2] = [".coda", "config.toml"];
const LOCAL_CONFIG_PATH_SEGMENTS: [&str; 2] = [".coda", "config.toml"];

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

pub fn load_project_registry() -> Result<ProjectRegistry, String> {
    let current_workspace_root = workspace_root_path()?;
    let home_dir = std::env::var_os("HOME")
        .map(PathBuf::from)
        .ok_or_else(|| "failed to resolve HOME".to_string())?;

    let global_config_path = GLOBAL_CONFIG_PATH_SEGMENTS
        .iter()
        .fold(home_dir, |current, segment| current.join(segment));
    let local_config_path = LOCAL_CONFIG_PATH_SEGMENTS
        .iter()
        .fold(current_workspace_root.clone(), |current, segment| {
            current.join(segment)
        });

    load_project_registry_from_paths(
        &current_workspace_root,
        &global_config_path,
        &local_config_path,
    )
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
mod tests {
    use super::{
        load_project_registry_from_paths, validate_project_removal, validate_project_selection,
    };
    use std::fs;
    use std::path::{Path, PathBuf};
    use std::time::{SystemTime, UNIX_EPOCH};

    fn create_temp_root(suffix: &str) -> PathBuf {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time should be after epoch")
            .as_nanos();
        let root = std::env::temp_dir().join(format!("coda-project-registry-{suffix}-{timestamp}"));
        fs::create_dir_all(&root).expect("temp root should be created");
        root
    }

    fn create_workspace(root: &Path, name: &str) -> PathBuf {
        let workspace = root.join(name);
        fs::create_dir_all(workspace.join("docs")).expect("docs directory should be created");
        workspace
            .canonicalize()
            .expect("workspace path should canonicalize")
    }

    fn write_file(path: &Path, contents: &str) {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).expect("parent directory should be created");
        }
        fs::write(path, contents).expect("file should be written");
    }

    fn teardown(path: &Path) {
        fs::remove_dir_all(path).expect("temp root should be removed");
    }

    #[test]
    fn merges_global_registry_with_local_override_for_current_workspace() {
        let temp_root = create_temp_root("merge");
        let home_root = temp_root.join("home");
        let global_config = home_root.join(".coda/config.toml");

        let workspace_a = create_workspace(&temp_root, "alpha-workspace");
        let workspace_b = create_workspace(&temp_root, "beta-workspace");
        let local_config = workspace_a.join(".coda/config.toml");

        write_file(
            &global_config,
            &format!(
                r#"
[projects.alpha]
path = "{}"
display_name = "Alpha"

[projects.beta]
path = "{}"
display_name = "Beta"

[app]
active_project_id = "beta"
"#,
                workspace_a.display(),
                workspace_b.display()
            ),
        );

        write_file(
            &local_config,
            r#"
[project]
id = "alpha_local"
display_name = "Alpha Local"
"#,
        );

        let registry =
            load_project_registry_from_paths(&workspace_a, &global_config, &local_config)
                .expect("registry should load with local override");

        assert_eq!(registry.projects.len(), 2);

        let local_project = registry
            .projects
            .iter()
            .find(|project| project.root_path == workspace_a)
            .expect("current project should exist");
        assert_eq!(local_project.project_id, "alpha_local");
        assert_eq!(local_project.display_name, "Alpha Local");
        assert!(local_project.has_local_override);

        assert_eq!(
            registry.preferred_active_project_id.as_deref(),
            Some("beta")
        );

        teardown(&temp_root);
    }

    #[test]
    fn rejects_duplicate_project_ids_after_local_override() {
        let temp_root = create_temp_root("duplicate-id");
        let home_root = temp_root.join("home");
        let global_config = home_root.join(".coda/config.toml");

        let workspace_a = create_workspace(&temp_root, "alpha-workspace");
        let workspace_b = create_workspace(&temp_root, "beta-workspace");
        let local_config = workspace_a.join(".coda/config.toml");

        write_file(
            &global_config,
            &format!(
                r#"
[projects.alpha]
path = "{}"

[projects.beta]
path = "{}"
"#,
                workspace_a.display(),
                workspace_b.display()
            ),
        );

        write_file(
            &local_config,
            r#"
[project]
id = "beta"
"#,
        );

        let error = load_project_registry_from_paths(&workspace_a, &global_config, &local_config)
            .expect_err("duplicate project id should fail");

        assert!(error.contains("duplicate project_id 'beta'"));

        teardown(&temp_root);
    }

    #[test]
    fn rejects_project_registration_when_docs_directory_is_missing() {
        let temp_root = create_temp_root("missing-docs");
        let home_root = temp_root.join("home");
        let global_config = home_root.join(".coda/config.toml");

        let workspace = temp_root.join("workspace-no-docs");
        fs::create_dir_all(&workspace).expect("workspace should exist");
        let local_config = workspace.join(".coda/config.toml");

        write_file(
            &global_config,
            &format!(
                r#"
[projects.sample]
path = "{}"
"#,
                workspace.display()
            ),
        );
        write_file(&local_config, "");

        let error = load_project_registry_from_paths(&workspace, &global_config, &local_config)
            .expect_err("missing docs directory should fail");

        assert!(error.contains("docs directory does not exist under root path"));

        teardown(&temp_root);
    }

    #[test]
    fn validates_selection_and_removal_contract_messages() {
        let temp_root = create_temp_root("selection-removal");
        let home_root = temp_root.join("home");
        let global_config = home_root.join(".coda/config.toml");

        let workspace_a = create_workspace(&temp_root, "alpha-workspace");
        let workspace_b = create_workspace(&temp_root, "beta-workspace");
        let local_config = workspace_a.join(".coda/config.toml");

        write_file(
            &global_config,
            &format!(
                r#"
[projects.alpha]
path = "{}"

[projects.beta]
path = "{}"
"#,
                workspace_a.display(),
                workspace_b.display()
            ),
        );
        write_file(&local_config, "");

        let registry =
            load_project_registry_from_paths(&workspace_a, &global_config, &local_config)
                .expect("registry should load");

        let unknown_error = validate_project_selection(&registry, "unknown")
            .expect_err("unknown selection should fail");
        assert!(unknown_error.contains("project selection failed"));

        let removal_error = validate_project_removal(&registry, "alpha", "alpha")
            .expect_err("active project removal should fail");
        assert!(removal_error.contains("cannot remove active project 'alpha'"));

        teardown(&temp_root);
    }
}
