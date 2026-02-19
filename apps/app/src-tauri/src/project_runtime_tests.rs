use super::ProjectRegistryState;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

fn create_temp_root(suffix: &str) -> PathBuf {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system time should be after epoch")
        .as_nanos();
    let root = std::env::temp_dir().join(format!("coda-project-runtime-{suffix}-{timestamp}"));
    fs::create_dir_all(&root).expect("temp root should be created");
    root
}

fn create_workspace_with_doc(root: &Path, name: &str, doc_name: &str) -> PathBuf {
    let workspace = root.join(name);
    let docs_dir = workspace.join("docs");
    fs::create_dir_all(&docs_dir).expect("docs directory should be created");
    fs::write(
        docs_dir.join(doc_name),
        "---\ntitle: Demo\ndate: 2026-02-19\nstatus: draft\ntags: [demo]\n---\n\nBody\n",
    )
    .expect("doc should be written");

    workspace
        .canonicalize()
        .expect("workspace path should canonicalize")
}

fn write_file(path: &Path, contents: &str) {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).expect("parent should be created");
    }

    fs::write(path, contents).expect("file should be written");
}

fn teardown(path: &Path) {
    fs::remove_dir_all(path).expect("temp root should be removed");
}

#[test]
fn restores_active_project_from_persisted_state_file() {
    let temp_root = create_temp_root("restore-active");
    let home_root = temp_root.join("home");
    let global_config = home_root.join(".coda/config.toml");
    let active_state = home_root.join(".coda/app-state.toml");

    let workspace_a = create_workspace_with_doc(&temp_root, "workspace-a", "a.md");
    let workspace_b = create_workspace_with_doc(&temp_root, "workspace-b", "b.md");
    let local_config = workspace_a.join(".coda/config.toml");

    write_file(
        &global_config,
        &format!(
            r#"
[projects.alpha]
path = "{}"

[projects.beta]
path = "{}"

[app]
active_project_id = "alpha"
"#,
            workspace_a.display(),
            workspace_b.display()
        ),
    );
    write_file(
        &active_state,
        r#"
[app]
active_project_id = "beta"
"#,
    );
    write_file(&local_config, "");

    let state = ProjectRegistryState::from_paths(
        &workspace_a,
        &global_config,
        &local_config,
        &active_state,
    )
    .expect("runtime state should load");

    let active = state
        .active_project_context()
        .expect("active project should resolve");
    assert_eq!(active.project_id, "beta");

    teardown(&temp_root);
}

#[test]
fn persists_selected_project_and_restores_after_reload() {
    let temp_root = create_temp_root("persist-active");
    let home_root = temp_root.join("home");
    let global_config = home_root.join(".coda/config.toml");
    let active_state = home_root.join(".coda/app-state.toml");

    let workspace_a = create_workspace_with_doc(&temp_root, "workspace-a", "a.md");
    let workspace_b = create_workspace_with_doc(&temp_root, "workspace-b", "b.md");
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

    let state = ProjectRegistryState::from_paths(
        &workspace_a,
        &global_config,
        &local_config,
        &active_state,
    )
    .expect("runtime state should load");

    let selected = state
        .set_active_project_by_id("beta")
        .expect("project switch should persist");
    assert_eq!(selected.project_id, "beta");

    let reloaded_state = ProjectRegistryState::from_paths(
        &workspace_a,
        &global_config,
        &local_config,
        &active_state,
    )
    .expect("reloaded runtime state should load");

    let reloaded_active = reloaded_state
        .active_project_context()
        .expect("active project should resolve after restart");
    assert_eq!(reloaded_active.project_id, "beta");

    let active_state_contents =
        fs::read_to_string(&active_state).expect("persisted state file should exist");
    assert!(active_state_contents.contains("active_project_id = \"beta\""));

    teardown(&temp_root);
}

#[test]
fn rejects_unknown_project_selection() {
    let temp_root = create_temp_root("unknown-selection");
    let home_root = temp_root.join("home");
    let global_config = home_root.join(".coda/config.toml");
    let active_state = home_root.join(".coda/app-state.toml");

    let workspace = create_workspace_with_doc(&temp_root, "workspace-a", "a.md");
    let local_config = workspace.join(".coda/config.toml");

    write_file(
        &global_config,
        &format!(
            r#"
[projects.alpha]
path = "{}"
"#,
            workspace.display()
        ),
    );
    write_file(&local_config, "");

    let state =
        ProjectRegistryState::from_paths(&workspace, &global_config, &local_config, &active_state)
            .expect("runtime state should load");

    let error = state
        .set_active_project_by_id("missing")
        .expect_err("unknown project id should fail");
    assert!(error.contains("unknown project_id 'missing'"));

    teardown(&temp_root);
}
