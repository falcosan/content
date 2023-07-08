<script setup>
import enums from '@/enums';
import { Icon } from '@iconify/vue';
import Modal from '@/components/Modal';
import Editor from '@/components/Editor';
import {
    watch,
    toRefs,
    inject,
    reactive,
    computed,
    onMounted,
    onUnmounted,
} from 'vue';
import {
    editStoryblokStory,
    toggleStoryblokStory,
    getStoryblokComponents,
} from '@/api';

const props = defineProps({
    data: {
        type: Object,
        default: () => ({}),
    },
});
const locale = inject('locale');
const state = reactive({
    post: {},
    properties: {
        markdown: [],
        required: [],
        translatable: [],
    },
    loading: {
        edit: false,
        toggle: false,
    },
    modal: { state: false, message: '', type: '', timeout: 0 },
});
const { post, modal, loading, properties } = toRefs(state);
const modalType = {
    edited: { background: 'bg-blue-500', text: 'text-white' },
    error: { background: 'bg-red-500', text: 'text-white' },
    published: { background: 'bg-green-500', text: 'text-white' },
};
const html = /^<([a-z]+)([^>]+)*(?:>(?:\s*|\n*)<\/\1>|[^/]*\/>)$/;
const translatable = computed(() =>
    properties.value.translatable.reduce((acc, value) => {
        const regex = new RegExp(`${enums.translatableSuffix}.*`);
        const key = value.replace(regex, '');
        const obj = enums.languages.reduce((objAcc, lang) => {
            const translatedKey = `${key}${enums.translatableSuffix}${lang}`;
            const text = lang === 'en' ? key : translatedKey;
            return { ...objAcc, [lang]: text };
        }, {});
        return { ...acc, [key]: obj[locale.value] };
    }, {})
);
const editors = computed(() => [
    {
        title: 'Title',
        value: translatable.value.title,
        markdown: checkProperty('markdown', 'title'),
    },
    {
        title: 'Intro',
        value: translatable.value.intro,
        markdown: checkProperty('markdown', 'intro'),
    },
    {
        title: 'Content',
        value: translatable.value.long_text,
        markdown: checkProperty('markdown', 'long_text'),
    },
]);
const resetModal = () => {
    clearTimeout(modal.value.timeout);
    modal.value.timeout = setTimeout(() => {
        modal.value.message = '';
        modal.value.state = false;
        modal.value.type = '';
    }, 5000);
};
const checkProperty = (prop, value) => properties.value[prop].includes(value);
const mapPost = (values) => {
    const keys = properties.value.translatable.reduce((acc, value) => {
        const regex = new RegExp(`${enums.translatableSuffix}.*`);
        const key = value.replace(regex, '');
        return enums.languages.reduce((objAcc, lang) => {
            const translatedKey = `${key}${enums.translatableSuffix}${lang}`;
            const text = lang === 'en' ? key : translatedKey;
            const value = values.content[text] || '';
            return {
                ...acc,
                ...objAcc,
                [text]: value,
            };
        }, {});
    }, {});
    return { ...values, content: { ...values.content, ...keys } };
};
const cleanPost = (values) => {
    const keys = properties.value.translatable.reduce((acc, curr) => {
        const transformed = enums.languages
            .filter((lang) => lang !== 'en')
            .map((lang) => `${curr}${enums.translatableSuffix}${lang}`);
        return [...acc, ...transformed];
    }, []);
    const content = Object.keys(values.content).reduce((fields, key) => {
        const value = values.content[key];
        if (!value) return fields;
        if (
            (keys.includes(key) && !html.test(value)) ||
            (!keys.includes(key) && !html.test(value))
        ) {
            return { ...fields, [key]: value };
        }
        return fields;
    }, {});
    return { ...values, content };
};
const checkPost = () => {
    const check = properties.value.required.every((prop) => {
        return post.value.content[prop] && !html.test(post.value.content[prop]);
    });
    if (!check) {
        const message = 'Complete required fields';
        clearTimeout(modal.value.timeout);
        modal.value.message = message;
        modal.value.state = true;
        modal.value.type = 'error';
        resetModal();
        throw new Error(message);
    }
};
const editPost = async () => {
    loading.value.edit = true;
    try {
        checkPost();
        await editStoryblokStory(cleanPost(post.value), locale.value)
            .then((res) => {
                post.value = mapPost(res.story);
                modal.value.message = 'Saved';
                modal.value.state = true;
                modal.value.type = 'edited';
            })
            .catch(() => {
                modal.value.message = 'Error';
                modal.value.state = true;
                modal.value.type = 'error';
            })
            .finally(() => {
                resetModal();
                loading.value.edit = false;
            });
    } catch {
        loading.value.edit = false;
    }
};
const togglePost = async () => {
    loading.value.toggle = true;
    const state = post.value.published ? 'unpublish' : 'publish';
    try {
        checkPost();
        await toggleStoryblokStory(post.value.id, state)
            .then((res) => {
                post.value = mapPost(res.story);
                modal.value.message = post.value.published
                    ? 'Published'
                    : 'Unpublished';
                modal.value.state = true;
                modal.value.type = 'published';
            })
            .catch(() => {
                modal.value.message = 'Error';
                modal.value.state = true;
                modal.value.type = 'error';
            })
            .finally(() => {
                resetModal();
                loading.value.toggle = false;
            });
    } catch {
        loading.value.toggle = false;
    }
};
const handleSave = async (event) => {
    if (event.metaKey && event.code === 'KeyS') {
        event.preventDefault();
        await editPost();
    }
};
onMounted(() => window.addEventListener('keydown', handleSave));
onUnmounted(() => window.removeEventListener('keydown', handleSave));
watch(
    props.data,
    async (val) => {
        if (!properties.value.translatable.length) {
            const data = await getStoryblokComponents(val.content.component, [
                'required',
                'translatable',
                { type: 'markdown' },
            ]);
            properties.value.markdown = data.type;
            properties.value.required = data.required;
            properties.value.translatable = data.translatable;
        }
        post.value = mapPost(val);
    },
    { immediate: true }
);
</script>

<template>
    <div v-if="post.content">
        <Editor
            v-for="(editor, indexEditor) in editors"
            :key="`${indexEditor}_${locale}`"
            v-model:text="post.content[editor.value]"
            :title="editor.title"
            :tools="editor.markdown"
        />
        <div class="flex flex-wrap justify-center xs:justify-end mt-10 -m-2.5">
            <button
                class="w-full sm:w-32 flex justify-center m-2.5 p-2.5 px-6 rounded font-semibold active:bg-opacity-70 text-white bg-blue-500"
                @click="editPost"
            >
                <Icon
                    v-if="loading.edit"
                    class="text-2xl"
                    icon="eos-icons:three-dots-loading"
                />
                <span v-else v-text="'Save'" />
            </button>
            <button
                :class="[
                    'w-full sm:w-32 flex justify-center m-2.5 p-2.5 px-6 rounded font-semibold active:bg-opacity-70 text-white',
                    post.published ? 'bg-red-500' : 'bg-green-600',
                ]"
                @click="togglePost"
            >
                <Icon
                    v-if="loading.toggle"
                    class="text-2xl"
                    icon="eos-icons:three-dots-loading"
                />
                <span
                    v-else
                    v-text="post.published ? 'Unpublish' : 'Publish'"
                />
            </button>
        </div>
        <Modal v-model:open="modal.state">
            <template v-if="modal.type" #body>
                <div
                    :class="[
                        'p-2.5 md:p-5 rounded text-center text-xl font-semibold',
                        modalType[modal.type].background,
                    ]"
                >
                    <span
                        :class="[modalType[modal.type].text]"
                        v-text="modal.message"
                    />
                </div>
            </template>
        </Modal>
    </div>
</template>
