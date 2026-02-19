import { Effect } from '@tauri-apps/api/window';
import { describe, expect, it, vi } from 'vitest';

import {
  applyMacOsWindowEffects,
  DEFAULT_MACOS_WINDOW_MATERIAL,
  resolveMacOsWindowEffects,
} from './window-effects';

describe('window effects material adapter', () => {
  it('resolves the default material to hudWindow', () => {
    const effects = resolveMacOsWindowEffects();

    expect(DEFAULT_MACOS_WINDOW_MATERIAL).toBe('hudWindow');
    expect(effects.effects).toEqual([Effect.HudWindow]);
    expect(effects.state).toBe('active');
    expect(effects.radius).toBe(14);
  });

  it('resolves sidebar material when selected', () => {
    const effects = resolveMacOsWindowEffects('sidebar');

    expect(effects.effects).toEqual([Effect.Sidebar]);
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
      material: 'sidebar',
      isTauriRuntime: () => true,
      applyEffects,
    });

    expect(applyEffects).toHaveBeenCalledTimes(1);
    const [firstCall] = applyEffects.mock.calls;

    expect(firstCall).toBeDefined();
    expect(firstCall?.[0]).toMatchObject({
      effects: [Effect.Sidebar],
      state: 'active',
      radius: 14,
    });
  });
});
