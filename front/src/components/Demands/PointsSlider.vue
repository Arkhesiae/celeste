<template>
  <div class="points-slider">
    <!-- Libellé et valeur courante au-dessus de la glissière : la valeur se lit sans deviner la position du curseur -->
    <div class="d-flex align-center justify-space-between ga-2 mb-1">
      <div class="d-flex align-center ga-2 min-width-0">
        <v-icon v-if="icon" :icon="icon" size="16" class="opacity-70" aria-hidden="true" />
        <span class="text-body-medium font-weight-bold text-truncate">{{ label }}</span>
      </div>
      <div class="d-flex align-center ga-1 flex-shrink-0">
        <span class="points-slider__value text-title-medium font-weight-bold" :class="{ 'text-error': excess }">{{
          points
        }}</span>
        <LogoCopy />
      </div>
    </div>

    <!-- Curseur MD3 expressif : piste épaisse aux coins arrondis et poignée en pastille -->
    <v-slider
      v-model="points"
      :min="min"
      :max="max"
      :step="1"
      :size="size"
      variant="pill"
      :color="excess ? 'error' : 'primary'"
      hide-details
      :aria-label="label"
    />

    <span v-if="reference !== null && points !== reference" class="text-body-small opacity-50">
      Points par défaut : {{ reference }}
    </span>
  </div>
</template>

<script setup>
/**
 * Choix d'un nombre de points sur un curseur (MD3 expressif, `v-slider` en variante `pill`) : remplace la saisie numérique.
 * Au-delà de la valeur de référence + 3, la valeur et le curseur passent en couleur d'erreur (offre nettement au-dessus de l'usage).
 */
const points = defineModel({ type: Number, default: 0 });

const props = defineProps({
  /** Ce que les points mesurent : « Remplacement », le nom d'une vacation... */
  label: { type: String, required: true },
  icon: { type: String, default: null },
  min: { type: Number, default: 0 },
  max: { type: Number, default: 20 },
  /** Taille MD3 de la piste : x-small (16 px), small (24 px), medium (40 px)... */
  size: { type: String, default: 'medium' },
  /** Valeur habituelle, rappelée sous le curseur quand on s'en écarte ; `null` : aucune */
  reference: { type: Number, default: null },
});

const excess = computed(() => props.reference !== null && points.value > props.reference + 3);
</script>

<style scoped>
.points-slider__value {
  font-variant-numeric: tabular-nums;
}
</style>
