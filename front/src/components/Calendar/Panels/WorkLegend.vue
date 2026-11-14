<template>
  <div
class="work-legend d-flex flex-wrap align-center text-body-small text-medium-emphasis" role="list"
    aria-label="Légende des indicateurs de temps de travail">
    <span class="legend-item" role="listitem">
      <span class="sample sample--work" aria-hidden="true" />
      Plus de {{ formatHours(limits.maxWeeklyWorkMinutes) }} de travail sur 7 jours
    </span>
    <span class="legend-item" role="listitem">
      <span class="sample sample--rest" aria-hidden="true" />
      Pas de repos continu de {{ formatHours(limits.weeklyRestMinutes) }} sur 7 jours
    </span>
    <span class="legend-item" role="listitem">
      <span class="rest-pill" aria-hidden="true"><v-icon size="11">mdi-sleep-off</v-icon></span>
      Moins de {{ formatHours(limits.minRestMinutes) }} de repos avant la vacation
    </span>
  </div>
</template>

<script setup>
import { formatHours } from '@/utils/workWindows';

/** Légende des indicateurs du calendrier : ce que signifient les lignes (trait plein, pointillés) et la pastille de repos. */
defineProps({
  /** Seuils appliqués par le serveur */
  limits: { type: Object, required: true },
});
</script>

<style scoped>
.work-legend {
  gap: 4px 16px;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.sample {
  display: inline-block;
  width: 22px;
  height: 3px;
  flex: none;
}

.sample--work {
  background: rgb(var(--v-theme-error));
}

.sample--rest {
  background: repeating-linear-gradient(90deg, rgb(var(--v-theme-error)) 0 6px, transparent 6px 9px);
}

.rest-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: rgb(var(--v-theme-error));
  color: rgb(var(--v-theme-onError));
  flex: none;
}
</style>
