/**
 * ESLint v9 flat config.
 * TypeScript (strict), React 19, Vite. Uses only @eslint/js and typescript-eslint.
 *
 * To enable React hooks rules (rules-of-hooks, exhaustive-deps), add
 * eslint-plugin-react-hooks and extend this config with its recommended rules.
 */

import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      "dist/",
      "src-core/",
      "src/wasm-pkg/",
      "node_modules/",
    ],
  },

  // Base recommended (JS)
  js.configs.recommended,

  // TypeScript + React: recommended and project rules
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "no-console": "warn",
    },
  },

  // Allow console in bridge and ErrorBoundary (DEV-only logging; gated by import.meta.env.DEV)
  {
    files: ["src/bridge/index.ts", "src/components/ErrorBoundary.tsx"],
    rules: {
      "no-console": "off",
    },
  }
);
