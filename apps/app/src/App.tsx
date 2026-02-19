import {
  DOCS_CHANGED_EVENT,
  type DocDocument,
  type DocId,
  type DocSummary,
  type DocsChangedEventPayload,
} from '@coda/core/contracts';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';

import { DocViewerPanel } from './components/DocViewerPanel';
import { DocsSidebar } from './components/DocsSidebar';
import {
  allTreeNodeKeys,
  ancestorKeysForDoc,
  buildTreeSections,
} from './docs-tree';
const ANNOTATION_TODO_NOTE =
  'TODO(M2): Add inline annotation + section approval controls per ux-specification section 2.2.';

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
  const [findQuery, setFindQuery] = useState<string>('');
  const [findMatchCount, setFindMatchCount] = useState<number>(0);
  const [activeFindMatchIndex, setActiveFindMatchIndex] = useState<number | null>(null);
  const [findInputFocusToken, setFindInputFocusToken] = useState<number>(0);

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
        await loadDocDocument(selectedBeforeRefresh);
      }
    },
    [loadDocDocument, loadDocSummariesQueued]
  );

  useEffect(() => {
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
    setFindQuery('');
    setFindMatchCount(0);
    setActiveFindMatchIndex(null);
  }, [selectedDocId]);

  const openFind = useCallback((): void => {
    setFindOpen(true);
    setFindInputFocusToken((current) => current + 1);
  }, []);

  const closeFind = useCallback((): void => {
    setFindOpen(false);
    setFindQuery('');
    setFindMatchCount(0);
    setActiveFindMatchIndex(null);
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
        return;
      }

      event.preventDefault();
      openFind();
    };

    window.addEventListener('keydown', onWindowKeyDown);
    return () => {
      window.removeEventListener('keydown', onWindowKeyDown);
    };
  }, [documentError, documentLoading, openFind, selectedDocId]);

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
    <main className="grid min-h-screen grid-cols-[minmax(250px,292px)_minmax(0,1fr)] items-start gap-3 px-3 pb-3 pt-0 animate-[shell-enter_200ms_ease-out] max-[980px]:grid-cols-1 max-[980px]:p-2">
      <DocsSidebar
        summaries={docSummaries}
        treeSections={treeSections}
        selectedDocId={selectedDocId}
        expandedNodeKeys={expandedNodeKeys}
        listLoading={listLoading}
        listError={listError}
        onRefresh={async (): Promise<void> => {
          await loadDocSummariesQueued();
        }}
        onToggleNode={onToggleNode}
        onSelectDoc={setSelectedDocId}
      />

      <section className="grid min-w-0 gap-3">
        <DocViewerPanel
          selectedDoc={selectedDoc}
          documentLoading={documentLoading}
          documentError={documentError}
          annotationNote={ANNOTATION_TODO_NOTE}
          findOpen={findOpen}
          findQuery={findQuery}
          findMatchCount={findMatchCount}
          activeFindMatchIndex={activeFindMatchIndex}
          findInputFocusToken={findInputFocusToken}
          onFindQueryChange={setFindQuery}
          onFindClose={closeFind}
          onFindMatchCountChange={setFindMatchCount}
          onActiveFindMatchIndexChange={setActiveFindMatchIndex}
        />
      </section>
    </main>
  );
};
