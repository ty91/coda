// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ChatPanel, type ChatPanelMessage } from './ChatPanel';

const chatMessagesFixture: ChatPanelMessage[] = [
  {
    id: 'assistant-1',
    role: 'assistant',
    author: 'Coda',
    body: 'Reader context loaded. Ready for document questions.',
    timestampLabel: '09:40',
  },
  {
    id: 'user-1',
    role: 'user',
    author: 'You',
    body: 'Summarize the design tensions section.',
    timestampLabel: '09:41',
  },
];

describe('ChatPanel', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders compound slots as one panel surface', () => {
    render(
      <ChatPanel.Root panelId="docs-chat" ariaLabel="Document chat">
        <ChatPanel.Header
          title="Document Chat"
          description="Ask-like chat preview area for M1 layout."
          statusLabel="UI placeholder"
        />
        <ChatPanel.Messages items={chatMessagesFixture} />
        <ChatPanel.Composer />
      </ChatPanel.Root>
    );

    const panel = screen.getByRole('complementary', { name: 'Document chat' });
    expect(panel.id).toBe('docs-chat');
    expect(panel.className).toContain('grid-rows-[auto_minmax(0,1fr)_auto]');
    expect(screen.getByRole('heading', { level: 2, name: 'Document Chat' })).toBeTruthy();
    expect(screen.getByText('Reader context loaded. Ready for document questions.')).toBeTruthy();
    expect(screen.getByText('Summarize the design tensions section.')).toBeTruthy();
    expect(screen.getByTestId('chat-panel-messages').className).toContain('overflow-y-auto');
    expect(screen.getByRole('button', { name: 'Send' }).hasAttribute('disabled')).toBe(true);
  });

  it('shows empty-state message when no chat items exist', () => {
    render(
      <ChatPanel.Root>
        <ChatPanel.Header title="Document Chat" />
        <ChatPanel.Messages items={[]} emptyLabel="No local chat history yet." />
        <ChatPanel.Composer />
      </ChatPanel.Root>
    );

    expect(screen.getByText('No local chat history yet.')).toBeTruthy();
    expect(screen.getByLabelText('Chat message input placeholder')).toBeTruthy();
  });
});
