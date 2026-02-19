use crate::project_registry::ProjectContext;
use crate::project_runtime::ProjectRegistryState;
use notify::event::ModifyKind;
use notify::{Event, EventKind, RecursiveMode, Watcher};
use serde::Serialize;
use std::collections::BTreeSet;
use std::io::Error;
use std::path::Path;
use std::sync::{mpsc, Arc, Mutex};
use std::thread;
use std::thread::JoinHandle;
use std::time::Duration;
use tauri::{AppHandle, Emitter};
use time::format_description::well_known::Rfc3339;
use time::OffsetDateTime;

const DOC_FILE_EXTENSION: &str = "md";
const WATCH_DEBOUNCE_WINDOW: Duration = Duration::from_millis(180);
const WATCH_STOP_POLL_WINDOW: Duration = Duration::from_millis(120);
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
    project_id: String,
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

#[derive(Default)]
struct DocsWatcherRuntime {
    stop_sender: Option<mpsc::Sender<()>>,
    watcher_thread: Option<JoinHandle<()>>,
    active_project_id: Option<String>,
}

#[derive(Clone, Default)]
pub struct DocsWatcherState {
    inner: Arc<Mutex<DocsWatcherRuntime>>,
}

pub fn start_docs_watcher(
    app_handle: AppHandle,
    watcher_state: &DocsWatcherState,
    project_state: &ProjectRegistryState,
) -> Result<(), Error> {
    let active_project = project_state
        .active_project_context()
        .map_err(Error::other)?;
    watcher_state
        .switch_to_project(app_handle, &active_project)
        .map_err(Error::other)
}

impl DocsWatcherState {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(Mutex::new(DocsWatcherRuntime::default())),
        }
    }

    pub fn switch_to_project(
        &self,
        app_handle: AppHandle,
        project: &ProjectContext,
    ) -> Result<(), String> {
        let docs_root = project.docs_path.canonicalize().map_err(|error| {
            format!(
                "docs watcher switch failed: cannot resolve docs root {}: {error}",
                project.docs_path.display()
            )
        })?;

        let (previous_stop_sender, previous_thread) = {
            let mut runtime = self
                .inner
                .lock()
                .map_err(|_| "docs watcher state lock poisoned".to_string())?;

            if runtime.active_project_id.as_deref() == Some(project.project_id.as_str()) {
                return Ok(());
            }

            (runtime.stop_sender.take(), runtime.watcher_thread.take())
        };

        if let Some(stop_sender) = previous_stop_sender {
            let _ = stop_sender.send(());
        }

        if let Some(previous_thread) = previous_thread {
            let _ = previous_thread.join();
        }

        let project_id = project.project_id.clone();
        let docs_root_for_thread = docs_root.clone();
        let app_handle_for_thread = app_handle.clone();
        let (stop_sender, stop_receiver) = mpsc::channel::<()>();

        let thread_name = format!("coda-docs-watcher-{}", project_id);
        let thread_project_id = project_id.clone();

        let watcher_thread = thread::Builder::new()
            .name(thread_name)
            .spawn(move || {
                if let Err(error) = watch_docs_loop(
                    &app_handle_for_thread,
                    &thread_project_id,
                    &docs_root_for_thread,
                    stop_receiver,
                ) {
                    log::error!("docs watcher stopped for project {}: {}", thread_project_id, error);
                }
            })
            .map_err(|error| {
                format!(
                    "docs watcher switch failed: cannot spawn watcher thread for project {}: {error}",
                    project_id
                )
            })?;

        let mut runtime = self
            .inner
            .lock()
            .map_err(|_| "docs watcher state lock poisoned".to_string())?;

        runtime.stop_sender = Some(stop_sender);
        runtime.watcher_thread = Some(watcher_thread);
        runtime.active_project_id = Some(project_id);

        Ok(())
    }
}

fn watch_docs_loop(
    app_handle: &AppHandle,
    project_id: &str,
    docs_root: &Path,
    stop_receiver: mpsc::Receiver<()>,
) -> Result<(), Error> {
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
        if stop_receiver.try_recv().is_ok() {
            return Ok(());
        }

        let first_event = match event_receiver.recv_timeout(WATCH_STOP_POLL_WINDOW) {
            Ok(event) => event,
            Err(mpsc::RecvTimeoutError::Timeout) => continue,
            Err(mpsc::RecvTimeoutError::Disconnected) => return Ok(()),
        };

        let mut pending_events = vec![first_event];

        while let Ok(event) = event_receiver.recv_timeout(WATCH_DEBOUNCE_WINDOW) {
            pending_events.push(event);
            if stop_receiver.try_recv().is_ok() {
                return Ok(());
            }
        }

        if let Some(payload) = build_docs_changed_payload(project_id, docs_root, &pending_events) {
            app_handle
                .emit(DOCS_CHANGED_EVENT, payload)
                .map_err(Error::other)?;
        }
    }
}

fn build_docs_changed_payload(
    project_id: &str,
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
        project_id: project_id.to_string(),
        changed_doc_ids: accumulator.changed_doc_ids.into_iter().collect(),
        removed_doc_ids: accumulator.removed_doc_ids.into_iter().collect(),
        kinds: accumulator.kinds.into_iter().collect(),
        emitted_at_iso: now_iso_utc(),
    })
}

fn accumulate_event_change(
    docs_root: &Path,
    event: &Event,
    accumulator: &mut DocsChangeAccumulator,
) {
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

#[cfg(test)]
mod tests {
    use super::{build_docs_changed_payload, DocsChangeKind};
    use notify::event::{CreateKind, DataChange, ModifyKind, RemoveKind, RenameMode};
    use notify::{Event, EventKind};
    use std::path::PathBuf;

    fn docs_root() -> PathBuf {
        PathBuf::from("/tmp/coda/docs")
    }

    fn doc(path: &str) -> PathBuf {
        docs_root().join(path)
    }

    #[test]
    fn includes_project_id_with_modify_and_create_events() {
        let payload = build_docs_changed_payload(
            "alpha",
            &docs_root(),
            &[
                Ok(
                    Event::new(EventKind::Modify(ModifyKind::Data(DataChange::Content)))
                        .add_path(doc("design-docs/core-beliefs.md")),
                ),
                Ok(Event::new(EventKind::Create(CreateKind::File))
                    .add_path(doc("solutions/2026-02-19-test.md"))),
            ],
        )
        .expect("markdown events should emit payload");

        assert_eq!(payload.project_id, "alpha");
        assert_eq!(
            payload.changed_doc_ids,
            vec![
                "design-docs/core-beliefs.md".to_string(),
                "solutions/2026-02-19-test.md".to_string()
            ]
        );
        assert!(payload.removed_doc_ids.is_empty());
        assert_eq!(
            payload.kinds,
            vec![DocsChangeKind::Modified, DocsChangeKind::Created]
        );
    }

    #[test]
    fn maps_rename_into_removed_and_changed_doc_ids() {
        let payload = build_docs_changed_payload(
            "alpha",
            &docs_root(),
            &[Ok(Event::new(EventKind::Modify(ModifyKind::Name(
                RenameMode::Both,
            )))
            .add_path(doc("plans/active/old-plan.md"))
            .add_path(doc("plans/active/new-plan.md")))],
        )
        .expect("rename event should emit payload");

        assert_eq!(payload.project_id, "alpha");
        assert_eq!(
            payload.changed_doc_ids,
            vec!["plans/active/new-plan.md".to_string()]
        );
        assert_eq!(
            payload.removed_doc_ids,
            vec!["plans/active/old-plan.md".to_string()]
        );
        assert_eq!(payload.kinds, vec![DocsChangeKind::Renamed]);
    }

    #[test]
    fn ignores_non_markdown_and_outside_paths() {
        let payload = build_docs_changed_payload(
            "alpha",
            &docs_root(),
            &[
                Ok(
                    Event::new(EventKind::Modify(ModifyKind::Data(DataChange::Content)))
                        .add_path(doc("notes/todo.txt")),
                ),
                Ok(Event::new(EventKind::Remove(RemoveKind::File))
                    .add_path(PathBuf::from("/tmp/other/workspace/docs/PRD.md"))),
            ],
        );

        assert!(payload.is_none());
    }

    #[test]
    fn keeps_doc_id_in_changed_when_remove_and_create_happen_together() {
        let payload = build_docs_changed_payload(
            "beta",
            &docs_root(),
            &[
                Ok(Event::new(EventKind::Remove(RemoveKind::File))
                    .add_path(doc("design-docs/architecture-overview.md"))),
                Ok(Event::new(EventKind::Create(CreateKind::File))
                    .add_path(doc("design-docs/architecture-overview.md"))),
            ],
        )
        .expect("remove+create should emit payload");

        assert_eq!(payload.project_id, "beta");
        assert_eq!(
            payload.changed_doc_ids,
            vec!["design-docs/architecture-overview.md".to_string()]
        );
        assert!(payload.removed_doc_ids.is_empty());
        assert_eq!(
            payload.kinds,
            vec![DocsChangeKind::Created, DocsChangeKind::Removed]
        );
    }
}
