import {
  DOCS_CHANGED_EVENT,
  type DocDocument,
  type DocId,
  type DocSummary,
  type DocsChangedEventPayload,
  type ProjectId,
  type ProjectSummary,
} from '@coda/core/contracts';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { open as openDirectoryDialog } from '@tauri-apps/plugin-dialog';
import { MessageCircleQuestionMark, PanelLeft } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
} from 'react';

import { AskInboxPanel } from './components/AskInboxPanel';
import { ChatPanel, type ChatPanelMessage } from './components/ChatPanel';
import { DocViewerPanel } from './components/DocViewerPanel';
import { DocsSidebar } from './components/DocsSidebar';
import { ProjectsSidebar, type ProjectAddActionState } from './components/ProjectsSidebar';
import { allTreeNodeKeys, ancestorKeysForDoc, buildTreeSections } from './docs-tree';
import { useAskNotifications } from './useAskNotifications';

const FIND_QUERY_DEBOUNCE_MS = 150;
const DEFAULT_FIND_OVERLAY_RIGHT_OFFSET_PX = 16;
const ASK_FLOATING_PANEL_WIDTH_PX = 360;
const ASK_FLOATING_PANEL_RIGHT_OFFSET_PX = 16;
const FIND_OVERLAY_PANEL_GAP_PX = 16;
const DOC_CHAT_PANEL_WIDTH_PX = 320;
const ASK_SIDEBAR_PANEL_ID = 'app-ask-sidebar-panel';
const PROJECT_SIDEBAR_PANEL_ID = 'app-project-sidebar-panel';
const DOC_CHAT_PANEL_ID = 'app-doc-chat-panel';
const ASK_SIDEBAR_PANEL_CLASS_NAME =
  'fixed right-4 top-12 z-40 max-h-[calc(100vh-3.5rem)] w-[22.5rem] overflow-auto';

type LoadDocDocumentOptions = {
  preserveView: boolean;
};

type ProjectViewStateCache = {
  selectedDocId: DocId | null;
  expandedNodeKeys: string[];
};

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
  useAskNotifications();

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [activeProject, setActiveProject] = useState<ProjectSummary | null>(null);
  const [projectLoading, setProjectLoading] = useState<boolean>(true);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [isProjectSidebarOpen, setIsProjectSidebarOpen] = useState<boolean>(true);
  const [projectAddActionState, setProjectAddActionState] = useState<ProjectAddActionState>('idle');

  const [docSummaries, setDocSummaries] = useState<DocSummary[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<DocId | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<DocDocument | null>(null);
  const [expandedNodeKeys, setExpandedNodeKeys] = useState<Set<string>>(new Set<string>());

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
  const [isAskPanelOpen, setIsAskPanelOpen] = useState<boolean>(false);

  const activeProjectId = activeProject?.projectId ?? null;
  const selectedDocIdRef = useRef<DocId | null>(null);
  const activeProjectIdRef = useRef<ProjectId | null>(null);
  const pendingAskCountRef = useRef<number>(0);
  const listRefreshInFlightRef = useRef<Promise<DocSummary[]> | null>(null);
  const listRefreshQueuedRef = useRef<boolean>(false);
  const projectViewStateCacheRef = useRef<Record<string, ProjectViewStateCache>>({});

  const treeSections = useMemo(() => buildTreeSections(docSummaries), [docSummaries]);
  const treeNodeKeys = useMemo(() => allTreeNodeKeys(treeSections), [treeSections]);

  const isAskPanelVisible = isAskPanelOpen;
  const askPanelToggleLabel = isAskPanelOpen ? 'Close ask panel' : 'Open ask panel';
  const projectSidebarToggleLabel = isProjectSidebarOpen
    ? 'Hide projects sidebar'
    : 'Show projects sidebar';
  const askPanelAriaLabel = 'Ask sidebar';

  const findOverlayRightOffsetPx = isAskPanelVisible
    ? ASK_FLOATING_PANEL_WIDTH_PX + ASK_FLOATING_PANEL_RIGHT_OFFSET_PX + FIND_OVERLAY_PANEL_GAP_PX
    : DEFAULT_FIND_OVERLAY_RIGHT_OFFSET_PX;
  const docsContentLayoutStyle = {
    ['--doc-chat-panel-width' as string]: `${DOC_CHAT_PANEL_WIDTH_PX}px`,
  } as CSSProperties;
  const mockChatMessages = useMemo<ChatPanelMessage[]>(() => {
    if (!selectedDoc) {
      return [];
    }

    return [
      {
        id: `${selectedDoc.id}-assistant-context`,
        role: 'assistant',
        author: 'Coda',
        body: `Loaded "${selectedDoc.displayTitle}". Ask actions stay disabled in this milestone UI.`,
        timestampLabel: 'context',
      },
      {
        id: `${selectedDoc.id}-user-preview`,
        role: 'user',
        author: 'You',
        body: 'Summarize decisions and open risks from this document.',
        timestampLabel: 'draft',
      },
    ];
  }, [selectedDoc]);

  const shellClassName = isProjectSidebarOpen
    ? 'grid h-screen grid-cols-[minmax(176px,220px)_minmax(250px,292px)_minmax(0,1fr)] items-stretch gap-3 overflow-hidden pl-3 pr-0 pb-0 pt-0 animate-[shell-enter_200ms_ease-out]'
    : 'grid h-screen grid-cols-[minmax(250px,292px)_minmax(0,1fr)] items-stretch gap-3 overflow-hidden pl-3 pr-0 pb-0 pt-0 animate-[shell-enter_200ms_ease-out]';

  const snapshotCurrentProjectViewState = useCallback(
    (projectId: ProjectId | null = activeProjectId): void => {
      if (!projectId) {
        return;
      }

      projectViewStateCacheRef.current[projectId] = {
        selectedDocId,
        expandedNodeKeys: [...expandedNodeKeys],
      };
    },
    [activeProjectId, expandedNodeKeys, selectedDocId]
  );

  const loadProjectRegistry = useCallback(async (): Promise<void> => {
    setProjectLoading(true);
    setProjectError(null);

    try {
      const [projectList, active] = await Promise.all([
        invoke<ProjectSummary[]>('list_projects'),
        invoke<ProjectSummary>('get_active_project'),
      ]);

      setProjects(projectList);
      setActiveProject(active);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setProjects([]);
      setActiveProject(null);
      setProjectError(`Unable to load projects: ${message}`);
      setDocSummaries([]);
      setSelectedDocId(null);
      setSelectedDoc(null);
      setListError(null);
    } finally {
      setProjectLoading(false);
    }
  }, []);

  const loadDocSummaries = useCallback(async (projectId: ProjectId): Promise<DocSummary[]> => {
    if (activeProjectIdRef.current === projectId) {
      setListLoading(true);
      setListError(null);
    }

    try {
      const summaries = await invoke<DocSummary[]>('list_doc_summaries');

      if (activeProjectIdRef.current !== projectId) {
        return summaries;
      }

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
      if (activeProjectIdRef.current !== projectId) {
        return [];
      }

      setDocSummaries([]);
      setSelectedDocId(null);
      setSelectedDoc(null);
      setListError(`Unable to load docs: ${message}`);
      return [];
    } finally {
      if (activeProjectIdRef.current === projectId) {
        setListLoading(false);
      }
    }
  }, []);

  const loadDocSummariesQueued = useCallback(async (): Promise<DocSummary[]> => {
    const projectId = activeProjectIdRef.current;
    if (!projectId) {
      return [];
    }

    if (listRefreshInFlightRef.current) {
      listRefreshQueuedRef.current = true;
      return listRefreshInFlightRef.current;
    }

    const refreshPromise = (async (): Promise<DocSummary[]> => {
      let latestSummaries: DocSummary[] = [];

      do {
        listRefreshQueuedRef.current = false;
        latestSummaries = await loadDocSummaries(projectId);
      } while (listRefreshQueuedRef.current && activeProjectIdRef.current === projectId);

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
      const projectId = activeProjectIdRef.current;
      if (!projectId) {
        return;
      }

      if (!options.preserveView) {
        setDocumentLoading(true);
      }

      setDocumentError(null);

      try {
        const document = await invoke<DocDocument>('get_doc_document', { docId });

        if (activeProjectIdRef.current !== projectId || selectedDocIdRef.current !== docId) {
          return;
        }

        setSelectedDoc(document);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);

        if (activeProjectIdRef.current !== projectId || selectedDocIdRef.current !== docId) {
          return;
        }

        if (!options.preserveView) {
          setSelectedDoc(null);
        }
        setDocumentError(`Unable to load selected document: ${message}`);
      } finally {
        if (!options.preserveView && activeProjectIdRef.current === projectId) {
          setDocumentLoading(false);
        }
      }
    },
    []
  );

  const handleProjectSelection = useCallback(
    async (projectId: ProjectId): Promise<void> => {
      if (!activeProject || activeProject.projectId === projectId) {
        return;
      }

      snapshotCurrentProjectViewState(activeProject.projectId);
      setProjectError(null);

      try {
        const nextProject = await invoke<ProjectSummary>('set_active_project', { projectId });
        setActiveProject(nextProject);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        setProjectError(`Unable to switch project: ${message}`);
      }
    },
    [activeProject, snapshotCurrentProjectViewState]
  );

  const handleProjectRegistration = useCallback(async (): Promise<void> => {
    setProjectError(null);
    setProjectAddActionState('selecting');

    try {
      const selectedPath = await openDirectoryDialog({
        directory: true,
        multiple: false,
        title: 'Select a project root folder',
      });
      const rootPath = Array.isArray(selectedPath) ? selectedPath[0] : selectedPath;

      if (!rootPath) {
        return;
      }

      setProjectAddActionState('registering');
      await invoke<ProjectSummary>('register_project', { rootPath });
      await loadProjectRegistry();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setProjectError(`Unable to add project: ${message}`);
    } finally {
      setProjectAddActionState('idle');
    }
  }, [loadProjectRegistry]);

  const handleDocsChangedEvent = useCallback(
    async (payload: DocsChangedEventPayload): Promise<void> => {
      const activeProjectIdAtEvent = activeProjectIdRef.current;
      if (!activeProjectIdAtEvent || payload.projectId !== activeProjectIdAtEvent) {
        return;
      }

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

  useEffect(() => {
    void loadProjectRegistry();
  }, [loadProjectRegistry]);

  useEffect(() => {
    selectedDocIdRef.current = selectedDocId;
  }, [selectedDocId]);

  useEffect(() => {
    activeProjectIdRef.current = activeProjectId;
  }, [activeProjectId]);

  useEffect(() => {
    const projectId = activeProjectId;
    activeProjectIdRef.current = projectId ?? null;
    listRefreshInFlightRef.current = null;
    listRefreshQueuedRef.current = false;

    if (!projectId) {
      setDocSummaries([]);
      setSelectedDocId(null);
      setSelectedDoc(null);
      setListLoading(false);
      return;
    }

    const cachedViewState = projectViewStateCacheRef.current[projectId];
    setSelectedDocId(cachedViewState?.selectedDocId ?? null);
    setExpandedNodeKeys(new Set(cachedViewState?.expandedNodeKeys ?? []));

    setDocSummaries([]);
    setSelectedDoc(null);
    setListError(null);
    setDocumentError(null);
    setDocumentLoading(false);
    setFindOpen(false);
    setFindInputQuery('');
    setFindSearchQuery('');
    setFindMatchCount(0);
    setActiveFindMatchIndex(null);
    setFindNextRequestToken(0);
    setFindPreviousRequestToken(0);

    void loadDocSummariesQueued();
  }, [activeProjectId, loadDocSummariesQueued]);

  useEffect(() => {
    if (!isTauri()) {
      return;
    }

    let unlisten: (() => void) | null = null;
    let cleanupRequested = false;

    const subscribeDocsChanged = async (): Promise<void> => {
      try {
        unlisten = await listen<DocsChangedEventPayload>(DOCS_CHANGED_EVENT, (event): void => {
          void handleDocsChangedEvent(event.payload);
        });

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
    const previousPendingAskCount = pendingAskCountRef.current;
    if (previousPendingAskCount === 0 && pendingAskCount > 0) {
      setIsAskPanelOpen(true);
    }

    pendingAskCountRef.current = pendingAskCount;
  }, [pendingAskCount]);

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

  return (
    <main className={shellClassName}>
      <ProjectsSidebar
        panelId={PROJECT_SIDEBAR_PANEL_ID}
        projects={projects}
        activeProjectId={activeProjectId}
        loading={projectLoading}
        error={projectError}
        isOpen={isProjectSidebarOpen}
        addActionState={projectAddActionState}
        onRequestAddProject={() => {
          if (!isTauri()) {
            setProjectError('Unable to add project: folder picker is available in the desktop app.');
            return;
          }
          void handleProjectRegistration();
        }}
        onSelectProject={(projectId) => {
          void handleProjectSelection(projectId);
        }}
      />

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

      <section className="grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] gap-2">
        <header className="relative flex items-center justify-end px-1 pt-3">
          <div
            className="absolute inset-x-0 top-0 h-11"
            data-tauri-drag-region
            data-testid="center-header-drag-region"
            aria-hidden
          />
          <div className="relative z-10 flex items-center gap-2">
            <p
              className="rounded-[999px] border border-coda-line-soft bg-[#f5f5f3] px-2 py-[0.18rem] text-[0.6875rem] text-coda-text-secondary"
              data-testid="active-project-badge"
            >
              {activeProject?.displayName ?? 'No project'}
            </p>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-coda-line-soft bg-[#f5f5f3] text-coda-text-secondary transition-colors hover:bg-[#ecece9] hover:text-coda-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8f8f89]"
              aria-label={projectSidebarToggleLabel}
              aria-controls={PROJECT_SIDEBAR_PANEL_ID}
              aria-expanded={isProjectSidebarOpen}
              aria-pressed={isProjectSidebarOpen}
              title={projectSidebarToggleLabel}
              onClick={() => {
                setIsProjectSidebarOpen((current) => !current);
              }}
              data-testid="project-sidebar-toggle-button"
            >
              <PanelLeft size={15} strokeWidth={2} aria-hidden />
            </button>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-coda-line-soft bg-[#f5f5f3] text-coda-text-secondary transition-colors hover:bg-[#ecece9] hover:text-coda-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8f8f89]"
              aria-label={askPanelToggleLabel}
              aria-controls={ASK_SIDEBAR_PANEL_ID}
              aria-expanded={isAskPanelOpen}
              aria-pressed={isAskPanelOpen}
              title={askPanelToggleLabel}
              onClick={() => {
                setIsAskPanelOpen((current) => !current);
              }}
              data-testid="ask-panel-toggle-button"
            >
              <MessageCircleQuestionMark size={15} strokeWidth={2} aria-hidden />
            </button>
          </div>
        </header>

        <div
          className="grid min-h-0 min-w-0 gap-3 pr-3 [grid-template-columns:minmax(0,1fr)_var(--doc-chat-panel-width)]"
          style={docsContentLayoutStyle}
        >
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

          <ChatPanel.Root panelId={DOC_CHAT_PANEL_ID} ariaLabel="Document chat panel">
            <ChatPanel.Header
              title="Document Chat"
              description="Reader-side chat preview. Send and IPC are intentionally disabled in M1."
              statusLabel="UI placeholder"
            />
            <ChatPanel.Messages
              items={mockChatMessages}
              emptyLabel="Select a document to preview chat context."
            />
            <ChatPanel.Composer />
          </ChatPanel.Root>
        </div>
      </section>

      <AskInboxPanel
        panelId={ASK_SIDEBAR_PANEL_ID}
        panelAriaLabel={askPanelAriaLabel}
        isOpen={isAskPanelOpen}
        showWhenEmpty
        className={ASK_SIDEBAR_PANEL_CLASS_NAME}
        onPendingCountChange={setPendingAskCount}
      />
    </main>
  );
};
