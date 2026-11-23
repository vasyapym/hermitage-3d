import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { configDefaults, defineConfig } from 'vitest/config';

// Multi-page entry (Phase 1): index.html is the palace, notes.html is the pure-DOM
// facade spec viewer at /notes. budget.mjs already counts every emitted js chunk.
const here = dirname(fileURLToPath(import.meta.url));

// Room chunks carry their rooms/<folder> name so tools/budget.mjs attributes JS per
// room by prefix; entry/shared chunks keep Vite's default naming. The cost — longer
// specifiers in the entry chunk — is declared in docs/budget-ledger.md (DECISION-34).
const ROOM_MODULE = /[\\/]rooms[\\/]([^\\/]+)[\\/]room\.ts$/;

export default defineConfig({
  build: {
    target: 'es2023',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(here, 'index.html'),
        notes: resolve(here, 'notes.html'),
      },
      output: {
        chunkFileNames: (chunk) => {
          const folder = chunk.facadeModuleId?.match(ROOM_MODULE)?.[1];
          return folder ? `assets/room_${folder}-[hash].js` : 'assets/[name]-[hash].js';
        },
      },
    },
  },
  test: {
    // Playwright specs live in tests/e2e and match Vitest's default include
    // (**/*.{test,spec}.?(c|m)[jt]s?(x)); keep Vitest on unit tests only. Defaults (node_modules,
    // dist …) stay intact — only the Playwright directory is fenced off.
    exclude: [...configDefaults.exclude, 'tests/e2e/**'],
  },
});
