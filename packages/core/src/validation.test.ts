import { describe, expect, it } from 'vitest';

import { parseNonEmptyDescription, parseStatusOptions } from './validation.js';

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
