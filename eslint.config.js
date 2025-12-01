// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import react from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";

export default [{ ignores: ["dist"] }, {
  files: ["src/**/*.{ts,tsx}"],
  languageOptions: {
    ecmaVersion: 2022,
    globals: globals.browser,
    parser: tsparser,
    parserOptions: {
      ecmaFeatures: { jsx: true }
    }
  },
  plugins: {
    "@typescript-eslint": tseslint,
    "react-hooks": react,
    "react-refresh": reactRefresh
  },
  rules: {
    ...js.configs.recommended.rules,
    ...tseslint.configs.recommended.rules,
    ...react.configs.recommended.rules,
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
    "react-refresh/only-export-components": ["warn", { allowConstantExport: true }]
  }
}, ...storybook.configs["flat/recommended"]];
