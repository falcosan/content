import js from '@eslint/js'
import prettier from 'eslint-config-prettier/flat'
import { defineConfig, globalIgnores } from 'eslint/config'
import pluginVue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'

export default defineConfig(
    globalIgnores(['**/dist/**', '**/.netlify/**', '**/test-results/**']),
    {
        files: ['**/*.{ts,vue}'],
        extends: [
            js.configs.recommended,
            tseslint.configs.recommended,
            pluginVue.configs['flat/recommended'],
        ],
        rules: {
            'vue/multi-word-component-names': 'off',
            'vue/require-default-prop': 'off',
            'vue/block-order': ['error', { order: ['script', 'template', 'style'] }],
            'vue/component-api-style': ['error', ['script-setup']],
            'vue/define-macros-order': 'error',
            'vue/no-unused-refs': 'error',
            'vue/no-useless-v-bind': 'error',
            'vue/prefer-true-attribute-shorthand': 'error',
            'no-console': ['error', { allow: ['error'] }],
            eqeqeq: 'error',
            'prefer-const': 'error',
        },
    },
    {
        files: ['**/*.vue'],
        languageOptions: {
            parserOptions: { parser: tseslint.parser, extraFileExtensions: ['.vue'] },
        },
        rules: {
            'no-undef': 'off',
        },
    },
    prettier
)
