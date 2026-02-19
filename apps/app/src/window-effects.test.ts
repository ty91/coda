import { Effect } from '@tauri-apps/api/window';
import { describe, expect, it, vi } from 'vitest';

import { applyMacOsWindowEffects, resolveMacOsWindowEffects } from './window-effects';

describe('window effects adapter', () => {
  it('always resolves to hudWindow', () => {
    const effects = resolveMacOsWindowEffects();

    expect(effects.effects).toEqual([Effect.HudWindow]);
    expect(effects.state).toBe('active');
    expect(effects.radius).toBe(14);
  });

  it('skips applying effects outside a tauri runtime', async () => {
    const applyEffects = vi.fn();

    await applyMacOsWindowEffects({
      isTauriRuntime: () => false,
      applyEffects,
    });

    expect(applyEffects).not.toHaveBeenCalled();
  });

  it('applies resolved effects through the adapter boundary', async () => {
    const applyEffects = vi.fn().mockResolvedValue(undefined);

    await applyMacOsWindowEffects({
      isTauriRuntime: () => true,
      applyEffects,
    });

    expect(applyEffects).toHaveBeenCalledTimes(1);
    const [firstCall] = applyEffects.mock.calls;

    expect(firstCall).toBeDefined();
    expect(firstCall?.[0]).toMatchObject({
      effects: [Effect.HudWindow],
      state: 'active',
      radius: 14,
    });
  });
});
