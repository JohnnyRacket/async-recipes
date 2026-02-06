import { flag } from 'flags/next';
import { createEdgeConfigAdapter } from '@flags-sdk/edge-config';

const adapter = process.env.EDGE_CONFIG
  ? createEdgeConfigAdapter(process.env.EDGE_CONFIG)<boolean, any>()
  : undefined;

export const textInputEnabled = flag<boolean>({
  key: 'text-input-enabled',
  description: 'Allow users to paste raw recipe text instead of only URLs',
  defaultValue: false,
  ...(adapter ? { adapter } : {}),
  decide() {
    return false;
  },
});
