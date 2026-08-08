// Flat config.
//
// Next 16 removed `next lint`, so the package.json script pointed at a command
// that no longer exists and `npm run lint` just failed. Next 16 also stopped
// running lint during `next build`, so linting only happens if something calls
// it — hence the CI step added alongside this.
//
// eslint-config-next 16.3 exports native flat-config arrays, so they are spread
// directly. The FlatCompat bridge most migration guides still show throws here,
// because the package no longer ships an eslintrc-shaped object.

import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "public/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "data/**",
      "next-env.d.ts",
      // 29 standalone .jsx sketches rendered from the sibling .html files.
      // Nothing imports them, nothing builds them, and they alone produced
      // ~90 errors — nearly all "component is not defined" for helpers their
      // .html host supplies. Linting them grades a sketchbook against
      // production rules.
      "design-refs/**",
    ],
  },

  ...nextCoreWebVitals,
  ...nextTypeScript,

  {
    rules: {
      // `any` is load-bearing at the Supabase and OpenAI boundaries, where the
      // generated types and the real payloads disagree often enough that
      // erroring would mean either hundreds of failures or hundreds of
      // suppression comments. Warn so new ones stay visible.
      "@typescript-eslint/no-explicit-any": "warn",

      // Default is destructuring:"any", which flags a destructuring pattern
      // when any single binding could be const — so `let { data, error } =`
      // gets reported even though `data` is reassigned later, and "fixing" it
      // produces code tsc rejects with TS2588. "all" reports only when every
      // binding could be const, which is the honest signal.
      "prefer-const": ["error", { destructuring: "all" }],

      // An argument prefixed with _ is a deliberate signal — usually a
      // positional param we're required to accept and don't read.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      // ── The React Compiler-era hook rules ──────────────────────────────
      // These ship as errors in eslint-plugin-react-hooks 6 and flag real
      // problems: setState inside an effect causes a second render pass, and
      // reading refs during render is unsound under concurrent rendering.
      //
      // They are warnings here because there are ~30 existing violations
      // across the app, and fixing them means restructuring effects in code
      // paths with no test coverage — a change with real regression risk that
      // should not ride along in a PR whose job is to make `npm run lint`
      // execute at all. Turning them off would hide the backlog; leaving them
      // as errors would mean CI is red on day one and everyone learns to
      // ignore it. Warnings keep the count visible and shrinking.
      //
      // Worth promoting back to "error" once the existing count reaches zero.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/use-memo": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
    },
  },

  {
    // Tests mock aggressively and assert against loosely-typed payloads.
    // Demanding precise types there buys nothing and makes mocks harder to read.
    files: ["tests/**/*.{ts,tsx}", "**/*.test.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off",
      "react/display-name": "off",
    },
  },

  {
    // Build and maintenance scripts run in Node, outside the bundler — these
    // are CommonJS CLIs invoked with `node`, not modules the app imports. The
    // glob is `**/scripts/**` rather than `scripts/**` because most of them
    // live under skills/*/scripts/.
    files: ["**/scripts/**/*.{js,mjs,cjs,ts}"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },

  {
    // lib/sentry.ts require()s @sentry/nextjs inside try/catch on purpose, so
    // the logging helpers degrade to no-ops when the SDK isn't installed
    // rather than failing at import time. A static import would defeat that,
    // and this is the one place the pattern is load-bearing.
    files: ["lib/sentry.ts"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];

export default eslintConfig;
