import { describe, expect, it } from 'vitest';

import {
  parseAskRequestBatch,
  parseAskRequestBatchJson,
  parseAskResponseBatch,
  parseNonEmptyDescription,
  parseStatusOptions,
} from './validation.js';

describe('parseNonEmptyDescription', () => {
  it('returns trimmed text for valid input', () => {
    expect(parseNonEmptyDescription('  scaffold  ')).toBe('scaffold');
  });

  it('throws for blank input', () => {
    expect(() => parseNonEmptyDescription('   ')).toThrow('value must not be empty');
  });
});

describe('parseStatusOptions', () => {
  it('defaults to json=false', () => {
    expect(parseStatusOptions({})).toEqual({ json: false });
  });
});

describe('parseAskRequestBatch', () => {
  it('parses valid ask request payload', () => {
    const parsed = parseAskRequestBatch({
      questions: [
        {
          header: 'Scope',
          id: 'scope_choice',
          question: 'Which scope should we apply?',
          options: [
            {
              label: 'Ship now (Recommended)',
              description: 'Keep current scope and deliver quickly.',
            },
            {
              label: 'Expand',
              description: 'Add adjacent improvements.',
            },
          ],
        },
      ],
      note: {
        label: 'Reason',
      },
    });

    expect(parsed.questions).toHaveLength(1);
    expect(parsed.note).toEqual({ label: 'Reason', required: false });
  });

  it('throws when question ids are duplicated', () => {
    expect(() =>
      parseAskRequestBatch({
        questions: [
          {
            header: 'One',
            id: 'same_id',
            question: 'First question?',
            options: [
              { label: 'A', description: 'alpha' },
              { label: 'B', description: 'beta' },
            ],
          },
          {
            header: 'Two',
            id: 'same_id',
            question: 'Second question?',
            options: [
              { label: 'A', description: 'alpha' },
              { label: 'B', description: 'beta' },
            ],
          },
        ],
      })
    ).toThrow('duplicate question id: same_id');
  });

  it('throws when options count is below minimum', () => {
    expect(() =>
      parseAskRequestBatch({
        questions: [
          {
            header: 'Scope',
            id: 'scope',
            question: 'Pick one?',
            options: [{ label: 'Only one', description: 'not enough options' }],
          },
        ],
      })
    ).toThrow('options must contain at least 2 entries');
  });

  it('throws when header exceeds 12 characters', () => {
    expect(() =>
      parseAskRequestBatch({
        questions: [
          {
            header: 'Header too long',
            id: 'scope',
            question: 'Pick one?',
            options: [
              { label: 'A', description: 'alpha' },
              { label: 'B', description: 'beta' },
            ],
          },
        ],
      })
    ).toThrow('header must be 12 characters or fewer');
  });

  it('throws when id is not snake_case', () => {
    expect(() =>
      parseAskRequestBatch({
        questions: [
          {
            header: 'Scope',
            id: 'ScopeChoice',
            question: 'Pick one?',
            options: [
              { label: 'A', description: 'alpha' },
              { label: 'B', description: 'beta' },
            ],
          },
        ],
      })
    ).toThrow('id must be snake_case');
  });

  it('throws when recommended marker is not a suffix', () => {
    expect(() =>
      parseAskRequestBatch({
        questions: [
          {
            header: 'Scope',
            id: 'scope',
            question: 'Pick one?',
            options: [
              { label: 'Recommended: A', description: 'alpha' },
              { label: 'B', description: 'beta' },
            ],
          },
        ],
      })
    ).toThrow(/recommended option labels must use/);
  });
});

describe('parseAskRequestBatchJson', () => {
  it('throws for malformed JSON payload', () => {
    expect(() => parseAskRequestBatchJson('{"questions": [}')).toThrow('invalid ask request JSON');
  });

  it('throws for empty JSON text', () => {
    expect(() => parseAskRequestBatchJson('   ')).toThrow('ask request JSON must not be empty');
  });
});

describe('parseAskResponseBatch', () => {
  it('parses valid ask response payload', () => {
    const parsed = parseAskResponseBatch({
      ask_id: 'ask-123',
      answers: [
        {
          id: 'scope_choice',
          selected_label: 'Ship now (Recommended)',
          selected_index: 0,
          used_other: false,
          other_text: null,
        },
      ],
      note: 'Ship this iteration.',
      status: 'answered',
      answered_at_iso: '2026-02-19T04:00:00.000Z',
      source: 'tauri-ui',
    });

    expect(parsed.status).toBe('answered');
    expect(parsed.source).toBe('tauri-ui');
  });

  it('throws when used_other=true but other_text is null', () => {
    expect(() =>
      parseAskResponseBatch({
        ask_id: 'ask-123',
        answers: [
          {
            id: 'scope_choice',
            selected_label: 'Other',
            selected_index: null,
            used_other: true,
            other_text: null,
          },
        ],
        note: null,
        status: 'answered',
        answered_at_iso: '2026-02-19T04:00:00.000Z',
        source: 'tauri-ui',
      })
    ).toThrow('other_text is required when used_other is true');
  });

  it('throws when used_other=false but other_text is provided', () => {
    expect(() =>
      parseAskResponseBatch({
        ask_id: 'ask-123',
        answers: [
          {
            id: 'scope_choice',
            selected_label: 'Ship now',
            selected_index: 0,
            used_other: false,
            other_text: 'typed text',
          },
        ],
        note: null,
        status: 'answered',
        answered_at_iso: '2026-02-19T04:00:00.000Z',
        source: 'tauri-ui',
      })
    ).toThrow('other_text must be null when used_other is false');
  });

  it('throws when response source is not tauri-ui', () => {
    expect(() =>
      parseAskResponseBatch({
        ask_id: 'ask-123',
        answers: [],
        note: null,
        status: 'cancelled',
        answered_at_iso: null,
        source: 'cli',
      })
    ).toThrow(/expected/);
  });
});
