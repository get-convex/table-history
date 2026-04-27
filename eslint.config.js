import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import convexPlugin from "@convex-dev/eslint-plugin";

export default [
  { files: ["src/**/*.{js,mjs,cjs,ts,tsx}"] },
  {
    ignores: [
      "dist/**",
      "eslint.config.js",
      "example/**/*.config.{js,mjs,cjs,ts,tsx}",
      "**/_generated/",
      "node10stubs.mjs",
    ],
  },
  {
    languageOptions: {
      globals: globals.worker,
      parser: tseslint.parser,

      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      "@convex-dev": convexPlugin,
    },
    rules: {
      ...convexPlugin.configs.recommended[0].rules,
      "@typescript-eslint/no-floating-promises": "error",
      "eslint-comments/no-unused-disable": "off",

      // allow (_arg: number) => {} and const _foo = 1;
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
];
