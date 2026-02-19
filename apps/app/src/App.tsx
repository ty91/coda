import {
  DOCS_CHANGED_EVENT,
  type DocDocument,
  type DocId,
  type DocSummary,
  type DocsChangedEventPayload,
} from '@coda/core/contracts';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';

import { DocViewerPanel } from './components/DocViewerPanel';
import { DocsSidebar } from './components/DocsSidebar';
import { AskInboxPanel } from './components/AskInboxPanel';
import {
  allTreeNodeKeys,
  ancestorKeysForDoc,
  buildTreeSections,
} from './docs-tree';
const FIND_QUERY_DEBOUNCE_MS = 150;
const DEFAULT_FIND_OVERLAY_RIGHT_OFFSET_PX = 16;
const ASK_FLOATING_PANEL_WIDTH_PX = 360;
const ASK_FLOATING_PANEL_RIGHT_OFFSET_PX = 16;
const FIND_OVERLAY_PANEL_GAP_PX = 16;

const isEditableEventTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  if (target instanceof HTMLTextAreaElement) {
    return !target.disabled && !target.readOnly;
  }

  if (target instanceof HTMLInputElement) {
    const editableTypes = new Set(['text', 'search', 'url', 'tel', 'email', 'password', 'number']);
    return editableTypes.has(target.type) && !target.disabled && !target.readOnly;
  }

  return false;
};

const areSameSet = (left: Set<string>, right: Set<string>): boolean => {
  if (left.size !== right.size) {
    return false;
  }

  for (const value of left) {
    if (!right.has(value)) {
      return false;
    }
  }

  return true;
};

type LoadDocDocumentOptions = {
  preserveView: boolean;
};

export const App = (): ReactElement => {
  const [docSummaries, setDocSummaries] = useState<DocSummary[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<DocId | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<DocDocument | null>(null);
  const [expandedNodeKeys, setExpandedNodeKeys] = useState<Set<string>>(new Set<string>());
  const selectedDocIdRef = useRef<DocId | null>(null);
  const listRefreshInFlightRef = useRef<Promise<DocSummary[]> | null>(null);
  const listRefreshQueuedRef = useRef<boolean>(false);

  const [listLoading, setListLoading] = useState<boolean>(true);
  const [listError, setListError] = useState<string | null>(null);
  const [documentLoading, setDocumentLoading] = useState<boolean>(false);
  const [documentError, setDocumentError] = useState<string | null>(null);

  const [findOpen, setFindOpen] = useState<boolean>(false);
  const [findInputQuery, setFindInputQuery] = useState<string>('');
  const [findSearchQuery, setFindSearchQuery] = useState<string>('');
  const [findMatchCount, setFindMatchCount] = useState<number>(0);
  const [activeFindMatchIndex, setActiveFindMatchIndex] = useState<number | null>(null);
  const [findInputFocusToken, setFindInputFocusToken] = useState<number>(0);
  const [findNextRequestToken, setFindNextRequestToken] = useState<number>(0);
  const [findPreviousRequestToken, setFindPreviousRequestToken] = useState<number>(0);
  const [pendingAskCount, setPendingAskCount] = useState<number>(0);

  const hasPendingAsks = pendingAskCount > 0;
  const findOverlayRightOffsetPx = hasPendingAsks
    ? ASK_FLOATING_PANEL_WIDTH_PX + ASK_FLOATING_PANEL_RIGHT_OFFSET_PX + FIND_OVERLAY_PANEL_GAP_PX
    : DEFAULT_FIND_OVERLAY_RIGHT_OFFSET_PX;

  const treeSections = useMemo(() => buildTreeSections(docSummaries), [docSummaries]);
  const treeNodeKeys = useMemo(() => allTreeNodeKeys(treeSections), [treeSections]);

  const loadDocSummaries = useCallback(async (): Promise<DocSummary[]> => {
    setListLoading(true);
    setListError(null);

    try {
      const summaries = await invoke<DocSummary[]>('list_doc_summaries');
      setDocSummaries(summaries);

      setSelectedDocId((currentId) => {
        if (currentId && summaries.some((summary) => summary.id === currentId)) {
          return currentId;
        }

        return null;
      });

      if (summaries.length === 0) {
        setSelectedDoc(null);
      }
      return summaries;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setDocSummaries([]);
      setSelectedDocId(null);
      setSelectedDoc(null);
      setListError(`Unable to load docs: ${message}`);
      return [];
    } finally {
      setListLoading(false);
    }
  }, []);

  const loadDocSummariesQueued = useCallback(async (): Promise<DocSummary[]> => {
    if (listRefreshInFlightRef.current) {
      listRefreshQueuedRef.current = true;
      return listRefreshInFlightRef.current;
    }

    const refreshPromise = (async (): Promise<DocSummary[]> => {
      let latestSummaries: DocSummary[] = [];

      do {
        listRefreshQueuedRef.current = false;
        latestSummaries = await loadDocSummaries();
      } while (listRefreshQueuedRef.current);

      return latestSummaries;
    })();

    listRefreshInFlightRef.current = refreshPromise;

    try {
      return await refreshPromise;
    } finally {
      if (listRefreshInFlightRef.current === refreshPromise) {
        listRefreshInFlightRef.current = null;
      }
    }
  }, [loadDocSummaries]);

  const loadDocDocument = useCallback(
    async (
      docId: DocId,
      options: LoadDocDocumentOptions = { preserveView: false }
    ): Promise<void> => {
      if (!options.preserveView) {
        setDocumentLoading(true);
      }

      setDocumentError(null);

      try {
        const document = await invoke<DocDocument>('get_doc_document', { docId });
        setSelectedDoc(document);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        if (!options.preserveView) {
          setSelectedDoc(null);
        }
        setDocumentError(`Unable to load selected document: ${message}`);
      } finally {
        if (!options.preserveView) {
          setDocumentLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    void loadDocSummariesQueued();
  }, [loadDocSummariesQueued]);

  useEffect(() => {
    selectedDocIdRef.current = selectedDocId;
  }, [selectedDocId]);

  const handleDocsChangedEvent = useCallback(
    async (payload: DocsChangedEventPayload): Promise<void> => {
      const selectedBeforeRefresh = selectedDocIdRef.current;
      const latestSummaries = await loadDocSummariesQueued();

      if (!selectedBeforeRefresh || selectedDocIdRef.current !== selectedBeforeRefresh) {
        return;
      }

      const selectedStillExists = latestSummaries.some(
        (summary) => summary.id === selectedBeforeRefresh
      );

      if (!selectedStillExists && payload.removedDocIds.includes(selectedBeforeRefresh)) {
        setSelectedDoc(null);
        setDocumentError(null);
        return;
      }

      if (selectedStillExists && payload.changedDocIds.includes(selectedBeforeRefresh)) {
        await loadDocDocument(selectedBeforeRefresh, { preserveView: true });
      }
    },
    [loadDocDocument, loadDocSummariesQueued]
  );

  useEffect(() => {
    if (!isTauri()) {
      return;
    }

    let unlisten: (() => void) | null = null;
    let cleanupRequested = false;

    const subscribeDocsChanged = async (): Promise<void> => {
      try {
        unlisten = await listen<DocsChangedEventPayload>(
          DOCS_CHANGED_EVENT,
          (event): void => {
            void handleDocsChangedEvent(event.payload);
          }
        );

        if (cleanupRequested && unlisten) {
          unlisten();
          unlisten = null;
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        setListError(`Unable to subscribe to docs watcher: ${message}`);
      }
    };

    void subscribeDocsChanged();

    return () => {
      cleanupRequested = true;
      if (unlisten) {
        unlisten();
      }
    };
  }, [handleDocsChangedEvent]);

  useEffect(() => {
    if (!selectedDocId) {
      setSelectedDoc(null);
      setDocumentError(null);
      return;
    }

    void loadDocDocument(selectedDocId);
  }, [loadDocDocument, selectedDocId]);

  useEffect(() => {
    setExpandedNodeKeys((current) => {
      const next = new Set<string>();

      for (const key of current) {
        if (treeNodeKeys.has(key)) {
          next.add(key);
        }
      }

      return areSameSet(current, next) ? current : next;
    });
  }, [treeNodeKeys]);

  useEffect(() => {
    if (!selectedDocId) {
      return;
    }

    const ancestorKeys = ancestorKeysForDoc(docSummaries, selectedDocId);
    if (ancestorKeys.length === 0) {
      return;
    }

    setExpandedNodeKeys((current) => {
      const next = new Set(current);
      let changed = false;

      for (const key of ancestorKeys) {
        if (!next.has(key)) {
          next.add(key);
          changed = true;
        }
      }

      return changed ? next : current;
    });
  }, [docSummaries, selectedDocId]);

  useEffect(() => {
    setFindOpen(false);
    setFindInputQuery('');
    setFindSearchQuery('');
    setFindMatchCount(0);
    setActiveFindMatchIndex(null);
    setFindNextRequestToken(0);
    setFindPreviousRequestToken(0);
  }, [selectedDocId]);

  useEffect(() => {
    if (!findOpen || !selectedDocId) {
      setFindSearchQuery('');
      return;
    }

    const debounceTimer = window.setTimeout(() => {
      setFindSearchQuery(findInputQuery);
    }, FIND_QUERY_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(debounceTimer);
    };
  }, [findInputQuery, findOpen, selectedDocId]);

  const openFind = useCallback((): void => {
    setFindOpen(true);
    setFindInputFocusToken((current) => current + 1);
  }, []);

  const requestFindNext = useCallback((): void => {
    if (findInputQuery.trim().length === 0) {
      return;
    }

    if (findSearchQuery !== findInputQuery) {
      setFindSearchQuery(findInputQuery);
      return;
    }

    setFindNextRequestToken((current) => current + 1);
  }, [findInputQuery, findSearchQuery]);

  const requestFindPrevious = useCallback((): void => {
    if (findInputQuery.trim().length === 0) {
      return;
    }

    if (findSearchQuery !== findInputQuery) {
      setFindSearchQuery(findInputQuery);
      return;
    }

    setFindPreviousRequestToken((current) => current + 1);
  }, [findInputQuery, findSearchQuery]);

  const closeFind = useCallback((): void => {
    setFindOpen(false);
    setFindInputQuery('');
    setFindSearchQuery('');
    setFindMatchCount(0);
    setActiveFindMatchIndex(null);
    setFindNextRequestToken(0);
    setFindPreviousRequestToken(0);
  }, []);

  useEffect(() => {
    const onWindowKeyDown = (event: KeyboardEvent): void => {
      const isFindShortcut =
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        !event.shiftKey &&
        event.key.toLowerCase() === 'f';
      const canOpenFind = Boolean(selectedDocId) && !documentLoading && !documentError;

      if (!isFindShortcut || !canOpenFind || isEditableEventTarget(event.target)) {
        if (!findOpen) {
          return;
        }
      } else {
        event.preventDefault();
        openFind();
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        closeFind();
        return;
      }

      if (event.key === 'Enter' && findInputQuery.trim().length > 0) {
        event.preventDefault();
        if (event.shiftKey) {
          requestFindPrevious();
        } else {
          requestFindNext();
        }
      }
    };

    window.addEventListener('keydown', onWindowKeyDown);
    return () => {
      window.removeEventListener('keydown', onWindowKeyDown);
    };
  }, [
    closeFind,
    documentError,
    documentLoading,
    findOpen,
    findInputQuery,
    openFind,
    requestFindNext,
    requestFindPrevious,
    selectedDocId,
  ]);

  const onToggleNode = useCallback((nodeKey: string): void => {
    setExpandedNodeKeys((current) => {
      const next = new Set(current);
      if (next.has(nodeKey)) {
        next.delete(nodeKey);
      } else {
        next.add(nodeKey);
      }
      return next;
    });
  }, []);

  return (
    <main className="grid h-screen grid-cols-[minmax(250px,292px)_minmax(0,1fr)] items-stretch gap-3 overflow-hidden pl-3 pr-0 pb-0 pt-0 animate-[shell-enter_200ms_ease-out]">
      <DocsSidebar
        summaries={docSummaries}
        treeSections={treeSections}
        selectedDocId={selectedDocId}
        expandedNodeKeys={expandedNodeKeys}
        listLoading={listLoading}
        listError={listError}
        onToggleNode={onToggleNode}
        onSelectDoc={setSelectedDocId}
      />

      <section className="grid min-h-0 min-w-0">
        <DocViewerPanel
          selectedDoc={selectedDoc}
          documentLoading={documentLoading}
          documentError={documentError}
          findOverlayRightOffsetPx={findOverlayRightOffsetPx}
          findOpen={findOpen}
          findInputQuery={findInputQuery}
          findSearchQuery={findSearchQuery}
          findMatchCount={findMatchCount}
          activeFindMatchIndex={activeFindMatchIndex}
          findInputFocusToken={findInputFocusToken}
          findNextRequestToken={findNextRequestToken}
          findPreviousRequestToken={findPreviousRequestToken}
          onFindQueryChange={setFindInputQuery}
          onFindClose={closeFind}
          onFindRequestNext={requestFindNext}
          onFindRequestPrevious={requestFindPrevious}
          onFindMatchCountChange={setFindMatchCount}
          onActiveFindMatchIndexChange={setActiveFindMatchIndex}
        />
      </section>

      <AskInboxPanel
        className="fixed right-4 top-12 z-40 max-h-[calc(100vh-3.5rem)] w-[22.5rem] overflow-auto"
        onPendingCountChange={setPendingAskCount}
      />
    </main>
  );
};
