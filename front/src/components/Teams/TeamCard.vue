<template>
  <v-card class="px-2 ma-0" variant="flat">
    <v-card-item class="pr-0 mb-4">
      <v-card-title class="d-flex justify-space-between align-center mb-0 pb-0">
        <div class="d-flex align-center">
          <span class="text-title-large">Equipe {{ team?.name }}</span>
          <v-btn v-if="isAdmin" icon variant="text" size="small" class="ml-2" @click="$emit('edit-team-name', team)">
            <v-icon size="small"> mdi-pencil </v-icon>
          </v-btn>
        </div>
        <div class="d-flex align-center">
          <v-menu rounded="lg">
            <template #activator="{ props }">
              <v-btn icon variant="text" size="small" v-bind="props" @click.stop>
                <v-icon>mdi-dots-vertical</v-icon>
              </v-btn>
            </template>
            <v-card>
              <v-list>
                <v-list-item v-if="isAdmin" @click.stop="$emit('edit-cycle', team)">
                  <v-list-item-title class="d-flex ga-3">
                    <v-icon>mdi-clock-outline </v-icon>
                    Modifier le cycle</v-list-item-title
                  >
                </v-list-item>
                <v-list-item v-if="isAdmin" @click.stop="$emit('remove-team', team._id)">
                  <v-list-item-title class="d-flex ga-3">
                    <v-icon>mdi-close </v-icon>Supprimer l'équipe
                  </v-list-item-title>
                </v-list-item>
              </v-list>
            </v-card>
            <v-card class="mt-1 pa-4">
              <div>
                <span class="text-body-small">Début de cycle:</span>
                <v-chip class="ml-1" color="onBackground" size="small" rounded="lg">
                  {{ cycleStartDate }}
                </v-chip>
              </div>
              <div>
                <span class="text-body-medium">Prochain début de cycle:</span>
                <v-chip class="ml-1" color="onBackground" size="small" rounded="lg">
                  {{ nextCycleDate }}
                </v-chip>
              </div>
            </v-card>
          </v-menu>
        </div>
      </v-card-title>
      <v-card-subtitle class="pa-0 ma-0 mt-n3"> {{ membersCount }} membres </v-card-subtitle>
    </v-card-item>

    <v-card-text>
      <div class="d-flex flex-column gap-2">
        <div>
          <v-chip v-if="renfortsCount > 0" class="ml-1" color="onBackground" size="small" rounded="lg">
            dont {{ renfortsCount }} renfort(s)
          </v-chip>
        </div>
        <div v-if="currentDay" class="d-flex align-center">
          <strong>Aujourd'hui:</strong>
          <v-chip
            class="ml-1"
            color="primary"
            size="small"
            rounded="lg"
            variant="tonal"
            prepend-icon="mdi-calendar-today"
            :title="`Jour ${currentDay.position} du cycle de ${currentDay.total} jours`"
          >
            <span class="font-weight-bold">Jour {{ currentDay.position }}</span>
            <span class="ml-1 text-medium-emphasis">/ {{ currentDay.total }}</span>
          </v-chip>
        </div>
      </div>

      <v-btn-group class="team-actions" connected>
        <v-btn
          prepend-icon="mdi-timeline-clock-outline"
          variant="flat"
          size="small"
          aria-label="Voir les membres sur la frise"
          title="Membres sur la frise"
          @click.stop="$emit('view-members', team)"
          >Membres</v-btn
        >
        <v-btn
          icon="mdi-view-week-outline"
          variant="tonal"
          color="primary"
          size="small"
          aria-label="Ouvrir la grille de l'équipe"
          title="Grille de l'équipe"
          @click.stop="$emit('open-grid', team)"
        />
      </v-btn-group>
    </v-card-text>
  </v-card>
</template>

<script setup>
defineProps({
  team: {
    type: Object,
    required: true,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  membersCount: {
    type: Number,
    required: true,
  },
  renfortsCount: {
    type: Number,
    required: true,
  },
  /** Date de début de cycle déjà formatée (ou « Non défini ») */
  cycleStartDate: {
    type: String,
    default: 'Non défini',
  },
  nextCycleDate: {
    type: String,
    required: true,
  },
  /** Jour courant du planning de l'équipe : { position (1-indexé), total } ou null si inconnu */
  currentDay: {
    type: Object,
    default: null,
  },
});

defineEmits(['edit-team-name', 'edit-cycle', 'remove-team', 'view-members', 'open-grid']);
</script>

<style scoped>
.team-actions {
  position: absolute;
  bottom: 16px;
  right: 16px;
}
</style>
