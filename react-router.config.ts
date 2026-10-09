import type { Config } from '@react-router/dev/config';
import { prerenderPaths } from './scripts/lib/paths';

export default {
  // Static prerendered output (build/client). No runtime server.
  ssr: false,
  prerender: prerenderPaths(),
} satisfies Config;
