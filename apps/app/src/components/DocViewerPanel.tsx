import type { DocDocument } from '@coda/core/contracts';
import type { ReactElement } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { eyebrowClass, headerRowClass, markdownContentClass, messageTextClass, panelSurfaceClass } from '../ui-classes';

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
    <section className={`${panelSurfaceClass} grid min-w-0 gap-3 p-4`}>
      <header className={headerRowClass}>
        <div>
          <p className={eyebrowClass}>Document</p>
          <h2 className="mt-1 text-[1.02rem] font-semibold tracking-[-0.01em]">Reader</h2>
        </div>
      </header>
      <p className={`${messageTextClass} rounded-coda-sm border border-dashed border-coda-line-strong bg-[#fafaf8] px-3 py-[0.65rem]`}>
        {annotationNote}
      </p>

      {documentLoading ? <p className={messageTextClass}>Loading selected document...</p> : null}
      {documentError ? <p className="text-[0.92rem] text-coda-error">{documentError}</p> : null}
      {!documentLoading && !documentError && !selectedDoc ? (
        <p className={messageTextClass}>Select a document from the sidebar to start reading.</p>
      ) : null}

      {!documentLoading && !documentError && selectedDoc ? (
        <article className="rounded-coda-md border border-coda-line-soft bg-[#fcfcfb] p-4">
          <header>
            <h3 className="mb-3 text-[1.28rem] font-semibold tracking-[-0.015em]">{selectedDoc.displayTitle}</h3>
            {metadataRows(selectedDoc).length > 0 ? (
              <dl className="mt-1 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-[0.55rem]">
                {metadataRows(selectedDoc).map((row) => (
                  <div key={row.label} className="rounded-coda-sm border border-coda-line-soft bg-coda-surface-strong px-[0.55rem] py-[0.45rem]">
                    <dt className="text-[0.68rem] font-normal tracking-[0.11em] text-coda-text-muted uppercase">
                      {row.label}
                    </dt>
                    <dd className="mt-1 text-[0.88rem] leading-[1.45] text-coda-text-primary">
                      {row.label === 'Path' ? <code className="font-mono text-[0.88rem]">{row.value}</code> : row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </header>

          <div className={markdownContentClass}>
            <Markdown remarkPlugins={[remarkGfm]}>{selectedDoc.markdownBody}</Markdown>
          </div>
        </article>
      ) : null}
    </section>
  );
};
