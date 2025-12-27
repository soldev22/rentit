import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Additional ignores for generated files:
    "playwright-report/**",
    "playwright/**",
    "test-results/**",
    "e2e-artifacts/**",
    "*.min.js",
    "*.bundle.js",
    // Ignore markdown files:
    "*.md",
    // Ignore utility scripts:
    "scripts/**",
    "tailwind.config.js",
  ]),
]);

export default eslintConfig;
