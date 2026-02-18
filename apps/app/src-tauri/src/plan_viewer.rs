use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

const PLAN_FILE_EXTENSION: &str = "md";
const FRONTMATTER_DELIMITER: &str = "---";
const PLAN_PATH_SEGMENTS: [&str; 3] = ["docs", "plans", "active"];

#[derive(Debug, Deserialize)]
struct PlanFrontmatter {
  title: Option<String>,
  date: Option<String>,
  status: Option<String>,
  tags: Option<Vec<String>>,
  milestone: Option<String>,
}

#[derive(Debug)]
struct ParsedMetadata {
  title: String,
  date: String,
  status: String,
  tags: Vec<String>,
  milestone: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PlanSummary {
  id: String,
  file_name: String,
  relative_path: String,
  title: String,
  date: String,
  status: String,
  tags: Vec<String>,
  milestone: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PlanDocument {
  id: String,
  file_name: String,
  relative_path: String,
  title: String,
  date: String,
  status: String,
  tags: Vec<String>,
  milestone: Option<String>,
  markdown_body: String,
}

#[tauri::command]
pub fn list_plan_summaries() -> Result<Vec<PlanSummary>, String> {
  let (workspace_root, active_plans_root) = resolve_workspace_paths()?;
  list_plan_summaries_from_root(&workspace_root, &active_plans_root)
}

#[tauri::command]
pub fn get_plan_document(plan_id: String) -> Result<PlanDocument, String> {
  let (workspace_root, active_plans_root) = resolve_workspace_paths()?;
  get_plan_document_from_root(&workspace_root, &active_plans_root, &plan_id)
}

fn resolve_workspace_paths() -> Result<(PathBuf, PathBuf), String> {
  let workspace_root = workspace_root_path()?;
  let active_plans_root = PLAN_PATH_SEGMENTS
    .iter()
    .fold(workspace_root.clone(), |current, segment| current.join(segment));

  Ok((workspace_root, active_plans_root))
}

fn workspace_root_path() -> Result<PathBuf, String> {
  let manifest_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
  manifest_path
    .ancestors()
    .nth(3)
    .map(Path::to_path_buf)
    .ok_or_else(|| "failed to resolve workspace root".to_string())
}

fn list_plan_summaries_from_root(
  workspace_root: &Path,
  active_plans_root: &Path,
) -> Result<Vec<PlanSummary>, String> {
  if !active_plans_root.exists() {
    return Ok(Vec::new());
  }

  let mut summaries = Vec::new();
  let entries = fs::read_dir(active_plans_root).map_err(|error| {
    format!(
      "failed to read plans directory {}: {error}",
      active_plans_root.display()
    )
  })?;

  for entry in entries {
    let entry = entry.map_err(|error| format!("failed to read plans entry: {error}"))?;
    let path = entry.path();

    if !is_markdown_file(&path) {
      continue;
    }

    let document = parse_plan_document(&path, workspace_root)?;
    summaries.push(PlanSummary {
      id: document.id,
      file_name: document.file_name,
      relative_path: document.relative_path,
      title: document.title,
      date: document.date,
      status: document.status,
      tags: document.tags,
      milestone: document.milestone,
    });
  }

  summaries.sort_by(|left, right| {
    right
      .date
      .cmp(&left.date)
      .then_with(|| right.file_name.cmp(&left.file_name))
  });

  Ok(summaries)
}

fn get_plan_document_from_root(
  workspace_root: &Path,
  active_plans_root: &Path,
  plan_id: &str,
) -> Result<PlanDocument, String> {
  validate_plan_id(plan_id)?;

  let active_root_canonical = active_plans_root.canonicalize().map_err(|error| {
    format!(
      "failed to resolve plans directory {}: {error}",
      active_plans_root.display()
    )
  })?;

  let requested_path = active_root_canonical.join(plan_id);
  let canonical_plan_path = requested_path
    .canonicalize()
    .map_err(|error| format!("failed to locate plan {plan_id}: {error}"))?;

  if !canonical_plan_path.starts_with(&active_root_canonical) {
    return Err("plan path is outside allowed docs/plans/active directory".to_string());
  }

  if !is_markdown_file(&canonical_plan_path) {
    return Err(format!("plan must be a .{PLAN_FILE_EXTENSION} file"));
  }

  parse_plan_document(&canonical_plan_path, workspace_root)
}

fn validate_plan_id(plan_id: &str) -> Result<(), String> {
  let trimmed = plan_id.trim();
  if trimmed.is_empty() {
    return Err("plan id must not be empty".to_string());
  }

  if trimmed.contains('/') || trimmed.contains('\\') || trimmed.contains("..") {
    return Err("plan id contains invalid path characters".to_string());
  }

  if !trimmed.ends_with(&format!(".{PLAN_FILE_EXTENSION}")) {
    return Err(format!("plan id must end with .{PLAN_FILE_EXTENSION}"));
  }

  Ok(())
}

fn parse_plan_document(path: &Path, workspace_root: &Path) -> Result<PlanDocument, String> {
  let file_contents = fs::read_to_string(path)
    .map_err(|error| format!("failed to read plan file {}: {error}", path.display()))?;
  let (frontmatter, markdown_body) = split_frontmatter(&file_contents, path)?;
  let metadata = parse_frontmatter(&frontmatter, path)?;

  let file_name = path
    .file_name()
    .and_then(|value| value.to_str())
    .ok_or_else(|| format!("invalid utf-8 plan filename: {}", path.display()))?
    .to_string();

  let relative_path = path
    .strip_prefix(workspace_root)
    .map(|value| value.to_string_lossy().replace('\\', "/"))
    .map_err(|_| {
      format!(
        "plan path {} is outside workspace root {}",
        path.display(),
        workspace_root.display()
      )
    })?;

  Ok(PlanDocument {
    id: file_name.clone(),
    file_name,
    relative_path,
    title: metadata.title,
    date: metadata.date,
    status: metadata.status,
    tags: metadata.tags,
    milestone: metadata.milestone,
    markdown_body,
  })
}

fn split_frontmatter(contents: &str, path: &Path) -> Result<(String, String), String> {
  let normalized_contents = contents.replace("\r\n", "\n");

  if !normalized_contents.starts_with(&format!("{FRONTMATTER_DELIMITER}\n")) {
    return Err(format!(
      "plan file {} must start with YAML frontmatter delimiter '---'",
      path.display()
    ));
  }

  let remainder = &normalized_contents[(FRONTMATTER_DELIMITER.len() + 1)..];
  let delimiter_marker = format!("\n{FRONTMATTER_DELIMITER}\n");
  let delimiter_index = remainder.find(&delimiter_marker).ok_or_else(|| {
    format!(
      "plan file {} is missing closing frontmatter delimiter '---'",
      path.display()
    )
  })?;

  let frontmatter = remainder[..delimiter_index].to_string();
  let markdown_body = remainder[(delimiter_index + delimiter_marker.len())..].to_string();

  Ok((frontmatter, markdown_body))
}

fn parse_frontmatter(frontmatter: &str, path: &Path) -> Result<ParsedMetadata, String> {
  let parsed: PlanFrontmatter = serde_yaml::from_str(frontmatter).map_err(|error| {
    format!(
      "failed to parse frontmatter for {}: {error}",
      path.display()
    )
  })?;

  let title = required_text(parsed.title, "title", path)?;
  let date = required_text(parsed.date, "date", path)?;
  let status = required_text(parsed.status, "status", path)?;
  let tags = parsed
    .tags
    .ok_or_else(|| format!("missing required frontmatter field 'tags' in {}", path.display()))?
    .into_iter()
    .map(|tag| tag.trim().to_string())
    .collect::<Vec<String>>();

  if tags.iter().any(|tag| tag.is_empty()) {
    return Err(format!(
      "frontmatter 'tags' contains empty value in {}",
      path.display()
    ));
  }

  let milestone = parsed
    .milestone
    .map(|value| value.trim().to_string())
    .filter(|value| !value.is_empty());

  Ok(ParsedMetadata {
    title,
    date,
    status,
    tags,
    milestone,
  })
}

fn required_text(value: Option<String>, field_name: &str, path: &Path) -> Result<String, String> {
  let candidate = value
    .map(|text| text.trim().to_string())
    .filter(|text| !text.is_empty());

  candidate.ok_or_else(|| {
    format!(
      "missing required frontmatter field '{field_name}' in {}",
      path.display()
    )
  })
}

fn is_markdown_file(path: &Path) -> bool {
  path.is_file()
    && path
      .extension()
      .and_then(|value| value.to_str())
      .is_some_and(|value| value == PLAN_FILE_EXTENSION)
}

#[cfg(test)]
mod tests {
  use super::{
    get_plan_document_from_root, list_plan_summaries_from_root, parse_plan_document, Path, PathBuf,
  };
  use std::fs;
  use std::time::{SystemTime, UNIX_EPOCH};

  fn create_temp_workspace() -> PathBuf {
    let timestamp = SystemTime::now()
      .duration_since(UNIX_EPOCH)
      .expect("system clock should be after unix epoch")
      .as_nanos();
    let workspace_path =
      std::env::temp_dir().join(format!("coda-plan-viewer-tests-{timestamp}"));
    let plans_path = workspace_path.join("docs").join("plans").join("active");

    fs::create_dir_all(&plans_path).expect("temp workspace should be created");

    workspace_path
  }

  fn write_plan_file(path: &Path, contents: &str) {
    fs::write(path, contents).expect("plan file should be written");
  }

  fn teardown_workspace(path: &Path) {
    fs::remove_dir_all(path).expect("temp workspace should be removed");
  }

  #[test]
  fn parses_valid_plan_file_into_document() {
    let workspace = create_temp_workspace();
    let active_plans_root = workspace.join("docs").join("plans").join("active");
    let plan_path = active_plans_root.join("2026-02-18-test-plan.md");

    write_plan_file(
      &plan_path,
      "---\ntitle: Test Plan\ndate: 2026-02-18\nstatus: draft\ntags: [ui, tauri]\nmilestone: M1\n---\n\n## Goal\n\nVerify plan parsing.\n",
    );

    let document = parse_plan_document(&plan_path, &workspace)
      .expect("valid plan should parse into document");

    assert_eq!(document.id, "2026-02-18-test-plan.md");
    assert_eq!(document.title, "Test Plan");
    assert_eq!(document.status, "draft");
    assert_eq!(document.tags, vec!["ui", "tauri"]);
    assert!(document.markdown_body.contains("## Goal"));

    teardown_workspace(&workspace);
  }

  #[test]
  fn errors_on_missing_required_frontmatter_field() {
    let workspace = create_temp_workspace();
    let active_plans_root = workspace.join("docs").join("plans").join("active");
    let plan_path = active_plans_root.join("2026-02-18-missing-tags-plan.md");

    write_plan_file(
      &plan_path,
      "---\ntitle: Missing Tags\ndate: 2026-02-18\nstatus: draft\n---\n\nNo tags.\n",
    );

    let error = parse_plan_document(&plan_path, &workspace)
      .expect_err("missing tags should fail validation");

    assert!(error.contains("missing required frontmatter field 'tags'"));

    teardown_workspace(&workspace);
  }

  #[test]
  fn rejects_path_traversal_plan_ids() {
    let workspace = create_temp_workspace();
    let active_plans_root = workspace.join("docs").join("plans").join("active");

    let error = get_plan_document_from_root(
      &workspace,
      &active_plans_root,
      "../completed/2026-02-18-test-plan.md",
    )
    .expect_err("path traversal should be rejected");

    assert!(error.contains("invalid path characters"));

    teardown_workspace(&workspace);
  }

  #[test]
  fn lists_only_markdown_plans() {
    let workspace = create_temp_workspace();
    let active_plans_root = workspace.join("docs").join("plans").join("active");
    let plan_path = active_plans_root.join("2026-02-18-sample-plan.md");
    let non_markdown_path = active_plans_root.join("ignore.txt");

    write_plan_file(
      &plan_path,
      "---\ntitle: Sample\ndate: 2026-02-18\nstatus: draft\ntags: [sample]\n---\n\nBody\n",
    );
    write_plan_file(&non_markdown_path, "not markdown");

    let summaries = list_plan_summaries_from_root(&workspace, &active_plans_root)
      .expect("listing should succeed");

    assert_eq!(summaries.len(), 1);
    assert_eq!(summaries[0].id, "2026-02-18-sample-plan.md");

    teardown_workspace(&workspace);
  }
}
