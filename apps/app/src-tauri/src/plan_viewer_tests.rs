use super::{
    get_doc_document_from_root, list_doc_summaries_from_root, parse_doc_document, Path, PathBuf,
};
use std::fs;
use std::time::{SystemTime, UNIX_EPOCH};

fn create_temp_workspace() -> PathBuf {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system clock should be after unix epoch")
        .as_nanos();
    let workspace_path = std::env::temp_dir().join(format!("coda-doc-viewer-tests-{timestamp}"));
    let docs_path = workspace_path.join("docs");

    fs::create_dir_all(&docs_path).expect("temp workspace should be created");

    workspace_path
        .canonicalize()
        .expect("temp workspace should canonicalize")
}

fn write_doc_file(path: &Path, contents: &str) {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).expect("parent directory should be created");
    }
    fs::write(path, contents).expect("document file should be written");
}

fn teardown_workspace(path: &Path) {
    fs::remove_dir_all(path).expect("temp workspace should be removed");
}

#[test]
fn parses_valid_doc_file_into_document() {
    let workspace = create_temp_workspace();
    let docs_root = workspace.join("docs");
    let doc_path = docs_root
        .join("solutions")
        .join("2026-02-18-test-solution.md");

    write_doc_file(
        &doc_path,
        "---\ntitle: Test Solution\ndate: 2026-02-18\nstatus: active\ntags: [viewer, docs]\nmilestone: M1\n---\n\n## Problem\n\nVerify docs parsing.\n",
    );

    let docs_root_canonical = docs_root
        .canonicalize()
        .expect("docs root should canonicalize");
    let document = parse_doc_document(&doc_path, &workspace, &docs_root_canonical)
        .expect("valid doc should parse into document");

    assert_eq!(document.id, "solutions/2026-02-18-test-solution.md");
    assert_eq!(document.title.as_deref(), Some("Test Solution"));
    assert_eq!(document.status.as_deref(), Some("active"));
    assert_eq!(document.tags, vec!["viewer", "docs"]);
    assert!(document.markdown_body.contains("## Problem"));

    teardown_workspace(&workspace);
}

#[test]
fn allows_optional_metadata_for_template_doc() {
    let workspace = create_temp_workspace();
    let docs_root = workspace.join("docs");
    let doc_path = docs_root.join("plans").join(".template.md");

    write_doc_file(
        &doc_path,
        "---\ntitle:\ndate:\nstatus: draft\ntags: []\nmilestone:\n---\n\n## Goal\n\nTemplate body.\n",
    );

    let docs_root_canonical = docs_root
        .canonicalize()
        .expect("docs root should canonicalize");
    let document = parse_doc_document(&doc_path, &workspace, &docs_root_canonical)
        .expect("template doc should parse without required fields");

    assert_eq!(document.title, None);
    assert_eq!(document.date, None);
    assert_eq!(document.milestone, None);
    assert!(document.is_hidden);
    assert!(document.is_template);

    teardown_workspace(&workspace);
}

#[test]
fn reports_file_path_for_malformed_frontmatter() {
    let workspace = create_temp_workspace();
    let docs_root = workspace.join("docs");
    let doc_path = docs_root.join("broken.md");

    write_doc_file(
        &doc_path,
        "---\ntitle: Broken\ntags: [valid, value\n---\n\nMalformed yaml.\n",
    );

    let docs_root_canonical = docs_root
        .canonicalize()
        .expect("docs root should canonicalize");
    let error = parse_doc_document(&doc_path, &workspace, &docs_root_canonical)
        .expect_err("malformed frontmatter should fail");

    assert!(error.contains("failed to parse frontmatter"));
    assert!(error.contains("broken.md"));

    teardown_workspace(&workspace);
}

#[test]
fn rejects_path_traversal_document_ids() {
    let workspace = create_temp_workspace();
    let docs_root = workspace.join("docs");

    let error = get_doc_document_from_root(&workspace, &docs_root, "../outside.md")
        .expect_err("path traversal should be rejected");

    assert!(error.contains("invalid path characters"));

    teardown_workspace(&workspace);
}

#[test]
fn lists_docs_recursively_and_filters_hidden_by_default() {
    let workspace = create_temp_workspace();
    let docs_root = workspace.join("docs");

    write_doc_file(
        &docs_root.join("PRD.md"),
        "---\ntitle: PRD\ndate: 2026-02-13\nstatus: draft\ntags: [prd]\n---\n\nBody\n",
    );
    write_doc_file(
        &docs_root.join("design-docs").join("core-beliefs.md"),
        "---\ntitle: Core Beliefs\ndate: 2026-02-14\nstatus: active\ntags: [beliefs]\n---\n\nBody\n",
    );
    write_doc_file(
        &docs_root.join("plans").join(".template.md"),
        "---\ntitle:\ndate:\nstatus: draft\ntags: []\n---\n\nTemplate\n",
    );

    let default_summaries =
        list_doc_summaries_from_root(&workspace, &docs_root, false).expect("listing should work");
    assert_eq!(default_summaries.len(), 2);
    assert!(default_summaries
        .iter()
        .all(|summary| summary.id != "plans/.template.md"));

    let expanded_summaries =
        list_doc_summaries_from_root(&workspace, &docs_root, true).expect("listing should work");
    assert_eq!(expanded_summaries.len(), 3);
    assert!(expanded_summaries
        .iter()
        .any(|summary| summary.id == "plans/.template.md"));

    teardown_workspace(&workspace);
}
