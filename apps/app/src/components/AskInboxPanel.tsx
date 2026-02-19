import type { AskQuestion, AskRequestBatch } from '@coda/core/contracts';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { useCallback, useEffect, useState, type ReactElement } from 'react';

const ASK_POLL_INTERVAL_MS = 1000;

const OTHER_OPTION_LABEL = 'Other';

type PendingAskSession = {
  askId: string;
  request: AskRequestBatch;
  requestedAtIso: string;
  timeoutMs: number;
  expiresAtIso: string | null;
  isExpired: boolean;
};

type AskAnswerPayload = {
  id: string;
  selected_label: string;
  selected_index: number | null;
  used_other: boolean;
  other_text: string | null;
};

type SubmitAskPayload = {
  ask_id: string;
  answers: AskAnswerPayload[];
  note: string | null;
  status: 'answered' | 'cancelled';
};

type AnswerDraft = {
  selectedIndex: number | null;
  selectedLabel: string | null;
  usedOther: boolean;
  otherText: string;
};

type AskDraftsState = Record<string, Record<string, AnswerDraft>>;
type AskNotesState = Record<string, string>;

type AskErrorsState = Record<string, string | null>;
type AskSubmittingState = Record<string, boolean>;

const createEmptyAnswerDraft = (): AnswerDraft => {
  return {
    selectedIndex: null,
    selectedLabel: null,
    usedOther: false,
    otherText: '',
  };
};

const normalizeNote = (rawValue: string | undefined): string | null => {
  if (!rawValue) {
    return null;
  }

  const trimmed = rawValue.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const hasValidAnswer = (question: AskQuestion, draft: AnswerDraft | undefined): boolean => {
  if (!draft) {
    return false;
  }

  if (draft.usedOther) {
    return draft.otherText.trim().length > 0;
  }

  if (draft.selectedIndex === null) {
    return false;
  }

  return draft.selectedIndex >= 0 && draft.selectedIndex < question.options.length;
};

const buildAnswerPayload = (question: AskQuestion, draft: AnswerDraft): AskAnswerPayload => {
  if (draft.usedOther) {
    return {
      id: question.id,
      selected_label: OTHER_OPTION_LABEL,
      selected_index: null,
      used_other: true,
      other_text: draft.otherText.trim(),
    };
  }

  const selectedIndex = draft.selectedIndex;
  const selectedOption = selectedIndex !== null ? question.options[selectedIndex] : null;

  return {
    id: question.id,
    selected_label: selectedOption?.label ?? '',
    selected_index: selectedIndex,
    used_other: false,
    other_text: null,
  };
};

const syncDraftState = (
  currentDrafts: AskDraftsState,
  sessions: PendingAskSession[]
): AskDraftsState => {
  const nextDrafts: AskDraftsState = {};

  for (const session of sessions) {
    const existingDrafts = currentDrafts[session.askId] ?? {};
    const nextQuestionDrafts: Record<string, AnswerDraft> = {};

    for (const question of session.request.questions) {
      nextQuestionDrafts[question.id] = existingDrafts[question.id] ?? createEmptyAnswerDraft();
    }

    nextDrafts[session.askId] = nextQuestionDrafts;
  }

  return nextDrafts;
};

const syncNoteState = (currentNotes: AskNotesState, sessions: PendingAskSession[]): AskNotesState => {
  const nextNotes: AskNotesState = {};

  for (const session of sessions) {
    nextNotes[session.askId] = currentNotes[session.askId] ?? '';
  }

  return nextNotes;
};

const formatExpiryText = (expiresAtIso: string | null): string => {
  if (!expiresAtIso) {
    return 'No timeout';
  }

  const parsed = new Date(expiresAtIso);
  if (Number.isNaN(parsed.getTime())) {
    return 'Timeout configured';
  }

  return `Expires at ${parsed.toLocaleTimeString()}`;
};

export const AskInboxPanel = (): ReactElement | null => {
  const [sessions, setSessions] = useState<PendingAskSession[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draftsByAsk, setDraftsByAsk] = useState<AskDraftsState>({});
  const [notesByAsk, setNotesByAsk] = useState<AskNotesState>({});
  const [submitErrorByAsk, setSubmitErrorByAsk] = useState<AskErrorsState>({});
  const [submittingByAsk, setSubmittingByAsk] = useState<AskSubmittingState>({});

  const loadPendingAsks = useCallback(async (): Promise<void> => {
    try {
      const pending = await invoke<PendingAskSession[]>('list_pending_ask_sessions');
      setSessions(pending);
      setLoadError(null);
      setDraftsByAsk((current) => syncDraftState(current, pending));
      setNotesByAsk((current) => syncNoteState(current, pending));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setLoadError(`Unable to load ask queue: ${message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isTauri()) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const load = async (): Promise<void> => {
      if (cancelled) {
        return;
      }
      await loadPendingAsks();
    };

    void load();
    const timer = window.setInterval(() => {
      void load();
    }, ASK_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [loadPendingAsks]);

  const setQuestionDraft = useCallback(
    (askId: string, questionId: string, updater: (draft: AnswerDraft) => AnswerDraft): void => {
      setDraftsByAsk((current) => {
        const askDrafts = current[askId] ?? {};
        const currentDraft = askDrafts[questionId] ?? createEmptyAnswerDraft();

        return {
          ...current,
          [askId]: {
            ...askDrafts,
            [questionId]: updater(currentDraft),
          },
        };
      });
    },
    []
  );

  const setSubmissionError = useCallback((askId: string, value: string | null): void => {
    setSubmitErrorByAsk((current) => ({
      ...current,
      [askId]: value,
    }));
  }, []);

  const setSubmitting = useCallback((askId: string, value: boolean): void => {
    setSubmittingByAsk((current) => ({
      ...current,
      [askId]: value,
    }));
  }, []);

  const submitAskResponse = useCallback(
    async (payload: SubmitAskPayload): Promise<void> => {
      await invoke('submit_ask_response', { payload });
      await loadPendingAsks();
    },
    [loadPendingAsks]
  );

  const handleSubmit = useCallback(
    async (session: PendingAskSession): Promise<void> => {
      if (session.isExpired) {
        return;
      }

      const askDrafts = draftsByAsk[session.askId] ?? {};
      const note = normalizeNote(notesByAsk[session.askId]);

      const isMissingAnswer = session.request.questions.some((question) => {
        return !hasValidAnswer(question, askDrafts[question.id]);
      });

      if (isMissingAnswer) {
        setSubmissionError(session.askId, 'Please answer every question before submitting.');
        return;
      }

      if (session.request.note?.required && note === null) {
        setSubmissionError(session.askId, 'Note is required before submitting this ask.');
        return;
      }

      const answers = session.request.questions.map((question) => {
        const draft = askDrafts[question.id] ?? createEmptyAnswerDraft();
        return buildAnswerPayload(question, draft);
      });

      setSubmitting(session.askId, true);
      setSubmissionError(session.askId, null);

      try {
        await submitAskResponse({
          ask_id: session.askId,
          answers,
          note,
          status: 'answered',
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        setSubmissionError(session.askId, `Submit failed: ${message}`);
      } finally {
        setSubmitting(session.askId, false);
      }
    },
    [draftsByAsk, notesByAsk, setSubmissionError, setSubmitting, submitAskResponse]
  );

  const handleCancel = useCallback(
    async (session: PendingAskSession): Promise<void> => {
      if (session.isExpired) {
        return;
      }

      setSubmitting(session.askId, true);
      setSubmissionError(session.askId, null);

      try {
        await submitAskResponse({
          ask_id: session.askId,
          answers: [],
          note: normalizeNote(notesByAsk[session.askId]),
          status: 'cancelled',
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        setSubmissionError(session.askId, `Cancel failed: ${message}`);
      } finally {
        setSubmitting(session.askId, false);
      }
    },
    [notesByAsk, setSubmissionError, setSubmitting, submitAskResponse]
  );

  if (!isTauri()) {
    return null;
  }

  return (
    <section className="rounded-coda-xl border border-coda-line-soft bg-white/84 p-4 shadow-sm">
      <header className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-[-0.01em] text-coda-text-primary">Ask Queue</h2>
        <span className="text-xs text-coda-text-secondary">{sessions.length} pending</span>
      </header>

      {loading && sessions.length === 0 && (
        <p className="text-xs text-coda-text-secondary">Checking pending asks...</p>
      )}

      {loadError && <p className="text-xs text-red-700">{loadError}</p>}

      {!loading && sessions.length === 0 && !loadError && (
        <p className="text-xs text-coda-text-secondary">No pending asks.</p>
      )}

      <div className="space-y-3">
        {sessions.map((session) => {
          const askDrafts = draftsByAsk[session.askId] ?? {};
          const note = notesByAsk[session.askId] ?? '';
          const isSubmitting = submittingByAsk[session.askId] ?? false;
          const submitError = submitErrorByAsk[session.askId];
          const isDisabled = isSubmitting || session.isExpired;

          return (
            <article
              key={session.askId}
              className="rounded-coda-lg border border-coda-line-soft bg-[#f8f8f5] p-3"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="font-mono text-xs text-coda-text-secondary">{session.askId}</p>
                <p className="text-xs text-coda-text-secondary">{formatExpiryText(session.expiresAtIso)}</p>
              </div>

              {session.isExpired && (
                <p className="mb-2 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-700">
                  This ask has expired. Submit and cancel are disabled.
                </p>
              )}

              <div className="space-y-4">
                {session.request.questions.map((question) => {
                  const draft = askDrafts[question.id] ?? createEmptyAnswerDraft();
                  const radioName = `${session.askId}-${question.id}`;

                  return (
                    <fieldset key={question.id} className="space-y-2">
                      <legend className="text-xs font-semibold text-coda-text-primary">
                        {question.header}: {question.question}
                      </legend>

                      <div className="space-y-1.5">
                        {question.options.map((option, optionIndex) => {
                          const optionId = `${radioName}-option-${optionIndex}`;
                          return (
                            <label key={optionId} htmlFor={optionId} className="flex items-start gap-2">
                              <input
                                id={optionId}
                                type="radio"
                                name={radioName}
                                checked={!draft.usedOther && draft.selectedIndex === optionIndex}
                                disabled={isDisabled}
                                onChange={() => {
                                  setQuestionDraft(session.askId, question.id, () => ({
                                    selectedIndex: optionIndex,
                                    selectedLabel: option.label,
                                    usedOther: false,
                                    otherText: '',
                                  }));
                                }}
                              />
                              <span className="text-xs text-coda-text-primary">
                                <strong className="font-medium">{option.label}</strong>
                                <span className="block text-coda-text-secondary">{option.description}</span>
                              </span>
                            </label>
                          );
                        })}

                        <label className="flex items-start gap-2">
                          <input
                            type="radio"
                            name={radioName}
                            checked={draft.usedOther}
                            disabled={isDisabled}
                            onChange={() => {
                              setQuestionDraft(session.askId, question.id, (current) => ({
                                ...current,
                                selectedIndex: null,
                                selectedLabel: OTHER_OPTION_LABEL,
                                usedOther: true,
                              }));
                            }}
                          />
                          <span className="text-xs text-coda-text-primary">Other</span>
                        </label>

                        {draft.usedOther && (
                          <textarea
                            value={draft.otherText}
                            disabled={isDisabled}
                            onChange={(event) => {
                              const nextValue = event.target.value;
                              setQuestionDraft(session.askId, question.id, (current) => ({
                                ...current,
                                otherText: nextValue,
                              }));
                            }}
                            className="min-h-[64px] w-full rounded border border-coda-line-soft bg-white px-2 py-1 text-xs text-coda-text-primary"
                            placeholder="Provide a custom answer"
                          />
                        )}
                      </div>
                    </fieldset>
                  );
                })}
              </div>

              {session.request.note && (
                <div className="mt-3 space-y-1">
                  <label className="text-xs font-medium text-coda-text-primary" htmlFor={`note-${session.askId}`}>
                    {session.request.note.label}
                    {session.request.note.required ? ' (required)' : ''}
                  </label>
                  <textarea
                    id={`note-${session.askId}`}
                    value={note}
                    disabled={isDisabled}
                    onChange={(event) => {
                      const value = event.target.value;
                      setNotesByAsk((current) => ({
                        ...current,
                        [session.askId]: value,
                      }));
                    }}
                    className="min-h-[72px] w-full rounded border border-coda-line-soft bg-white px-2 py-1 text-xs text-coda-text-primary"
                    placeholder="Add optional context"
                  />
                </div>
              )}

              {submitError && <p className="mt-2 text-xs text-red-700">{submitError}</p>}

              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={isDisabled}
                  onClick={() => {
                    void handleCancel(session);
                  }}
                  className="rounded border border-coda-line-soft px-3 py-1 text-xs text-coda-text-secondary disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDisabled}
                  onClick={() => {
                    void handleSubmit(session);
                  }}
                  className="rounded bg-coda-text-primary px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                >
                  Submit
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
