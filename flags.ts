import { flag } from 'flags/next';
import { createEdgeConfigAdapter } from '@flags-sdk/edge-config';

const edgeConfigAdapter = createEdgeConfigAdapter(process.env.EDGE_CONFIG!)<boolean, any>()

export const textInputEnabled = flag<boolean>({
  key: 'text-input-enabled',
  description: 'Allow users to paste raw recipe text instead of only URLs',
  adapter: edgeConfigAdapter
});
