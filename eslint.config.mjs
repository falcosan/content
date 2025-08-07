import pluginJs from '@eslint/js'
import prettierPlugin from 'eslint-plugin-prettier'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'

/** @type {import('eslint').Linter.Config[]} */
export default [
    {
        ignores: ['**/dist/**', '**/.git/**', '**/.dist/**', '**/node_modules/**'],
    },
    {
        files: ['**/*.{js,mjs,cjs,ts,vue}'],
        languageOptions: {
            globals: { ...globals.browser, ...globals.node },
        },
    },
    pluginJs.configs.recommended,
    ...pluginVue.configs['flat/essential'],
    {
        files: ['**/*.vue'],
        languageOptions: {
            parserOptions: {
                ecmaVersion: 2022,
                sourceType: 'module',
            },
        },
    },
    {
        plugins: {
            prettier: prettierPlugin,
        },
        rules: {
            'comma-dangle': 'off',
            'comma-spacing': 'off',
            'comma-style': 'off',
            camelcase: 'off',
            'no-console': 'off',
            'no-debugger': 'off',
            'default-case': 'off',
            'linebreak-style': 'off',
            'consistent-return': 'off',
            'prefer-destructuring': 'off',
            'import/imports-first': 'off',
            'import/no-unresolved': 'off',
            'import/extensions': 'off',
            'import/prefer-default-export': 'off',
            'no-param-reassign': 'off',
            'operator-linebreak': 'off',
            complexity: ['error', { max: 30 }],
            'max-nested-callbacks': ['error', 4],
            'arrow-body-style': ['error', 'as-needed'],
            'vue/html-indent': 'off',
            'vue/no-watch-after-await': 'off',
            'vue/script-setup-uses-vars': 'off',
            'vue/max-attributes-per-line': 'off',
            'vue/multi-word-component-names': 'off',
            'vue/no-reserved-component-names': 'off',
            'vue/html-closing-bracket-spacing': 'error',
            'vue/singleline-html-element-content-newline': 'off',
            'vue/html-self-closing': ['error', { html: { normal: 'any', void: 'always' } }],
        },
    },
]
