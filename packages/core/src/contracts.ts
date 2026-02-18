export type CompoundCommand = 'plan' | 'work' | 'review' | 'compound' | 'status';

export type AgentReadiness = 'ready' | 'degraded';

export type DocId = string;

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

export type ListDocsOptions = {
  includeHidden: boolean;
};

export type StatusSnapshot = {
  projectName: string;
  milestone: string;
  readiness: AgentReadiness;
  checkedAtIso: string;
};

export const SCAFFOLD_STATUS: StatusSnapshot = {
  projectName: 'coda',
  milestone: 'm1-scaffold',
  readiness: 'ready',
  checkedAtIso: '2026-02-18T00:00:00.000Z',
};
