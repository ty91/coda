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
  const docMetadataRows = selectedDoc ? metadataRows(selectedDoc) : [];

  return (
    <section className={`${panelSurfaceClass} grid min-w-0 gap-4 px-4 pb-4 pt-11 max-[980px]:pt-4`}>
      <header className={headerRowClass}>
        <div>
          <p className={eyebrowClass}>Document</p>
          <h2 className="mt-1 text-[1.02rem] font-semibold tracking-[-0.01em]">Reader</h2>
        </div>
      </header>

      <div className="grid gap-3">
        <p className={`${messageTextClass} rounded-coda-sm border border-dashed border-coda-line-strong bg-[#fafaf8] px-3 py-[0.65rem]`}>
          {annotationNote}
        </p>

        {documentLoading ? <p className={messageTextClass}>Loading selected document...</p> : null}
        {documentError ? <p className="text-[0.92rem] text-coda-error">{documentError}</p> : null}
        {!documentLoading && !documentError && !selectedDoc ? (
          <p className={messageTextClass}>Select a document from the sidebar to start reading.</p>
        ) : null}
      </div>

      {!documentLoading && !documentError && selectedDoc ? (
        <div className="min-w-0">
          <article className="mx-auto w-full max-w-[832px] rounded-coda-lg border border-[#d6d6d1] bg-[#fcfcfbf2] px-5 py-5 md:px-8 md:py-8 lg:px-10 lg:py-10">
            <header>
              <h3 className="mb-4 text-[1.55rem] font-semibold tracking-[-0.02em]">{selectedDoc.displayTitle}</h3>
              {docMetadataRows.length > 0 ? (
                <dl className="mb-6 grid gap-2 rounded-coda-md border border-coda-line-soft bg-[#f5f5f3] p-4 text-[0.88rem]">
                  {docMetadataRows.map((row) => (
                    <div key={row.label} className="grid grid-cols-[78px_1fr] items-baseline gap-2">
                      <dt className="text-[0.66rem] font-semibold tracking-[0.11em] text-coda-text-muted uppercase">
                        {row.label}
                      </dt>
                      <dd className="text-[0.88rem] leading-[1.5] text-coda-text-primary">
                        {row.label === 'Path' ? <code className="font-mono text-[0.82rem]">{row.value}</code> : row.value}
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
        </div>
      ) : null}
    </section>
  );
};
