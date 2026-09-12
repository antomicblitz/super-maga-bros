// ESLint flat config — recommended level only (no stylistic churn).
// The game ships as plain browser scripts: top-level globals are intentional,
// so no-env-guessing; declare the known cross-file globals explicitly.
import html from "eslint-plugin-html";

export default [
  {
    ignores: ["node_modules/"],
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        // Browser
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        location: "readonly",
        console: "readonly",
        fetch: "readonly",
        localStorage: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        requestAnimationFrame: "readonly",
        URLSearchParams: "readonly",
        Blob: "readonly",
        URL: "readonly",
        AudioContext: "readonly",
        Image: "readonly",
        // Phaser + cross-file contracts (index.html <-> game.js)
        Phaser: "readonly",
        TOUCH: "readonly",
        ASSETS_LOADED: "readonly",
        TEX: "readonly",
      },
    },
    rules: {
      "no-unused-vars": [
        "warn",
        // `catch (e) {}` is the project's deliberate defensive-catch idiom
        // (55 sites in game.js); caught errors are intentionally unused.
        { args: "none", caughtErrors: "none" },
      ],
      "no-undef": "error",
      "no-empty": ["warn", { allowEmptyCatch: true }],
      "no-constant-condition": ["error", { checkLoops: false }],
    },
  },
  {
    files: ["**/*.html"],
    plugins: { html },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        location: "readonly",
        console: "readonly",
        fetch: "readonly",
        localStorage: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        requestAnimationFrame: "readonly",
        URLSearchParams: "readonly",
        Blob: "readonly",
        URL: "readonly",
        AudioContext: "readonly",
        Image: "readonly",
        alert: "readonly",
        confirm: "readonly",
        Phaser: "readonly",
        TOUCH: "readonly",
        ASSETS_LOADED: "readonly",
        TEX: "readonly",
      },
    },
    rules: {
      "no-unused-vars": [
        "warn",
        { args: "none", caughtErrors: "none" },
      ],
      "no-undef": "error",
      "no-empty": ["warn", { allowEmptyCatch: true }],
      "no-constant-condition": ["error", { checkLoops: false }],
    },
  },
];
