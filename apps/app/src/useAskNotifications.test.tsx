// @vitest-environment jsdom

import { type ReactElement } from 'react';
import { cleanup, render, waitFor } from '@testing-library/react';
import { isTauri } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import {
  isPermissionGranted,
  onAction,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAskNotifications } from './useAskNotifications';

vi.mock('@tauri-apps/api/core', () => ({
  isTauri: vi.fn(() => true),
}));
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(),
}));
vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: vi.fn(),
}));
vi.mock('@tauri-apps/plugin-notification', () => ({
  isPermissionGranted: vi.fn(),
  onAction: vi.fn(),
  requestPermission: vi.fn(),
  sendNotification: vi.fn(),
}));

const mockIsTauri = vi.mocked(isTauri);
const mockListen = vi.mocked(listen);
const mockGetCurrentWindow = vi.mocked(getCurrentWindow);
const mockIsPermissionGranted = vi.mocked(isPermissionGranted);
const mockOnAction = vi.mocked(onAction);
const mockRequestPermission = vi.mocked(requestPermission);
const mockSendNotification = vi.mocked(sendNotification);

const setUserAgent = (value: string): void => {
  Object.defineProperty(window.navigator, 'userAgent', {
    configurable: true,
    value,
  });
};

const HookHarness = (): ReactElement => {
  useAskNotifications();
  return <div data-testid="hook-harness" />;
};

beforeEach(() => {
  setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6)');
  mockIsTauri.mockReturnValue(true);
  mockListen.mockResolvedValue(() => {});
  mockIsPermissionGranted.mockResolvedValue(true);
  mockRequestPermission.mockResolvedValue('granted');
  mockSendNotification.mockImplementation(() => {});
  mockOnAction.mockResolvedValue({
    plugin: 'notification',
    event: 'actionPerformed',
    channelId: 1,
    unregister: vi.fn().mockResolvedValue(undefined),
  } as never);
  mockGetCurrentWindow.mockReturnValue({
    unminimize: vi.fn().mockResolvedValue(undefined),
    show: vi.fn().mockResolvedValue(undefined),
    setFocus: vi.fn().mockResolvedValue(undefined),
  } as never);
});

afterEach(() => {
  mockIsTauri.mockReset();
  mockListen.mockReset();
  mockGetCurrentWindow.mockReset();
  mockIsPermissionGranted.mockReset();
  mockOnAction.mockReset();
  mockRequestPermission.mockReset();
  mockSendNotification.mockReset();
  cleanup();
});

describe('useAskNotifications', () => {
  it('sends one notification for a new ask event and appends ellipsis preview', async () => {
    render(<HookHarness />);

    await waitFor(() => {
      expect(mockListen).toHaveBeenCalledWith('ask_session_created', expect.any(Function));
    });

    const askEventHandler = mockListen.mock.calls[0]?.[1];
    expect(askEventHandler).toBeTruthy();

    askEventHandler?.({
      event: 'ask_session_created',
      id: 1,
      payload: {
        askId: 'ask-1',
        requestedAtIso: '2026-02-19T16:00:00Z',
        firstQuestionText: 'Can we ship scope A this sprint?',
      },
    });

    await waitFor(() => {
      expect(mockSendNotification).toHaveBeenCalledTimes(1);
      expect(mockSendNotification).toHaveBeenCalledWith({
        title: 'New ask needs your response',
        body: 'Can we ship scope A this sprint?...',
      });
    });
  });

  it('deduplicates repeated ask_id events', async () => {
    render(<HookHarness />);
    await waitFor(() => {
      expect(mockListen).toHaveBeenCalled();
    });

    const askEventHandler = mockListen.mock.calls[0]?.[1];
    if (!askEventHandler) {
      throw new Error('ask event handler should be registered');
    }

    const payload = {
      askId: 'ask-dedupe',
      requestedAtIso: '2026-02-19T16:00:00Z',
      firstQuestionText: 'Do we pause deployment?',
    };

    askEventHandler({ event: 'ask_session_created', id: 1, payload });
    askEventHandler({ event: 'ask_session_created', id: 2, payload });

    await waitFor(() => {
      expect(mockSendNotification).toHaveBeenCalledTimes(1);
    });
  });

  it('no-ops on non-macOS platforms', async () => {
    setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');

    render(<HookHarness />);

    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 0);
    });

    expect(mockListen).not.toHaveBeenCalled();
    expect(mockOnAction).not.toHaveBeenCalled();
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it('handles denied permission without crashing or sending notifications', async () => {
    mockIsPermissionGranted.mockResolvedValue(false);
    mockRequestPermission.mockResolvedValue('denied');

    render(<HookHarness />);
    await waitFor(() => {
      expect(mockListen).toHaveBeenCalled();
    });

    const askEventHandler = mockListen.mock.calls[0]?.[1];
    if (!askEventHandler) {
      throw new Error('ask event handler should be registered');
    }

    askEventHandler({
      event: 'ask_session_created',
      id: 1,
      payload: {
        askId: 'ask-permission-denied',
        requestedAtIso: '2026-02-19T16:00:00Z',
        firstQuestionText: 'Need approval to proceed?',
      },
    });

    await waitFor(() => {
      expect(mockRequestPermission).toHaveBeenCalledTimes(1);
    });
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it('focuses the app window when notification action fires', async () => {
    render(<HookHarness />);

    await waitFor(() => {
      expect(mockOnAction).toHaveBeenCalledTimes(1);
    });

    const actionHandler = mockOnAction.mock.calls[0]?.[0];
    expect(actionHandler).toBeTruthy();

    actionHandler?.({
      title: 'irrelevant',
    });

    await waitFor(() => {
      const currentWindow = mockGetCurrentWindow.mock.results[0]?.value;
      expect(currentWindow?.unminimize).toHaveBeenCalledTimes(1);
      expect(currentWindow?.show).toHaveBeenCalledTimes(1);
      expect(currentWindow?.setFocus).toHaveBeenCalledTimes(1);
    });
  });
});
