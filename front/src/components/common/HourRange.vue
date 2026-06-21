<script setup>
const props = defineProps({
    hours: { type: Object, required: true },
    endsNextDay: { type: Boolean, default: false },
    wasPatched: { type: Boolean, default: false },
});
</script>

<template>
    <div class="d-flex align-center ga-2">
        <span style="line-height: 1.2;" class="text-body-small font-weight-bold">{{ hours.startTime }}</span>
        <v-icon size="12px" color="primary">mdi-arrow-right</v-icon>
        <div class="d-flex align-center">
            <span style="line-height: 1.2;" class="text-body-small font-weight-bold">{{ hours.endTime }}</span>
            <span
v-if="endsNextDay" class="text-body-small font-weight-bold opacity-50 ml-1"
                style="line-height: 1.2; font-size: 10px !important; top: -2px; position: relative;">+1</span>
        </div>
        <v-icon v-if="wasPatched" size="12px" color="primary">mdi-clock-fast</v-icon>
    </div>
</template>
