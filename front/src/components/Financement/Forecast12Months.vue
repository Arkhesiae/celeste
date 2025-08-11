<template>
  <v-card rounded="xl" elevation="0" class="smooth-shadow pa-6" color="surfaceContainer">
    <h3 class="text-h6 font-weight-medium mb-4">Prévision sur 12 Mois</h3>
    <div class="months-forecast">
      <div class="months-grid py-16">
        <div v-for="(month, index) in nextMonths" :key="index" class="month-rectangle" :class="{ 'exhausted': month.exhausted }">
          <!-- Ligne verticale de date d'épuisement -->
          <div v-if="month.showExhaustionLine" class="exhaustion-line" :style="{ left: `${month.exhaustionPosition}%` }">
            <div class="exhaustion-dot"></div>
            <div class="exhaustion-label">
              <div class="exhaustion-date">{{ exhaustionDate }}</div>
              <div class="exhaustion-text">Épuisement</div>
            </div>
          </div>
          <div class="month-rectangle-content">
            <div class="month-fill" :style="{ width: `${month.fillPercentage}%` }"></div>
            <div class="month-label">{{ month.label }}</div>
            <div v-if="month.monthBudget !== null" class="month-budget">
              {{ month.monthBudget }}€
            </div>
          </div>
        </div>
      </div>
      <!-- Ligne de prochaine campagne -->
      <div class="next-campaign-line mt-4">
        <div class="campaign-indicator">
          <span class="text-caption font-weight-medium">Prochaine campagne : {{ nextCampaign }}</span>
        </div>
      </div>
    </div>
  </v-card>
</template>

<script setup>
const props = defineProps({
  nextMonths: { type: Array, required: true },
  exhaustionDate: { type: String, required: true },
  nextCampaign: { type: [String, Number], required: true }
});
</script>

<style scoped>
@import "./CurrentBudgetCard.vue";
</style> 