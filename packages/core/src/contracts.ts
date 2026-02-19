export type CompoundCommand = 'plan' | 'work' | 'review' | 'compound' | 'status';

export type AgentReadiness = 'ready' | 'degraded';

export type DocId = string;
export type ProjectId = string;

export type ProjectSummary = {
  projectId: ProjectId;
  displayName: string;
  rootPath: string;
  docsPath: string;
  hasLocalOverride: boolean;
};

export type DocMetadata = {
  id: DocId;
  fileName: string;
  docPath: string;
  relativePath: string;
  section: string;
  title: string | null;
  displayTitle: string;
  date: string | null;
  status: string | null;
  tags: string[];
  milestone: string | null;
  isTemplate: boolean;
  isHidden: boolean;
};

export type DocSummary = DocMetadata;

export type DocDocument = DocMetadata & {
  markdownBody: string;
};

export const DOCS_CHANGED_EVENT = 'docs_changed';

export type DocsChangeKind = 'modified' | 'created' | 'removed' | 'renamed' | 'other';

export type DocsChangedEventPayload = {
  projectId: ProjectId;
  changedDocIds: DocId[];
  removedDocIds: DocId[];
  kinds: DocsChangeKind[];
  emittedAtIso: string;
};

export type ListDocsOptions = {
  includeHidden: boolean;
};

export type StatusSnapshot = {
  projectName: string;
  milestone: string;
  readiness: AgentReadiness;
  checkedAtIso: string;
};

export const ASK_RESPONSE_SOURCE = 'tauri-ui';
export const ASK_SESSION_CREATED_EVENT = 'ask_session_created';

export type AskSessionCreatedEventPayload = {
  askId: string;
  requestedAtIso: string;
  firstQuestionText: string | null;
};

export type AskOption = {
  label: string;
  description: string;
};

export type AskQuestion = {
  header: string;
  id: string;
  question: string;
  options: AskOption[];
};

export type AskNote = {
  label: string;
  required: boolean;
};

export type AskRequestBatch = {
  questions: AskQuestion[];
  note?: AskNote | undefined;
};

export type AskResponseStatus = 'answered' | 'cancelled' | 'expired';

export type AskAnswer = {
  id: string;
  selected_label: string;
  selected_index: number | null;
  used_other: boolean;
  other_text: string | null;
};

export type AskResponseBatch = {
  ask_id: string;
  answers: AskAnswer[];
  note: string | null;
  status: AskResponseStatus;
  answered_at_iso: string | null;
  source: typeof ASK_RESPONSE_SOURCE;
};

export const SCAFFOLD_STATUS: StatusSnapshot = {
  projectName: 'coda',
  milestone: 'm1-scaffold',
  readiness: 'ready',
  checkedAtIso: '2026-02-18T00:00:00.000Z',
};
