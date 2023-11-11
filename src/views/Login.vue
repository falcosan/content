<template>
    <div class="w-full min-h-screen flex justify-center items-center max-w-md mx-auto space-y-8">
        <div class="w-full text-center">
            <span class="block mb-5 text-3xl font-bold text-gray-200" v-text="name" />
            <form class="space-y-6" @submit.prevent="signIn" @keydown.enter="signIn">
                <div class="rounded-md shadow-sm -space-y-px">
                    <div>
                        <label for="email" class="sr-only">Email</label>
                        <input
                            id="email"
                            v-model="email"
                            name="email"
                            type="text"
                            autocomplete="email"
                            required
                            class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-gray-500 focus:border-gray-500 focus:z-10 sm:text-sm"
                            placeholder="Email"
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
                            v-if="failed"
                            class="absolute w-full block px-1 py-1.5 rounded-md translate-y-6 text-sm font-medium text-white bg-red-500"
                            v-text="'Email or Password is incorrect'"
                        />
                    </Transition>
                </div>
            </form>
        </div>
    </div>
</template>
<script>
import enums from '@/enums'
import { reactive, toRefs, inject } from 'vue'
export default {
    name: 'Login',
    setup() {
        const db = inject('db')
        const auth = inject('auth')
        const state = reactive({ email: '', password: '', failed: false })
        const { email, password, failed } = toRefs(state)
        const signIn = async () => {
            reset()
            const { error } = await db.auth.signInWithPassword({
                email: email.value,
                password: password.value,
            })
            if (error) {
                setTimeout(() => (error.value = true), 75)
                throw new Error(error)
            }
        }
        const reset = () => {
            if (failed.value) failed.value = false
        }
        return {
            reset,
            failed,
            signIn,
            email,
            password,
            name: enums.webTitle,
        }
    },
}
</script>
