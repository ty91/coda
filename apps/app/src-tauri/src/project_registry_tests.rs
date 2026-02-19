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

    let registry = load_project_registry_from_paths(&workspace_a, &global_config, &local_config)
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

    let registry = load_project_registry_from_paths(&workspace_a, &global_config, &local_config)
        .expect("registry should load");

    let unknown_error = validate_project_selection(&registry, "unknown")
        .expect_err("unknown selection should fail");
    assert!(unknown_error.contains("project selection failed"));

    let removal_error = validate_project_removal(&registry, "alpha", "alpha")
        .expect_err("active project removal should fail");
    assert!(removal_error.contains("cannot remove active project 'alpha'"));

    teardown(&temp_root);
}
