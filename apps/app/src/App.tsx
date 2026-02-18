import {
  SCAFFOLD_STATUS,
  type PlanDocument,
  type PlanId,
  type PlanSummary,
} from '@coda/core/contracts';
import { invoke } from '@tauri-apps/api/core';
import { useCallback, useEffect, useState, type ReactElement } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type HealthResponse = {
  message: string;
};

const APP_TITLE = 'Coda Mission Control';
const ANNOTATION_TODO_NOTE =
  'TODO(M2): Add inline annotation + section approval controls per ux-specification section 2.2.';

export const App = (): ReactElement => {
  const [healthMessage, setHealthMessage] = useState<string>('Idle');
  const [healthLoading, setHealthLoading] = useState<boolean>(false);

  const [planSummaries, setPlanSummaries] = useState<PlanSummary[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanDocument | null>(null);

  const [listLoading, setListLoading] = useState<boolean>(true);
  const [listError, setListError] = useState<string | null>(null);
  const [documentLoading, setDocumentLoading] = useState<boolean>(false);
  const [documentError, setDocumentError] = useState<string | null>(null);

  const runHealthCheck = async (): Promise<void> => {
    setHealthLoading(true);
    try {
      const response = await invoke<HealthResponse>('get_health_message', {
        projectName: SCAFFOLD_STATUS.projectName,
      });
      setHealthMessage(response.message);
    } finally {
      setHealthLoading(false);
    }
  };

  const loadPlanSummaries = useCallback(async (): Promise<void> => {
    setListLoading(true);
    setListError(null);

    try {
      const summaries = await invoke<PlanSummary[]>('list_plan_summaries');
      setPlanSummaries(summaries);

      setSelectedPlanId((currentId) => {
        if (currentId && summaries.some((summary) => summary.id === currentId)) {
          return currentId;
        }

        return summaries[0]?.id ?? null;
      });

      if (summaries.length === 0) {
        setSelectedPlan(null);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setPlanSummaries([]);
      setSelectedPlanId(null);
      setSelectedPlan(null);
      setListError(`Unable to load plans: ${message}`);
    } finally {
      setListLoading(false);
    }
  }, []);

  const loadPlanDocument = useCallback(async (planId: PlanId): Promise<void> => {
    setDocumentLoading(true);
    setDocumentError(null);

    try {
      const document = await invoke<PlanDocument>('get_plan_document', { planId });
      setSelectedPlan(document);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setSelectedPlan(null);
      setDocumentError(`Unable to load selected plan: ${message}`);
    } finally {
      setDocumentLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlanSummaries();
  }, [loadPlanSummaries]);

  useEffect(() => {
    if (!selectedPlanId) {
      setSelectedPlan(null);
      setDocumentError(null);
      return;
    }

    void loadPlanDocument(selectedPlanId);
  }, [loadPlanDocument, selectedPlanId]);

  return (
    <main className="layout">
      <header className="panel">
        <p className="kicker">Milestone 1 Scaffold</p>
        <h1>{APP_TITLE}</h1>
        <p>Roundtrip status for app shell + Rust command bridge.</p>
      </header>

      <section className="panel">
        <h2>Health Check</h2>
        <p>{healthMessage}</p>
        <button type="button" onClick={() => void runHealthCheck()} disabled={healthLoading}>
          {healthLoading ? 'Checking...' : 'Run Tauri Command'}
        </button>
      </section>

      <section className="panel plan-viewer">
        <div className="plan-viewer-header">
          <h2>Plan Viewer</h2>
          <button type="button" onClick={() => void loadPlanSummaries()} disabled={listLoading}>
            {listLoading ? 'Refreshing...' : 'Refresh Plans'}
          </button>
        </div>
        <p className="annotation-note">{ANNOTATION_TODO_NOTE}</p>

        {listLoading ? <p>Loading plans from `docs/plans/active`...</p> : null}
        {listError ? <p className="error-text">{listError}</p> : null}

        {!listLoading && !listError && planSummaries.length === 0 ? (
          <p>No plan files found in `docs/plans/active`.</p>
        ) : null}

        {!listLoading && !listError && planSummaries.length > 0 ? (
          <>
            <label className="plan-selector" htmlFor="plan-select">
              <span>Plan file</span>
              <select
                id="plan-select"
                value={selectedPlanId ?? ''}
                onChange={(event) => setSelectedPlanId(event.target.value)}
              >
                {planSummaries.map((summary) => (
                  <option key={summary.id} value={summary.id}>
                    {summary.fileName}
                  </option>
                ))}
              </select>
            </label>

            {documentLoading ? <p>Loading selected plan...</p> : null}
            {documentError ? <p className="error-text">{documentError}</p> : null}

            {!documentLoading && !documentError && selectedPlan ? (
              <article className="plan-document">
                <header>
                  <h3>{selectedPlan.title}</h3>
                  <dl className="plan-metadata">
                    <div>
                      <dt>Status</dt>
                      <dd>{selectedPlan.status}</dd>
                    </div>
                    <div>
                      <dt>Date</dt>
                      <dd>{selectedPlan.date}</dd>
                    </div>
                    <div>
                      <dt>Milestone</dt>
                      <dd>{selectedPlan.milestone ?? 'Unspecified'}</dd>
                    </div>
                    <div>
                      <dt>Tags</dt>
                      <dd>{selectedPlan.tags.length > 0 ? selectedPlan.tags.join(', ') : 'None'}</dd>
                    </div>
                    <div>
                      <dt>Path</dt>
                      <dd>
                        <code>{selectedPlan.relativePath}</code>
                      </dd>
                    </div>
                  </dl>
                </header>

                <div className="markdown-content">
                  <Markdown remarkPlugins={[remarkGfm]}>{selectedPlan.markdownBody}</Markdown>
                </div>
              </article>
            ) : null}
          </>
        ) : null}
      </section>
    </main>
  );
};
