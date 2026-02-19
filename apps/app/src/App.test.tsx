// @vitest-environment jsdom

import type { DocDocument, DocSummary } from '@coda/core/contracts';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { App } from './App';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
  isTauri: vi.fn(() => true),
}));
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(),
}));

const mockInvoke = vi.mocked(invoke);
const mockIsTauri = vi.mocked(isTauri);
const mockListen = vi.mocked(listen);

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

const documents: Record<string, DocDocument> = {
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
};

const setupSuccessfulInvokeMock = (): void => {
  mockIsTauri.mockReturnValue(true);
  mockListen.mockResolvedValue(() => {});

  mockInvoke.mockImplementation(async (command, args) => {
    if (command === 'list_doc_summaries') {
      expect(args).toBeUndefined();
      return visibleSummaries;
    }

    if (command === 'get_doc_document') {
      const docId = (args as { docId: string } | undefined)?.docId;
      if (!docId || !documents[docId]) {
        throw new Error(`unknown document ${docId ?? 'undefined'}`);
      }
      return documents[docId];
    }

    if (command === 'get_health_message') {
      return { message: 'ok' };
    }

    throw new Error(`Unexpected command: ${command}`);
  });
};

afterEach(() => {
  mockInvoke.mockReset();
  mockIsTauri.mockReset();
  mockListen.mockReset();
  cleanup();
});

describe('App docs viewer', () => {
  it('marks sidebar and reader surfaces as tauri drag regions', async () => {
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

    const sidebar = screen.getByLabelText('Documentation sidebar');
    const readerHeading = screen.getByRole('heading', { name: 'Reader', level: 2 });
    const readerSurface = readerHeading.closest('section');
    const refreshButton = screen.getByRole('button', { name: 'Refresh docs list' });
    const sidebarDragRegion = screen.getByTestId('sidebar-drag-region');
    const viewerDragRegion = screen.getByTestId('viewer-drag-region');

    expect(sidebarDragRegion.hasAttribute('data-tauri-drag-region')).toBe(true);
    expect(viewerDragRegion.hasAttribute('data-tauri-drag-region')).toBe(true);
    expect(sidebar.hasAttribute('data-tauri-drag-region')).toBe(false);
    expect(readerSurface?.hasAttribute('data-tauri-drag-region')).toBe(false);
    expect(refreshButton.hasAttribute('data-tauri-drag-region')).toBe(false);
    expect(document.querySelectorAll('[data-tauri-drag-region]')).toHaveLength(2);
  });

  it('loads docs and allows selecting another document from the sidebar', async () => {
    setupSuccessfulInvokeMock();

    render(<App />);

    await screen.findByRole('button', { name: 'Design Docs' });
    fireEvent.click(screen.getByRole('button', { name: 'Design Docs' }));
    fireEvent.click(screen.getByRole('button', { name: /Core Beliefs/ }));

    await screen.findByRole('heading', { name: 'Core Beliefs', level: 3 });
    expect(screen.getByText(/Beliefs body/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Plans' }));
    fireEvent.click(screen.getByRole('button', { name: /active$/ }));
    await screen.findByRole('button', { name: /Execution Plan/ });
    fireEvent.click(screen.getByRole('button', { name: /Execution Plan/ }));

    await screen.findByRole('heading', { name: 'Execution Plan', level: 3 });
    expect(screen.getByText('Execution body')).toBeTruthy();
  });

  it('shows list error state when docs fetch fails', async () => {
    mockInvoke.mockImplementation(async (command) => {
      if (command === 'list_doc_summaries') {
        throw new Error('list failed');
      }
      if (command === 'get_health_message') {
        return { message: 'ok' };
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

  it('reloads docs when icon refresh control is clicked', async () => {
    setupSuccessfulInvokeMock();

    render(<App />);

    await screen.findByRole('button', { name: 'Design Docs' });
    expect(screen.getByRole('button', { name: 'Refresh docs list' })).toBeTruthy();

    const getListDocSummaryCallCount = (): number =>
      mockInvoke.mock.calls.filter(([command]) => command === 'list_doc_summaries').length;

    expect(getListDocSummaryCallCount()).toBe(1);

    fireEvent.click(screen.getByRole('button', { name: 'Refresh docs list' }));

    await waitFor(() => {
      expect(getListDocSummaryCallCount()).toBe(2);
    });
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

    mockInvoke.mockImplementation(async (command, args) => {
      if (command === 'list_doc_summaries') {
        return visibleSummaries;
      }

      if (command === 'get_doc_document') {
        const docId = (args as { docId: string } | undefined)?.docId;
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

    const refreshedDoc = documents['design-docs/core-beliefs.md'];
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
    expect(document.activeElement).toBe(findInput);

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
    fireEvent.click(screen.getByRole('button', { name: 'Next match' }));
    await waitFor(() => {
      expect(findCounter.textContent).not.toBe(beforeNext);
    });

    const beforePrevious = findCounter.textContent;
    fireEvent.click(screen.getByRole('button', { name: 'Previous match' }));
    await waitFor(() => {
      expect(findCounter.textContent).not.toBe(beforePrevious);
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
