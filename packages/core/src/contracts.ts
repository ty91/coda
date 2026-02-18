export type CompoundCommand = 'plan' | 'work' | 'review' | 'compound' | 'status';

export type AgentReadiness = 'ready' | 'degraded';

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
