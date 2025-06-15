<template>
  <v-card rounded="xl" elevation="0" class="pa-6 bite" color="">
    <!-- En-tête avec l'icône et le menu -->
    <div class="d-flex justify-space-between align-center pa-0">
      <div class="d-flex align-center">
        <span class="text-h6">Mon équipe</span>
        <v-btn icon variant="text" color="default" size="small" class="ml-1 text-medium-emphasis"
          @click="showInfo = true">
          <v-icon>mdi-information-outline</v-icon>
        </v-btn>
      </div>

      <v-menu location="bottom end" @click.stop>
        <template v-slot:activator="{ props }">
          <v-btn icon v-bind="props" variant="text" color="default">
            <v-icon>mdi-dots-vertical</v-icon>
          </v-btn>
        </template>
        <v-list rounded="xl" class="pa-4" bg-color="onBackground">
          <v-list-item rounded="xl" prepend-icon="mdi-handshake-outline" @click="promptDialog('Renfort')">
            <v-list-item-title>Renforcer une équipe</v-list-item-title>
          </v-list-item>
          <v-list-item rounded="xl" prepend-icon="mdi-account-switch-outline" link @click="promptDialog('Changement')">
            <v-list-item-title>Changer d'équipe</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </div>

    <v-card-title class="text-h4 d-flex flex-column align-center  ">
      <div v-if="permanentTeam" class="d-flex flex-column align-center">
        <p class="text-overline text-medium-emphasis  ">équipe</p>
        <p class="text-h1 font-weight-medium gradient">{{ permanentTeam ? permanentTeam.name : 'Aucune équipe' }}</p>
        <p class="text-subtitle-2 text-medium-emphasis ">depuis le {{ formattedPermanentTeamDate }}</p>
      </div>
      <p v-else>Aucune équipe</p>



      <v-menu location="bottom end" offset="10" @click.stop>
        <template v-slot:activator="{ props }">
          <v-chip v-bind="props" v-if="showTemporaryTeamChip" color="onBackground" rounded="lg" >
            <v-icon class="mr-2">mdi-handshake-outline</v-icon>
            Renforce l'équipe {{ temporaryTeam?.teamName }} jusqu'au {{ formattedTemporaryTeamDate }}

          </v-chip>

        </template>
        <v-list rounded="xl" class="pa-4" bg-color="onBackground">
          <v-list-item rounded="xl" prepend-icon="mdi-delete-outline" @click="handleDeleteOccurrence(temporaryTeam?._id)">
            <v-list-item-title>Annuler le renfort</v-list-item-title>
          </v-list-item>

        </v-list>
      </v-menu>





    </v-card-title>

    <div class="d-flex align-center justify-center ">
      <div style="max-width: 600px" class="flex-1-1 d-flex align-center justify-center mb-4 pa-6">
        <v-btn value="option2" variant="flat" height="60px" color="background"
          class="flex-1-1 d-flex flex-column rounded-ts-xl rounded-bs-xl mr-1 text-none"
          @click="promptDialog('Changement')" rounded="lg">
          <template #prepend>
            <v-icon>mdi-account-switch-outline</v-icon>
          </template>
          Changement d'équipe
        </v-btn>
        <v-btn color="background" value="option2" height="60px" variant="flat" @click="promptDialog('Renfort')"
          class="flex-1-1 d-flex flex-column rounded-te-xl rounded-be-xl text-none " rounded="lg">
          <template #prepend>
            <v-icon>mdi-handshake-outline</v-icon>
          </template>
          Renfort
        </v-btn>
      </div>
    </div>

    <div class="d-flex align-center justify-space-between pa-0 mb-3">
      <div class="text-h6">{{ nextOccurrences?.length > 0 ? 'A venir' : 'Aucun changement à venir' }}</div>
      <div>
        <v-scroll-x-transition mode="out-in">
          <v-btn color="background" variant="flat" class="elevated-shadow" rounded="lg"
            v-if="isHistoryRevealed === false" @click="$router.push('/profile/' + authStore.userId + '/change-history')"
            append-icon="mdi-history">
            Historique
          </v-btn>

          <v-btn color="background" class="elevated-shadow" rounded="lg" v-else @click="isHistoryRevealed = false"
            append-icon="mdi-chevron-right">
            A venir
          </v-btn>
        </v-scroll-x-transition>
      </div>
    </div>
    <div>


    </div>


    <v-card-text class="pa-0">
      <v-card color="transparent" class="pa-0" elevation="0" rounded="xl">


        <v-scroll-x-transition mode="out-in">
          <div>
            <TeamOccurence v-for="nextOccurrence in nextOccurrences" :occurrence="nextOccurrence"
              :key="nextOccurrence._id" @delete-occurrence="handleDeleteOccurrence" />

          </div>

        </v-scroll-x-transition>
        <!-- <v-card-actions class="justify-end">
          <v-btn color="primary" outlined class="mt-3" rounded="xl" @click="promptDialog('Renfort')">Renfort</v-btn>
          <v-btn
            prepend-icon="mdi-account-switch-outline"
            color="secondary"
            variant="tonal"
            class="mt-3"
            rounded="lg"
            @click="promptDialog('Changement')"
          >
            Changement d'équipe
          </v-btn>
        </v-card-actions> -->


      </v-card>
    </v-card-text>
  </v-card>

  <!-- Dialogue d'information pour mobile -->
  <v-dialog v-model="showInfo" fullscreen :scrim="false" transition="dialog-bottom-transition" class="d-md-none">
    <v-card>
      <v-toolbar color="primary">
        <v-btn icon @click="showInfo = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
        <v-toolbar-title>À propos de mon équipe</v-toolbar-title>
      </v-toolbar>

      <v-card-text class="pa-6">
        <h2 class="text-h5 mb-4">Comment fonctionne mon équipe ?</h2>
        <p class="mb-4">Votre équipe actuelle est affichée en haut de la carte. Vous pouvez :</p>
        <ul class="mb-4">
          <li>Changer d'équipe en cliquant sur le bouton "Changement d'équipe"</li>
          <li>Renforcer une autre équipe en cliquant sur le bouton "Renfort"</li>
          <li>Consulter votre historique et vos changements à venir</li>
        </ul>
      </v-card-text>
    </v-card>
  </v-dialog>

  <!-- Panneau latéral pour desktop -->
  <v-navigation-drawer v-model="showInfo" location="right" temporary="" order="-4" width="400"
    class="d-none d-md-block">
    <v-card>
      <v-toolbar color="primary">
        <v-btn icon @click="showInfo = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
        <v-toolbar-title>À propos de mon équipe</v-toolbar-title>
      </v-toolbar>

      <v-card-text class="pa-6">
        <h2 class="text-h5 mb-4">Comment fonctionne mon équipe ?</h2>
        <p class="mb-4">Votre équipe actuelle est affichée en haut de la carte. Vous pouvez :</p>
        <ul class="mb-4">
          <li>Changer d'équipe en cliquant sur le bouton "Changement d'équipe"</li>
          <li>Renforcer une autre équipe en cliquant sur le bouton "Renfort"</li>
          <li>Consulter votre historique et vos changements à venir</li>
        </ul>
      </v-card-text>
    </v-card>
  </v-navigation-drawer>

  <ConfirmationDialog :isDialogVisible="showConfirmationDialog" title="Suppression du changement"
    text="Êtes-vous sûr de vouloir supprimer ce changement ? Cette action est irréversible." icon="mdi-delete-outline"
    iconColor="error" confirmText="Supprimer" @confirm="confirmDelete"
    @update:isDialogVisible="showConfirmationDialog = $event" />
</template>

<script setup>
import { ref, computed } from 'vue';
import OccurrencesList from "@/components/Profile/TeamOccurence.vue";
import { useTeamStore } from "@/stores/teamStore.js";
import { useAuthStore } from "@/stores/authStore.js";

import ConfirmationDialog from '@/components/common/ConfirmationDialog.vue';


const emit = defineEmits(['show-team-change-dialog']);

const isHistoryRevealed = ref(false);


const promptDialog = (mode) => {
  emit('show-team-change-dialog', mode);
};

const authStore = useAuthStore();
const teamStore = useTeamStore();
const userId = computed(() => authStore.userId);

const permanentTeam = computed(() => teamStore.currentTeam);
const temporaryTeam = computed(() => teamStore.teamOccurrences?.temporaryTeam);
const allOccurrences = computed(() => teamStore.teamOccurrences?.allOccurrences);
const nextOccurrences = computed(() => teamStore.teamOccurrences?.nextOccurrences);

const formattedPermanentTeamDate = computed(() => {
  if (!permanentTeam.value?.fromDate) return '';
  return new Date(permanentTeam.value.fromDate).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
});

const formattedTemporaryTeamDate = computed(() => {
  if (!temporaryTeam.value?.toDate) return '';
  return new Date(temporaryTeam.value.toDate).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
});

const showTemporaryTeamChip = computed(() =>
  
  temporaryTeam.value
);

const showConfirmationDialog = ref(false);
const occurrenceToDelete = ref(null);

const handleDeleteOccurrence = (occurrenceId) => {
  console.log('handleDeleteOccurrence', occurrenceId);
  occurrenceToDelete.value = occurrenceId;
  showConfirmationDialog.value = true;
};

const confirmDelete = async () => {
  try {
    await teamStore.deleteTeamOccurrence(userId.value, occurrenceToDelete.value);

  } catch (error) {
    console.error('Erreur lors de la suppression de l\'occurrence :', error);
  } finally {
    showConfirmationDialog.value = false;
    occurrenceToDelete.value = null;
  }
};

const showInfo = ref(false);
</script>
<style>
.elevated-shadow {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.096), 0 0 0 1px rgba(255, 255, 255, 0.007), 0 4px 8px rgba(0, 0, 0, 0.048);
}


.scale-up {
  background: #768dff;
  transform: scale(1.01);
  /* Carte sélectionnée */
}

.scale-down {
  transform: scale(1);
  /* Cartes non sélectionnées */
}

.gradient {
  fill: transparent;
  color: #000;
  font-weight: 700 !important;
  background: linear-gradient(to right, rgb(var(--v-theme-remplacement))00%, #a779cd 40%, rgb(var(--v-theme-permutation)) 90%, #dc8474 80%);
  background-size: 200% auto;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  text-fill-color: transparent;
  animation: animatedTextGradient 15s linear infinite;
}
</style>
