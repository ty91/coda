// @vitest-environment jsdom

import { invoke, isTauri } from '@tauri-apps/api/core';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AskInboxPanel } from './AskInboxPanel';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
  isTauri: vi.fn(() => true),
}));

const mockInvoke = vi.mocked(invoke);
const mockIsTauri = vi.mocked(isTauri);

type PendingAskSession = {
  askId: string;
  request: {
    questions: Array<{
      header: string;
      id: string;
      question: string;
      options: Array<{ label: string; description: string }>;
    }>;
    note?: {
      label: string;
      required: boolean;
    };
  };
  requestedAtIso: string;
  timeoutMs: number;
  expiresAtIso: string | null;
  isExpired: boolean;
};

const buildSession = (overrides: Partial<PendingAskSession> = {}): PendingAskSession => {
  return {
    askId: 'ask-1',
    request: {
      questions: [
        {
          header: 'Scope',
          id: 'scope_choice',
          question: 'Choose scope?',
          options: [
            {
              label: 'Ship now (Recommended)',
              description: 'Fast path',
            },
            {
              label: 'Expand',
              description: 'Broad path',
            },
          ],
        },
      ],
      note: {
        label: 'Reason',
        required: true,
      },
    },
    requestedAtIso: '2026-02-19T14:00:00Z',
    timeoutMs: 0,
    expiresAtIso: null,
    isExpired: false,
    ...overrides,
  };
};

const setupInvokeWithSessions = (sessions: PendingAskSession[]): void => {
  const mutableSessions = [...sessions];

  mockInvoke.mockImplementation(async (command, args) => {
    if (command === 'list_pending_ask_sessions') {
      return mutableSessions;
    }

    if (command === 'submit_ask_response') {
      const payload = (args as { payload: { ask_id: string } }).payload;
      const sessionIndex = mutableSessions.findIndex((session) => session.askId === payload.ask_id);
      if (sessionIndex >= 0) {
        mutableSessions.splice(sessionIndex, 1);
      }
      return null;
    }

    throw new Error(`Unexpected command: ${command}`);
  });
};

afterEach(() => {
  vi.useRealTimers();
  mockInvoke.mockReset();
  mockIsTauri.mockReset();
  cleanup();
});

describe('AskInboxPanel', () => {
  it('does not render panel when no pending asks exist', async () => {
    mockIsTauri.mockReturnValue(true);
    setupInvokeWithSessions([]);

    render(<AskInboxPanel />);

    await waitFor(() => {
      expect(screen.queryByTestId('ask-inbox-panel')).toBeNull();
    });
  });

  it('reveals panel when a pending ask arrives after initial empty poll', async () => {
    mockIsTauri.mockReturnValue(true);
    const onPendingCountChange = vi.fn();
    let listCallCount = 0;

    mockInvoke.mockImplementation(async (command) => {
      if (command === 'list_pending_ask_sessions') {
        listCallCount += 1;
        return listCallCount === 1 ? [] : [buildSession()];
      }
      if (command === 'submit_ask_response') {
        return null;
      }
      throw new Error(`Unexpected command: ${command}`);
    });

    render(<AskInboxPanel onPendingCountChange={onPendingCountChange} />);

    await waitFor(() => {
      expect(screen.queryByTestId('ask-inbox-panel')).toBeNull();
    });

    await screen.findByTestId('ask-inbox-panel', {}, { timeout: 3000 });

    expect(onPendingCountChange).toHaveBeenCalledWith(0);
    expect(onPendingCountChange).toHaveBeenCalledWith(1);
  });

  it('keeps panel hidden when pending queue load fails', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      mockIsTauri.mockReturnValue(true);

      mockInvoke.mockImplementation(async (command) => {
        if (command === 'list_pending_ask_sessions') {
          throw new Error('queue down');
        }
        if (command === 'submit_ask_response') {
          return null;
        }
        throw new Error(`Unexpected command: ${command}`);
      });

      render(<AskInboxPanel />);

      await waitFor(() => {
        expect(warnSpy).toHaveBeenCalled();
        expect(screen.queryByTestId('ask-inbox-panel')).toBeNull();
      });
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('submits answered payload with option and other selections plus note', async () => {
    const session = buildSession({
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
          {
            header: 'Risk',
            id: 'risk_choice',
            question: 'Risk level?',
            options: [
              { label: 'Low (Recommended)', description: 'Low delivery risk' },
              { label: 'High', description: 'High delivery risk' },
            ],
          },
        ],
        note: {
          label: 'Reason',
          required: true,
        },
      },
    });

    mockIsTauri.mockReturnValue(true);
    setupInvokeWithSessions([session]);

    render(<AskInboxPanel />);

    await screen.findByText('ask-1');

    fireEvent.click(screen.getByRole('radio', { name: /Ship now \(Recommended\)/ }));
    const otherRadios = screen.getAllByRole('radio', { name: /^Other$/ });
    const secondOtherRadio = otherRadios[1];
    if (!secondOtherRadio) {
      throw new Error('expected second Other radio option');
    }
    fireEvent.click(secondOtherRadio);
    fireEvent.change(screen.getByPlaceholderText('Provide a custom answer'), {
      target: { value: 'Medium risk due dependency' },
    });
    fireEvent.change(screen.getByLabelText('Reason (required)'), {
      target: { value: '  aligns with release scope  ' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      const submitCall = mockInvoke.mock.calls.find(([command]) => command === 'submit_ask_response');
      expect(submitCall).toBeTruthy();
    });

    const submitCall = mockInvoke.mock.calls.find(([command]) => command === 'submit_ask_response');
    expect(submitCall).toBeTruthy();

    if (!submitCall) {
      throw new Error('submit call missing');
    }

    const payload = (submitCall[1] as { payload: Record<string, unknown> }).payload;
    expect(payload.status).toBe('answered');
    expect(payload.note).toBe('aligns with release scope');
    expect(payload.answers).toEqual([
      {
        id: 'scope_choice',
        selected_label: 'Ship now (Recommended)',
        selected_index: 0,
        used_other: false,
        other_text: null,
      },
      {
        id: 'risk_choice',
        selected_label: 'Other',
        selected_index: null,
        used_other: true,
        other_text: 'Medium risk due dependency',
      },
    ]);
  });

  it('shows soft-cap warning for asks with more than 4 questions but still renders them', async () => {
    const questions = Array.from({ length: 5 }, (_, index) => ({
      header: `Q${index + 1}`,
      id: `q_${index + 1}`,
      question: `Question ${index + 1}?`,
      options: [
        { label: 'Yes (Recommended)', description: 'Recommended path' },
        { label: 'No', description: 'Alternative path' },
      ],
    }));

    mockIsTauri.mockReturnValue(true);
    setupInvokeWithSessions([
      buildSession({
        request: {
          questions,
        },
      }),
    ]);

    render(<AskInboxPanel />);

    await screen.findByText('Soft cap notice: this ask contains more than 4 questions.');
    expect(screen.getByText('Q5: Question 5?')).toBeTruthy();
  });

  it('disables submit and cancel actions for expired asks', async () => {
    mockIsTauri.mockReturnValue(true);
    setupInvokeWithSessions([
      buildSession({
        isExpired: true,
        timeoutMs: 1000,
        expiresAtIso: '2026-02-19T14:00:01Z',
      }),
    ]);

    render(<AskInboxPanel />);

    await screen.findByText('This ask has expired. Submit and cancel are disabled.');

    const submitButton = screen.getByRole('button', { name: 'Submit' }) as HTMLButtonElement;
    const cancelButton = screen.getByRole('button', { name: 'Cancel' }) as HTMLButtonElement;

    expect(submitButton.disabled).toBe(true);
    expect(cancelButton.disabled).toBe(true);

    expect(
      mockInvoke.mock.calls.some(([command]) => command === 'submit_ask_response')
    ).toBe(false);
  });

  it('submits cancelled status when cancel is clicked', async () => {
    mockIsTauri.mockReturnValue(true);
    setupInvokeWithSessions([buildSession()]);

    render(<AskInboxPanel />);

    await screen.findByText('ask-1');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      const submitCall = mockInvoke.mock.calls.find(([command]) => command === 'submit_ask_response');
      expect(submitCall).toBeTruthy();
    });

    const submitCall = mockInvoke.mock.calls.find(([command]) => command === 'submit_ask_response');
    if (!submitCall) {
      throw new Error('cancel submit call missing');
    }

    const payload = (submitCall[1] as { payload: Record<string, unknown> }).payload;

    expect(payload.status).toBe('cancelled');
    expect(payload.answers).toEqual([]);
  });
});
