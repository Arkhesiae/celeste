<template>
  <v-card rounded="xl" elevation="0" class="smooth-shadow pa-6" color="surfaceContainer">
    <h3 class="text-h6 font-weight-medium mb-4">
      <v-icon icon="mdi-code-braces" color="success" class="mr-2" />
      Coûts de Développement
    </h3>
    <v-card rounded="xl" elevation="0" class="smooth-shadow pa-6" color="surfaceContainer">
      <div class="d-flex align-center mb-4">
        <v-icon icon="mdi-robot" color="primary" class="mr-3" size="32" />
        <div>
          <h3 class="text-h6 font-weight-medium">Développement assisté par IA</h3>
          <p class="text-caption text-medium-emphasis">Accélération éthique du développement</p>
        </div>
      </div>
      <div class="pa-4 rounded-lg" style="background-color: rgba(var(--v-theme-primary), 0.05); border-left: 4px solid rgb(var(--v-theme-primary));">
        <p class="text-body-1 mb-3">
          En tant que développeur solo, j'utilise l'intelligence artificielle de manière <strong>éthique et responsable</strong>
          pour accélérer et améliorer le développement de cette application.
        </p>
        <div class="d-flex flex-wrap gap-4">
          <div class="d-flex align-center">
            <v-icon icon="mdi-check-circle" color="success" class="mr-2" />
            <span class="text-body-2">Code toujours révisé et validé</span>
          </div>
          <div class="d-flex align-center">
            <v-icon icon="mdi-check-circle" color="success" class="mr-2" />
            <span class="text-body-2">Architecture pensée par l'humain</span>
          </div>
          <div class="d-flex align-center">
            <v-icon icon="mdi-check-circle" color="success" class="mr-2" />
            <span class="text-body-2">Tests et sécurité prioritaires</span>
          </div>
        </div>
        <p class="text-body-2 text-medium-emphasis mt-3 mb-0">
          L'IA est un outil d'assistance qui me permet de me concentrer sur la qualité,
          l'expérience utilisateur et les fonctionnalités complexes plutôt que sur le code répétitif.
        </p>
      </div>
    </v-card>
    <v-row>
      <v-col cols="12" md="6">
        <div class="mb-4">
          <h4 class="text-subtitle-1 font-weight-medium mb-2">Développement Initial</h4>
          <div class="d-flex justify-space-between align-center mb-2">
            <span>Conception et architecture</span>
            <span class="font-weight-bold">2 500€</span>
          </div>
          <div class="d-flex justify-space-between align-center mb-2">
            <span>Développement frontend</span>
            <span class="font-weight-bold">4 200€</span>
          </div>
          <div class="d-flex justify-space-between align-center mb-2">
            <span>Développement backend</span>
            <span class="font-weight-bold">3 800€</span>
          </div>
          <div class="d-flex justify-space-between align-center mb-2">
            <span>Tests et déploiement</span>
            <span class="font-weight-bold">1 500€</span>
          </div>
          <v-divider class="my-2" />
          <div class="d-flex justify-space-between align-center font-weight-bold">
            <span>Total initial</span>
            <span>12 000€</span>
          </div>
        </div>
      </v-col>
      <v-col cols="12" md="6">
        <div class="mb-4">
          <h4 class="text-subtitle-1 font-weight-medium mb-2">Maintenance Continue</h4>
          <div class="d-flex justify-space-between align-center mb-2">
            <span>Développement de nouvelles fonctionnalités</span>
            <span class="font-weight-bold">800€/mois</span>
          </div>
          <div class="d-flex justify-space-between align-center mb-2">
            <span>Corrections de bugs</span>
            <span class="font-weight-bold">200€/mois</span>
          </div>
          <div class="d-flex justify-space-between align-center mb-2">
            <span>Optimisations et refactoring</span>
            <span class="font-weight-bold">300€/mois</span>
          </div>
          <v-divider class="my-2" />
          <div class="d-flex justify-space-between align-center font-weight-bold">
            <span>Total mensuel</span>
            <span>1 300€/mois</span>
          </div>
        </div>
      </v-col>
    </v-row>
  </v-card>
</template>

<script setup>
// Pas de props pour l’instant, tout est statique.
</script> 