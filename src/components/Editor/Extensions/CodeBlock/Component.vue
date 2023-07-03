<template>
    <NodeViewWrapper as="div" class="relative">
        <select
            @change="setSyntax"
            class="absolute w-44 right-0 z-20 text-xs border rounded cursor-pointer focus:outline-none focus:ring-2 border-gray-300 focus:ring-blue-500 focus:border-blue-500 text-gray-700 bg-white"
        >
            <option
                v-for="(language, indexLanguage) in renderSyntax.list"
                :key="indexLanguage"
                :value="language.value"
                :selected="language.value === renderSyntax.current.value"
            >
                {{ language.label }}
            </option>
        </select>
        <pre class="flex flex-col pt-7">
            <NodeViewContent as="code" :class="getSyntax" style="white-space: pre;" />
        </pre>
    </NodeViewWrapper>
</template>

<script>
import enums from '@/enums';
import { computed, reactive, toRefs } from 'vue';
import { nodeViewProps, NodeViewWrapper, NodeViewContent } from '@tiptap/vue-3';
export default {
    components: {
        NodeViewContent,
        NodeViewWrapper,
    },
    props: nodeViewProps,
    setup(props) {
        const state = reactive({
            showList: false,
        });
        const { showList } = toRefs(state);
        const getSyntax = computed(() => props.node.attrs.language);
        const renderSyntax = computed(() => {
            const list = enums.syntaxes;
            return {
                list,
                current: list.find(({ value }) => {
                    const syntax = getSyntax.value.split('language-')[1] || '';
                    return value === syntax;
                }),
            };
        });
        const setSyntax = (event) => {
            const language = event.target.value;
            props.updateAttributes({ language: `language-${language}` });
        };
        const toggleList = () => showList.value != showList.value;
        return { getSyntax, setSyntax, renderSyntax, toggleList, showList };
    },
};
</script>
