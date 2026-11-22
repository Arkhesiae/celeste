<template>
  <!-- Place l'illustration d'une page de la même façon partout, comme premier enfant du conteneur de la page (classe `page-art-content`) : sur
       ordinateur, au bord droit de la fenêtre (le conteneur est centré, donc ce bord est à (100vw - largeur) / 2 au-delà du sien) à la hauteur du
       titre ; sur mobile, au-dessus du titre, centrée, dans le flux. -->
  <div v-if="smAndDown" class="page-illustration page-illustration--mobile">
    <slot />
  </div>
  <div v-else class="page-illustration page-illustration--desktop" aria-hidden="true">
    <slot />
  </div>
</template>

<script setup>
import { useDisplay } from 'vuetify';

const { smAndDown } = useDisplay();
</script>

<style scoped>
.page-illustration :deep(svg) {
  display: block;
  height: 100%;
  width: auto;
}

.page-illustration--desktop {
  position: absolute;
  top: 40px;
  right: calc((100% - 100vw) / 2 + 24px);
  height: 180px;

  z-index: -1;
}

/* Mobile : c'est la hauteur qui limite l'illustration (le SVG prend toute la hauteur et sa largeur suit ses proportions) ; `max-width` ne sert qu'à
   l'empêcher de déborder d'un écran très étroit */
.page-illustration--mobile {
  display: flex;
  justify-content: center;
  height: 150px;
  margin: 16px 0 0;
}

.page-illustration--mobile :deep(svg) {
  max-width: 100%;
}
</style>
