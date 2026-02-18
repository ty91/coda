use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

const DOC_FILE_EXTENSION: &str = "md";
const FRONTMATTER_DELIMITER: &str = "---";
const DOCS_PATH_SEGMENTS: [&str; 1] = ["docs"];

#[derive(Debug, Deserialize)]
struct DocFrontmatter {
    title: Option<String>,
    date: Option<String>,
    status: Option<String>,
    tags: Option<Vec<String>>,
    milestone: Option<String>,
}

#[derive(Debug)]
struct ParsedMetadata {
    title: Option<String>,
    date: Option<String>,
    status: Option<String>,
    tags: Vec<String>,
    milestone: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DocSummary {
    id: String,
    file_name: String,
    doc_path: String,
    relative_path: String,
    section: String,
    title: Option<String>,
    display_title: String,
    date: Option<String>,
    status: Option<String>,
    tags: Vec<String>,
    milestone: Option<String>,
    is_template: bool,
    is_hidden: bool,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DocDocument {
    id: String,
    file_name: String,
    doc_path: String,
    relative_path: String,
    section: String,
    title: Option<String>,
    display_title: String,
    date: Option<String>,
    status: Option<String>,
    tags: Vec<String>,
    milestone: Option<String>,
    is_template: bool,
    is_hidden: bool,
    markdown_body: String,
}

#[tauri::command]
pub fn list_doc_summaries(include_hidden: Option<bool>) -> Result<Vec<DocSummary>, String> {
    let (workspace_root, docs_root) = resolve_workspace_paths()?;
    list_doc_summaries_from_root(&workspace_root, &docs_root, include_hidden.unwrap_or(false))
}

#[tauri::command]
pub fn get_doc_document(doc_id: String) -> Result<DocDocument, String> {
    let (workspace_root, docs_root) = resolve_workspace_paths()?;
    get_doc_document_from_root(&workspace_root, &docs_root, &doc_id)
}

fn resolve_workspace_paths() -> Result<(PathBuf, PathBuf), String> {
    let workspace_root = workspace_root_path()?;
    let docs_root = DOCS_PATH_SEGMENTS
        .iter()
        .fold(workspace_root.clone(), |current, segment| {
            current.join(segment)
        });

    Ok((workspace_root, docs_root))
}

fn workspace_root_path() -> Result<PathBuf, String> {
    let manifest_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    manifest_path
        .ancestors()
        .nth(3)
        .map(Path::to_path_buf)
        .ok_or_else(|| "failed to resolve workspace root".to_string())
}

fn list_doc_summaries_from_root(
    workspace_root: &Path,
    docs_root: &Path,
    include_hidden: bool,
) -> Result<Vec<DocSummary>, String> {
    if !docs_root.exists() {
        return Ok(Vec::new());
    }

    let docs_root_canonical = docs_root.canonicalize().map_err(|error| {
        format!(
            "failed to resolve docs directory {}: {error}",
            docs_root.display()
        )
    })?;
    let workspace_root_canonical = workspace_root.canonicalize().map_err(|error| {
        format!(
            "failed to resolve workspace root {}: {error}",
            workspace_root.display()
        )
    })?;

    let markdown_paths = collect_markdown_paths(docs_root)?;
    let mut summaries = Vec::new();

    for path in markdown_paths {
        let path_canonical = path.canonicalize().map_err(|error| {
            format!(
                "failed to resolve document path {}: {error}",
                path.display()
            )
        })?;

        if !path_canonical.starts_with(&docs_root_canonical) {
            return Err(format!(
                "document path {} is outside allowed docs directory {}",
                path.display(),
                docs_root.display()
            ));
        }

        let document = parse_doc_document(
            &path_canonical,
            &workspace_root_canonical,
            &docs_root_canonical,
        )?;

        if !include_hidden && (document.is_hidden || document.is_template) {
            continue;
        }

        summaries.push(DocSummary {
            id: document.id,
            file_name: document.file_name,
            doc_path: document.doc_path,
            relative_path: document.relative_path,
            section: document.section,
            title: document.title,
            display_title: document.display_title,
            date: document.date,
            status: document.status,
            tags: document.tags,
            milestone: document.milestone,
            is_template: document.is_template,
            is_hidden: document.is_hidden,
        });
    }

    summaries.sort_by(|left, right| {
        left.section
            .cmp(&right.section)
            .then_with(|| right.date.cmp(&left.date))
            .then_with(|| left.doc_path.cmp(&right.doc_path))
    });

    Ok(summaries)
}

fn collect_markdown_paths(root: &Path) -> Result<Vec<PathBuf>, String> {
    let mut paths = Vec::new();
    collect_markdown_paths_recursive(root, &mut paths)?;
    Ok(paths)
}

fn collect_markdown_paths_recursive(root: &Path, paths: &mut Vec<PathBuf>) -> Result<(), String> {
    let entries = fs::read_dir(root)
        .map_err(|error| format!("failed to read directory {}: {error}", root.display()))?;

    for entry in entries {
        let entry = entry.map_err(|error| {
            format!(
                "failed to read directory entry in {}: {error}",
                root.display()
            )
        })?;
        let entry_path = entry.path();

        if entry_path.is_dir() {
            collect_markdown_paths_recursive(&entry_path, paths)?;
            continue;
        }

        if is_markdown_file(&entry_path) {
            paths.push(entry_path);
        }
    }

    Ok(())
}

fn get_doc_document_from_root(
    workspace_root: &Path,
    docs_root: &Path,
    doc_id: &str,
) -> Result<DocDocument, String> {
    validate_doc_id(doc_id)?;

    let docs_root_canonical = docs_root.canonicalize().map_err(|error| {
        format!(
            "failed to resolve docs directory {}: {error}",
            docs_root.display()
        )
    })?;
    let workspace_root_canonical = workspace_root.canonicalize().map_err(|error| {
        format!(
            "failed to resolve workspace root {}: {error}",
            workspace_root.display()
        )
    })?;

    let requested_path = docs_root_canonical.join(doc_id);
    let canonical_doc_path = requested_path
        .canonicalize()
        .map_err(|error| format!("failed to locate document {doc_id}: {error}"))?;

    if !canonical_doc_path.starts_with(&docs_root_canonical) {
        return Err("document path is outside allowed docs directory".to_string());
    }

    if !is_markdown_file(&canonical_doc_path) {
        return Err(format!("document must be a .{DOC_FILE_EXTENSION} file"));
    }

    parse_doc_document(
        &canonical_doc_path,
        &workspace_root_canonical,
        &docs_root_canonical,
    )
}

fn validate_doc_id(doc_id: &str) -> Result<(), String> {
    let trimmed = doc_id.trim();

    if trimmed.is_empty() {
        return Err("document id must not be empty".to_string());
    }

    if trimmed.starts_with('/') || trimmed.starts_with('\\') {
        return Err("document id must be a relative path under docs/".to_string());
    }

    if trimmed.contains('\\') || trimmed.contains("..") {
        return Err("document id contains invalid path characters".to_string());
    }

    if !trimmed.ends_with(&format!(".{DOC_FILE_EXTENSION}")) {
        return Err(format!("document id must end with .{DOC_FILE_EXTENSION}"));
    }

    Ok(())
}

fn parse_doc_document(
    path: &Path,
    workspace_root: &Path,
    docs_root: &Path,
) -> Result<DocDocument, String> {
    let file_contents = fs::read_to_string(path)
        .map_err(|error| format!("failed to read document file {}: {error}", path.display()))?;
    let (frontmatter, markdown_body) = split_frontmatter(&file_contents, path)?;
    let metadata = parse_frontmatter(&frontmatter, path)?;

    let file_name = path
        .file_name()
        .and_then(|value| value.to_str())
        .ok_or_else(|| format!("invalid utf-8 document filename: {}", path.display()))?
        .to_string();

    let relative_path = path
        .strip_prefix(workspace_root)
        .map(|value| value.to_string_lossy().replace('\\', "/"))
        .map_err(|_| {
            format!(
                "document path {} is outside workspace root {}",
                path.display(),
                workspace_root.display()
            )
        })?;

    let doc_path = path
        .strip_prefix(docs_root)
        .map(|value| value.to_string_lossy().replace('\\', "/"))
        .map_err(|_| {
            format!(
                "document path {} is outside docs root {}",
                path.display(),
                docs_root.display()
            )
        })?;

    let section = doc_path
        .split('/')
        .next()
        .filter(|value| !value.ends_with(&format!(".{DOC_FILE_EXTENSION}")))
        .unwrap_or("root")
        .to_string();

    let display_title = metadata.title.clone().unwrap_or_else(|| {
        file_name
            .trim_end_matches(&format!(".{DOC_FILE_EXTENSION}"))
            .to_string()
    });

    let is_hidden = is_hidden_doc_path(&doc_path);
    let is_template = is_template_file(&file_name);

    Ok(DocDocument {
        id: doc_path.clone(),
        file_name,
        doc_path,
        relative_path,
        section,
        title: metadata.title,
        display_title,
        date: metadata.date,
        status: metadata.status,
        tags: metadata.tags,
        milestone: metadata.milestone,
        is_template,
        is_hidden,
        markdown_body,
    })
}

fn split_frontmatter(contents: &str, path: &Path) -> Result<(String, String), String> {
    let normalized_contents = contents.replace("\r\n", "\n");

    if !normalized_contents.starts_with(&format!("{FRONTMATTER_DELIMITER}\n")) {
        return Err(format!(
            "document file {} must start with YAML frontmatter delimiter '---'",
            path.display()
        ));
    }

    let remainder = &normalized_contents[(FRONTMATTER_DELIMITER.len() + 1)..];
    let delimiter_marker = format!("\n{FRONTMATTER_DELIMITER}\n");
    let delimiter_index = remainder.find(&delimiter_marker).ok_or_else(|| {
        format!(
            "document file {} is missing closing frontmatter delimiter '---'",
            path.display()
        )
    })?;

    let frontmatter = remainder[..delimiter_index].to_string();
    let markdown_body = remainder[(delimiter_index + delimiter_marker.len())..].to_string();

    Ok((frontmatter, markdown_body))
}

fn parse_frontmatter(frontmatter: &str, path: &Path) -> Result<ParsedMetadata, String> {
    let parsed: DocFrontmatter = serde_yaml::from_str(frontmatter).map_err(|error| {
        format!(
            "failed to parse frontmatter for {}: {error}",
            path.display()
        )
    })?;

    let tags = parsed
        .tags
        .unwrap_or_default()
        .into_iter()
        .map(|tag| tag.trim().to_string())
        .filter(|tag| !tag.is_empty())
        .collect::<Vec<String>>();

    Ok(ParsedMetadata {
        title: optional_text(parsed.title),
        date: optional_text(parsed.date),
        status: optional_text(parsed.status),
        tags,
        milestone: optional_text(parsed.milestone),
    })
}

fn optional_text(value: Option<String>) -> Option<String> {
    value
        .map(|text| text.trim().to_string())
        .filter(|text| !text.is_empty())
}

fn is_markdown_file(path: &Path) -> bool {
    path.is_file()
        && path
            .extension()
            .and_then(|value| value.to_str())
            .is_some_and(|value| value == DOC_FILE_EXTENSION)
}

fn is_template_file(file_name: &str) -> bool {
    file_name == ".template.md" || file_name.ends_with(".template.md")
}

fn is_hidden_doc_path(doc_path: &str) -> bool {
    doc_path
        .split('/')
        .any(|segment| !segment.is_empty() && segment.starts_with('.'))
}

#[cfg(test)]
#[path = "plan_viewer_tests.rs"]
mod tests;
