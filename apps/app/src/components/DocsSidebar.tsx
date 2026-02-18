import type { DocId, DocSummary } from '@coda/core/contracts';
import type { CSSProperties, ReactElement } from 'react';

import type { TreeFolderNode, TreeNode, TreeSectionNode } from '../docs-tree';

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

  return (
    <li className="tree-item" key={node.key}>
      <button
        type="button"
        className="tree-toggle"
        style={{ '--depth': depth } as CSSProperties}
        aria-expanded={isExpanded}
        onClick={() => onToggleNode(node.key)}
      >
        <span className="caret">{isExpanded ? 'v' : '>'}</span>
        <span>{node.name}</span>
      </button>

      {isExpanded ? (
        <ul className="tree-branch" role="group">
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

  return (
    <li className="tree-item" key={node.key}>
      <button
        type="button"
        className={isActive ? 'tree-doc is-active' : 'tree-doc'}
        style={{ '--depth': depth } as CSSProperties}
        aria-current={isActive ? 'page' : undefined}
        onClick={() => onSelectDoc(node.summary.id)}
      >
        <span className="tree-doc-title">{node.summary.displayTitle}</span>
        <span className="tree-doc-path">{node.summary.docPath}</span>
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
    <ul className="tree-root" role="tree">
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
    <aside className="sidebar panel-surface" aria-label="Documentation sidebar">
      <header className="sidebar-header">
        <div>
          <p className="eyebrow">Knowledge</p>
          <h2>Docs Tree</h2>
        </div>
        <button type="button" className="ghost-button" onClick={() => void onRefresh()} disabled={listLoading}>
          {listLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </header>

      <label className="toggle-row" htmlFor="include-hidden-toggle">
        <input
          id="include-hidden-toggle"
          type="checkbox"
          checked={includeHidden}
          onChange={(event) => onToggleHidden(event.target.checked)}
        />
        <span>Show hidden/template docs</span>
      </label>

      {listLoading ? <p className="sidebar-message">Loading markdown docs from `docs/`...</p> : null}
      {listError ? <p className="error-text">{listError}</p> : null}

      {!listLoading && !listError && summaries.length === 0 ? (
        <p className="sidebar-message">
          {includeHidden
            ? 'No markdown docs found in `docs/`.'
            : 'No visible markdown docs found in `docs/`. Enable hidden/template docs to include templates.'}
        </p>
      ) : null}

      {!listLoading && !listError && summaries.length > 0 ? (
        <nav className="docs-tree" aria-label="Docs navigation tree">
          {treeSections.map((section) => {
            const sectionExpanded = expandedNodeKeys.has(section.key);

            return (
              <section className="tree-section" key={section.key}>
                <button
                  type="button"
                  className="tree-section-toggle"
                  aria-expanded={sectionExpanded}
                  onClick={() => onToggleNode(section.key)}
                >
                  <span className="caret">{sectionExpanded ? 'v' : '>'}</span>
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
