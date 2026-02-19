use notify::event::ModifyKind;
use notify::{Event, EventKind, RecursiveMode, Watcher};
use serde::Serialize;
use std::collections::BTreeSet;
use std::io::Error;
use std::path::{Path, PathBuf};
use std::sync::mpsc;
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter};
use time::format_description::well_known::Rfc3339;
use time::OffsetDateTime;

const DOC_FILE_EXTENSION: &str = "md";
const DOCS_PATH_SEGMENTS: [&str; 1] = ["docs"];
const WATCH_DEBOUNCE_WINDOW: Duration = Duration::from_millis(180);
pub const DOCS_CHANGED_EVENT: &str = "docs_changed";

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize)]
#[serde(rename_all = "lowercase")]
enum DocsChangeKind {
    Modified,
    Created,
    Removed,
    Renamed,
    Other,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DocsChangedEventPayload {
    changed_doc_ids: Vec<String>,
    removed_doc_ids: Vec<String>,
    kinds: Vec<DocsChangeKind>,
    emitted_at_iso: String,
}

#[derive(Debug, Default)]
struct DocsChangeAccumulator {
    changed_doc_ids: BTreeSet<String>,
    removed_doc_ids: BTreeSet<String>,
    kinds: BTreeSet<DocsChangeKind>,
}

pub fn start_docs_watcher(app_handle: AppHandle) -> Result<(), Error> {
    let docs_root = resolve_docs_root()?;
    if !docs_root.exists() {
        log::info!("docs watcher skipped; docs directory does not exist");
        return Ok(());
    }

    let docs_root_canonical = docs_root.canonicalize()?;

    thread::Builder::new()
        .name("coda-docs-watcher".to_string())
        .spawn(move || {
            if let Err(error) = watch_docs_loop(&app_handle, &docs_root_canonical) {
                log::error!("docs watcher stopped: {error}");
            }
        })?;

    Ok(())
}

fn watch_docs_loop(app_handle: &AppHandle, docs_root: &Path) -> Result<(), Error> {
    let (event_sender, event_receiver) = mpsc::channel::<notify::Result<Event>>();

    let mut watcher = notify::recommended_watcher(move |event| {
        if event_sender.send(event).is_err() {
            log::warn!("docs watcher receiver dropped");
        }
    })
    .map_err(Error::other)?;

    watcher
        .watch(docs_root, RecursiveMode::Recursive)
        .map_err(Error::other)?;

    loop {
        let first_event = match event_receiver.recv() {
            Ok(event) => event,
            Err(_) => return Ok(()),
        };

        let mut pending_events = vec![first_event];

        while let Ok(event) = event_receiver.recv_timeout(WATCH_DEBOUNCE_WINDOW) {
            pending_events.push(event);
        }

        if let Some(payload) = build_docs_changed_payload(docs_root, &pending_events) {
            app_handle
                .emit(DOCS_CHANGED_EVENT, payload)
                .map_err(Error::other)?;
        }
    }
}

fn build_docs_changed_payload(
    docs_root: &Path,
    events: &[notify::Result<Event>],
) -> Option<DocsChangedEventPayload> {
    let mut accumulator = DocsChangeAccumulator::default();

    for maybe_event in events {
        match maybe_event {
            Ok(event) => accumulate_event_change(docs_root, event, &mut accumulator),
            Err(error) => log::warn!("docs watcher event dropped: {error}"),
        }
    }

    if accumulator.changed_doc_ids.is_empty() && accumulator.removed_doc_ids.is_empty() {
        return None;
    }

    for id in &accumulator.changed_doc_ids {
        if accumulator.removed_doc_ids.contains(id) {
            accumulator.removed_doc_ids.remove(id);
        }
    }

    Some(DocsChangedEventPayload {
        changed_doc_ids: accumulator.changed_doc_ids.into_iter().collect(),
        removed_doc_ids: accumulator.removed_doc_ids.into_iter().collect(),
        kinds: accumulator.kinds.into_iter().collect(),
        emitted_at_iso: now_iso_utc(),
    })
}

fn accumulate_event_change(docs_root: &Path, event: &Event, accumulator: &mut DocsChangeAccumulator) {
    match event.kind {
        EventKind::Create(_) => {
            accumulator.kinds.insert(DocsChangeKind::Created);
            for path in &event.paths {
                if let Some(doc_id) = path_to_doc_id(path, docs_root) {
                    accumulator.changed_doc_ids.insert(doc_id);
                }
            }
        }
        EventKind::Modify(ModifyKind::Name(_)) => {
            accumulator.kinds.insert(DocsChangeKind::Renamed);
            let mut doc_ids = event
                .paths
                .iter()
                .filter_map(|path| path_to_doc_id(path, docs_root));
            if let Some(previous_doc_id) = doc_ids.next() {
                accumulator.removed_doc_ids.insert(previous_doc_id);
            }
            for doc_id in doc_ids {
                accumulator.changed_doc_ids.insert(doc_id);
            }
        }
        EventKind::Modify(_) => {
            accumulator.kinds.insert(DocsChangeKind::Modified);
            for path in &event.paths {
                if let Some(doc_id) = path_to_doc_id(path, docs_root) {
                    accumulator.changed_doc_ids.insert(doc_id);
                }
            }
        }
        EventKind::Remove(_) => {
            accumulator.kinds.insert(DocsChangeKind::Removed);
            for path in &event.paths {
                if let Some(doc_id) = path_to_doc_id(path, docs_root) {
                    accumulator.removed_doc_ids.insert(doc_id);
                }
            }
        }
        _ => {
            let mut included = false;
            for path in &event.paths {
                if let Some(doc_id) = path_to_doc_id(path, docs_root) {
                    accumulator.changed_doc_ids.insert(doc_id);
                    included = true;
                }
            }
            if included {
                accumulator.kinds.insert(DocsChangeKind::Other);
            }
        }
    }
}

fn path_to_doc_id(path: &Path, docs_root: &Path) -> Option<String> {
    if path.extension().and_then(|value| value.to_str()) != Some(DOC_FILE_EXTENSION) {
        return None;
    }

    let relative_path = path.strip_prefix(docs_root).ok()?;
    if relative_path.as_os_str().is_empty() {
        return None;
    }

    Some(relative_path.to_string_lossy().replace('\\', "/"))
}

fn now_iso_utc() -> String {
    OffsetDateTime::now_utc()
        .format(&Rfc3339)
        .unwrap_or_else(|_| "1970-01-01T00:00:00Z".to_string())
}

fn resolve_docs_root() -> Result<PathBuf, Error> {
    let workspace_root = workspace_root_path()?;
    let docs_root = DOCS_PATH_SEGMENTS
        .iter()
        .fold(workspace_root, |current, segment| current.join(segment));

    Ok(docs_root)
}

fn workspace_root_path() -> Result<PathBuf, Error> {
    let manifest_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    manifest_path
        .ancestors()
        .nth(3)
        .map(Path::to_path_buf)
        .ok_or_else(|| Error::other("failed to resolve workspace root"))
}
