/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
  },
  env: {
    browser: true,
    commonjs: true,
    es6: true,
    node: true, // Added for Remix server-side code
  },
  ignorePatterns: [
    "!**/.server",
    "!**/.client",
    "dist",
    "node_modules",
    "**/*.cjs",
  ],

  // Base config
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react/jsx-runtime",
    "plugin:react-hooks/recommended",
    "plugin:jsx-a11y/recommended",
    "plugin:import/recommended",
    "plugin:import/typescript",
    "prettier", // Add Prettier to avoid conflicts
  ],

  plugins: [
    "react",
    "jsx-a11y",
    "@typescript-eslint",
    "import",
    "react-refresh", // For better HMR support with Vite
  ],

  settings: {
    react: {
      version: "detect",
    },
    "import/resolver": {
      typescript: {},
      node: {
        extensions: [".js", ".jsx", ".ts", ".tsx"],
      },
    },
  },

  rules: {
    "react-refresh/only-export-components": [
      "warn",
      { allowConstantExport: true },
    ],
    "import/no-unresolved": "error",
    "import/order": [
      "warn",
      {
        groups: [
          "builtin",
          "external",
          "internal",
          "parent",
          "sibling",
          "index",
        ],
        "newlines-between": "always",
        alphabetize: { order: "asc", caseInsensitive: true },
      },
    ],
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-non-null-assertion": "off",
    "react/prop-types": "off",
    "no-unused-vars": "warn",
    "@typescript-eslint/no-unused-vars": "warn",
    "no-irregular-whitespace": "warn",
    "@typescript-eslint/no-explicit-any": "warn",
    "no-var": "warn",
    "jsx-a11y/heading-has-content": "warn",
    "jsx-a11y/alt-text": "warn",
    "react/jsx-key": "warn",
    "no-empty": "warn",
    "@typescript-eslint/ban-ts-comment": "warn",
    "react/no-unescaped-entities": "warn",
    "jsx-a11y/img-redundant-alt": "warn",
    "jsx-a11y/label-has-associated-control": "warn",
    "no-case-declarations": "warn",
    "prefer-const": "warn",
  },

  overrides: [
    // Node
    {
      files: [".eslintrc.{js,cjs}", "vite.config.ts", "remix.config.js"],
      env: {
        node: true,
      },
    },
  ],
};
