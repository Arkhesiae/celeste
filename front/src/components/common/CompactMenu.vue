<template>
  <!-- Menu compact : un composant à part, les défauts globaux de `v-menu` (plugins/vuetify.js) ne sont pas touchés. Ses réglages passent par
       `v-defaults-provider` : carte de la couleur du fond à coins de 24, lignes compactes à coins de 12, ligne sélectionnée en pilule de
       couleur secondaire. -->
  <v-menu
    v-model="open"
    :location="target ? undefined : location"
    :target="target ?? undefined"
    :offset="8"
    min-width="112"
    class="pa-0"
    v-bind="$attrs"
  >
    <template v-if="$slots.activator" #activator="{ props: activatorProps }">
      <slot name="activator" :props="activatorProps" :open="open" />
    </template>

    <v-defaults-provider :defaults="defaults">
      <v-card>
        <v-list :aria-label="label">
          <v-list-item
            v-for="item in items"
            :key="item.value"
            :title="item.title"
            :subtitle="item.subtitle"
            :prepend-icon="item.icon"
            :class="{ 'compact-menu__item--selected': isSelected(item) }"
            :aria-selected="isSelected(item)"
            @click="select(item)"
          >
            <slot name="item" :item="item" :selected="isSelected(item)" />
          </v-list-item>
        </v-list>
      </v-card>
    </v-defaults-provider>
  </v-menu>
</template>

<script setup>
// `items` : `{ title, value, subtitle?, icon? }` ; `v-model` : la valeur choisie. Le slot `activator` reçoit `props` à poser sur le bouton qui ouvre
// le menu (`v-bind="props"`) ; le slot `item` ajoute du contenu à une ligne. Sans activateur, le menu s'ouvre depuis le parent avec
// `v-model:open`, à l'endroit donné par `target` (`[x, y]` en pixels de la fenêtre, par exemple celui d'un appui long).
defineOptions({ inheritAttrs: false });

const modelValue = defineModel({ type: [String, Number, Boolean, Object], default: null });

const open = defineModel('open', { type: Boolean, default: false });

defineProps({
  items: {
    type: Array,
    required: true,
  },
  location: {
    type: String,
    default: 'bottom start',
  },
  // Position d'ouverture `[x, y]` (sans activateur)
  target: {
    type: Array,
    default: undefined,
  },
  // Libellé du menu pour les lecteurs d'écran
  label: {
    type: String,
    default: undefined,
  },
});

const emit = defineEmits(['select']);

const isSelected = (item) => item.value === modelValue.value;

const select = (item) => {
  modelValue.value = item.value;
  emit('select', item);
  open.value = false;
};

// Les réglages par défaut, selon le principe des défauts de Vuetify. Ils reprennent l'emboîtement des défauts globaux de `VMenu` (carte > liste >
// ligne, voir plugins/vuetify.js) pour l'emporter sur eux, mais ne valent que pour ce menu.
const defaults = {
  VCard: {
    class: 'pa-1',
    color: 'surfaceContainer',
    rounded: '24',
    VList: {
      rounded: '0',
      bgColor: 'transparent',
      density: 'compact',
      class: 'pa-0 d-flex flex-column ga-1',
      VListItem: {
        minHeight: 40,
        rounded: '12',
        color: 'secondary',
        VListItemTitle: {
          class: 'text-label-medium',
        },
      },
    },
  },
};
</script>

<style scoped>
/* La ligne sélectionnée : pilule de couleur secondaire. Hors de toute couche CSS, donc plus forte que l'arrondi de 12 des lignes. */
.compact-menu__item--selected {
  --v-activated-opacity: 0;
  border-radius: 9999px !important;
  background-color: rgb(var(--v-theme-secondary));
  color: rgb(var(--v-theme-onSecondary));
}

.v-list-item {
  transition: border-radius 0.2s cubic-bezier(0.2, 0, 0, 1);
}
</style>
