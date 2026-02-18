import type { DocId, DocSummary } from '@coda/core/contracts';

export type TreeNode = TreeDocNode | TreeFolderNode;

export type TreeSectionNode = {
  key: string;
  section: string;
  label: string;
  children: TreeNode[];
};

export type TreeFolderNode = {
  type: 'folder';
  key: string;
  name: string;
  children: TreeNode[];
};

export type TreeDocNode = {
  type: 'doc';
  key: string;
  summary: DocSummary;
};

type FolderAccumulator = {
  folders: Map<string, FolderAccumulator>;
  docs: DocSummary[];
};

type SectionAccumulator = {
  section: string;
  label: string;
  folders: Map<string, FolderAccumulator>;
  docs: DocSummary[];
};

const createFolderAccumulator = (): FolderAccumulator => {
  return {
    folders: new Map<string, FolderAccumulator>(),
    docs: [],
  };
};

const createSectionAccumulator = (section: string): SectionAccumulator => {
  return {
    section,
    label: formatSectionLabel(section),
    folders: new Map<string, FolderAccumulator>(),
    docs: [],
  };
};

const titleCase = (value: string): string => {
  return value
    .split('-')
    .filter((token) => token.length > 0)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
};

const toLocalPathSegments = (summary: DocSummary): string[] => {
  const allSegments = summary.docPath.split('/').filter((segment) => segment.length > 0);

  if (summary.section === 'root') {
    return allSegments;
  }

  if (allSegments[0] === summary.section) {
    return allSegments.slice(1);
  }

  return allSegments;
};

const sortDocs = (docs: DocSummary[]): DocSummary[] => {
  return [...docs].sort((left, right) => {
    const titleOrder = left.displayTitle.localeCompare(right.displayTitle);
    if (titleOrder !== 0) {
      return titleOrder;
    }

    return left.docPath.localeCompare(right.docPath);
  });
};

const sortFolders = (entries: Array<[string, FolderAccumulator]>): Array<[string, FolderAccumulator]> => {
  return [...entries].sort(([leftName], [rightName]) => leftName.localeCompare(rightName));
};

const buildFolderChildren = (
  section: string,
  folderPath: string,
  folder: FolderAccumulator
): TreeNode[] => {
  const children: TreeNode[] = [];

  for (const [folderName, childFolder] of sortFolders([...folder.folders.entries()])) {
    const childPath = folderPath.length > 0 ? `${folderPath}/${folderName}` : folderName;
    children.push({
      type: 'folder',
      key: toFolderNodeKey(section, childPath),
      name: folderName,
      children: buildFolderChildren(section, childPath, childFolder),
    });
  }

  for (const summary of sortDocs(folder.docs)) {
    children.push({
      type: 'doc',
      key: toDocNodeKey(summary.id),
      summary,
    });
  }

  return children;
};

export const toSectionNodeKey = (section: string): string => {
  return `section:${section}`;
};

export const toFolderNodeKey = (section: string, folderPath: string): string => {
  return `folder:${section}/${folderPath}`;
};

export const toDocNodeKey = (docId: DocId): string => {
  return `doc:${docId}`;
};

export const formatSectionLabel = (section: string): string => {
  if (section === 'root') {
    return 'Docs';
  }

  return titleCase(section);
};

export const buildTreeSections = (summaries: DocSummary[]): TreeSectionNode[] => {
  const sectionMap = new Map<string, SectionAccumulator>();

  for (const summary of summaries) {
    const sectionKey = summary.section;
    const section = sectionMap.get(sectionKey) ?? createSectionAccumulator(sectionKey);
    sectionMap.set(sectionKey, section);

    const localSegments = toLocalPathSegments(summary);

    if (localSegments.length <= 1) {
      section.docs.push(summary);
      continue;
    }

    const folderSegments = localSegments.slice(0, -1);
    let cursor = section.folders;
    let currentFolder: FolderAccumulator | null = null;

    for (const segment of folderSegments) {
      const folder = cursor.get(segment) ?? createFolderAccumulator();
      cursor.set(segment, folder);
      currentFolder = folder;
      cursor = folder.folders;
    }

    if (currentFolder) {
      currentFolder.docs.push(summary);
    }
  }

  const sections = [...sectionMap.values()]
    .sort((left, right) => {
      if (left.section === 'root' && right.section !== 'root') {
        return -1;
      }
      if (left.section !== 'root' && right.section === 'root') {
        return 1;
      }

      return left.label.localeCompare(right.label);
    })
    .map((section) => {
      const children: TreeNode[] = [];

      for (const [folderName, folder] of sortFolders([...section.folders.entries()])) {
        children.push({
          type: 'folder',
          key: toFolderNodeKey(section.section, folderName),
          name: folderName,
          children: buildFolderChildren(section.section, folderName, folder),
        });
      }

      for (const summary of sortDocs(section.docs)) {
        children.push({
          type: 'doc',
          key: toDocNodeKey(summary.id),
          summary,
        });
      }

      return {
        key: toSectionNodeKey(section.section),
        section: section.section,
        label: section.label,
        children,
      };
    });

  return sections;
};

const findSummaryByDocId = (summaries: DocSummary[], docId: DocId): DocSummary | null => {
  return summaries.find((summary) => summary.id === docId) ?? null;
};

export const ancestorKeysForDoc = (summaries: DocSummary[], docId: DocId): string[] => {
  const summary = findSummaryByDocId(summaries, docId);

  if (!summary) {
    return [];
  }

  const keys: string[] = [toSectionNodeKey(summary.section)];
  const localSegments = toLocalPathSegments(summary);
  const folderSegments = localSegments.slice(0, -1);

  if (folderSegments.length === 0) {
    return keys;
  }

  let currentPath = '';

  for (const segment of folderSegments) {
    currentPath = currentPath.length > 0 ? `${currentPath}/${segment}` : segment;
    keys.push(toFolderNodeKey(summary.section, currentPath));
  }

  return keys;
};

export const defaultExpandedSectionKeys = (sections: TreeSectionNode[]): Set<string> => {
  return new Set(sections.map((section) => section.key));
};

export const allTreeNodeKeys = (sections: TreeSectionNode[]): Set<string> => {
  const keys = new Set<string>();

  const walkNodes = (nodes: TreeNode[]): void => {
    for (const node of nodes) {
      keys.add(node.key);

      if (node.type === 'folder') {
        walkNodes(node.children);
      }
    }
  };

  for (const section of sections) {
    keys.add(section.key);
    walkNodes(section.children);
  }

  return keys;
};
