import js from '@eslint/js';
import globals from 'globals';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import prettierConfig from 'eslint-config-prettier';
import nextPlugin from '@next/eslint-plugin-next';

export default [
  {
    ignores: ['node_modules/', '.next/', 'out/', 'dist/', 'build/', 'coverage/', '*.min.js'],
  },
  // Frontend files (app, components, hooks, context)
  {
    files: [
      'app/**/*.{js,jsx}',
      'components/**/*.{js,jsx}',
      'hooks/**/*.{js,jsx}',
      'contexts/**/*.{js,jsx}',
    ],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        React: 'readonly',
        JSX: 'readonly',
      },
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      '@next/next': nextPlugin,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactPlugin.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/no-unescaped-entities': 'off',
      'react/display-name': 'off',
      'react/no-unknown-property': ['error', { ignore: ['cmdk-input-wrapper'] }],
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      '@next/next/no-img-element': 'warn',
      '@next/next/no-location-assign-relative-destination': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error', 'log'] }],
      'no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      'no-var': 'error',
      'prefer-const': 'warn',
      'require-atomic-updates': 'off',
    },
  },
  // Backend files (lib, models, scripts)
  {
    files: ['lib/**/*.{js,jsx}', 'models/**/*.{js,jsx}', 'scripts/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.browser,
        window: 'readonly',
        document: 'readonly',
        CustomEvent: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-console': ['warn', { allow: ['warn', 'error', 'log'] }],
      'no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      'no-var': 'error',
      'prefer-const': 'warn',
      'require-atomic-updates': 'off',
    },
  },
  // Test files
  {
    files: [
      '**/*.test.js',
      '**/*.test.jsx',
      '**/__tests__/**/*.js',
      '**/__tests__/**/*.jsx',
      'jest.setup.js',
      'jest.config.js',
      'tests/**/*.js',
      'tests/**/*.jsx',
    ],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.node,
        ...globals.jest,
        jest: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
    plugins: {
      react: reactPlugin,
    },
    rules: {
      ...js.configs.recommended.rules,
      'react/jsx-uses-vars': 'error',
      'react/jsx-uses-react': 'error',
      'no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      'no-var': 'error',
      'prefer-const': 'warn',
    },
  },
  prettierConfig,
];
