<template>
  <v-container>
    <MainTitle title="Mutations" subtitle="Demandes de changement de centre" />

    <!-- Rien ne crée encore de demande de mutation (voir docs/quality/blocking-issues.md, #52) : la liste viendra avec elles -->
    <v-card rounded="xl" variant="flat" color="surfaceContainer" class="pa-8 text-center">
      <v-icon icon="mdi-swap-horizontal" size="48" class="mb-4 text-medium-emphasis" />
      <div class="text-title-medium">Aucune demande de mutation</div>
      <div class="text-body-medium text-medium-emphasis mt-2">
        Les demandes de changement de centre des utilisateurs apparaîtront ici.
      </div>
    </v-card>
  </v-container>
</template>
