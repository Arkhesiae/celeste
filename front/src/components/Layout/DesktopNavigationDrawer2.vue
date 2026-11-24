<template>
  <v-navigation-drawer v-if="!smAndDown && isLoggedIn" rail order="-1" border="none" rail-width="96px">
    <div class="py-6 d-flex align-center justify-space-evenly">
      <v-btn
        icon
        class="desktop-nav__home"
        elevation="0"
        color="primary"
        :to="tabTarget('dashboard', '/dashboard')"
        :ripple="false"
        aria-label="Tableau de bord"
      >
        <!-- Le logo sur l'accueil, l'icône d'accueil ailleurs -->
        <v-scale-transition mode="out-in">
          <LogoCopy v-if="isHome" key="logo" class="desktop-nav__logo" />
          <v-icon v-else key="home" icon="mdi-home" color="background" />
        </v-scale-transition>
      </v-btn>
    </div>

    <nav class="mt-16" aria-label="Navigation principale">
      <VNavigationBtn
        v-for="navItem in visibleItems"
        :key="navItem.path"
        :to="navItem.tab ? tabTarget(navItem.tab, navItem.path) : navItem.path"
        :active="navItem.match ? navItem.match(route.path) : undefined"
        stacked
        :icon="navItem.iconInactive"
        :active-icon="navItem.iconActive"
        :badge="navItem.badgeCount > 0 ? navItem.badgeCount : false"
        :value="navItem.value"
        color="primary"
        base-color="onBackground"
      >
        <span class="desktop-nav__text">{{ navItem.title }}</span>
      </VNavigationBtn>
    </nav>

    <template #append>
      <nav class="py-4" aria-label="Aide et réglages">
        <VNavigationBtn
          v-for="navItem in footerItems"
          :key="navItem.title"
          :to="navItem.path"
          stacked
          :icon="navItem.iconInactive"
          :active-icon="navItem.iconActive"
          :text="navItem.title"
          :aria-label="navItem.title"
          labels="none"
          class="desktop-nav__outlined"
          color="primary"
          base-color="onBackground"
          @click="navItem.action?.()"
        />
      </nav>
    </template>
  </v-navigation-drawer>
</template>

<script setup>
import { useRoute } from 'vue-router';
import { VNavigationBtn } from 'vuetify/labs/VNavigationBtn';
import { useDisplay } from 'vuetify';
import { useAuthStore } from '@/stores/authStore.js';
import { useDemandStore } from '@/stores/demandStore';
import { tabTarget } from '@/router/tabMemory.js';
import { useAssistanceStore } from '@/stores/assistanceStore.js';
import { parametersPath } from '@/utils/profilePaths.js';

const demandStore = useDemandStore();
const authStore = useAuthStore();
const assistance = useAssistanceStore();
const { smAndDown } = useDisplay();
const route = useRoute();
const isHome = computed(() => route.name === '/(tabs)/dashboard');

const isLoggedIn = computed(() => authStore.isLoggedIn);
const isMaster = computed(() => authStore.userData.adminType === 'master');
const centerId = computed(() => authStore.userData.centerId);

const demandsCount = computed(
  () =>
    demandStore.availableSubstitutions.length +
    demandStore.availableSwitches.length +
    demandStore.otherDemands.length,
);

// `show: false` retire l'entrée. « Mon centre » dépend du centre : un administrateur principal sans centre choisit d'abord un centre
// (« Centres »). `match` remplace la comparaison de l'adresse pour savoir si l'entrée est active.
const navigationItems = computed(() => [
  {
    path: '/demand-page/demands',
    tab: 'demands',
    title: 'Demandes',
    value: 'replace',
    iconActive: 'mdi-account-arrow-left',
    iconInactive: 'mdi-account-arrow-left-outline',
    badgeCount: demandsCount.value,
  },
  {
    path: '/planning/calendar',
    tab: 'planning',
    title: 'Planning',
    value: 'rep',
    iconActive: 'mdi-calendar',
    iconInactive: 'mdi-calendar-outline',
    // Calendrier et grille de l'équipe sont deux vues d'un même planning (voir PlanningSwitch.vue)
    match: (path) => path.startsWith('/planning'),
  },
  {
    path: `/center/${centerId.value}/teams`,
    tab: 'center',
    match: (path) => path.startsWith('/center/'),
    title: 'Mon centre',
    value: 'my-center',
    iconActive: 'mdi-airport',
    iconInactive: 'mdi-airport',
    show: !isMaster.value && !!centerId.value,
  },
  {
    path: '/center/centers',
    tab: 'center',
    match: (path) => path.startsWith('/center/'),
    title: 'Centres',
    value: 'centers',
    iconActive: 'mdi-home',
    iconInactive: 'mdi-home-outline',
    show: isMaster.value,
  },
]);

const visibleItems = computed(() => navigationItems.value.filter((item) => item.show !== false));

// Bas du rail : Informations (financement, notes de versions), Assistance et Paramètres, comme dans le tiroir mobile, en icônes seules (pleine sur la page active)
const footerItems = computed(() => [
  {
    path: '/information',
    title: 'Infos',
    value: 'information',
    iconActive: 'mdi-information',
    iconInactive: 'mdi-information-outline',
  },
  {
    // Une fenêtre, pas une page
    action: () => assistance.open(),
    title: 'Assistance',
    iconActive: 'mdi-help-circle',
    iconInactive: 'mdi-help-circle-outline',
  },
  {
    path: parametersPath(authStore.userData.userId),
    title: 'Paramètres',
    iconActive: 'mdi-cog',
    iconInactive: 'mdi-cog-outline',
  },
]);
</script>

<style scoped>
/* Libellé sous l'icône : un cran sous les 12 px du composant (le contenu du slot s'affiche dans le libellé) */
.desktop-nav__text {
  font-size: 0.6875rem;
  line-height: 1.2;
}

/* Variante contournée et plus petite : une pastille ronde de 40 px (56 px dans le composant) au centre des 96 px du rail, bordée de
   primaire à 20 %. Le composant n'a pas de prop variant ni de taille ; tout y part du bord gauche, donc on déplace la pastille (28 px =
   (96 - 40) / 2) et l'icône (8 px = (40 - 24) / 2). La bordure est portée par la couche de survol, toujours visible, et non par
   l'indicateur, qui n'apparaît que sur la page active. */
.desktop-nav__outlined {
  padding-block: 40px 0;
  margin-block: 12px;
}

.desktop-nav__outlined :deep(.v-navigation-btn__pill) {
  inset-inline-start: 28px;
}

.desktop-nav__outlined :deep(.v-navigation-btn__indicator),
.desktop-nav__outlined :deep(.v-navigation-btn__overlay) {
  width: 40px;
  height: 40px;
  transition:
    border-radius 0.2s cubic-bezier(0.2, 0, 0, 1),
    box-shadow 0.2s cubic-bezier(0.2, 0, 0, 1),
    background-color 0.2s cubic-bezier(0.2, 0, 0, 1);
}

/* La pastille ronde devient un carré arrondi sur la page active et pendant l'appui (indicateur, couche de survol et bordure ensemble) */
.desktop-nav__outlined.v-navigation-btn--active :deep(.v-navigation-btn__indicator),
.desktop-nav__outlined.v-navigation-btn--active :deep(.v-navigation-btn__overlay),
.desktop-nav__outlined:active :deep(.v-navigation-btn__indicator),
.desktop-nav__outlined:active :deep(.v-navigation-btn__overlay) {
  border-radius: 12px;
}

.desktop-nav__outlined :deep(.v-navigation-btn__icon) {
  top: 8px;
  inset-inline-start: 8px;
}

.desktop-nav__outlined :deep(.v-navigation-btn__overlay) {
  box-shadow: inset 0 0 0 1px color-mix(in srgb, rgb(var(--v-theme-primary)) 20%, transparent);
}

/* Le logo prend la couleur du fond (le bouton est primaire) ; Logo.vue le peint en primaire par défaut */
.desktop-nav__logo :deep(path) {
  fill: rgb(var(--v-theme-background));
}

/* Rayon à l'appui du bouton d'accueil. Vuetify le pose avec `.v-btn:active` dans sa couche `vuetify-components`, qu'une règle de couche
   supérieure ou non superposée écrase ; ce style, hors de toute couche, l'emporte. */
.desktop-nav__home {
  transition: border-radius 0.2s cubic-bezier(0.2, 0, 0, 1);
}

.desktop-nav__home:active {
  border-radius: 16px;
}
</style>
