export type CompoundCommand = 'plan' | 'work' | 'review' | 'compound' | 'status';

export type AgentReadiness = 'ready' | 'degraded';

export type PlanId = string;

export type PlanMetadata = {
  id: PlanId;
  fileName: string;
  relativePath: string;
  title: string;
  date: string;
  status: string;
  tags: string[];
  milestone: string | null;
};

export type PlanSummary = PlanMetadata;

export type PlanDocument = PlanMetadata & {
  markdownBody: string;
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
