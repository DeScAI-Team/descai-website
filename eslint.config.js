import js from "@eslint/js";
import react from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";

export default [
  { ignores: ["dist"] },
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true }
      }
    },
    plugins: {
      "react-hooks": react,
      "react-refresh": reactRefresh
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }]
    }
  }
];
