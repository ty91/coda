use super::{
    AskAnswer, AskNote, AskOption, AskQuestion, AskRequestBatch, AskRuntimeState, AskSocketRequest,
    AskResponseStatus, SubmitAskResponsePayload, SubmitAskResponseStatus,
};
use std::sync::mpsc;
use std::time::Duration;
use time::format_description::well_known::Rfc3339;
use time::{Duration as TimeDuration, OffsetDateTime};

fn build_request(timeout_ms: u64, requested_at_iso: &str, require_note: bool) -> AskSocketRequest {
    AskSocketRequest {
        request_type: "ask_request".to_string(),
        ask_id: "ask-test-1".to_string(),
        request: AskRequestBatch {
            questions: vec![AskQuestion {
                header: "Scope".to_string(),
                id: "scope_choice".to_string(),
                question: "Choose scope".to_string(),
                options: vec![
                    AskOption {
                        label: "Ship now (Recommended)".to_string(),
                        description: "Fast path".to_string(),
                    },
                    AskOption {
                        label: "Expand".to_string(),
                        description: "Broader path".to_string(),
                    },
                ],
            }],
            note: Some(AskNote {
                label: "Reason".to_string(),
                required: require_note,
            }),
        },
        timeout_ms,
        requested_at_iso: requested_at_iso.to_string(),
    }
}

#[test]
fn submits_answered_response_and_normalizes_payload() {
    let state = AskRuntimeState::new();
    let (sender, receiver) = mpsc::channel();

    state
        .insert_pending_session(build_request(0, "2026-02-19T00:00:00Z", true), sender)
        .expect("session should be inserted");

    state
        .submit_response(SubmitAskResponsePayload {
            ask_id: "ask-test-1".to_string(),
            answers: vec![AskAnswer {
                id: "scope_choice".to_string(),
                selected_label: "ignored by backend".to_string(),
                selected_index: Some(1),
                used_other: false,
                other_text: None,
            }],
            note: Some("  because impact is low  ".to_string()),
            status: SubmitAskResponseStatus::Answered,
        })
        .expect("valid response should be accepted");

    let response = receiver
        .recv_timeout(Duration::from_millis(200))
        .expect("response should be sent to socket waiter");

    assert_eq!(response.status, AskResponseStatus::Answered);
    assert_eq!(response.note.as_deref(), Some("because impact is low"));
    assert_eq!(response.answers.len(), 1);
    assert_eq!(response.answers[0].selected_label, "Expand");
}

#[test]
fn keeps_session_pending_when_payload_validation_fails() {
    let state = AskRuntimeState::new();
    let (sender, _receiver) = mpsc::channel();

    state
        .insert_pending_session(build_request(0, "2026-02-19T00:00:00Z", false), sender)
        .expect("session should be inserted");

    let result = state.submit_response(SubmitAskResponsePayload {
        ask_id: "ask-test-1".to_string(),
        answers: Vec::new(),
        note: None,
        status: SubmitAskResponseStatus::Answered,
    });

    assert!(result.is_err());

    let pending = state
        .list_pending_sessions()
        .expect("pending asks should still be listed after invalid payload");
    assert_eq!(pending.len(), 1);
}

#[test]
fn marks_pending_session_as_expired_when_timeout_has_passed() {
    let state = AskRuntimeState::new();
    let (sender, _receiver) = mpsc::channel();
    let requested_at_iso = (OffsetDateTime::now_utc() - TimeDuration::seconds(1))
        .format(&Rfc3339)
        .expect("recent timestamp should format");

    state
        .insert_pending_session(build_request(1, &requested_at_iso, false), sender)
        .expect("session should be inserted");

    let pending = state
        .list_pending_sessions()
        .expect("pending asks should be listed");

    assert_eq!(pending.len(), 1);
    assert!(pending[0].is_expired);
}

#[test]
fn rejects_submission_when_session_is_expired_and_emits_expired_response() {
    let state = AskRuntimeState::new();
    let (sender, receiver) = mpsc::channel();

    state
        .insert_pending_session(build_request(1, "2000-01-01T00:00:00Z", false), sender)
        .expect("session should be inserted");

    let result = state.submit_response(SubmitAskResponsePayload {
        ask_id: "ask-test-1".to_string(),
        answers: Vec::new(),
        note: None,
        status: SubmitAskResponseStatus::Cancelled,
    });

    assert!(result.is_err());

    let response = receiver
        .recv_timeout(Duration::from_millis(200))
        .expect("expired response should be forwarded");

    assert_eq!(response.status, AskResponseStatus::Expired);
}
