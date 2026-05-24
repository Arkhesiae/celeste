<template>
  <div class="announcement-banners">
    <!-- ── Permanent banners (always visible, no dismiss) ────────────────── -->
    <TransitionGroup name="banner-slide" tag="div">
      <div v-for="ann in PAstore.permanentAnnouncements" :key="ann._id" class="announcement-banner permanent"
        :class="`type-${ann.type}`">
        <div class="banner-accent" />
        <div class="banner-content">
          <div class="banner-icon">
            <v-icon :icon="typeIcon(ann.type)" size="18" />
          </div>
          <div class="banner-text">
            <span class="banner-title">{{ ann.title }}</span>
            <span class="banner-message">{{ ann.message }}</span>
          </div>
          <v-chip size="x-small" class="permanent-chip" label>
            <v-icon start size="10">mdi-pin</v-icon>
            Permanent
          </v-chip>
        </div>
      </div>
    </TransitionGroup>

    <!-- ── Non-permanent banner (most recent unacknowledged) ─────────────── -->
    <Transition name="banner-slide">
      <div v-if="currentBanner" :key="currentBanner._id" class="announcement-banner dismissible"
        :class="`type-${currentBanner.type}`">
        <div class="banner-accent" />
        <div class="banner-content">
          <div class="banner-icon">
            <v-icon :icon="typeIcon(currentBanner.type)" size="18" />
          </div>
          <div class="banner-text">
            <span class="banner-title">{{ currentBanner.title }}</span>
            <span class="banner-message">{{ currentBanner.message }}</span>
          </div>


          <v-btn size="small" variant="tonal" rounded="xl" class="ack-btn" :loading="acknowledging"
            @click="handleAcknowledge">
            J'ai compris
          </v-btn>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { usePublicAnnouncementStore } from '@/stores/publicAnnouncementStore.js';

const PAstore = usePublicAnnouncementStore();

const acknowledging = ref(false);

const currentBanner = computed(() => {
  return PAstore.currentBanner;
});

const typeIcon = (type) => {
  const icons = {
    info: 'mdi-information-outline',
    warning: 'mdi-alert-outline',
    maintenance: 'mdi-tools',
    update: 'mdi-update'
  };
  return icons[type] ?? 'mdi-bullhorn-outline';
};

const handleAcknowledge = async () => {
  const id = PAstore.currentBanner?._id;
  if (!id) return;
  acknowledging.value = true;
  try {
    await PAstore.acknowledge(id);
  } finally {
    acknowledging.value = false;
  }
};

onMounted(() => {
  PAstore.fetchActive();
});
</script>

<style scoped>
.announcement-banners {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

/* ── Base banner ─────────────────────────────────────────────────────────── */
.announcement-banner {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  background: rgba(var(--v-theme-surfaceContainer), 1);
  border: 1px solid rgba(var(--v-theme-outline), 0.12);
}

.banner-accent {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  border-radius: 0;
}

.banner-content {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px 12px 20px;
  flex-wrap: wrap;
}

.banner-icon {
  flex-shrink: 0;
  opacity: 0.85;
}

.banner-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.banner-title {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.3;
  color: rgba(var(--v-theme-onSurface), 0.9);
}

.banner-message {
  font-size: 12px;
  color: rgba(var(--v-theme-onSurface), 0.6);
  line-height: 1.4;
  white-space: pre-line;
}

/* ── Type variants ───────────────────────────────────────────────────────── */
.type-info .banner-accent {
  background: #42A5F5;
}

.type-info .banner-icon {
  color: #42A5F5;
}

.type-warning .banner-accent {
  background: #FFA726;
}

.type-warning .banner-icon {
  color: #FFA726;
}

.type-maintenance .banner-accent {
  background: #EF5350;
}

.type-maintenance .banner-icon {
  color: #EF5350;
}

.type-update .banner-accent {
  background: #66BB6A;
}

.type-update .banner-icon {
  color: #66BB6A;
}

/* ── Permanent chip ──────────────────────────────────────────────────────── */
.permanent-chip {
  flex-shrink: 0;
  font-size: 10px;
  opacity: 0.7;
}

/* ── Navigation (multiple banners) ──────────────────────────────────────── */
.banner-nav {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.nav-label {
  font-size: 11px;
  color: rgba(var(--v-theme-onSurface), 0.5);
  min-width: 28px;
  text-align: center;
}

/* ── Acknowledge button ──────────────────────────────────────────────────── */
.ack-btn {
  flex-shrink: 0;
  font-size: 12px;
  height: 32px;
}

/* ── Transitions ─────────────────────────────────────────────────────────── */
.banner-slide-enter-active {
  transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.banner-slide-leave-active {
  transition: all 0.25s ease-in;
}

.banner-slide-enter-from {
  opacity: 0;
  transform: translateY(-12px) scale(0.98);
}

.banner-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.97);
}
</style>
