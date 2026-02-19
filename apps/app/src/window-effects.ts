import { isTauri } from '@tauri-apps/api/core';
import { Effect, EffectState, getCurrentWindow, type Effects } from '@tauri-apps/api/window';

export type MacOsWindowMaterial = 'hudWindow' | 'sidebar';

export const DEFAULT_MACOS_WINDOW_MATERIAL: MacOsWindowMaterial = 'hudWindow';

const EFFECT_BY_MATERIAL: Record<MacOsWindowMaterial, Effect> = {
  hudWindow: Effect.HudWindow,
  sidebar: Effect.Sidebar,
};

type RuntimeChecker = () => boolean;
type EffectsApplier = (effects: Effects) => Promise<void>;

type ApplyMacOsWindowEffectsOptions = {
  material?: MacOsWindowMaterial;
  isTauriRuntime?: RuntimeChecker;
  applyEffects?: EffectsApplier;
};

const isTauriRuntime = (): boolean => isTauri();

const applyCurrentWindowEffects = async (effects: Effects): Promise<void> => {
  await getCurrentWindow().setEffects(effects);
};

export const resolveMacOsWindowEffects = (material: MacOsWindowMaterial = DEFAULT_MACOS_WINDOW_MATERIAL): Effects => ({
  effects: [EFFECT_BY_MATERIAL[material]],
  state: EffectState.Active,
  radius: 14,
});

export const applyMacOsWindowEffects = async ({
  material = DEFAULT_MACOS_WINDOW_MATERIAL,
  isTauriRuntime: runtimeChecker = isTauriRuntime,
  applyEffects = applyCurrentWindowEffects,
}: ApplyMacOsWindowEffectsOptions = {}): Promise<void> => {
  if (!runtimeChecker()) {
    return;
  }

  await applyEffects(resolveMacOsWindowEffects(material));
};
