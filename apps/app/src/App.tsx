import { type DocDocument, type DocId, type DocSummary } from '@coda/core/contracts';
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
    <main className="grid min-h-screen grid-cols-[minmax(250px,292px)_minmax(0,1fr)] items-start gap-3 p-3 animate-[shell-enter_200ms_ease-out] max-[980px]:grid-cols-1 max-[980px]:p-2">
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

      <section className="grid min-w-0 gap-3">
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
