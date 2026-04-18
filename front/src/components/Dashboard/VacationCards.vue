<template>
    <!-- Mobile: Swiper -->
     <div class=" d-flex justify-space-between align-start flex-column  ga-4">
          <span class="text-h6 font-weight-medium pa-0">
            A venir
          </span>
    <div v-if="smAndDown" class="w-100">
        <Swiper :modules="[Pagination]" :pagination="{ clickable: true }" :slides-per-view="1" :space-between="16"
            class="vacation-swiper">
            <SwiperSlide>
                <ShiftCard class="bg-surfaceContainer" :enableAssign="false" :date="todayISO" label="Aujourd'hui" />
            </SwiperSlide>
            <SwiperSlide>
                <ShiftCard class="bg-surfaceContainer" :enableAssign="false" :date="tomorrowISO" label="Demain" />
            </SwiperSlide>
        </Swiper>
    </div>

    <!-- Desktop: side by side -->
    <div v-else class="d-flex ga-4 w-100  flex-wrap">
        <ShiftCard class="bg-surfaceContainer flex-1-1" :enableAssign="false" :date="todayISO" label="Aujourd'hui" />
        <ShiftCard class="bg-surfaceContainer flex-1-1" :enableAssign="false" :date="tomorrowISO" label="Demain" />
    </div>
    </div>
</template>

<script setup>
import { useDisplay } from 'vuetify';
import { Swiper, SwiperSlide } from 'swiper/vue';
import { Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';

const { smAndDown } = useDisplay();

const todayISO = computed(() => new Date().toISOString().slice(0, 10));
const tomorrowISO = computed(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
});
</script>

<style scoped>
.vacation-swiper {
    padding-bottom: 32px !important;
}

.vacation-swiper :deep(.swiper-pagination) {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
}

.vacation-swiper :deep(.swiper-pagination-bullet) {
    width: 6px;
    height: 6px;
    border-radius: 50px;
    background: rgba(var(--v-theme-onSurfaceVariant), 0.4);
    opacity: 1;
    margin: 0 !important;
    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
        background 0.3s ease;
}

.vacation-swiper :deep(.swiper-pagination-bullet-active) {
    width: 24px;
    background: rgba(var(--v-theme-primary), 1);
}
</style>