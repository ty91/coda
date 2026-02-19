import { isTauri } from '@tauri-apps/api/core';
import { Effect, EffectState, getCurrentWindow, type Effects } from '@tauri-apps/api/window';

const HUD_WINDOW_EFFECT = Effect.HudWindow;
const HUD_WINDOW_STATE = EffectState.Active;
const HUD_WINDOW_RADIUS = 14;

type RuntimeChecker = () => boolean;
type EffectsApplier = (effects: Effects) => Promise<void>;

type ApplyMacOsWindowEffectsOptions = {
  isTauriRuntime?: RuntimeChecker;
  applyEffects?: EffectsApplier;
};

const isTauriRuntime = (): boolean => isTauri();

const applyCurrentWindowEffects = async (effects: Effects): Promise<void> => {
  await getCurrentWindow().setEffects(effects);
};

export const resolveMacOsWindowEffects = (): Effects => ({
  effects: [HUD_WINDOW_EFFECT],
  state: HUD_WINDOW_STATE,
  radius: HUD_WINDOW_RADIUS,
});

export const applyMacOsWindowEffects = async ({
  isTauriRuntime: runtimeChecker = isTauriRuntime,
  applyEffects = applyCurrentWindowEffects,
}: ApplyMacOsWindowEffectsOptions = {}): Promise<void> => {
  if (!runtimeChecker()) {
    return;
  }

  await applyEffects(resolveMacOsWindowEffects());
};
