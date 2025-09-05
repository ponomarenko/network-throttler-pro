module.exports = {
  env: {
    browser: true,
    es2021: true,
    webextensions: true,
    node: true,
  },
  extends: ["eslint:recommended"],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: "module",
  },
  globals: {
    chrome: "readonly",
    browser: "readonly",
  },
  rules: {
    // Best Practices
    "no-console": "warn",
    "no-debugger": "error",
    "no-alert": "warn",
    "no-eval": "error",
    "no-implied-eval": "error",
    "no-new-func": "error",

    // Variables
    "no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      },
    ],
    "no-undef": "error",

    // Stylistic Issues
    indent: ["error", 2, { SwitchCase: 1 }],
    quotes: ["error", "single", { avoidEscape: true }],
    semi: ["error", "always"],
    "comma-dangle": ["error", "never"],
    "no-trailing-spaces": "error",
    "eol-last": "error",

    // ES6+
    "arrow-spacing": "error",
    "no-var": "error",
    "prefer-const": "error",
    "prefer-arrow-callback": "error",
    "prefer-template": "error",

    // Chrome Extension Specific
    "no-restricted-globals": [
      "error",
      {
        name: "localStorage",
        message:
          "Use chrome.storage API instead of localStorage in extensions.",
      },
    ],
  },
};
