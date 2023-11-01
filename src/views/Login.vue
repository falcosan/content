<template>
    <div class="w-full min-h-screen flex justify-center items-center max-w-md mx-auto space-y-8">
        <div class="w-full text-center">
            <span class="block mb-5 text-3xl font-bold text-gray-200" v-text="name" />
            <form class="space-y-6" @submit.prevent="signIn" @keydown.enter="signIn">
                <div class="rounded-md shadow-sm -space-y-px">
                    <div>
                        <label for="username" class="sr-only">Username</label>
                        <input
                            id="username"
                            v-model="username"
                            name="username"
                            type="text"
                            autocomplete="username"
                            required
                            class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-gray-500 focus:border-gray-500 focus:z-10 sm:text-sm"
                            placeholder="Username"
                            @input="reset"
                        />
                    </div>
                    <div>
                        <label for="password" class="sr-only">Password</label>
                        <input
                            id="password"
                            v-model="password"
                            name="password"
                            type="password"
                            autocomplete="current-password"
                            required
                            class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-gray-500 focus:border-gray-500 focus:z-10 sm:text-sm"
                            placeholder="Password"
                            @input="reset"
                        />
                    </div>
                </div>
                <div class="relative">
                    <button
                        type="submit"
                        class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 text-white bg-black hover:bg-gray-900 focus:ring-gray-500"
                    >
                        Login
                    </button>
                    <Transition
                        enter-from-class="opacity-0"
                        leave-to-class="opacity-0"
                        enter-active-class="transition duration-75"
                        leave-active-class="transition duration-75"
                    >
                        <span
                            v-if="error"
                            class="absolute w-full block px-1 py-1.5 rounded-md translate-y-6 text-sm font-medium text-white bg-red-500"
                            v-text="'Username or Password is incorrect'"
                        />
                    </Transition>
                </div>
            </form>
        </div>
    </div>
</template>
<script>
import enums from '@/enums'
import { inject } from 'vue'
import { reactive, toRefs } from 'vue'
export default {
    name: 'Login',
    setup() {
        const auth = inject('auth')
        const state = reactive({ username: '', password: '', error: false })
        const { username, password, error } = toRefs(state)
        const signIn = () => {
            reset()
            const authorized =
                username.value === import.meta.env.STORY_AUTH_USERNAME &&
                password.value === import.meta.env.STORY_AUTH_PASSWORD
            if (authorized) auth.value = import.meta.env.STORY_AUTH_SECRET
            else setTimeout(() => (error.value = true), 75)
        }
        const reset = () => {
            if (error.value) error.value = false
        }
        return {
            reset,
            error,
            signIn,
            username,
            password,
            name: enums.webTitle,
        }
    },
}
</script>
