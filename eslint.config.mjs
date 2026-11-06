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
    // Git worktrees made by Claude Code sessions are full copies of the repo.
    ".claude/worktrees/**",
    // The collage lab's Python virtualenv, which bundles third-party JavaScript (torch).
    "**/.venv/**",
  ]),
]);

export default eslintConfig;
