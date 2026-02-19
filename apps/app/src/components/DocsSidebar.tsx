import type { DocId, DocSummary } from '@coda/core/contracts';
import { Folder, FolderOpen, RefreshCw } from 'lucide-react';
import type { CSSProperties, ReactElement } from 'react';

import type { TreeFolderNode, TreeNode, TreeSectionNode } from '../docs-tree';
import {
  eyebrowClass,
  messageTextClass,
  sidebarSectionClass,
  sidebarSectionHeaderClass,
  sidebarSurfaceClass,
  sidebarIconButtonClass,
  sidebarUtilityButtonClass,
  sidebarUtilityGroupClass,
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
  const folderToggleClass = `${treeRowClass} hover:bg-[var(--color-coda-sidebar-row-hover)]`;

  return (
    <li key={node.key}>
      <button
        type="button"
        className={folderToggleClass}
        style={{ '--depth': depth } as CSSProperties}
        aria-expanded={isExpanded}
        onClick={() => onToggleNode(node.key)}
      >
        <span className="inline-flex min-w-3 items-center justify-center text-[var(--color-coda-sidebar-label)]">
          {isExpanded ? <FolderOpen size={13} strokeWidth={2} aria-hidden /> : <Folder size={13} strokeWidth={2} aria-hidden />}
        </span>
        <span>{node.name}</span>
      </button>

      {isExpanded ? (
        <ul className="m-0 list-none space-y-[0.08rem] p-0" role="group">
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
    ? `${treeRowClass} grid gap-[0.05rem] bg-[var(--color-coda-sidebar-row-active)] shadow-[inset_0_0_0_1px_#d0d0cd] hover:bg-[var(--color-coda-sidebar-row-active)]`
    : `${treeRowClass} grid gap-[0.05rem] hover:bg-[var(--color-coda-sidebar-row-hover)]`;
  const docPathClass = isActive
    ? 'font-mono text-[0.69rem] leading-[1.28] text-[#50504d]'
    : 'font-mono text-[0.69rem] leading-[1.28] text-coda-text-muted';

  return (
    <li key={node.key}>
      <button
        type="button"
        className={docButtonClass}
        style={{ '--depth': depth } as CSSProperties}
        aria-current={isActive ? 'page' : undefined}
        onClick={() => onSelectDoc(node.summary.id)}
      >
        <span className="text-[0.84rem] leading-[1.28]">{node.summary.displayTitle}</span>
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
    <ul className="m-0 list-none space-y-[0.08rem] p-0" role="tree">
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
      className={`${sidebarSurfaceClass} sticky top-0 grid max-h-[100vh] gap-3 overflow-auto px-3 pb-3 pt-11 max-[980px]:static max-[980px]:max-h-none max-[980px]:p-3`}
      aria-label="Documentation sidebar"
    >
      <header className="grid gap-[0.15rem] px-1">
        <p className={eyebrowClass}>Workspace</p>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[0.98rem] font-semibold tracking-[-0.01em] text-[var(--color-coda-sidebar-text)]">
            Docs Tree
          </h2>
          <button
            type="button"
            className={sidebarIconButtonClass}
            onClick={() => void onRefresh()}
            disabled={listLoading}
            aria-label={listLoading ? 'Refreshing docs list' : 'Refresh docs list'}
            title={listLoading ? 'Refreshing docs list' : 'Refresh docs list'}
          >
            <RefreshCw
              size={15}
              strokeWidth={2}
              aria-hidden
              className={listLoading ? 'animate-spin' : undefined}
            />
          </button>
        </div>
      </header>

      <div className={sidebarUtilityGroupClass}>
        <label className={`${sidebarUtilityButtonClass} cursor-pointer`} htmlFor="include-hidden-toggle">
          <span className="inline-flex items-center gap-2">
            <input
              id="include-hidden-toggle"
              type="checkbox"
              aria-label="Show hidden/template docs"
              className="m-0 h-[0.78rem] w-[0.78rem] accent-[#5a5a57]"
              checked={includeHidden}
              onChange={(event) => onToggleHidden(event.target.checked)}
            />
            <span>Show hidden/template docs</span>
          </span>
          <span className="text-[0.66rem] font-semibold tracking-[0.08em] text-[var(--color-coda-sidebar-label)] uppercase">
            {includeHidden ? 'On' : 'Off'}
          </span>
        </label>
      </div>

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
        <nav className="grid gap-[0.35rem]" aria-label="Docs navigation tree">
          {treeSections.map((section) => {
            const sectionExpanded = expandedNodeKeys.has(section.key);

            return (
              <section className={sidebarSectionClass} key={section.key}>
                <button
                  type="button"
                  className={sidebarSectionHeaderClass}
                  aria-expanded={sectionExpanded}
                  onClick={() => onToggleNode(section.key)}
                >
                  <span className="inline-flex min-w-3 items-center justify-center text-[var(--color-coda-sidebar-label)]">
                    {sectionExpanded ? <FolderOpen size={13} strokeWidth={2} aria-hidden /> : <Folder size={13} strokeWidth={2} aria-hidden />}
                  </span>
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
