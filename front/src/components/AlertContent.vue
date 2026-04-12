<template>
    <div class="d-flex align-center justify-space-between">
        <div>
            <v-card-title class="text-h6 font-weight-medium">{{ title }}</v-card-title>
            <v-card-text>
                <slot />
            </v-card-text>
        </div>
        <v-icon v-if="chevron" icon="mdi-chevron-right" color="error" size="32" class="mr-2" />
    </div>
</template>

<script setup>
defineProps({
    title: { type: String, required: true },
    chevron: { type: Boolean, default: false },
});
</script>