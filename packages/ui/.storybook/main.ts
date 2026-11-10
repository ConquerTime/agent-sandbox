import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { StorybookConfig } from '@storybook/react-vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(__dirname, '../src');

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  framework: '@storybook/react-vite',
  viteFinal(config) {
    config.resolve ??= {};
    // Array form: first match wins — keep subpaths before the package root alias.
    config.resolve.alias = [
      {
        find: '@cortex/ui/utils',
        replacement: path.join(srcDir, 'lib/utils.ts'),
      },
      {
        find: '@cortex/ui/styles',
        replacement: path.join(srcDir, 'styles/globals.css'),
      },
      {
        find: '@cortex/ui/lib',
        replacement: path.join(srcDir, 'lib'),
      },
      {
        find: '@cortex/ui/components/ui',
        replacement: path.join(srcDir, 'components/ui'),
      },
      {
        find: '@cortex/ui/components',
        replacement: path.join(srcDir, 'components/ui'),
      },
      {
        find: '@cortex/ui',
        replacement: srcDir,
      },
      {
        find: '@cortex/shared',
        replacement: path.resolve(__dirname, '../../shared/src'),
      },
      {
        find: '@cortex/ai-components',
        replacement: path.resolve(__dirname, '../../ai-components/src'),
      },
      ...(Array.isArray(config.resolve.alias)
        ? config.resolve.alias
        : Object.entries(config.resolve.alias ?? {}).map(([find, replacement]) => ({
            find,
            replacement: String(replacement),
          }))),
    ];
    return config;
  },
};

export default config;
