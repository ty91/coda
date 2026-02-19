import type { DocDocument } from '@coda/core/contracts';
import { useEffect, useRef, type CSSProperties, type ReactElement } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { markdownContentClass, messageTextClass, panelSurfaceClass } from '../ui-classes';

const FIND_MATCH_SELECTOR = 'mark[data-doc-find-match="true"]';
const FIND_MATCH_ACTIVE_CLASS = 'bg-[#f4b944]';
const FIND_MATCH_BASE_CLASS = 'rounded-[2px] bg-[#efe08b] px-[1px] text-inherit';

const clearFindHighlights = (rootElement: HTMLElement): void => {
  const highlightedMatches = rootElement.querySelectorAll<HTMLElement>(FIND_MATCH_SELECTOR);
  highlightedMatches.forEach((highlightedMatch) => {
    const parentElement = highlightedMatch.parentNode;
    if (!parentElement) {
      return;
    }

    const replacementTextNode = document.createTextNode(highlightedMatch.textContent ?? '');
    parentElement.replaceChild(replacementTextNode, highlightedMatch);
    parentElement.normalize();
  });
};

const collectHighlightableTextNodes = (rootElement: HTMLElement): Text[] => {
  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(
    rootElement,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (candidateNode: Node): number => {
        if (!(candidateNode instanceof Text)) {
          return NodeFilter.FILTER_REJECT;
        }

        const parentElement = candidateNode.parentElement;
        if (!parentElement) {
          return NodeFilter.FILTER_REJECT;
        }

        if (parentElement.closest(FIND_MATCH_SELECTOR)) {
          return NodeFilter.FILTER_REJECT;
        }

        if ((candidateNode.nodeValue ?? '').trim().length === 0) {
          return NodeFilter.FILTER_REJECT;
        }

        return NodeFilter.FILTER_ACCEPT;
      },
    },
  );

  while (walker.nextNode()) {
    const currentNode = walker.currentNode;
    if (currentNode instanceof Text) {
      textNodes.push(currentNode);
    }
  }

  return textNodes;
};

const highlightMatches = (rootElement: HTMLElement, query: string): HTMLElement[] => {
  const normalizedQuery = query.toLocaleLowerCase();
  if (normalizedQuery.length === 0) {
    return [];
  }

  const textNodes = collectHighlightableTextNodes(rootElement);
  const highlightedMatches: HTMLElement[] = [];

  textNodes.forEach((textNode) => {
    const originalText = textNode.nodeValue ?? '';
    const normalizedText = originalText.toLocaleLowerCase();
    let nextSearchIndex = normalizedText.indexOf(normalizedQuery);
    if (nextSearchIndex < 0) {
      return;
    }

    const fragment = document.createDocumentFragment();
    let consumedIndex = 0;

    while (nextSearchIndex >= 0) {
      if (nextSearchIndex > consumedIndex) {
        fragment.appendChild(
          document.createTextNode(originalText.slice(consumedIndex, nextSearchIndex)),
        );
      }

      const highlightedMatch = document.createElement('mark');
      highlightedMatch.dataset.docFindMatch = 'true';
      highlightedMatch.className = FIND_MATCH_BASE_CLASS;
      highlightedMatch.textContent = originalText.slice(
        nextSearchIndex,
        nextSearchIndex + query.length,
      );
      fragment.appendChild(highlightedMatch);
      highlightedMatches.push(highlightedMatch);

      consumedIndex = nextSearchIndex + query.length;
      nextSearchIndex = normalizedText.indexOf(normalizedQuery, consumedIndex);
    }

    if (consumedIndex < originalText.length) {
      fragment.appendChild(document.createTextNode(originalText.slice(consumedIndex)));
    }

    textNode.replaceWith(fragment);
  });

  return highlightedMatches;
};

const setActiveMatch = (
  highlightedMatches: HTMLElement[],
  activeMatchIndex: number,
): void => {
  highlightedMatches.forEach((highlightedMatch, matchIndex) => {
    if (matchIndex === activeMatchIndex) {
      highlightedMatch.dataset.docFindMatchActive = 'true';
      highlightedMatch.classList.add(FIND_MATCH_ACTIVE_CLASS);
      highlightedMatch.scrollIntoView?.({ block: 'center', inline: 'nearest' });
    } else {
      highlightedMatch.dataset.docFindMatchActive = 'false';
      highlightedMatch.classList.remove(FIND_MATCH_ACTIVE_CLASS);
    }
  });
};

type DocViewerPanelProps = {
  selectedDoc: DocDocument | null;
  documentLoading: boolean;
  documentError: string | null;
  findOverlayRightOffsetPx: number;
  findOpen: boolean;
  findInputQuery: string;
  findSearchQuery: string;
  findMatchCount: number;
  activeFindMatchIndex: number | null;
  findInputFocusToken: number;
  findNextRequestToken: number;
  findPreviousRequestToken: number;
  onFindQueryChange: (value: string) => void;
  onFindClose: () => void;
  onFindRequestNext: () => void;
  onFindRequestPrevious: () => void;
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
  findOverlayRightOffsetPx,
  findOpen,
  findInputQuery,
  findSearchQuery,
  findMatchCount,
  activeFindMatchIndex,
  findInputFocusToken,
  findNextRequestToken,
  findPreviousRequestToken,
  onFindQueryChange,
  onFindClose,
  onFindRequestNext,
  onFindRequestPrevious,
  onFindMatchCountChange,
  onActiveFindMatchIndexChange,
}: DocViewerPanelProps): ReactElement => {
  const findInputRef = useRef<HTMLInputElement | null>(null);
  const readerArticleRef = useRef<HTMLElement | null>(null);
  const highlightedMatchesRef = useRef<HTMLElement[]>([]);
  const lastHandledNextTokenRef = useRef<number>(0);
  const lastHandledPreviousTokenRef = useRef<number>(0);
  const docMetadataRows = selectedDoc ? metadataRows(selectedDoc) : [];
  const showDocPanelStatus = documentLoading || Boolean(documentError);
  const activeMatchPosition =
    findMatchCount === 0 || activeFindMatchIndex === null ? '0/0' : `${activeFindMatchIndex + 1}/${findMatchCount}`;
  const findNavigationDisabled = findMatchCount === 0;
  const findOverlayStyle = {
    ['--viewer-find-right-offset' as string]: `${findOverlayRightOffsetPx}px`,
  } as CSSProperties;

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
    const readerArticle = readerArticleRef.current;
    if (!readerArticle) {
      return;
    }

    const resetFindState = (): void => {
      clearFindHighlights(readerArticle);
      highlightedMatchesRef.current = [];
      lastHandledNextTokenRef.current = 0;
      lastHandledPreviousTokenRef.current = 0;
      onFindMatchCountChange(0);
      onActiveFindMatchIndexChange(null);
    };

    if (!findOpen || !selectedDoc) {
      resetFindState();
      return;
    }

    if (findSearchQuery.trim().length === 0) {
      resetFindState();
      return;
    }

    clearFindHighlights(readerArticle);
    const highlightedMatches = highlightMatches(readerArticle, findSearchQuery);
    highlightedMatchesRef.current = highlightedMatches;
    onFindMatchCountChange(highlightedMatches.length);

    if (highlightedMatches.length === 0) {
      onActiveFindMatchIndexChange(null);
      return;
    }

    setActiveMatch(highlightedMatches, 0);
    onActiveFindMatchIndexChange(0);
  }, [
    findOpen,
    findSearchQuery,
    onActiveFindMatchIndexChange,
    onFindMatchCountChange,
    selectedDoc,
  ]);

  useEffect(() => {
    if (
      findNextRequestToken === 0 ||
      findNextRequestToken === lastHandledNextTokenRef.current ||
      highlightedMatchesRef.current.length === 0
    ) {
      return;
    }

    lastHandledNextTokenRef.current = findNextRequestToken;
    const currentIndex = activeFindMatchIndex ?? -1;
    const nextIndex =
      (currentIndex + 1 + highlightedMatchesRef.current.length) %
      highlightedMatchesRef.current.length;

    setActiveMatch(highlightedMatchesRef.current, nextIndex);
    onActiveFindMatchIndexChange(nextIndex);
  }, [activeFindMatchIndex, findNextRequestToken, onActiveFindMatchIndexChange]);

  useEffect(() => {
    if (
      findPreviousRequestToken === 0 ||
      findPreviousRequestToken === lastHandledPreviousTokenRef.current ||
      highlightedMatchesRef.current.length === 0
    ) {
      return;
    }

    lastHandledPreviousTokenRef.current = findPreviousRequestToken;
    const currentIndex = activeFindMatchIndex ?? 0;
    const previousIndex =
      (currentIndex - 1 + highlightedMatchesRef.current.length) %
      highlightedMatchesRef.current.length;

    setActiveMatch(highlightedMatchesRef.current, previousIndex);
    onActiveFindMatchIndexChange(previousIndex);
  }, [activeFindMatchIndex, findPreviousRequestToken, onActiveFindMatchIndexChange]);

  return (
    <section
      className={`${panelSurfaceClass} relative grid h-full min-h-0 min-w-0 gap-4 overflow-y-auto px-4 pb-4 pt-11`}
    >
      <div
        className="absolute inset-x-0 top-0 h-11"
        data-tauri-drag-region
        data-testid="viewer-drag-region"
        aria-hidden
      />

      {selectedDoc && findOpen ? (
        <div
          className="fixed top-12 right-[var(--viewer-find-right-offset)] left-auto z-30 grid w-[min(31rem,calc(100%-2rem))] gap-2 rounded-coda-sm border border-coda-line-soft bg-[#f5f5f3] px-3 py-2 shadow-[0_10px_20px_-14px_rgba(0,0,0,0.45)]"
          style={findOverlayStyle}
          data-testid="viewer-find-overlay"
        >
          <label className="text-[0.7rem] font-semibold tracking-[0.02em] text-coda-text-muted" htmlFor="reader-find-input">
            Find In Document
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <input
              id="reader-find-input"
              ref={findInputRef}
              className="min-w-[10.5rem] flex-1 rounded-[0.45rem] border border-coda-line-strong bg-[#fff] px-2 py-[0.35rem] text-[0.88rem] text-coda-text-primary"
              type="text"
              value={findInputQuery}
              onChange={(event) => onFindQueryChange(event.target.value)}
              aria-label="Find in document"
              data-testid="viewer-find-input"
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  if (event.shiftKey) {
                    onFindRequestPrevious();
                  } else {
                    onFindRequestNext();
                  }
                }

                if (event.key === 'Escape') {
                  event.preventDefault();
                  onFindClose();
                }
              }}
            />

            <button
              type="button"
              className="rounded-[0.45rem] border border-coda-line-soft px-2 py-[0.32rem] text-[0.74rem] font-medium text-coda-text-secondary disabled:cursor-not-allowed disabled:opacity-55"
              onClick={onFindRequestPrevious}
              disabled={findNavigationDisabled}
              aria-label="Previous match"
              title="Previous match"
            >
              Prev
            </button>

            <button
              type="button"
              className="rounded-[0.45rem] border border-coda-line-soft px-2 py-[0.32rem] text-[0.74rem] font-medium text-coda-text-secondary disabled:cursor-not-allowed disabled:opacity-55"
              onClick={onFindRequestNext}
              disabled={findNavigationDisabled}
              aria-label="Next match"
              title="Next match"
            >
              Next
            </button>

            <span
              className="min-w-[3rem] text-right font-mono text-[0.74rem] text-coda-text-muted"
              aria-live="polite"
              data-testid="viewer-find-counter"
            >
              {activeMatchPosition}
            </span>

            <button
              type="button"
              className="rounded-[0.45rem] border border-coda-line-soft px-2 py-[0.32rem] text-[0.74rem] font-medium text-coda-text-secondary"
              onClick={onFindClose}
              aria-label="Close find"
              title="Close find"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}

      {showDocPanelStatus ? (
        <div className="grid gap-3">
          {documentLoading ? <p className={messageTextClass}>Loading selected document...</p> : null}
          {documentError ? <p className="text-[0.92rem] text-coda-error">{documentError}</p> : null}
        </div>
      ) : null}

      {!documentLoading && !documentError && selectedDoc ? (
        <div className="min-w-0">
          <article
            ref={readerArticleRef}
            className="mx-auto w-full max-w-[832px] rounded-coda-lg border border-[#d6d6d1] bg-[#fcfcfbf2] px-5 py-5 md:px-8 md:py-8 lg:px-10 lg:py-10"
          >
            <header>
              <h3 className="mb-4 text-[1.55rem] font-semibold tracking-[-0.02em]">{selectedDoc.displayTitle}</h3>
              {docMetadataRows.length > 0 ? (
                <dl className="mb-6 grid gap-2 rounded-coda-md border border-coda-line-soft bg-[#f5f5f3] p-4 text-[0.88rem]">
                  {docMetadataRows.map((row) => (
                    <div key={row.label} className="grid grid-cols-[78px_1fr] items-baseline gap-2">
                      <dt className="text-[0.66rem] font-semibold tracking-[0.02em] text-coda-text-muted">
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
