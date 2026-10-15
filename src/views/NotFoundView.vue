<template>
    <section class="flex flex-col items-start gap-3 py-16">
        <h1 class="text-2xl font-bold tracking-tight">Page not found</h1>
        <RouterLink
            :to="{ name: 'stories' }"
            class="text-sm font-medium underline underline-offset-4"
        >
            Back to posts
        </RouterLink>
    </section>
</template>
