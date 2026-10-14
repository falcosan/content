<script setup lang="ts">
import { CircleAlert } from '@lucide/vue'
import { computed, ref, useId } from 'vue'
import { errorMessage, statusOf } from '@/api/client'
import { useSignIn } from '@/composables/useSession'
import UiButton from './ui/UiButton.vue'

const emit = defineEmits<{ success: [] }>()

const user = ref('')
const password = ref('')
const errorId = useId()
const signIn = useSignIn()

const error = computed(() => {
    const failure = signIn.error.value
    if (!failure) return ''
    if (statusOf(failure) === 401) return 'Invalid credentials'
    if (statusOf(failure) === 429) return 'Too many attempts. Try again in a minute.'
    return errorMessage(failure)
})

const submit = () =>
    signIn.mutate(
        { user: user.value, password: password.value },
        {
            onSuccess: () => emit('success'),
            onError: () => (password.value = ''),
        }
    )
</script>

<template>
    <form class="flex flex-col gap-4" novalidate @submit.prevent="submit">
        <label class="block">
            <span class="label">Email or username</span>
            <input
                v-model="user"
                class="control"
                type="text"
                name="username"
                autocapitalize="none"
                spellcheck="false"
                autocomplete="username"
                required
                autofocus
                :aria-invalid="!!error || undefined"
                :aria-describedby="error ? errorId : undefined"
                @input="signIn.reset()"
            />
        </label>
        <label class="block">
            <span class="label">Password</span>
            <input
                v-model="password"
                class="control"
                type="password"
                name="password"
                autocomplete="current-password"
                required
                :aria-invalid="!!error || undefined"
                :aria-describedby="error ? errorId : undefined"
                @input="signIn.reset()"
            />
        </label>
        <p
            v-if="error"
            :id="errorId"
            role="alert"
            class="flex items-center gap-2 text-sm font-medium"
        >
            <CircleAlert class="size-4 shrink-0" aria-hidden="true" />
            {{ error }}
        </p>
        <UiButton
            type="submit"
            variant="solid"
            :loading="signIn.isPending.value"
            :disabled="!user || !password"
        >
            Sign in
        </UiButton>
    </form>
</template>
