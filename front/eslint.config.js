

import { readFileSync } from 'node:fs';
import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import eslintPluginVue from 'eslint-plugin-vue';
import globals from 'globals';
import typescriptEslint from 'typescript-eslint';

const autoImportGlobals = JSON.parse(readFileSync(new URL('./.eslintrc-auto-import.json', import.meta.url), 'utf8')).globals;

export default typescriptEslint.config(
  { ignores: ['*.d.ts', '**/coverage', '**/dist'] },
  {
    extends: [
      eslint.configs.recommended,
      ...typescriptEslint.configs.recommended,
      ...eslintPluginVue.configs['flat/recommended'],
    ],
    files: ['**/*.{ts,vue}', 'src/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        // Auto-imports (Vue, vue-router, Pinia...) listed by unplugin-auto-import
        ...autoImportGlobals,
        ref: 'readonly',
        computed: 'readonly',
        watch: 'readonly',
        watchEffect: 'readonly',
      },
      parserOptions: {
        parser: typescriptEslint.parser,
      },
    }
  },
  
  {
    files: ['**/*.vue'],
    rules: {
      // Composition API with <script setup> only (project rule)
      'vue/component-api-style': ['error', ['script-setup']],
      'vue/block-order': ['warn', { order: ['template', 'script', 'style'] }],
      // Layout of attributes belongs to Prettier
      'vue/first-attribute-linebreak': 'off',
    },
  },
  {
    files: ['src/pages/**/*.vue'],
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },
  eslintConfigPrettier
);