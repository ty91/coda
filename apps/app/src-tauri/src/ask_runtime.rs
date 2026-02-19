use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::io::{BufRead, BufReader, Error, Write};
use std::os::unix::net::{UnixListener, UnixStream};
use std::path::{Path, PathBuf};
use std::sync::{mpsc, Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter, State};
use time::format_description::well_known::Rfc3339;
use time::{Duration as TimeDuration, OffsetDateTime};

const ASK_SOCKET_FILE_NAME: &str = "ask.sock";
const ASK_SOCKET_PATH_SEGMENTS: [&str; 2] = [".coda", "runtime"];
const ASK_SOCKET_SWEEP_INTERVAL: Duration = Duration::from_secs(5);
const ASK_EXPIRED_RETENTION_WINDOW: TimeDuration = TimeDuration::seconds(30);
const ASK_RESPONSE_SOURCE: &str = "tauri-ui";
pub const ASK_SESSION_CREATED_EVENT: &str = "ask_session_created";

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct AskOption {
    label: String,
    description: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct AskQuestion {
    header: String,
    id: String,
    question: String,
    options: Vec<AskOption>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct AskNote {
    label: String,
    required: bool,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct AskRequestBatch {
    questions: Vec<AskQuestion>,
    note: Option<AskNote>,
}

#[derive(Debug, Clone, Deserialize)]
struct AskSocketRequest {
    #[serde(rename = "type")]
    request_type: String,
    ask_id: String,
    request: AskRequestBatch,
    timeout_ms: u64,
    requested_at_iso: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct AskAnswer {
    id: String,
    selected_label: String,
    selected_index: Option<usize>,
    used_other: bool,
    other_text: Option<String>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
enum AskResponseStatus {
    Answered,
    Cancelled,
    Expired,
}

#[derive(Debug, Clone, Serialize)]
struct AskResponseBatch {
    ask_id: String,
    answers: Vec<AskAnswer>,
    note: Option<String>,
    status: AskResponseStatus,
    answered_at_iso: Option<String>,
    source: String,
}

#[derive(Debug, Clone)]
struct PendingAskSession {
    ask_id: String,
    request: AskRequestBatch,
    requested_at: OffsetDateTime,
    requested_at_iso: String,
    timeout_ms: u64,
    response_sender: mpsc::Sender<AskResponseBatch>,
}

#[derive(Debug, Default)]
struct AskRuntimeInner {
    pending: HashMap<String, PendingAskSession>,
}

#[derive(Clone)]
pub struct AskRuntimeState {
    inner: Arc<Mutex<AskRuntimeInner>>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PendingAskSessionView {
    ask_id: String,
    request: AskRequestBatch,
    requested_at_iso: String,
    timeout_ms: u64,
    expires_at_iso: Option<String>,
    is_expired: bool,
}

#[derive(Debug, Deserialize)]
pub struct SubmitAskResponsePayload {
    ask_id: String,
    answers: Vec<AskAnswer>,
    note: Option<String>,
    status: SubmitAskResponseStatus,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AskSessionCreatedEventPayload {
    ask_id: String,
    requested_at_iso: String,
    first_question_text: Option<String>,
}

#[derive(Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
enum SubmitAskResponseStatus {
    Answered,
    Cancelled,
}

impl AskRuntimeState {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(Mutex::new(AskRuntimeInner::default())),
        }
    }

    fn insert_pending_session(
        &self,
        request: AskSocketRequest,
        response_sender: mpsc::Sender<AskResponseBatch>,
    ) -> Result<AskSessionCreatedEventPayload, String> {
        let now = OffsetDateTime::now_utc();
        let requested_at = parse_requested_at_iso(&request.requested_at_iso).unwrap_or(now);
        let ask_id = request.ask_id;

        let session = PendingAskSession {
            ask_id: ask_id.clone(),
            request: request.request,
            requested_at,
            requested_at_iso: request.requested_at_iso,
            timeout_ms: request.timeout_ms,
            response_sender,
        };

        let mut inner = self
            .inner
            .lock()
            .map_err(|_| "ask runtime state lock poisoned".to_string())?;

        if inner.pending.contains_key(&ask_id) {
            return Err(format!("ask session already exists: {}", ask_id));
        }

        let event_payload = AskSessionCreatedEventPayload {
            ask_id: session.ask_id.clone(),
            requested_at_iso: session.requested_at_iso.clone(),
            first_question_text: session
                .request
                .questions
                .first()
                .map(|question| question.question.clone()),
        };

        inner.pending.insert(ask_id, session);
        Ok(event_payload)
    }

    fn remove_pending_session(&self, ask_id: &str) {
        if let Ok(mut inner) = self.inner.lock() {
            inner.pending.remove(ask_id);
        }
    }

    fn list_pending_sessions(&self) -> Result<Vec<PendingAskSessionView>, String> {
        self.sweep_expired_sessions()?;

        let now = OffsetDateTime::now_utc();
        let mut sessions = {
            let inner = self
                .inner
                .lock()
                .map_err(|_| "ask runtime state lock poisoned".to_string())?;

            inner
                .pending
                .values()
                .map(|session| PendingAskSessionView {
                    ask_id: session.ask_id.clone(),
                    request: session.request.clone(),
                    requested_at_iso: session.requested_at_iso.clone(),
                    timeout_ms: session.timeout_ms,
                    expires_at_iso: session_expiry_iso(session),
                    is_expired: is_session_expired(session, now),
                })
                .collect::<Vec<PendingAskSessionView>>()
        };

        sessions.sort_by(|left, right| left.requested_at_iso.cmp(&right.requested_at_iso));
        Ok(sessions)
    }

    fn submit_response(&self, payload: SubmitAskResponsePayload) -> Result<(), String> {
        let session = {
            let inner = self
                .inner
                .lock()
                .map_err(|_| "ask runtime state lock poisoned".to_string())?;

            inner.pending.get(&payload.ask_id).cloned()
        }
        .ok_or_else(|| format!("ask session not found: {}", payload.ask_id))?;

        let now = OffsetDateTime::now_utc();
        if is_session_expired(&session, now) {
            let removed_session = {
                let mut inner = self
                    .inner
                    .lock()
                    .map_err(|_| "ask runtime state lock poisoned".to_string())?;
                inner.pending.remove(&payload.ask_id)
            };

            if let Some(removed_session) = removed_session {
                let expired_response = build_expired_response(&removed_session.ask_id);
                let _ = removed_session.response_sender.send(expired_response);
            }

            return Err("ask session has expired".to_string());
        }

        let normalized_note = normalize_optional_text(payload.note);
        let response = match payload.status {
            SubmitAskResponseStatus::Answered => {
                let answers = validate_and_normalize_answers(&session, payload.answers)?;
                validate_required_note(&session, normalized_note.as_ref())?;

                AskResponseBatch {
                    ask_id: session.ask_id.clone(),
                    answers,
                    note: normalized_note,
                    status: AskResponseStatus::Answered,
                    answered_at_iso: Some(now_iso_utc()),
                    source: ASK_RESPONSE_SOURCE.to_string(),
                }
            }
            SubmitAskResponseStatus::Cancelled => AskResponseBatch {
                ask_id: session.ask_id.clone(),
                answers: Vec::new(),
                note: normalized_note,
                status: AskResponseStatus::Cancelled,
                answered_at_iso: Some(now_iso_utc()),
                source: ASK_RESPONSE_SOURCE.to_string(),
            },
        };

        let removed_session = {
            let mut inner = self
                .inner
                .lock()
                .map_err(|_| "ask runtime state lock poisoned".to_string())?;
            inner.pending.remove(&payload.ask_id)
        }
        .ok_or_else(|| format!("ask session not found: {}", payload.ask_id))?;

        removed_session
            .response_sender
            .send(response)
            .map_err(|_| "ask requester disconnected before response submission".to_string())
    }

    fn sweep_expired_sessions(&self) -> Result<(), String> {
        let now = OffsetDateTime::now_utc();
        let mut expired_session_ids = Vec::new();
        let mut expired_senders = Vec::new();

        {
            let inner = self
                .inner
                .lock()
                .map_err(|_| "ask runtime state lock poisoned".to_string())?;

            for (ask_id, session) in &inner.pending {
                if !is_session_expired(session, now) {
                    continue;
                }

                let retention_cutoff = session_expiry_time(session)
                    .map(|expiry| now - expiry > ASK_EXPIRED_RETENTION_WINDOW)
                    .unwrap_or(false);

                if retention_cutoff {
                    expired_session_ids.push(ask_id.clone());
                    expired_senders.push((ask_id.clone(), session.response_sender.clone()));
                }
            }
        }

        if expired_session_ids.is_empty() {
            return Ok(());
        }

        {
            let mut inner = self
                .inner
                .lock()
                .map_err(|_| "ask runtime state lock poisoned".to_string())?;

            for ask_id in &expired_session_ids {
                inner.pending.remove(ask_id);
            }
        }

        for (ask_id, sender) in expired_senders {
            let _ = sender.send(build_expired_response(&ask_id));
        }

        Ok(())
    }
}

pub fn start_ask_socket_server(state: AskRuntimeState, app_handle: AppHandle) -> Result<(), Error> {
    let socket_path = resolve_ask_socket_path()?;
    prepare_socket_path(&socket_path)?;

    let listener = UnixListener::bind(&socket_path)?;

    let runtime_state = state.clone();
    thread::Builder::new()
        .name("coda-ask-socket-server".to_string())
        .spawn(move || {
            for stream in listener.incoming() {
                match stream {
                    Ok(stream) => {
                        let per_connection_state = runtime_state.clone();
                        let per_connection_handle = app_handle.clone();
                        thread::spawn(move || {
                            if let Err(error) = handle_socket_connection(
                                stream,
                                per_connection_state,
                                per_connection_handle,
                            ) {
                                log::warn!("ask socket connection failed: {error}");
                            }
                        });
                    }
                    Err(error) => {
                        log::warn!("ask socket listener error: {error}");
                    }
                }
            }
        })?;

    let sweeper_state = state;
    thread::Builder::new()
        .name("coda-ask-socket-sweeper".to_string())
        .spawn(move || loop {
            thread::sleep(ASK_SOCKET_SWEEP_INTERVAL);
            if let Err(error) = sweeper_state.sweep_expired_sessions() {
                log::warn!("ask session sweep failed: {error}");
            }
        })?;

    Ok(())
}

#[tauri::command]
pub fn list_pending_ask_sessions(
    state: State<'_, AskRuntimeState>,
) -> Result<Vec<PendingAskSessionView>, String> {
    state.list_pending_sessions()
}

#[tauri::command]
pub fn submit_ask_response(
    payload: SubmitAskResponsePayload,
    state: State<'_, AskRuntimeState>,
) -> Result<(), String> {
    state.submit_response(payload)
}

fn handle_socket_connection(
    mut stream: UnixStream,
    state: AskRuntimeState,
    app_handle: AppHandle,
) -> Result<(), String> {
    let request = read_socket_request(&stream).map_err(|error| error.to_string())?;
    let ask_id = request.ask_id.clone();
    let (response_sender, response_receiver) = mpsc::channel::<AskResponseBatch>();

    let created_payload = state.insert_pending_session(request, response_sender)?;
    if let Err(error) = emit_ask_session_created_event(&app_handle, &created_payload) {
        log::warn!("{error}");
    }

    let response = response_receiver.recv().map_err(|_| {
        format!(
            "ask session channel closed before response was produced: {}",
            ask_id
        )
    })?;

    let write_result = write_socket_response(&mut stream, &response).map_err(|error| {
        format!(
            "failed to write ask response for session {} to socket: {}",
            ask_id, error
        )
    });

    state.remove_pending_session(&ask_id);
    write_result
}

fn emit_ask_session_created_event(
    app_handle: &AppHandle,
    payload: &AskSessionCreatedEventPayload,
) -> Result<(), String> {
    app_handle
        .emit(ASK_SESSION_CREATED_EVENT, payload)
        .map_err(|error| format!("failed to emit ask session created event: {error}"))
}

fn read_socket_request(stream: &UnixStream) -> Result<AskSocketRequest, Error> {
    let mut reader = BufReader::new(stream.try_clone()?);
    let mut line = String::new();
    let bytes_read = reader.read_line(&mut line)?;

    if bytes_read == 0 {
        return Err(Error::other("empty ask socket payload"));
    }

    let parsed = serde_json::from_str::<AskSocketRequest>(line.trim())
        .map_err(|error| Error::other(format!("failed to parse ask socket payload: {error}")))?;

    validate_socket_request(&parsed)?;
    Ok(parsed)
}

fn validate_socket_request(request: &AskSocketRequest) -> Result<(), Error> {
    if request.request_type != "ask_request" {
        return Err(Error::other("unsupported ask socket request type"));
    }

    if request.ask_id.trim().is_empty() {
        return Err(Error::other("ask_id must not be empty"));
    }

    if request.request.questions.is_empty() {
        return Err(Error::other("questions must contain at least one entry"));
    }

    let mut seen_question_ids = HashSet::new();
    for question in &request.request.questions {
        if question.id.trim().is_empty() {
            return Err(Error::other("question id must not be empty"));
        }

        if !seen_question_ids.insert(question.id.clone()) {
            return Err(Error::other("question ids must be unique per request"));
        }
    }

    Ok(())
}

fn write_socket_response(
    stream: &mut UnixStream,
    response: &AskResponseBatch,
) -> Result<(), Error> {
    let json = serde_json::to_string(response)
        .map_err(|error| Error::other(format!("failed to serialize ask response: {error}")))?;

    stream.write_all(json.as_bytes())?;
    stream.write_all(b"\n")?;
    stream.flush()
}

fn validate_required_note(
    session: &PendingAskSession,
    note: Option<&String>,
) -> Result<(), String> {
    if !session
        .request
        .note
        .as_ref()
        .map(|note_config| note_config.required)
        .unwrap_or(false)
    {
        return Ok(());
    }

    if note.is_none() {
        return Err("note is required for this ask session".to_string());
    }

    Ok(())
}

fn validate_and_normalize_answers(
    session: &PendingAskSession,
    raw_answers: Vec<AskAnswer>,
) -> Result<Vec<AskAnswer>, String> {
    if raw_answers.len() != session.request.questions.len() {
        return Err("answers must contain exactly one entry per question".to_string());
    }

    let mut answers_by_id = HashMap::new();
    for answer in raw_answers {
        if answers_by_id.insert(answer.id.clone(), answer).is_some() {
            return Err("answers contain duplicate question ids".to_string());
        }
    }

    let mut normalized_answers = Vec::with_capacity(session.request.questions.len());

    for question in &session.request.questions {
        let answer = answers_by_id
            .remove(&question.id)
            .ok_or_else(|| format!("answer is missing for question id: {}", question.id))?;

        if answer.used_other {
            if answer.selected_index.is_some() {
                return Err(format!(
                    "selected_index must be null when used_other is true (question: {})",
                    question.id
                ));
            }

            let normalized_other_text =
                normalize_optional_text(answer.other_text).ok_or_else(|| {
                    format!("other_text is required for question id: {}", question.id)
                })?;

            normalized_answers.push(AskAnswer {
                id: question.id.clone(),
                selected_label: "Other".to_string(),
                selected_index: None,
                used_other: true,
                other_text: Some(normalized_other_text),
            });
            continue;
        }

        if answer.other_text.is_some() {
            return Err(format!(
                "other_text must be null when used_other is false (question: {})",
                question.id
            ));
        }

        let selected_index = answer.selected_index.ok_or_else(|| {
            format!(
                "selected_index is required for question id: {}",
                question.id
            )
        })?;

        let selected_option = question.options.get(selected_index).ok_or_else(|| {
            format!(
                "selected_index {} is out of range for question id: {}",
                selected_index, question.id
            )
        })?;

        normalized_answers.push(AskAnswer {
            id: question.id.clone(),
            selected_label: selected_option.label.clone(),
            selected_index: Some(selected_index),
            used_other: false,
            other_text: None,
        });
    }

    Ok(normalized_answers)
}

fn normalize_optional_text(raw_value: Option<String>) -> Option<String> {
    raw_value
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

fn parse_requested_at_iso(raw_requested_at: &str) -> Option<OffsetDateTime> {
    OffsetDateTime::parse(raw_requested_at, &Rfc3339).ok()
}

fn session_timeout_duration(timeout_ms: u64) -> Option<TimeDuration> {
    if timeout_ms == 0 {
        return None;
    }

    let timeout_i64 = i64::try_from(timeout_ms).unwrap_or(i64::MAX);
    Some(TimeDuration::milliseconds(timeout_i64))
}

fn session_expiry_time(session: &PendingAskSession) -> Option<OffsetDateTime> {
    session_timeout_duration(session.timeout_ms).map(|timeout| session.requested_at + timeout)
}

fn session_expiry_iso(session: &PendingAskSession) -> Option<String> {
    session_expiry_time(session).map(format_iso_utc)
}

fn is_session_expired(session: &PendingAskSession, now: OffsetDateTime) -> bool {
    session_expiry_time(session)
        .map(|expiry| now >= expiry)
        .unwrap_or(false)
}

fn build_expired_response(ask_id: &str) -> AskResponseBatch {
    AskResponseBatch {
        ask_id: ask_id.to_string(),
        answers: Vec::new(),
        note: None,
        status: AskResponseStatus::Expired,
        answered_at_iso: None,
        source: ASK_RESPONSE_SOURCE.to_string(),
    }
}

fn now_iso_utc() -> String {
    format_iso_utc(OffsetDateTime::now_utc())
}

fn format_iso_utc(value: OffsetDateTime) -> String {
    value
        .format(&Rfc3339)
        .unwrap_or_else(|_| "1970-01-01T00:00:00Z".to_string())
}

fn resolve_ask_socket_path() -> Result<PathBuf, Error> {
    let home = std::env::var_os("HOME").ok_or_else(|| Error::other("failed to resolve HOME"))?;
    let base_path = ASK_SOCKET_PATH_SEGMENTS
        .iter()
        .fold(PathBuf::from(home), |current, segment| {
            current.join(segment)
        });

    Ok(base_path.join(ASK_SOCKET_FILE_NAME))
}

fn prepare_socket_path(socket_path: &Path) -> Result<(), Error> {
    if let Some(parent) = socket_path.parent() {
        fs::create_dir_all(parent)?;
    }

    if socket_path.exists() {
        fs::remove_file(socket_path)?;
    }

    Ok(())
}

#[cfg(test)]
#[path = "ask_runtime_tests.rs"]
mod tests;
