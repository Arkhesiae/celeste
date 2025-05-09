<template>
  <v-card class="px-2 ma-0" rounded="xl" variant="flat">
    <v-card-item>
      <v-card-title class="d-flex justify-space-between align-center">
        <div class="d-flex align-center">
          <span class="text-h6">Equipe {{ team.name }}</span>
          <v-btn
            v-if="isAdmin"
            icon
            variant="text"
            size="small"
            @click="$emit('edit-team-name', team)"
            class="ml-2"
          >
            <v-icon size="small">mdi-pencil</v-icon>
          </v-btn>
        </div>
        <div class="d-flex align-center">
          <v-menu color="onBackground" rounded="lg">
            <template v-slot:activator="{ props }">
              <v-btn icon variant="text" v-bind="props" @click.stop>
                <v-icon>mdi-dots-vertical</v-icon>
              </v-btn>
            </template>
            <v-list color="onBackground" bg-color="onBackground" rounded="xl" class="pa-4">
              <v-list-item rounded="lg" @click.stop="$emit('edit-cycle', team)" v-if="isAdmin">
                <v-list-item-title>Modifier le cycle</v-list-item-title>
              </v-list-item>
              <!-- <v-list-item v-if="isAdmin" rounded="lg" @click.stop="$emit('add-member', team)">
                <v-list-item-title>Ajouter un membre</v-list-item-title>
              </v-list-item> -->
              <v-list-item rounded="lg" @click.stop="$emit('view-members', team)">
                <v-list-item-title>Voir les membres</v-list-item-title>
              </v-list-item>
              <v-list-item v-if="isAdmin" rounded="lg" @click.stop="$emit('remove-team', team._id)">
                <v-list-item-title style="color: rgba(var(--v-theme-onError), 1);">Supprimer l'équipe</v-list-item-title>
              </v-list-item>
         
            </v-list>
          </v-menu>
        </div>
      </v-card-title>
    </v-card-item>

    <v-card-text>
      <div class="d-flex flex-column gap-2">
        <div>
          <span class="d-inline">Membres:</span>
          <span class="ml-1">
            {{ membersCount }}
          </span>
          <v-chip
            v-if="renfortsCount > 0"
            class="ml-1"
            color="onBackground"
            size="small"
            rounded="lg"
          >
            dont {{ renfortsCount }} renfort(s)
          </v-chip>
        </div>
        <div>
          <strong>Prochain début de cycle:</strong>
          <v-chip
            class="ml-1"
            color="onBackground"
            size="small"
            rounded="lg"
          >
            {{ nextCycleDate }}
          </v-chip>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
defineProps({
  team: {
    type: Object,
    required: true
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  membersCount: {
    type: Number,
    required: true
  },
  renfortsCount: {
    type: Number,
    required: true
  },
  nextCycleDate: {
    type: String,
    required: true
  }
});

defineEmits(['edit-team-name', 'edit-cycle', 'add-member', 'remove-team', 'view-members']);
</script> 