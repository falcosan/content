<script setup>
import enums from '@/enums'
import { Icon } from '@iconify/vue'
import Modal from '@/components/Modal'
import Editor from '@/components/Editor'
import { formatString } from '@/utils/string'
import { watch, toRefs, inject, reactive, computed, onMounted, onUnmounted } from 'vue'
import { editStoryblokStory, toggleStoryblokStory, getStoryblokComponents } from '@/api'

const props = defineProps({
    data: {
        type: Object,
        default: () => ({}),
    },
})
const emit = defineEmits(['edited'])
const locale = inject('locale')
const state = reactive({
    post: {},
    properties: {
        datetime: [],
        markdown: [],
        required: [],
        maxLength: [],
        translatable: [],
    },
    loading: {
        edit: false,
        toggle: false,
    },
    keys: { ctrl: false },
    modal: { state: false, message: '', type: '', timeout: 0 },
})
const { post, keys, modal, loading, properties } = toRefs(state)
const modalType = {
    error: { background: 'bg-red-500', text: 'text-white' },
    edited: { background: 'bg-blue-500', text: 'text-white' },
    published: { background: 'bg-green-500', text: 'text-white' },
}
const html = /^<([a-z]+)([^>]+)*(?:>(?:\s*|\n*)<\/\1>|[^/]*\/>)$/
const translatable = computed(() =>
    properties.value.translatable.reduce((acc, value) => {
        const regex = new RegExp(`${enums.translatableSuffix}.*`)
        const key = value.replace(regex, '')
        const obj = enums.languages.reduce((objAcc, lang) => {
            const translatedKey = `${key}${enums.translatableSuffix}${lang}`
            const text = lang === 'en' ? key : translatedKey
            return { ...objAcc, [lang]: text }
        }, {})
        return { ...acc, [key]: obj[locale.value] }
    }, {})
)
const inputs = computed(() => [
    ...properties.value.datetime.map((key) => ({
        title: formatString(key),
        value: key,
        type: 'date',
    })),
])
const editors = computed(() => [
    {
        title: formatString(properties.value.translatable.find((val) => val === 'title')),
        value: translatable.value.title,
        max: checkProperties('maxLength', 'title'),
        markdown: checkProperties('markdown', 'title'),
    },
    {
        title: formatString(properties.value.translatable.find((val) => val === 'intro')),
        value: translatable.value.intro,
        max: checkProperties('maxLength', 'intro'),
        markdown: checkProperties('markdown', 'intro'),
    },
    {
        title: formatString(properties.value.translatable.find((val) => val === 'long_text')),
        value: translatable.value.long_text,
        max: checkProperties('maxLength', 'long_text'),
        markdown: checkProperties('markdown', 'long_text'),
    },
])
const resetModal = () => {
    clearTimeout(modal.value.timeout)
    modal.value.timeout = setTimeout(() => {
        modal.value.message = ''
        modal.value.state = false
        modal.value.type = ''
    }, 5000)
}
const mapPost = (values) => {
    const translatables = properties.value.translatable.reduce((acc, value) => {
        const regex = new RegExp(`${enums.translatableSuffix}.*`)
        const key = value.replace(regex, '')
        return enums.languages.reduce((objAcc, lang) => {
            const translatedKey = `${key}${enums.translatableSuffix}${lang}`
            const text = lang === 'en' ? key : translatedKey
            const value = values.content[text] || ''
            return {
                ...acc,
                ...objAcc,
                [text]: value,
            }
        }, {})
    }, {})
    const content = Object.entries(values.content).reduce((acc, [k, v]) => {
        if (k === 'date') acc[k] = new Date(v).toISOString().slice(0, 10)
        else acc[k] = v
        return acc
    }, {})
    return { ...values, content: { ...content, ...translatables } }
}
const cleanPost = (values) => {
    const keys = properties.value.translatable.reduce((acc, curr) => {
        const transformed = enums.languages
            .filter((lang) => lang !== 'en')
            .map((lang) => `${curr}${enums.translatableSuffix}${lang}`)
        return [...acc, ...transformed]
    }, [])
    const content = Object.keys(values.content).reduce((fields, key) => {
        const value = values.content[key]
        if (!value) return fields
        if (
            (keys.includes(key) && !html.test(value)) ||
            (!keys.includes(key) && !html.test(value))
        ) {
            return { ...fields, [key]: value }
        }
        return fields
    }, {})
    return { ...values, content }
}
const checkProperties = (prop, value) => {
    const property = properties.value[prop]
    if (property.every((item) => typeof item === 'object')) {
        const found = property.find((item) => item[value])
        if (found) return found[value]
        else return null
    } else {
        return property.includes(value)
    }
}
const checkPost = () => {
    const check = properties.value.required.every((prop) => {
        return post.value.content[prop] && !html.test(post.value.content[prop])
    })
    if (!check) {
        const message = 'Complete required fields'
        clearTimeout(modal.value.timeout)
        modal.value.message = message
        modal.value.state = true
        modal.value.type = 'error'
        resetModal()
        throw new Error(message)
    }
}
const goToPost = () => {
    let domain
    const slug = post.value.slug
    const language = locale.value === 'en' ? '' : `${locale.value}/`
    if (post.value.published) domain = import.meta.env.STORY_DOMAIN_PRO
    else domain = import.meta.env.STORY_DOMAIN_DEV
    window.open(`${domain}${language}blog/${slug}`, '_blank', 'noopener,noreferrer')
}
const editPost = async () => {
    loading.value.edit = true
    try {
        checkPost()
        await editStoryblokStory(cleanPost(post.value), locale.value)
            .then((res) => {
                post.value = mapPost(res.story)
                modal.value.message = 'Saved'
                modal.value.state = true
                modal.value.type = 'edited'
                emit('edited', post.value)
            })
            .catch(() => {
                modal.value.message = 'Error'
                modal.value.state = true
                modal.value.type = 'error'
            })
            .finally(() => {
                resetModal()
                loading.value.edit = false
            })
    } catch {
        loading.value.edit = false
    }
}
const togglePost = async () => {
    loading.value.toggle = true
    const state = post.value.published ? 'unpublish' : 'publish'
    try {
        checkPost()
        await toggleStoryblokStory(post.value.id, state)
            .then((res) => {
                post.value = mapPost(res.story)
                modal.value.message = post.value.published ? 'Published' : 'Unpublished'
                modal.value.state = true
                modal.value.type = post.value.published ? 'published' : 'error'
            })
            .catch(() => {
                modal.value.message = 'Error'
                modal.value.state = true
                modal.value.type = 'error'
            })
            .finally(() => {
                resetModal()
                loading.value.toggle = false
            })
    } catch {
        loading.value.toggle = false
    }
}
const handleSave = async (event) => {
    if (event.metaKey && event.code === 'KeyS') {
        event.preventDefault()
        await editPost()
    } else {
        if (event.keyCode == 17) {
            event.preventDefault()
            keys.value.ctrl = true
        }
        if (event.keyCode == 83 && keys.value.ctrl) {
            event.preventDefault()
            await editPost()
            keys.value.ctrl = false
        }
    }
}
onMounted(() => window.addEventListener('keydown', handleSave))
onUnmounted(() => window.removeEventListener('keydown', handleSave))
watch(
    props.data,
    async (val) => {
        if (val.content) {
            const data = await getStoryblokComponents(val.content.component, [
                'required',
                'max_length',
                'translatable',
                { type: ['markdown', 'datetime'] },
                { max_length: [String, Number] },
            ])
            const getKeys = (list, type) => {
                const mapper = (arr) => arr.map((val) => val[0])
                if (type) return mapper(list.filter((value) => value.includes(type)))
                else return mapper(list)
            }
            const getObj = (list, type) => {
                const mapper = (arr) => arr.map((val) => ({ [val[0]]: val[1] }))
                if (type) return mapper(list.filter((value) => value.includes(type)))
                else return mapper(list)
            }
            properties.value.required = getKeys(data.required)
            properties.value.maxLength = getObj(data.max_length)
            properties.value.markdown = getKeys(data.type, 'markdown')
            properties.value.datetime = getKeys(data.type, 'datetime')
            properties.value.translatable = getKeys(data.translatable)
            post.value = mapPost(val)
        }
    },
    { immediate: true }
)
</script>

<template>
    <div v-if="post.content">
        <div class="grid grid-cols-12">
            <div
                v-for="(input, indexInput) in inputs"
                :key="`${indexInput}_${locale}`"
                class="col-span-12 md:col-span-6 xl:col-span-4 mb-10"
            >
                <span
                    v-if="input.title"
                    class="block mb-5 text-lg font-semibold text-gray-300"
                    v-text="input.title"
                />
                <input v-model="post.content[input.value]" :type="input.type" />
            </div>
        </div>
        <Editor
            v-for="(editor, indexEditor) in editors"
            :key="`${indexEditor}_${locale}`"
            v-model:text="post.content[editor.value]"
            :title="editor.title"
            :tools="editor.markdown"
            :max="editor.max"
        />
        <div class="flex flex-wrap justify-center xs:justify-end mt-10 -m-2.5">
            <button
                class="w-full sm:w-32 flex justify-center m-2.5 p-2.5 px-6 rounded font-semibold active:bg-opacity-70 text-white bg-slate-700"
                @click="goToPost"
            >
                <span v-text="'Post'" />
            </button>
            <button
                class="w-full sm:w-32 flex justify-center m-2.5 p-2.5 px-6 rounded font-semibold active:bg-opacity-70 text-white bg-blue-500"
                @click="editPost"
            >
                <Icon v-if="loading.edit" class="text-2xl" icon="eos-icons:three-dots-loading" />
                <span v-else v-text="'Save'" />
            </button>
            <button
                :class="[
                    'w-full sm:w-32 flex justify-center m-2.5 p-2.5 px-6 rounded font-semibold active:bg-opacity-70 text-white',
                    post.published ? 'bg-red-500' : 'bg-green-500',
                ]"
                @click="togglePost"
            >
                <Icon v-if="loading.toggle" class="text-2xl" icon="eos-icons:three-dots-loading" />
                <span v-else v-text="post.published ? 'Unpublish' : 'Publish'" />
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
                    <span :class="[modalType[modal.type].text]" v-text="modal.message" />
                </div>
            </template>
        </Modal>
    </div>
</template>
