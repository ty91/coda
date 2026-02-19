import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

type TauriCapability = {
  permissions: string[];
};

describe('tauri capabilities', () => {
  it('allows window start dragging for overlay titlebar drag regions', () => {
    const capabilityPath = resolve(process.cwd(), 'src-tauri/capabilities/default.json');
    const content = readFileSync(capabilityPath, 'utf8');
    const capability = JSON.parse(content) as TauriCapability;

    expect(capability.permissions).toContain('core:window:allow-start-dragging');
  });
});
