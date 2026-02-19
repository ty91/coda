import type { DocDocument } from '@coda/core/contracts';
import { useEffect, useRef, type ReactElement } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { eyebrowClass, headerRowClass, markdownContentClass, messageTextClass, panelSurfaceClass } from '../ui-classes';

type DocViewerPanelProps = {
  selectedDoc: DocDocument | null;
  documentLoading: boolean;
  documentError: string | null;
  annotationNote: string;
  findOpen: boolean;
  findQuery: string;
  findMatchCount: number;
  activeFindMatchIndex: number | null;
  findInputFocusToken: number;
  onFindQueryChange: (value: string) => void;
  onFindClose: () => void;
  onFindMatchCountChange: (value: number) => void;
  onActiveFindMatchIndexChange: (value: number | null) => void;
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
  findOpen,
  findQuery,
  findMatchCount,
  activeFindMatchIndex,
  findInputFocusToken,
  onFindQueryChange,
  onFindClose,
  onFindMatchCountChange,
  onActiveFindMatchIndexChange,
}: DocViewerPanelProps): ReactElement => {
  const findInputRef = useRef<HTMLInputElement | null>(null);
  const docMetadataRows = selectedDoc ? metadataRows(selectedDoc) : [];
  const showDocPanelStatus = documentLoading || Boolean(documentError) || Boolean(selectedDoc);

  useEffect(() => {
    if (!findOpen) {
      return;
    }

    const findInput = findInputRef.current;
    if (!findInput) {
      return;
    }

    findInput.focus();
    findInput.select();
  }, [findInputFocusToken, findOpen]);

  useEffect(() => {
    if (!findOpen || !selectedDoc || findQuery.trim().length > 0) {
      return;
    }

    onFindMatchCountChange(0);
    onActiveFindMatchIndexChange(null);
  }, [
    findOpen,
    findQuery,
    onActiveFindMatchIndexChange,
    onFindMatchCountChange,
    selectedDoc,
  ]);

  return (
    <section
      className={`${panelSurfaceClass} relative grid min-w-0 gap-4 px-4 pb-4 pt-11 max-[980px]:pt-4`}
    >
      <div
        className="absolute inset-x-0 top-0 h-11 max-[980px]:hidden"
        data-tauri-drag-region
        data-testid="viewer-drag-region"
        aria-hidden
      />
      <header className={headerRowClass}>
        <div>
          <p className={eyebrowClass}>Document</p>
          <h2 className="mt-1 text-[1.02rem] font-semibold tracking-[-0.01em]">Reader</h2>
        </div>
      </header>

      {selectedDoc && findOpen ? (
        <div className="flex items-center gap-2 rounded-coda-sm border border-coda-line-soft bg-[#f5f5f3] px-3 py-2">
          <label
            className="text-[0.7rem] font-semibold tracking-[0.1em] text-coda-text-muted uppercase"
            htmlFor="reader-find-input"
          >
            Find
          </label>
          <input
            id="reader-find-input"
            ref={findInputRef}
            className="min-w-0 flex-1 rounded-[0.45rem] border border-coda-line-strong bg-[#fff] px-2 py-[0.35rem] text-[0.88rem] text-coda-text-primary"
            type="text"
            value={findQuery}
            onChange={(event) => onFindQueryChange(event.target.value)}
            aria-label="Find in document"
            data-testid="viewer-find-input"
          />
          <button
            type="button"
            className="rounded-[0.45rem] border border-coda-line-soft px-2 py-[0.32rem] text-[0.72rem] font-medium text-coda-text-secondary"
            onClick={onFindClose}
            aria-label="Close find"
          >
            Close
          </button>
          <span className="min-w-[3rem] text-right text-[0.74rem] text-coda-text-muted" aria-live="polite">
            {findMatchCount === 0 || activeFindMatchIndex === null ? '0/0' : `${activeFindMatchIndex + 1}/${findMatchCount}`}
          </span>
        </div>
      ) : null}

      {showDocPanelStatus ? (
        <div className="grid gap-3">
          {selectedDoc ? (
            <p className={`${messageTextClass} rounded-coda-sm border border-dashed border-coda-line-strong bg-[#fafaf8] px-3 py-[0.65rem]`}>
              {annotationNote}
            </p>
          ) : null}

          {documentLoading ? <p className={messageTextClass}>Loading selected document...</p> : null}
          {documentError ? <p className="text-[0.92rem] text-coda-error">{documentError}</p> : null}
        </div>
      ) : null}

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
