import type { DocDocument } from '@coda/core/contracts';
import type { ReactElement } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type DocViewerPanelProps = {
  selectedDoc: DocDocument | null;
  documentLoading: boolean;
  documentError: string | null;
  annotationNote: string;
};

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

export const DocViewerPanel = ({
  selectedDoc,
  documentLoading,
  documentError,
  annotationNote,
}: DocViewerPanelProps): ReactElement => {
  return (
    <section className="doc-viewer panel-surface">
      <header className="doc-viewer-header">
        <div>
          <p className="eyebrow">Document</p>
          <h2>Reader</h2>
        </div>
      </header>
      <p className="annotation-note">{annotationNote}</p>

      {documentLoading ? <p className="panel-message">Loading selected document...</p> : null}
      {documentError ? <p className="error-text">{documentError}</p> : null}
      {!documentLoading && !documentError && !selectedDoc ? (
        <p className="panel-message">Select a document from the sidebar to start reading.</p>
      ) : null}

      {!documentLoading && !documentError && selectedDoc ? (
        <article className="doc-document">
          <header>
            <h3>{selectedDoc.displayTitle}</h3>
            {metadataRows(selectedDoc).length > 0 ? (
              <dl className="doc-metadata">
                {metadataRows(selectedDoc).map((row) => (
                  <div key={row.label}>
                    <dt>{row.label}</dt>
                    <dd>{row.label === 'Path' ? <code>{row.value}</code> : row.value}</dd>
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
    </section>
  );
};
