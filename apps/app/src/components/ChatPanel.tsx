import { type ReactElement, type ReactNode } from 'react';
import { panelSurfaceClass } from '../ui-classes';

type ChatPanelRootProps = {
  children: ReactNode;
  className?: string;
  panelId?: string;
  ariaLabel?: string;
};

type ChatPanelHeaderProps = {
  title: string;
  description?: string;
  statusLabel?: string;
};

type ChatMessageRole = 'assistant' | 'user';

export type ChatPanelMessage = {
  id: string;
  role: ChatMessageRole;
  author: string;
  body: string;
  timestampLabel: string;
};

type ChatPanelMessagesProps = {
  items: ChatPanelMessage[];
  emptyLabel?: string;
};

type ChatPanelComposerProps = {
  inputPlaceholder?: string;
  hintLabel?: string;
  submitLabel?: string;
};

const cx = (...values: Array<string | undefined>): string => {
  return values.filter((value) => Boolean(value)).join(' ');
};

const roleBadgeClassName = (role: ChatMessageRole): string => {
  if (role === 'assistant') {
    return 'border-[#cfd3ca] bg-[#f0f2ec] text-coda-text-primary';
  }

  return 'border-[#d7d2c6] bg-[#f5f1e8] text-coda-text-primary';
};

const ChatPanelRoot = ({
  children,
  className,
  panelId,
  ariaLabel = 'Document chat panel',
}: ChatPanelRootProps): ReactElement => {
  return (
    <section
      id={panelId}
      role="complementary"
      aria-label={ariaLabel}
      className={cx(
        `${panelSurfaceClass} grid h-full min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden border border-coda-line-soft bg-[#fbfbf8f2]`,
        className
      )}
      data-testid="chat-panel-root"
    >
      {children}
    </section>
  );
};

const ChatPanelHeader = ({
  title,
  description,
  statusLabel = 'UI placeholder',
}: ChatPanelHeaderProps): ReactElement => {
  return (
    <header className="border-b border-coda-line-soft px-4 py-3">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <h2 className="text-[0.8125rem] font-semibold tracking-[0.02em] text-coda-text-primary">
          {title}
        </h2>
        <span className="rounded-full border border-coda-line-soft px-2 py-[0.12rem] text-[0.625rem] font-medium tracking-[0.01em] text-coda-text-secondary">
          {statusLabel}
        </span>
      </div>

      {description ? (
        <p className="text-[0.75rem] leading-[1.45] text-coda-text-secondary">{description}</p>
      ) : null}
    </header>
  );
};

const ChatPanelMessages = ({
  items,
  emptyLabel = 'No chat messages yet.',
}: ChatPanelMessagesProps): ReactElement => {
  if (items.length === 0) {
    return (
      <div
        className="grid h-full min-h-0 content-center px-4 py-4"
        data-testid="chat-panel-messages"
      >
        <p className="text-[0.75rem] text-coda-text-secondary">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <ol className="grid min-h-0 content-start gap-2 overflow-y-auto px-4 py-4" data-testid="chat-panel-messages">
      {items.map((item) => (
        <li key={item.id} className="rounded-coda-md border border-coda-line-soft bg-white/90 p-2.5">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span
              className={cx(
                'rounded-full border px-1.5 py-[0.08rem] text-[0.625rem] font-medium tracking-[0.01em]',
                roleBadgeClassName(item.role)
              )}
            >
              {item.role}
            </span>
            <span className="font-mono text-[0.625rem] text-coda-text-muted">{item.timestampLabel}</span>
          </div>
          <p className="mb-1 text-[0.6875rem] font-medium text-coda-text-primary">{item.author}</p>
          <p className="text-[0.75rem] leading-[1.45] text-coda-text-primary">{item.body}</p>
        </li>
      ))}
    </ol>
  );
};

const ChatPanelComposer = ({
  inputPlaceholder = 'Write a message (coming soon)...',
  hintLabel = 'UI-only placeholder. Send/IPC disabled in M1.',
  submitLabel = 'Send',
}: ChatPanelComposerProps): ReactElement => {
  return (
    <footer className="border-t border-coda-line-soft px-4 py-3" data-testid="chat-panel-composer">
      <div className="grid gap-2">
        <label className="text-[0.6875rem] font-medium text-coda-text-secondary" htmlFor="doc-chat-composer">
          Message
        </label>
        <div className="flex items-center gap-2">
          <input
            id="doc-chat-composer"
            type="text"
            className="h-8 w-full rounded-[0.5rem] border border-coda-line-soft bg-[#f5f5f2] px-2 text-[0.75rem] text-coda-text-secondary"
            placeholder={inputPlaceholder}
            disabled
            aria-label="Chat message input placeholder"
          />
          <button
            type="button"
            className="h-8 rounded-[0.5rem] border border-coda-line-soft px-2.5 text-[0.75rem] font-medium text-coda-text-secondary disabled:opacity-65"
            disabled
          >
            {submitLabel}
          </button>
        </div>
        <p className="text-[0.6875rem] leading-[1.4] text-coda-text-muted">{hintLabel}</p>
      </div>
    </footer>
  );
};

export const ChatPanel = {
  Root: ChatPanelRoot,
  Header: ChatPanelHeader,
  Messages: ChatPanelMessages,
  Composer: ChatPanelComposer,
} as const;
