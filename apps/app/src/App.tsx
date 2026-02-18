import {
  SCAFFOLD_STATUS,
  type DocDocument,
  type DocId,
  type DocSummary,
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

const metadataValue = (value: string | null): string => value ?? '';

const metadataRows = (doc: DocDocument): Array<{ label: string; value: string }> => {
  const rows = [
    { label: 'Section', value: doc.section },
    { label: 'Path', value: doc.relativePath },
    { label: 'Status', value: metadataValue(doc.status) },
    { label: 'Date', value: metadataValue(doc.date) },
    { label: 'Milestone', value: metadataValue(doc.milestone) },
    { label: 'Tags', value: doc.tags.join(', ') },
  ];

  return rows.filter((row) => row.value.trim().length > 0);
};

const optionLabel = (summary: DocSummary): string => {
  return `${summary.displayTitle} (${summary.docPath})`;
};

export const App = (): ReactElement => {
  const [healthMessage, setHealthMessage] = useState<string>('Idle');
  const [healthLoading, setHealthLoading] = useState<boolean>(false);

  const [docSummaries, setDocSummaries] = useState<DocSummary[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<DocId | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<DocDocument | null>(null);
  const [includeHidden, setIncludeHidden] = useState<boolean>(false);

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

  const loadDocSummaries = useCallback(async (): Promise<void> => {
    setListLoading(true);
    setListError(null);

    try {
      const summaries = await invoke<DocSummary[]>('list_doc_summaries', {
        includeHidden,
      });
      setDocSummaries(summaries);

      setSelectedDocId((currentId) => {
        if (currentId && summaries.some((summary) => summary.id === currentId)) {
          return currentId;
        }

        return summaries[0]?.id ?? null;
      });

      if (summaries.length === 0) {
        setSelectedDoc(null);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setDocSummaries([]);
      setSelectedDocId(null);
      setSelectedDoc(null);
      setListError(`Unable to load docs: ${message}`);
    } finally {
      setListLoading(false);
    }
  }, [includeHidden]);

  const loadDocDocument = useCallback(async (docId: DocId): Promise<void> => {
    setDocumentLoading(true);
    setDocumentError(null);

    try {
      const document = await invoke<DocDocument>('get_doc_document', { docId });
      setSelectedDoc(document);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setSelectedDoc(null);
      setDocumentError(`Unable to load selected document: ${message}`);
    } finally {
      setDocumentLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDocSummaries();
  }, [loadDocSummaries]);

  useEffect(() => {
    if (!selectedDocId) {
      setSelectedDoc(null);
      setDocumentError(null);
      return;
    }

    void loadDocDocument(selectedDocId);
  }, [loadDocDocument, selectedDocId]);

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

      <section className="panel docs-viewer">
        <div className="docs-viewer-header">
          <h2>Docs Viewer</h2>
          <button type="button" onClick={() => void loadDocSummaries()} disabled={listLoading}>
            {listLoading ? 'Refreshing...' : 'Refresh Docs'}
          </button>
        </div>
        <p className="annotation-note">{ANNOTATION_TODO_NOTE}</p>

        <label className="toggle-row" htmlFor="include-hidden-toggle">
          <input
            id="include-hidden-toggle"
            type="checkbox"
            checked={includeHidden}
            onChange={(event) => setIncludeHidden(event.target.checked)}
          />
          <span>Show hidden/template docs</span>
        </label>

        {listLoading ? <p>Loading markdown docs from `docs/`...</p> : null}
        {listError ? <p className="error-text">{listError}</p> : null}

        {!listLoading && !listError && docSummaries.length === 0 ? (
          <p>
            {includeHidden
              ? 'No markdown docs found in `docs/`.'
              : 'No visible markdown docs found in `docs/`. Enable hidden/template filter to include `.template.md` files.'}
          </p>
        ) : null}

        {!listLoading && !listError && docSummaries.length > 0 ? (
          <>
            <label className="doc-selector" htmlFor="doc-select">
              <span>Document</span>
              <select
                id="doc-select"
                value={selectedDocId ?? ''}
                onChange={(event) => setSelectedDocId(event.target.value)}
              >
                {docSummaries.map((summary) => (
                  <option key={summary.id} value={summary.id}>
                    {optionLabel(summary)}
                  </option>
                ))}
              </select>
            </label>

            {documentLoading ? <p>Loading selected document...</p> : null}
            {documentError ? <p className="error-text">{documentError}</p> : null}

            {!documentLoading && !documentError && selectedDoc ? (
              <article className="doc-document">
                <header>
                  <h3>{selectedDoc.displayTitle}</h3>
                  {metadataRows(selectedDoc).length > 0 ? (
                    <dl className="doc-metadata">
                      {metadataRows(selectedDoc).map((row) => (
                        <div key={row.label}>
                          <dt>{row.label}</dt>
                          <dd>
                            {row.label === 'Path' ? <code>{row.value}</code> : row.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                </header>

                <div className="markdown-content">
                  <Markdown remarkPlugins={[remarkGfm]}>{selectedDoc.markdownBody}</Markdown>
                </div>
              </article>
            ) : null}
          </>
        ) : null}
      </section>
    </main>
  );
};
