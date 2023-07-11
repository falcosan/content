<template>
    <div class="w-full min-h-screen flex justify-center items-center max-w-md mx-auto space-y-8">
        <div class="w-full text-center">
            <span class="block mb-5 text-3xl font-bold text-gray-700" v-text="name" />
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
                        />
                    </div>
                </div>
                <div>
                    <button
                        type="submit"
                        class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 text-white bg-gray-600 hover:bg-gray-700 focus:ring-gray-500"
                    >
                        <span class="absolute left-0 inset-y-0 flex items-center pl-3"> </span>
                        Login
                    </button>
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
        const state = reactive({ username: '', password: '' })
        const { username, password } = toRefs(state)
        const signIn = () => {
            const authorized =
                username.value === import.meta.env.STORY_AUTH_USERNAME &&
                password.value === import.meta.env.STORY_AUTH_PASSWORD
            if (authorized) auth.value = import.meta.env.STORY_AUTH_SECRET
        }
        return {
            signIn,
            username,
            password,
            name: enums.webTitle,
        }
    },
}
</script>
