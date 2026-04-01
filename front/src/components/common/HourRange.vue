<script setup>
const props = defineProps({
    hours: { type: Object, required: true },
    endsNextDay: { type: Boolean, default: false },
});
</script>

<template>
    <div class="d-flex align-center ga-2">
        <span class="text-caption font-weight-bold">{{ hours.startTime }}</span>
        <v-icon size="12px" color="primary">mdi-arrow-right</v-icon>
        <div class="d-flex align-center">
            <span class="text-caption font-weight-bold">{{ hours.endTime }}</span>
            <span v-if="endsNextDay" class="text-caption font-weight-bold opacity-50 ml-1"
                style="font-size: 10px !important; top: -2px; position: relative;">+1</span>
        </div>
    </div>
</template>
