<template>
  <div>
    <!-- Les deux pages d'information, reliées en un seul groupe : l'une ou l'autre est affichée en dessous -->
    <v-container class="pb-0">
      <div class="d-flex justify-center">
        <v-btn-toggle
          :model-value="section"
          mandatory
          connected
          variant="flat"
          color="primary"
          :size="smAndDown ? 'small' : 'default'"
          aria-label="Informations"
          @update:model-value="goTo"
        >
          <v-btn v-for="item in sections" :key="item.value" :value="item.value" :prepend-icon="item.icon">
            {{ item.title }}
          </v-btn>
        </v-btn-toggle>
      </div>
    </v-container>

    <router-view />
  </div>
</template>

<script setup>
// Les pages d'information : layout `alternative` (barre avec retour vers l'onglet)
definePage({ meta: { layout: 'alternative' } });

import { useRoute, useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';

const route = useRoute();
const router = useRouter();
const { smAndDown } = useDisplay();

const sections = [
  { value: 'financement', title: 'Financement', icon: 'mdi-currency-eur' },
  { value: 'patchnotes', title: 'Notes de versions', icon: 'mdi-update' },
];

// La section affichée est la fin de l'adresse : /information/financement ou /information/patchnotes
const section = computed(() => sections.find((item) => route.path.endsWith(`/${item.value}`))?.value);

const goTo = (value) => {
  if (value && value !== section.value) {
    router.push({ path: `/information/${value}` });
  }
};
</script>
