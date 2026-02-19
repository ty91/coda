import type { DocId, DocSummary } from '@coda/core/contracts';
import type { CSSProperties, ReactElement } from 'react';

import type { TreeFolderNode, TreeNode, TreeSectionNode } from '../docs-tree';
import {
  eyebrowClass,
  ghostButtonClass,
  headerRowClass,
  messageTextClass,
  sidebarSurfaceClass,
  treeRowClass,
} from '../ui-classes';

type DocsSidebarProps = {
  summaries: DocSummary[];
  treeSections: TreeSectionNode[];
  selectedDocId: DocId | null;
  includeHidden: boolean;
  expandedNodeKeys: Set<string>;
  listLoading: boolean;
  listError: string | null;
  onRefresh: () => Promise<void>;
  onToggleHidden: (value: boolean) => void;
  onToggleNode: (nodeKey: string) => void;
  onSelectDoc: (docId: DocId) => void;
};

const renderFolderNode = (
  node: TreeFolderNode,
  depth: number,
  selectedDocId: DocId | null,
  expandedNodeKeys: Set<string>,
  onToggleNode: (nodeKey: string) => void,
  onSelectDoc: (docId: DocId) => void
): ReactElement => {
  const isExpanded = expandedNodeKeys.has(node.key);
  const folderToggleClass = `${treeRowClass} rounded-none hover:bg-[#f2f2ef]`;

  return (
    <li key={node.key}>
      <button
        type="button"
        className={folderToggleClass}
        style={{ '--depth': depth } as CSSProperties}
        aria-expanded={isExpanded}
        onClick={() => onToggleNode(node.key)}
      >
        <span className="min-w-3 text-[0.82rem] text-coda-text-secondary">{isExpanded ? 'v' : '>'}</span>
        <span>{node.name}</span>
      </button>

      {isExpanded ? (
        <ul className="m-0 list-none divide-y divide-[#ecece9] p-0" role="group">
          {node.children.map((childNode) =>
            renderTreeNode(
              childNode,
              depth + 1,
              selectedDocId,
              expandedNodeKeys,
              onToggleNode,
              onSelectDoc
            )
          )}
        </ul>
      ) : null}
    </li>
  );
};

const renderTreeNode = (
  node: TreeNode,
  depth: number,
  selectedDocId: DocId | null,
  expandedNodeKeys: Set<string>,
  onToggleNode: (nodeKey: string) => void,
  onSelectDoc: (docId: DocId) => void
): ReactElement => {
  if (node.type === 'folder') {
    return renderFolderNode(
      node,
      depth,
      selectedDocId,
      expandedNodeKeys,
      onToggleNode,
      onSelectDoc
    );
  }

  const isActive = node.summary.id === selectedDocId;
  const docButtonClass = isActive
    ? `${treeRowClass} grid gap-[0.08rem] rounded-none bg-[#111111] text-[#fafafa] hover:bg-[#111111]`
    : `${treeRowClass} grid gap-[0.08rem] rounded-none hover:bg-[#f2f2ef]`;
  const docPathClass = isActive
    ? 'font-mono text-[0.72rem] leading-[1.25] text-[#d4d4d4]'
    : 'font-mono text-[0.72rem] leading-[1.25] text-coda-text-muted';

  return (
    <li key={node.key}>
      <button
        type="button"
        className={docButtonClass}
        style={{ '--depth': depth } as CSSProperties}
        aria-current={isActive ? 'page' : undefined}
        onClick={() => onSelectDoc(node.summary.id)}
      >
        <span className="text-[0.9rem] leading-[1.3]">{node.summary.displayTitle}</span>
        <span className={docPathClass}>{node.summary.docPath}</span>
      </button>
    </li>
  );
};

const sectionContent = (
  section: TreeSectionNode,
  selectedDocId: DocId | null,
  expandedNodeKeys: Set<string>,
  onToggleNode: (nodeKey: string) => void,
  onSelectDoc: (docId: DocId) => void
): ReactElement | null => {
  const isExpanded = expandedNodeKeys.has(section.key);

  if (!isExpanded) {
    return null;
  }

  return (
    <ul className="m-0 list-none divide-y divide-[#ecece9] p-0" role="tree">
      {section.children.map((node) =>
        renderTreeNode(node, 1, selectedDocId, expandedNodeKeys, onToggleNode, onSelectDoc)
      )}
    </ul>
  );
};

export const DocsSidebar = ({
  summaries,
  treeSections,
  selectedDocId,
  includeHidden,
  expandedNodeKeys,
  listLoading,
  listError,
  onRefresh,
  onToggleHidden,
  onToggleNode,
  onSelectDoc,
}: DocsSidebarProps): ReactElement => {
  return (
    <aside
      className={`${sidebarSurfaceClass} sticky top-4 grid max-h-[calc(100vh-2rem)] gap-3 overflow-auto p-4 max-[980px]:static max-[980px]:max-h-none`}
      aria-label="Documentation sidebar"
    >
      <header className={headerRowClass}>
        <div>
          <p className={eyebrowClass}>Knowledge</p>
          <h2 className="mt-1 text-[1.02rem] font-semibold tracking-[-0.01em]">Docs Tree</h2>
        </div>
        <button type="button" className={ghostButtonClass} onClick={() => void onRefresh()} disabled={listLoading}>
          {listLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </header>

      <label className="inline-flex items-center gap-2 text-[0.86rem] text-coda-text-secondary" htmlFor="include-hidden-toggle">
        <input
          id="include-hidden-toggle"
          type="checkbox"
          className="m-0 accent-[#111111]"
          checked={includeHidden}
          onChange={(event) => onToggleHidden(event.target.checked)}
        />
        <span>Show hidden/template docs</span>
      </label>

      {listLoading ? <p className={messageTextClass}>Loading markdown docs from `docs/`...</p> : null}
      {listError ? <p className="text-[0.92rem] text-coda-error">{listError}</p> : null}

      {!listLoading && !listError && summaries.length === 0 ? (
        <p className={messageTextClass}>
          {includeHidden
            ? 'No markdown docs found in `docs/`.'
            : 'No visible markdown docs found in `docs/`. Enable hidden/template docs to include templates.'}
        </p>
      ) : null}

      {!listLoading && !listError && summaries.length > 0 ? (
        <nav className="grid gap-[0.55rem]" aria-label="Docs navigation tree">
          {treeSections.map((section) => {
            const sectionExpanded = expandedNodeKeys.has(section.key);

            return (
              <section className="overflow-hidden rounded-coda-md border border-[#d5d5d0] bg-[#fafaf7d6]" key={section.key}>
                <button
                  type="button"
                  className="flex min-h-[2.15rem] w-full items-center gap-2 rounded-none border-0 bg-transparent px-[0.65rem] py-[0.55rem] text-left font-semibold tracking-[0.01em] hover:bg-[#f2f2ef]"
                  aria-expanded={sectionExpanded}
                  onClick={() => onToggleNode(section.key)}
                >
                  <span className="min-w-3 text-[0.82rem] text-coda-text-secondary">{sectionExpanded ? 'v' : '>'}</span>
                  <span>{section.label}</span>
                </button>
                {sectionContent(
                  section,
                  selectedDocId,
                  expandedNodeKeys,
                  onToggleNode,
                  onSelectDoc
                )}
              </section>
            );
          })}
        </nav>
      ) : null}
    </aside>
  );
};
