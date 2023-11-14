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
                        class="group relative w-full h-10 flex items-center justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 text-white bg-black hover:bg-gray-900 focus:ring-gray-500"
                    >
                        <Loader v-if="loading" size="3" />
                        <span v-else class="block" v-text="'Login'" />
                    </button>
                    <Transition
                        leave-to-class="opacity-0"
                        enter-from-class="opacity-0"
                        enter-active-class="transition duration-75"
                        leave-active-class="transition duration-75"
                    >
                        <span
                            v-if="failed"
                            class="absolute w-full block px-1 py-1.5 rounded-md translate-y-6 text-sm font-medium text-white bg-red-500"
                            v-text="failed"
                        />
                    </Transition>
                </div>
            </form>
        </div>
    </div>
</template>
<script>
import enums from '@/enums'
import Loader from '@/components/Loader'
import { reactive, toRefs, inject } from 'vue'
export default {
    name: 'Login',
    components: { Loader },
    setup() {
        const db = inject('db')
        const state = reactive({ email: '', password: '', loading: false, failed: '' })
        const { email, password, loading, failed } = toRefs(state)
        const errorHandler = (error) => {
            console.table(error)
            failed.value = error.message || error
            if (error.status === 400) password.value = ''
        }
        const signIn = async () => {
            reset()
            loading.value = true
            await db.auth
                .signInWithPassword({
                    email: email.value,
                    password: password.value,
                })
                .then(({ error }) => {
                    if (error) errorHandler(error)
                })
                .catch(errorHandler)
                .finally(() => (loading.value = false))
        }
        const reset = () => {
            if (failed.value) failed.value = ''
        }
        return {
            reset,
            email,
            failed,
            signIn,
            loading,
            password,
            name: enums.webTitle,
        }
    },
}
</script>
