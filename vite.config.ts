/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const moleculeUrl = new URL(env.VITE_MOLECULE_GRAPHQL_ENDPOINT || "https://production.graphql.api.molecule.xyz/graphql");

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": "/src"
      }
    },
    server: {
      proxy: {
        "/api/pump-science": {
          target: "https://pump.science",
          changeOrigin: true,
          rewrite: (pathValue) => pathValue.replace(/^\/api\/pump-science/, "")
        },
        "/api/bio": {
          target: "https://app.bio.xyz",
          changeOrigin: true,
          rewrite: (pathValue) => pathValue.replace(/^\/api\/bio/, "")
        },
        "/api/dexscreener": {
          target: "https://api.dexscreener.com",
          changeOrigin: true,
          rewrite: (pathValue) => pathValue.replace(/^\/api\/dexscreener/, "")
        },
        "/api/molecule": {
          target: moleculeUrl.origin,
          changeOrigin: true,
          rewrite: (pathValue) => pathValue.replace(/^\/api\/molecule/, ""),
          headers: env.VITE_MOLECULE_API_KEY
            ? {
                "x-api-key": env.VITE_MOLECULE_API_KEY
              }
            : undefined
        }
      }
    },
    test: {
      projects: [{
        extends: true,
        plugins: [
        // The plugin will run tests for the stories defined in your Storybook config
        // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
        storybookTest({
          configDir: path.join(dirname, '.storybook')
        })],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [{
              browser: 'chromium'
            }]
          },
          setupFiles: ['.storybook/vitest.setup.ts']
        }
      }]
    }
  };
});
