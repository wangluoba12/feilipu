import type { NapCatPluginContext } from '../types/napcat';

export const pluginState: { ctx: NapCatPluginContext | null; config: Record<string, unknown> } = {
  ctx: null,
  config: {},
};
