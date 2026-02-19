import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const stylesCss = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');

describe('global interactive cursor styles', () => {
  it('sets pointer cursor for clickable controls', () => {
    expect(stylesCss).toContain("button:not(:disabled)");
    expect(stylesCss).toContain("input[type='radio']:not(:disabled)");
    expect(stylesCss).toContain('label');
  });
});
