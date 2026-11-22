<template>
  <!-- Bouton scindé de tri : à gauche, le critère en cours (un clic ouvre la liste des critères) ; à droite, un chevron qui montre l'ordre
       (vers le haut : croissant, vers le bas : décroissant) et l'inverse d'un clic. -->
  <v-btn-group connected variant="tonal" color="primary" density="comfortable" class="sort-split">
    <CompactMenu v-model="criterion" :items="items" :label="label" location="bottom start">
      <template #activator="{ props: menuProps }">
        <v-btn
          v-bind="menuProps"
          class="sort-split__label text-label-medium"
          size="small"
          height="36"
          :aria-label="`${label} : ${current?.text ?? ''}, changer de critère`"
        >
          {{ current?.text ?? label }}
        </v-btn>
      </template>
    </CompactMenu>

    <v-btn
      class="sort-split__order text-label-medium"
      :aria-label="
        order === 'asc' ? 'Ordre croissant, passer en décroissant' : 'Ordre décroissant, passer en croissant'
      "
      size="small"
      height="36"
      :title="order === 'asc' ? 'Croissant' : 'Décroissant'"
      @click="order = order === 'asc' ? 'desc' : 'asc'"
    >
      <v-icon
        icon="mdi-chevron-up"
        class="sort-split__chevron"
        :class="{ 'sort-split__chevron--desc': order === 'desc' }"
      />
    </v-btn>
  </v-btn-group>
</template>

<script setup>
import CompactMenu from './CompactMenu.vue';

// Le critère choisi (l'une des `options`, objets `{ text, tag }`) et l'ordre ('asc' ou 'desc') sont deux modèles : v-model:sort et v-model:order
const current = defineModel('sort', { type: Object, default: null });
const order = defineModel('order', {
  type: String,
  default: 'asc',
  validator: (value) => ['asc', 'desc'].includes(value),
});

const props = defineProps({
  options: {
    type: Array,
    required: true,
  },
  label: {
    type: String,
    default: 'Trier par',
  },
});

// Les critères au format du menu compact (`title` / `value`), et le critère choisi comme valeur de ce menu
const items = computed(() => props.options.map((option) => ({ title: option.text, value: option.tag })));
const criterion = computed({
  get: () => current.value?.tag ?? null,
  set: (tag) => {
    current.value = props.options.find((option) => option.tag === tag) ?? current.value;
  },
});

// sans critère choisi au départ, le premier
if (!current.value && props.options.length) current.value = props.options[0];
</script>

<style scoped>
/* Boutons reliés : grands arrondis aux deux extrémités, petit entre les deux ; l'ordre se lit sur le chevron qui pivote */
.sort-split__chevron {
  transition: transform 0.25s cubic-bezier(0.2, 0, 0, 1);
}

.sort-split__chevron--desc {
  transform: rotate(180deg);
}

@media (prefers-reduced-motion: reduce) {
  .sort-split__chevron {
    transition: none;
  }
}
</style>
