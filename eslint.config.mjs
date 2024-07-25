import vue from 'eslint-plugin-vue'
import html from 'eslint-plugin-html'
import prettier from 'eslint-plugin-prettier'
import globals from 'globals'
import parser from 'vue-eslint-parser'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import js from '@eslint/js'
import { FlatCompat } from '@eslint/eslintrc'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all,
})

export default [
    ...compat.extends('plugin:vue/vue3-recommended', 'prettier'),
    {
        plugins: {
            vue,
            html,
            prettier,
        },

        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
            },

            parser: parser,
            ecmaVersion: 13,
            sourceType: 'module',
        },

        rules: {
            'prettier/prettier': 'error',
            'vue/no-multiple-template-root': 'off',
            'vue/multi-word-component-names': 'off',
            'vue/no-v-model-argument': 'off',
        },
    },
]
