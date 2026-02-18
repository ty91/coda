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

const visibleSummaries: DocSummary[] = [coreBeliefsSummary, executionPlanSummary];

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

const documents: Record<string, DocDocument> = {
  'design-docs/core-beliefs.md': {
    ...coreBeliefsSummary,
    markdownBody: '## Core\n\nBeliefs body',
  },
  'plans/active/2026-02-18-exec.md': {
    ...executionPlanSummary,
    markdownBody: '## Plan\n\nExecution body',
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
  it('loads docs and allows selecting another document', async () => {
    setupSuccessfulInvokeMock();

    render(<App />);

    await screen.findByRole('heading', { name: 'Core Beliefs', level: 3 });
    expect(screen.getByText('Beliefs body')).toBeTruthy();

    const selector = screen.getByLabelText('Document');
    fireEvent.change(selector, { target: { value: 'plans/active/2026-02-18-exec.md' } });

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

    await screen.findByRole('option', {
      name: 'Core Beliefs (design-docs/core-beliefs.md)',
    });
    expect(screen.queryByRole('option', { name: 'template (plans/.template.md)' })).toBeNull();

    fireEvent.click(screen.getByLabelText('Show hidden/template docs'));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('list_doc_summaries', { includeHidden: true });
    });
    await screen.findByRole('option', {
      name: 'template (plans/.template.md)',
    });
  });
});
