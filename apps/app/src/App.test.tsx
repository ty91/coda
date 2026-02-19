// @vitest-environment jsdom

import type { DocDocument, DocSummary, ProjectSummary } from '@coda/core/contracts';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-dialog';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { App } from './App';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
  isTauri: vi.fn(() => true),
}));
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(),
}));
vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
}));
vi.mock('./useAskNotifications', () => ({
  useAskNotifications: vi.fn(),
}));

const mockInvoke = vi.mocked(invoke);
const mockIsTauri = vi.mocked(isTauri);
const mockListen = vi.mocked(listen);
const mockOpen = vi.mocked(open);

const coreBeliefsSummary: DocSummary = {
  id: 'design-docs/core-beliefs.md',
  fileName: 'core-beliefs.md',
  docPath: 'design-docs/core-beliefs.md',
  relativePath: 'docs/design-docs/core-beliefs.md',
  section: 'design-docs',
  title: 'Core Beliefs',
  displayTitle: 'Core Beliefs',
  date: '2026-02-13',
  status: 'active',
  tags: ['core-beliefs'],
  milestone: null,
  isTemplate: false,
  isHidden: false,
};

const executionPlanSummary: DocSummary = {
  id: 'plans/active/2026-02-18-exec.md',
  fileName: '2026-02-18-exec.md',
  docPath: 'plans/active/2026-02-18-exec.md',
  relativePath: 'docs/plans/active/2026-02-18-exec.md',
  section: 'plans',
  title: 'Execution Plan',
  displayTitle: 'Execution Plan',
  date: '2026-02-18',
  status: 'draft',
  tags: ['plan'],
  milestone: 'M1',
  isTemplate: false,
  isHidden: false,
};

const slackReferenceSummary: DocSummary = {
  id: 'references/api/slack.md',
  fileName: 'slack.md',
  docPath: 'references/api/slack.md',
  relativePath: 'docs/references/api/slack.md',
  section: 'references',
  title: 'Slack API Reference',
  displayTitle: 'Slack API Reference',
  date: '2026-02-17',
  status: null,
  tags: ['api'],
  milestone: null,
  isTemplate: false,
  isHidden: false,
};

const visibleSummaries: DocSummary[] = [coreBeliefsSummary, executionPlanSummary, slackReferenceSummary];

const betaStrategySummary: DocSummary = {
  id: 'plans/active/2026-02-19-beta-strategy.md',
  fileName: '2026-02-19-beta-strategy.md',
  docPath: 'plans/active/2026-02-19-beta-strategy.md',
  relativePath: 'docs/plans/active/2026-02-19-beta-strategy.md',
  section: 'plans',
  title: 'Beta Strategy',
  displayTitle: 'Beta Strategy',
  date: '2026-02-19',
  status: 'draft',
  tags: ['beta'],
  milestone: 'M2',
  isTemplate: false,
  isHidden: false,
};

const alphaProject: ProjectSummary = {
  projectId: 'alpha',
  displayName: 'Alpha',
  rootPath: '/tmp/alpha',
  docsPath: '/tmp/alpha/docs',
  hasLocalOverride: false,
};

const betaProject: ProjectSummary = {
  projectId: 'beta',
  displayName: 'Beta',
  rootPath: '/tmp/beta',
  docsPath: '/tmp/beta/docs',
  hasLocalOverride: false,
};

const projectFixtures: ProjectSummary[] = [alphaProject, betaProject];

const docsByProject: Record<string, DocSummary[]> = {
  alpha: visibleSummaries,
  beta: [betaStrategySummary],
};

const documentsByProject: Record<string, Record<string, DocDocument>> = {
  alpha: {
  'design-docs/core-beliefs.md': {
    ...coreBeliefsSummary,
    markdownBody: '## Core\n\nBeliefs body core core',
  },
  'plans/active/2026-02-18-exec.md': {
    ...executionPlanSummary,
    markdownBody: '## Plan\n\nExecution body',
  },
  'references/api/slack.md': {
    ...slackReferenceSummary,
    markdownBody: '## Slack\n\nSlack reference body',
  },
  },
  beta: {
    'plans/active/2026-02-19-beta-strategy.md': {
      ...betaStrategySummary,
      markdownBody: '## Beta\n\nBeta strategy body',
    },
  },
};

const pendingAskSessionsFixture: Array<Record<string, unknown>> = [
  {
    askId: 'ask-1',
    request: {
      questions: [
        {
          header: 'Scope',
          id: 'scope_choice',
          question: 'Choose scope?',
          options: [
            { label: 'Ship now (Recommended)', description: 'Fast path' },
            { label: 'Expand', description: 'Broad path' },
          ],
        },
      ],
    },
    requestedAtIso: '2026-02-19T14:00:00Z',
    timeoutMs: 0,
    expiresAtIso: null,
    isExpired: false,
  },
];

const setupSuccessfulInvokeMock = (
  pendingAskSessions: Array<Record<string, unknown>> = []
): void => {
  mockIsTauri.mockReturnValue(true);
  mockListen.mockResolvedValue(() => {});
  mockOpen.mockResolvedValue(null);
  let activeProjectId = 'alpha';
  let registeredProjects = [...projectFixtures];

  mockInvoke.mockImplementation(async (command, args) => {
    if (command === 'list_projects') {
      return registeredProjects;
    }

    if (command === 'get_active_project') {
      return registeredProjects.find((project) => project.projectId === activeProjectId) ?? alphaProject;
    }

    if (command === 'set_active_project') {
      const projectId = (args as { projectId: string } | undefined)?.projectId;
      if (!projectId || !registeredProjects.some((project) => project.projectId === projectId)) {
        throw new Error(`unknown project ${projectId ?? 'undefined'}`);
      }

      activeProjectId = projectId;
      return registeredProjects.find((project) => project.projectId === projectId) ?? alphaProject;
    }

    if (command === 'register_project') {
      const rootPath = (args as { rootPath: string } | undefined)?.rootPath;
      if (!rootPath) {
        throw new Error('missing root path');
      }

      const derivedId = rootPath
        .split('/')
        .filter((value) => value.length > 0)
        .at(-1)
        ?.toLowerCase()
        .replace(/[^a-z0-9-_]+/g, '-')
        .replace(/^-+|-+$/g, '');
      const projectId = derivedId && derivedId.length > 0 ? derivedId : 'project';
      const projectSummary: ProjectSummary = {
        projectId,
        displayName: projectId,
        rootPath,
        docsPath: `${rootPath}/docs`,
        hasLocalOverride: false,
      };

      if (registeredProjects.some((project) => project.projectId === projectId)) {
        throw new Error(`duplicate project_id '${projectId}'`);
      }

      registeredProjects = [...registeredProjects, projectSummary].sort((left, right) =>
        left.displayName.localeCompare(right.displayName)
      );

      return projectSummary;
    }

    if (command === 'list_doc_summaries') {
      expect(args).toBeUndefined();
      return docsByProject[activeProjectId] ?? [];
    }

    if (command === 'get_doc_document') {
      const docId = (args as { docId: string } | undefined)?.docId;
      const documents = documentsByProject[activeProjectId] ?? {};

      if (!docId || !documents[docId]) {
        throw new Error(`unknown document ${docId ?? 'undefined'}`);
      }
      return documents[docId];
    }

    if (command === 'get_health_message') {
      return { message: 'ok' };
    }

    if (command === 'list_pending_ask_sessions') {
      return pendingAskSessions;
    }

    if (command === 'submit_ask_response') {
      return null;
    }

    throw new Error(`Unexpected command: ${command}`);
  });
};

afterEach(() => {
  mockInvoke.mockReset();
  mockIsTauri.mockReset();
  mockListen.mockReset();
  mockOpen.mockReset();
  cleanup();
});

describe('App docs viewer', () => {
  it('marks sidebar and center header strips as tauri drag regions', async () => {
    setupSuccessfulInvokeMock();

    render(<App />);

    const designDocsButton = await screen.findByRole('button', { name: 'Design Docs' });
    const plansButton = screen.getByRole('button', { name: 'Plans' });
    const referencesButton = screen.getByRole('button', { name: 'References' });

    expect(designDocsButton.getAttribute('aria-expanded')).toBe('false');
    expect(plansButton.getAttribute('aria-expanded')).toBe('false');
    expect(referencesButton.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('heading', { level: 3 })).toBeNull();
    expect(screen.queryByText('Select a document from the sidebar to start reading.')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Reader', level: 2 })).toBeNull();

    const sidebar = screen.getByLabelText('Documentation sidebar');
    const projectsSidebar = screen.getByLabelText('Projects sidebar');
    const readerSurface = screen.getByTestId('viewer-drag-region').closest('section');
    const projectsSidebarDragRegion = screen.getByTestId('projects-sidebar-drag-region');
    const sidebarDragRegion = screen.getByTestId('sidebar-drag-region');
    const centerHeaderDragRegion = screen.getByTestId('center-header-drag-region');
    const viewerDragRegion = screen.getByTestId('viewer-drag-region');

    expect(projectsSidebarDragRegion.hasAttribute('data-tauri-drag-region')).toBe(true);
    expect(sidebarDragRegion.hasAttribute('data-tauri-drag-region')).toBe(true);
    expect(centerHeaderDragRegion.hasAttribute('data-tauri-drag-region')).toBe(true);
    expect(viewerDragRegion.hasAttribute('data-tauri-drag-region')).toBe(false);
    expect(projectsSidebar.hasAttribute('data-tauri-drag-region')).toBe(false);
    expect(sidebar.hasAttribute('data-tauri-drag-region')).toBe(false);
    expect(readerSurface?.hasAttribute('data-tauri-drag-region')).toBe(false);
    expect(screen.queryByRole('button', { name: 'Refresh docs list' })).toBeNull();
    expect(document.querySelectorAll('[data-tauri-drag-region]')).toHaveLength(3);
  });

  it('uses fixed 100vh shell and internal pane scrolling containers', async () => {
    setupSuccessfulInvokeMock();

    const view = render(<App />);

    await screen.findByRole('button', { name: 'Design Docs' });

    const shell = view.container.querySelector('main');
    expect(shell).toBeTruthy();
    expect(shell?.className).toContain('h-screen');
    expect(shell?.className).toContain('overflow-hidden');
    expect(shell?.className).not.toContain('min-h-screen');

    const sidebar = screen.getByLabelText('Documentation sidebar');
    expect(sidebar.className).toContain('h-full');
    expect(sidebar.className).toContain('min-h-0');
    expect(sidebar.className).toContain('content-start');
    expect(sidebar.className).toContain('overflow-y-auto');
    expect(sidebar.className).not.toContain('max-h-[100vh]');

    const docsNav = screen.getByRole('navigation', { name: 'Docs navigation tree' });
    expect(docsNav.className).toContain('content-start');
    expect(docsNav.className).toContain('self-start');

    const viewerSurface = screen.getByTestId('viewer-drag-region').closest('section');
    expect(viewerSurface).toBeTruthy();
    expect(viewerSurface?.className).toContain('h-full');
    expect(viewerSurface?.className).toContain('min-h-0');
    expect(viewerSurface?.className).toContain('overflow-y-auto');

    const chatPanel = screen.getByRole('complementary', { name: 'Document chat panel' });
    expect(chatPanel.id).toBe('app-doc-chat-panel');
    expect(chatPanel.className).toContain('grid-rows-[auto_minmax(0,1fr)_auto]');
    expect(screen.getByText('Select a document to preview chat context.')).toBeTruthy();
  });

  it('loads docs and allows selecting another document from the sidebar', async () => {
    setupSuccessfulInvokeMock();

    render(<App />);

    await screen.findByRole('button', { name: 'Design Docs' });
    const sidebarLabel = screen.getByText('Workspace');
    expect(sidebarLabel.className).toContain('text-[0.8125rem]');
    expect(sidebarLabel.className).toContain('font-normal');

    fireEvent.click(screen.getByRole('button', { name: 'Design Docs' }));
    const coreBeliefsButton = screen.getByRole('button', { name: /Core Beliefs/ });
    fireEvent.click(coreBeliefsButton);

    await screen.findByRole('heading', { name: 'Core Beliefs', level: 3 });
    expect(screen.getByText(/Beliefs body/)).toBeTruthy();
    expect(coreBeliefsButton.className).toContain('text-[0.8125rem]');
    expect(coreBeliefsButton.className).toContain('font-normal');
    expect(coreBeliefsButton.className).toContain('!bg-[var(--color-coda-sidebar-row-hover)]');
    expect(coreBeliefsButton.className).not.toContain('shadow-[inset_0_0_0_1px_#d0d0cd]');
    expect(screen.queryByText(/TODO\(M2\): Add inline annotation/)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Plans' }));
    fireEvent.click(screen.getByRole('button', { name: /active$/ }));
    await screen.findByRole('button', { name: /Execution Plan/ });
    fireEvent.click(screen.getByRole('button', { name: /Execution Plan/ }));

    await screen.findByRole('heading', { name: 'Execution Plan', level: 3 });
    expect(screen.getByText('Execution body')).toBeTruthy();
  });

  it('keeps chat panel visible and updates mock messages after document selection', async () => {
    setupSuccessfulInvokeMock();

    render(<App />);

    await screen.findByRole('button', { name: 'Design Docs' });
    const chatPanel = screen.getByRole('complementary', { name: 'Document chat panel' });
    expect(within(chatPanel).getByText('Select a document to preview chat context.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Design Docs' }));
    fireEvent.click(screen.getByRole('button', { name: /Core Beliefs/ }));
    await screen.findByRole('heading', { name: 'Core Beliefs', level: 3 });

    expect(
      within(chatPanel).getByText(/Loaded "Core Beliefs"\. Ask actions stay disabled in this milestone UI\./)
    ).toBeTruthy();
    expect(
      within(chatPanel).getByText('Summarize decisions and open risks from this document.')
    ).toBeTruthy();
  });

  it('shows list error state when docs fetch fails', async () => {
    let activeProjectId = 'alpha';

    mockInvoke.mockImplementation(async (command) => {
      if (command === 'list_projects') {
        return projectFixtures;
      }

      if (command === 'get_active_project') {
        return projectFixtures.find((project) => project.projectId === activeProjectId) ?? alphaProject;
      }

      if (command === 'set_active_project') {
        activeProjectId = 'alpha';
        return alphaProject;
      }

      if (command === 'list_doc_summaries') {
        throw new Error('list failed');
      }
      if (command === 'get_health_message') {
        return { message: 'ok' };
      }

      if (command === 'list_pending_ask_sessions') {
        return [];
      }

      if (command === 'submit_ask_response') {
        return null;
      }

      throw new Error(`Unexpected command: ${command}`);
    });

    render(<App />);

    await screen.findByText('Unable to load docs: list failed');
  });

  it('does not render hidden/template filter controls', async () => {
    setupSuccessfulInvokeMock();

    render(<App />);

    await screen.findByRole('button', { name: 'Design Docs' });
    expect(screen.queryByLabelText('Show hidden/template docs')).toBeNull();
  });

  it('does not render manual docs refresh control', async () => {
    setupSuccessfulInvokeMock();

    render(<App />);

    await screen.findByRole('button', { name: 'Design Docs' });
    expect(screen.queryByRole('button', { name: 'Refresh docs list' })).toBeNull();
  });

  it('toggles projects sidebar from header PanelLeft control', async () => {
    setupSuccessfulInvokeMock();

    render(<App />);

    await screen.findByRole('button', { name: 'Design Docs' });
    const toggleButton = screen.getByTestId('project-sidebar-toggle-button');
    expect(toggleButton.getAttribute('aria-controls')).toBe('app-project-sidebar-panel');
    expect(toggleButton.getAttribute('aria-expanded')).toBe('true');
    expect(toggleButton.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('projects-sidebar')).toBeTruthy();

    fireEvent.click(toggleButton);
    expect(toggleButton.getAttribute('aria-expanded')).toBe('false');
    expect(toggleButton.getAttribute('aria-pressed')).toBe('false');
    expect(screen.queryByTestId('projects-sidebar')).toBeNull();

    fireEvent.click(toggleButton);
    expect(toggleButton.getAttribute('aria-expanded')).toBe('true');
    expect(toggleButton.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('projects-sidebar')).toBeTruthy();
  });

  it('registers a project from FolderPlus action and refreshes project list', async () => {
    setupSuccessfulInvokeMock();
    mockOpen.mockResolvedValue('/tmp/gamma');

    render(<App />);

    await screen.findByRole('button', { name: 'Design Docs' });
    const addButton = screen.getByTestId('projects-add-button');
    expect(addButton.getAttribute('aria-label')).toBe('Add project');
    expect(addButton.hasAttribute('disabled')).toBe(false);

    fireEvent.click(addButton);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('register_project', { rootPath: '/tmp/gamma' });
    });
    await screen.findByRole('button', { name: 'gamma' });
  });

  it('keeps state unchanged when FolderPlus flow is cancelled', async () => {
    setupSuccessfulInvokeMock();
    mockOpen.mockResolvedValue(null);

    render(<App />);

    await screen.findByRole('button', { name: 'Design Docs' });
    const addButton = screen.getByTestId('projects-add-button');
    fireEvent.click(addButton);

    await waitFor(() => {
      const registerCalls = mockInvoke.mock.calls.filter(([command]) => command === 'register_project');
      expect(registerCalls).toHaveLength(0);
      expect(addButton.hasAttribute('disabled')).toBe(false);
    });
    expect(screen.queryByText(/Unable to add project:/)).toBeNull();
  });

  it('shows registration error when FolderPlus register request fails', async () => {
    setupSuccessfulInvokeMock();
    mockOpen.mockResolvedValue('/tmp/alpha');

    const baseInvoke = mockInvoke.getMockImplementation();
    mockInvoke.mockImplementation(async (command, args) => {
      if (command === 'register_project') {
        throw new Error("project registration failed: duplicate root path '/tmp/alpha'.");
      }

      if (!baseInvoke) {
        throw new Error('missing base invoke implementation');
      }

      return await baseInvoke(command, args);
    });

    render(<App />);

    await screen.findByRole('button', { name: 'Design Docs' });
    fireEvent.click(screen.getByTestId('projects-add-button'));

    await screen.findByText(
      "Unable to add project: project registration failed: duplicate root path '/tmp/alpha'."
    );
  });

  it('switches projects and restores per-project selected document state', async () => {
    setupSuccessfulInvokeMock();

    render(<App />);

    await screen.findByRole('button', { name: 'Design Docs' });
    fireEvent.click(screen.getByRole('button', { name: 'Design Docs' }));
    fireEvent.click(screen.getByRole('button', { name: /Core Beliefs/ }));
    await screen.findByRole('heading', { name: 'Core Beliefs', level: 3 });

    fireEvent.click(screen.getByRole('button', { name: 'Beta' }));
    await waitFor(() => {
      expect(screen.getByTestId('active-project-badge').textContent).toBe('Beta');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Plans' }));
    fireEvent.click(screen.getByRole('button', { name: 'active' }));
    fireEvent.click(screen.getByRole('button', { name: /Beta Strategy/ }));
    await screen.findByRole('heading', { name: 'Beta Strategy', level: 3 });
    expect(screen.getByText('Beta strategy body')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Alpha' }));
    await waitFor(() => {
      expect(screen.getByTestId('active-project-badge').textContent).toBe('Alpha');
    });
    await screen.findByRole('heading', { name: 'Core Beliefs', level: 3 });
    expect(screen.getByText(/Beliefs body core core/)).toBeTruthy();
  });

  it('opens ask panel empty state via header toggle when no pending ask exists', async () => {
    setupSuccessfulInvokeMock();

    render(<App />);

    await screen.findByRole('button', { name: 'Design Docs' });
    const askPanelToggle = screen.getByTestId('ask-panel-toggle-button');
    expect(askPanelToggle.getAttribute('aria-label')).toBe('Open ask panel');
    expect(askPanelToggle.getAttribute('aria-controls')).toBe('app-ask-sidebar-panel');
    expect(askPanelToggle.getAttribute('aria-expanded')).toBe('false');
    expect(askPanelToggle.getAttribute('aria-pressed')).toBe('false');
    expect(askPanelToggle.hasAttribute('disabled')).toBe(false);
    expect(screen.queryByTestId('ask-inbox-panel')).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(askPanelToggle);
    expect(askPanelToggle.getAttribute('aria-label')).toBe('Close ask panel');
    expect(askPanelToggle.getAttribute('aria-expanded')).toBe('true');
    expect(askPanelToggle.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('ask-inbox-panel')).toBeTruthy();
    expect(screen.getByRole('complementary', { name: 'Ask sidebar' }).id).toBe(
      'app-ask-sidebar-panel'
    );
    expect(screen.getByText('No pending asks.')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('expands nested folders and loads nested documents from the tree', async () => {
    setupSuccessfulInvokeMock();

    render(<App />);

    await screen.findByRole('button', { name: 'References' });
    expect(screen.queryByText('Slack API Reference')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'References' }));
    fireEvent.click(screen.getByRole('button', { name: 'api' }));

    await screen.findByRole('button', { name: /Slack API Reference/ });
    fireEvent.click(screen.getByRole('button', { name: /Slack API Reference/ }));

    await screen.findByRole('heading', { name: 'Slack API Reference', level: 3 });
    expect(screen.getByText('Slack reference body')).toBeTruthy();
  });

  it('auto-refreshes selected doc after docs_changed event', async () => {
    setupSuccessfulInvokeMock();

    render(<App />);

    await screen.findByRole('button', { name: 'Design Docs' });
    fireEvent.click(screen.getByRole('button', { name: 'Design Docs' }));
    fireEvent.click(screen.getByRole('button', { name: /Core Beliefs/ }));
    await screen.findByRole('heading', { name: 'Core Beliefs', level: 3 });

    const docsChangedHandler = mockListen.mock.calls.find(
      ([eventName]) => eventName === 'docs_changed'
    )?.[1];
    expect(docsChangedHandler).toBeTruthy();

    const getDocDocumentCallCount = (): number =>
      mockInvoke.mock.calls.filter(([command]) => command === 'get_doc_document').length;
    const listDocSummariesCallCount = (): number =>
      mockInvoke.mock.calls.filter(([command]) => command === 'list_doc_summaries').length;

    const initialDocCalls = getDocDocumentCallCount();
    const initialListCalls = listDocSummariesCallCount();

    docsChangedHandler?.({
      event: 'docs_changed',
      id: 1,
      payload: {
        projectId: 'alpha',
        changedDocIds: ['design-docs/core-beliefs.md'],
        removedDocIds: [],
        kinds: ['modified'],
        emittedAtIso: '2026-02-19T00:00:00Z',
      },
    });

    await waitFor(() => {
      expect(listDocSummariesCallCount()).toBeGreaterThan(initialListCalls);
      expect(getDocDocumentCallCount()).toBeGreaterThan(initialDocCalls);
    });
  });

  it('keeps rendered document visible while auto-refresh fetch is in flight', async () => {
    mockIsTauri.mockReturnValue(true);
    mockListen.mockResolvedValue(() => {});

    let holdRefreshFetch = false;
    const pendingRefreshResolvers: Array<(value: DocDocument) => void> = [];
    let activeProjectId = 'alpha';

    mockInvoke.mockImplementation(async (command, args) => {
      if (command === 'list_projects') {
        return projectFixtures;
      }

      if (command === 'get_active_project') {
        return projectFixtures.find((project) => project.projectId === activeProjectId) ?? alphaProject;
      }

      if (command === 'set_active_project') {
        const projectId = (args as { projectId: string } | undefined)?.projectId ?? 'alpha';
        activeProjectId = projectId;
        return projectFixtures.find((project) => project.projectId === projectId) ?? alphaProject;
      }

      if (command === 'list_doc_summaries') {
        return docsByProject[activeProjectId] ?? [];
      }

      if (command === 'get_doc_document') {
        const docId = (args as { docId: string } | undefined)?.docId;
        const documents = documentsByProject[activeProjectId] ?? {};

        if (!docId || !documents[docId]) {
          throw new Error(`unknown document ${docId ?? 'undefined'}`);
        }

        if (docId === 'design-docs/core-beliefs.md' && holdRefreshFetch) {
          return await new Promise<DocDocument>((resolve) => {
            pendingRefreshResolvers.push(resolve);
          });
        }

        return documents[docId];
      }

      if (command === 'get_health_message') {
        return { message: 'ok' };
      }

      if (command === 'list_pending_ask_sessions') {
        return [];
      }

      if (command === 'submit_ask_response') {
        return null;
      }

      throw new Error(`Unexpected command: ${command}`);
    });

    render(<App />);

    await screen.findByRole('button', { name: 'Design Docs' });
    fireEvent.click(screen.getByRole('button', { name: 'Design Docs' }));
    fireEvent.click(screen.getByRole('button', { name: /Core Beliefs/ }));
    await screen.findByRole('heading', { name: 'Core Beliefs', level: 3 });

    const docsChangedHandler = mockListen.mock.calls.find(
      ([eventName]) => eventName === 'docs_changed'
    )?.[1];
    expect(docsChangedHandler).toBeTruthy();

    holdRefreshFetch = true;
    docsChangedHandler?.({
      event: 'docs_changed',
      id: 1,
      payload: {
        projectId: 'alpha',
        changedDocIds: ['design-docs/core-beliefs.md'],
        removedDocIds: [],
        kinds: ['modified'],
        emittedAtIso: '2026-02-19T00:00:00Z',
      },
    });

    await waitFor(() => {
      expect(pendingRefreshResolvers.length).toBeGreaterThan(0);
    });

    expect(screen.getByText(/Beliefs body core core/)).toBeTruthy();
    expect(screen.queryByText('Loading selected document...')).toBeNull();

    const refreshResolver = pendingRefreshResolvers.shift();
    if (!refreshResolver) {
      throw new Error('refresh fetch resolver was not set');
    }

    const refreshedDoc = documentsByProject.alpha?.['design-docs/core-beliefs.md'];
    if (!refreshedDoc) {
      throw new Error('missing core beliefs document fixture');
    }

    (refreshResolver as (value: DocDocument) => void)({
      ...refreshedDoc,
      markdownBody: '## Core\n\nBeliefs body updated',
    });
    holdRefreshFetch = false;

    await waitFor(() => {
      expect(screen.getByText(/Beliefs body updated/)).toBeTruthy();
    });
  });

  it('cleans up docs_changed listener on unmount', async () => {
    setupSuccessfulInvokeMock();
    const unlisten = vi.fn();
    mockListen.mockResolvedValue(unlisten);

    const view = render(<App />);

    await screen.findByRole('button', { name: 'Design Docs' });
    expect(mockListen).toHaveBeenCalled();

    view.unmount();

    expect(unlisten).toHaveBeenCalledTimes(1);
  });

  it('opens find bar with cmd+f and navigates highlight matches', async () => {
    setupSuccessfulInvokeMock();

    render(<App />);

    await screen.findByRole('button', { name: 'Design Docs' });
    fireEvent.click(screen.getByRole('button', { name: 'Design Docs' }));
    fireEvent.click(screen.getByRole('button', { name: /Core Beliefs/ }));
    await screen.findByRole('heading', { name: 'Core Beliefs', level: 3 });

    fireEvent.keyDown(window, { key: 'f', metaKey: true });

    const findInput = await screen.findByTestId('viewer-find-input');
    const findOverlay = screen.getByTestId('viewer-find-overlay');
    const nextButton = screen.getByRole('button', { name: 'Next match' });
    const previousButton = screen.getByRole('button', { name: 'Previous match' });
    expect(document.activeElement).toBe(findInput);
    expect(findOverlay.className).toContain('fixed');
    expect(findOverlay.className).toContain('right-[var(--viewer-find-right-offset)]');
    expect(findOverlay.style.getPropertyValue('--viewer-find-right-offset')).toBe('16px');

    fireEvent.change(findInput, { target: { value: 'core' } });

    const findCounter = await screen.findByTestId('viewer-find-counter');
    await waitFor(() => {
      const counterValue = findCounter.textContent ?? '0/0';
      expect(counterValue).not.toBe('0/0');
      const [current, total] = counterValue.split('/').map((value) => Number(value));
      expect(current).toBeGreaterThanOrEqual(1);
      expect(total).toBeGreaterThan(1);
    });

    const beforeNext = findCounter.textContent;
    fireEvent.click(nextButton);
    await waitFor(() => {
      expect(findCounter.textContent).not.toBe(beforeNext);
    });

    const beforePrevious = findCounter.textContent;
    fireEvent.click(previousButton);
    await waitFor(() => {
      expect(findCounter.textContent).not.toBe(beforePrevious);
    });
  });

  it('shows floating ask sidebar and shifts find overlay left when pending ask exists', async () => {
    setupSuccessfulInvokeMock(pendingAskSessionsFixture);

    render(<App />);

    const docChatPanel = screen.getByRole('complementary', { name: 'Document chat panel' });
    expect(docChatPanel.id).toBe('app-doc-chat-panel');

    const askPanelToggle = await screen.findByTestId('ask-panel-toggle-button');
    const askPanel = await screen.findByTestId('ask-inbox-panel');
    expect(askPanel.className).toContain('fixed');
    expect(askPanel.className).toContain('right-4');
    expect(askPanel.className).toContain('w-[22.5rem]');
    expect(askPanelToggle.getAttribute('aria-label')).toBe('Close ask panel');
    expect(askPanelToggle.getAttribute('aria-pressed')).toBe('true');
    expect(askPanelToggle.hasAttribute('disabled')).toBe(false);
    expect(screen.queryByRole('dialog')).toBeNull();

    await screen.findByRole('button', { name: 'Design Docs' });
    fireEvent.click(screen.getByRole('button', { name: 'Design Docs' }));
    fireEvent.click(screen.getByRole('button', { name: /Core Beliefs/ }));
    await screen.findByRole('heading', { name: 'Core Beliefs', level: 3 });
    expect(
      within(docChatPanel).getByText(/Loaded "Core Beliefs"\. Ask actions stay disabled in this milestone UI\./)
    ).toBeTruthy();

    fireEvent.keyDown(window, { key: 'f', metaKey: true });

    const findOverlay = await screen.findByTestId('viewer-find-overlay');
    expect(findOverlay.style.getPropertyValue('--viewer-find-right-offset')).toBe('392px');

    fireEvent.click(askPanelToggle);

    expect(screen.queryByTestId('ask-inbox-panel')).toBeNull();
    expect(askPanelToggle.getAttribute('aria-label')).toBe('Open ask panel');
    expect(askPanelToggle.getAttribute('aria-expanded')).toBe('false');
    expect(askPanelToggle.getAttribute('aria-pressed')).toBe('false');
    expect(findOverlay.style.getPropertyValue('--viewer-find-right-offset')).toBe('16px');
    expect(screen.getByRole('complementary', { name: 'Document chat panel' })).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(askPanelToggle);

    await screen.findByTestId('ask-inbox-panel');
    expect(askPanelToggle.getAttribute('aria-label')).toBe('Close ask panel');
    expect(askPanelToggle.getAttribute('aria-expanded')).toBe('true');
    expect(askPanelToggle.getAttribute('aria-pressed')).toBe('true');
    expect(findOverlay.style.getPropertyValue('--viewer-find-right-offset')).toBe('392px');
    expect(screen.getByRole('complementary', { name: 'Document chat panel' })).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('debounces find matching until 150ms after typing', async () => {
    setupSuccessfulInvokeMock();

    render(<App />);

    await screen.findByRole('button', { name: 'Design Docs' });
    fireEvent.click(screen.getByRole('button', { name: 'Design Docs' }));
    fireEvent.click(screen.getByRole('button', { name: /Core Beliefs/ }));
    await screen.findByRole('heading', { name: 'Core Beliefs', level: 3 });

    fireEvent.keyDown(window, { key: 'f', metaKey: true });

    const findInput = await screen.findByTestId('viewer-find-input');
    const findCounter = await screen.findByTestId('viewer-find-counter');
    expect(findCounter.textContent).toBe('0/0');

    fireEvent.change(findInput, { target: { value: 'core' } });
    expect(findCounter.textContent).toBe('0/0');

    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 120);
    });
    expect(findCounter.textContent).toBe('0/0');

    await waitFor(() => {
      expect(findCounter.textContent).not.toBe('0/0');
    });
  });

  it('shows no-match state and resets find state on document switch', async () => {
    setupSuccessfulInvokeMock();

    render(<App />);

    await screen.findByRole('button', { name: 'Design Docs' });
    fireEvent.click(screen.getByRole('button', { name: 'Design Docs' }));
    fireEvent.click(screen.getByRole('button', { name: /Core Beliefs/ }));
    await screen.findByRole('heading', { name: 'Core Beliefs', level: 3 });

    fireEvent.keyDown(window, { key: 'f', ctrlKey: true });

    const findInput = await screen.findByTestId('viewer-find-input');
    fireEvent.change(findInput, { target: { value: 'no-match-value' } });

    const findCounter = await screen.findByTestId('viewer-find-counter');
    await waitFor(() => {
      expect(findCounter.textContent).toBe('0/0');
    });

    const nextButton = screen.getByRole('button', { name: 'Next match' });
    const previousButton = screen.getByRole('button', { name: 'Previous match' });
    expect((nextButton as HTMLButtonElement).disabled).toBe(true);
    expect((previousButton as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Plans' }));
    fireEvent.click(screen.getByRole('button', { name: /active$/ }));
    await screen.findByRole('button', { name: /Execution Plan/ });
    fireEvent.click(screen.getByRole('button', { name: /Execution Plan/ }));

    await screen.findByRole('heading', { name: 'Execution Plan', level: 3 });
    expect(screen.queryByTestId('viewer-find-input')).toBeNull();
  });
});
