<script setup>
defineProps({
    position: {
        type: String,
        default: '',
        validator: (val) => /cover|full|/.test(val),
    },
    size: {
        type: String,
        default: '5',
    },
})
</script>
<template>
    <div
        :class="[
            'flex items-center justify-center',
            {
                [`fixed w-full h-full inset-0 ${
                    position === 'cover' ? 'z-20' : 'z-10'
                } bg-[#262626]`]: /cover|full/.test(position),
            },
        ]"
    >
        <svg
            id="loader-pencil"
            xmlns="http://www.w3.org/2000/svg"
            width="667"
            height="182"
            :style="`width: ${size}rem`"
            viewBox="0 0 677.34762 182.15429"
        >
            <g>
                <path
                    id="body-pencil"
                    d="M128.273 0l-3.9 2.77L0 91.078l128.273 91.076 549.075-.006V.008L128.273 0zm20.852 30l498.223.006V152.15l-498.223.007V30zm-25 9.74v102.678l-49.033-34.813-.578-32.64 49.61-35.225z"
                ></path>
                <path id="line" d="M134.482 157.147v25l518.57.008.002-25-518.572-.008z"></path>
            </g>
        </svg>
    </div>
</template>
<style scoped>
#loader-pencil {
    @apply h-auto fill-[#ccc];
}
#line {
    animation: linePencil 0.8s infinite linear;
}
@keyframes linePencil {
    0% {
        transform: translateY(0);
    }
    100% {
        transform: translateY(-150px);
    }
}
</style>
