// @vitest-environment jsdom

import type { DocDocument, DocSummary } from '@coda/core/contracts';
import { invoke } from '@tauri-apps/api/core';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { App } from './App';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

const mockInvoke = vi.mocked(invoke);

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

const hiddenTemplateSummary: DocSummary = {
  id: 'plans/.template.md',
  fileName: '.template.md',
  docPath: 'plans/.template.md',
  relativePath: 'docs/plans/.template.md',
  section: 'plans',
  title: null,
  displayTitle: 'template',
  date: null,
  status: 'draft',
  tags: [],
  milestone: null,
  isTemplate: true,
  isHidden: true,
};

const visibleSummaries: DocSummary[] = [coreBeliefsSummary, executionPlanSummary, slackReferenceSummary];

const documents: Record<string, DocDocument> = {
  'design-docs/core-beliefs.md': {
    ...coreBeliefsSummary,
    markdownBody: '## Core\n\nBeliefs body',
  },
  'plans/active/2026-02-18-exec.md': {
    ...executionPlanSummary,
    markdownBody: '## Plan\n\nExecution body',
  },
  'references/api/slack.md': {
    ...slackReferenceSummary,
    markdownBody: '## Slack\n\nSlack reference body',
  },
  'plans/.template.md': {
    ...hiddenTemplateSummary,
    markdownBody: '## Goal\n\nTemplate body',
  },
};

const setupSuccessfulInvokeMock = (): void => {
  mockInvoke.mockImplementation(async (command, args) => {
    if (command === 'list_doc_summaries') {
      const includeHidden = (args as { includeHidden?: boolean } | undefined)?.includeHidden ?? false;
      if (includeHidden) {
        return [...visibleSummaries, hiddenTemplateSummary];
      }
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
  cleanup();
});

describe('App docs viewer', () => {
  it('does not render an extra title overlay strip layer', async () => {
    setupSuccessfulInvokeMock();

    render(<App />);

    await screen.findByRole('heading', { name: 'Core Beliefs', level: 3 });
    expect(document.querySelector('[data-tauri-drag-region]')).toBeNull();
  });

  it('loads docs and allows selecting another document from the sidebar', async () => {
    setupSuccessfulInvokeMock();

    render(<App />);

    await screen.findByRole('heading', { name: 'Core Beliefs', level: 3 });
    expect(screen.getByText('Beliefs body')).toBeTruthy();

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

  it('reloads docs with hidden/template files when filter is enabled', async () => {
    setupSuccessfulInvokeMock();

    render(<App />);

    await screen.findByRole('heading', { name: 'Core Beliefs', level: 3 });
    expect(screen.queryByText('template')).toBeNull();

    fireEvent.click(screen.getByLabelText('Show hidden/template docs'));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('list_doc_summaries', { includeHidden: true });
    });
    await screen.findByText('template');
  });

  it('reloads docs when icon refresh control is clicked', async () => {
    setupSuccessfulInvokeMock();

    render(<App />);

    await screen.findByRole('heading', { name: 'Core Beliefs', level: 3 });
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

    await screen.findByRole('heading', { name: 'Core Beliefs', level: 3 });
    expect(screen.queryByText('Slack API Reference')).toBeNull();

    fireEvent.click(screen.getByText('api'));

    await screen.findByText('Slack API Reference');
    fireEvent.click(screen.getByText('Slack API Reference'));

    await screen.findByRole('heading', { name: 'Slack API Reference', level: 3 });
    expect(screen.getByText('Slack reference body')).toBeTruthy();
  });
});
