import { SCAFFOLD_STATUS, type DocDocument, type DocId, type DocSummary } from '@coda/core/contracts';
import { invoke } from '@tauri-apps/api/core';
import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';

import { DocViewerPanel } from './components/DocViewerPanel';
import { DocsSidebar } from './components/DocsSidebar';
import {
  allTreeNodeKeys,
  ancestorKeysForDoc,
  buildTreeSections,
  defaultExpandedSectionKeys,
} from './docs-tree';
import { eyebrowClass, ghostButtonClass, headerRowClass, panelSurfaceClass, subtleTextClass } from './ui-classes';

type HealthResponse = {
  message: string;
};

const APP_TITLE = 'Coda Mission Control';
const ANNOTATION_TODO_NOTE =
  'TODO(M2): Add inline annotation + section approval controls per ux-specification section 2.2.';

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
  const [healthMessage, setHealthMessage] = useState<string>('Idle');
  const [healthLoading, setHealthLoading] = useState<boolean>(false);

  const [docSummaries, setDocSummaries] = useState<DocSummary[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<DocId | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<DocDocument | null>(null);
  const [includeHidden, setIncludeHidden] = useState<boolean>(false);
  const [expandedNodeKeys, setExpandedNodeKeys] = useState<Set<string>>(new Set<string>());

  const [listLoading, setListLoading] = useState<boolean>(true);
  const [listError, setListError] = useState<string | null>(null);
  const [documentLoading, setDocumentLoading] = useState<boolean>(false);
  const [documentError, setDocumentError] = useState<string | null>(null);

  const treeSections = useMemo(() => buildTreeSections(docSummaries), [docSummaries]);
  const treeNodeKeys = useMemo(() => allTreeNodeKeys(treeSections), [treeSections]);

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

  useEffect(() => {
    setExpandedNodeKeys((current) => {
      const next = new Set<string>();

      for (const key of current) {
        if (treeNodeKeys.has(key)) {
          next.add(key);
        }
      }

      if (next.size === 0 && treeSections.length > 0) {
        const defaultKeys = defaultExpandedSectionKeys(treeSections);
        for (const key of defaultKeys) {
          next.add(key);
        }
      }

      return areSameSet(current, next) ? current : next;
    });
  }, [treeNodeKeys, treeSections]);

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
    <main className="grid min-h-screen grid-cols-[minmax(280px,340px)_minmax(0,1fr)] items-start gap-4 p-4 animate-[shell-enter_200ms_ease-out] max-[980px]:grid-cols-1 max-[980px]:p-3">
      <DocsSidebar
        summaries={docSummaries}
        treeSections={treeSections}
        selectedDocId={selectedDocId}
        includeHidden={includeHidden}
        expandedNodeKeys={expandedNodeKeys}
        listLoading={listLoading}
        listError={listError}
        onRefresh={loadDocSummaries}
        onToggleHidden={setIncludeHidden}
        onToggleNode={onToggleNode}
        onSelectDoc={setSelectedDocId}
      />

      <section className="grid min-w-0 gap-4">
        <header
          className={`${panelSurfaceClass} ${headerRowClass} p-4 max-[980px]:flex-col max-[980px]:items-stretch`}
        >
          <div>
            <p className={eyebrowClass}>Milestone 1</p>
            <h1 className="mt-1 text-[clamp(1.3rem,1.8vw,1.85rem)] font-semibold tracking-[-0.02em]">{APP_TITLE}</h1>
            <p className={subtleTextClass}>Monochrome docs command center with a structured navigation tree.</p>
          </div>

          <div
            className="grid min-w-[220px] gap-2 rounded-coda-md border border-coda-line-soft bg-[#fafaf8] p-3 max-[980px]:min-w-0 max-[980px]:w-full"
            aria-live="polite"
          >
            <p className="text-[0.66rem] font-semibold tracking-[0.11em] text-coda-text-muted uppercase">
              Bridge Status
            </p>
            <p className="font-semibold">{healthMessage}</p>
            <button
              type="button"
              className={ghostButtonClass}
              onClick={() => void runHealthCheck()}
              disabled={healthLoading}
            >
              {healthLoading ? 'Checking...' : 'Check connection'}
            </button>
          </div>
        </header>

        <DocViewerPanel
          selectedDoc={selectedDoc}
          documentLoading={documentLoading}
          documentError={documentError}
          annotationNote={ANNOTATION_TODO_NOTE}
        />
      </section>
    </main>
  );
};
