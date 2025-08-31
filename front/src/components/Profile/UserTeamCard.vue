<template>
  <v-card rounded="xl" elevation="0" class="pa-6 bite" color="" height="100%">
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
        <p class="text-h1 font-weight-medium text-remplacement">{{ permanentTeam ? permanentTeam.teamName : 'Aucune équipe' }}</p>
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
      <v-toolbar color="surfaceContainer">
        <v-btn icon @click="showInfo = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
       
      </v-toolbar>

      <v-card-text class="pa-6">
        <h2 class="text-h5 mb-4">Comment fonctionne mon équipe ?</h2>
        <p class="mb-4">Votre équipe actuelle est affichée en haut de la carte. Vous pouvez :</p>
        <div class="mb-4 d-flex flex-column ga-2">
          <span class="text-subtitle-2">Changer d'équipe en cliquant sur le bouton "Changement d'équipe"</span>
          <span class="text-subtitle-2">Renforcer une autre équipe en cliquant sur le bouton "Renfort"</span>
          <span class="text-subtitle-2">Consulter votre historique et vos changements à venir</span>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>


  <!-- Panneau latéral pour desktop -->
  <teleport to="body"> 
  <v-navigation-drawer style="z-index: 3500 !important;" v-model="showInfo" location="right" temporary="" order="-4" width="500"
    class="d-none d-md-block">
    <v-card class="pa-6" flat>
     

      <v-card-text class="pa-6">
        <h2 class="text-h5 mb-4">Comment fonctionne mon équipe ?</h2>
        <p class="mb-4">Votre équipe actuelle est affichée en haut de la carte. Vous pouvez :</p>
        <div class="mb-4 d-flex flex-column ga-2">
          <span class="text-subtitle-2">Changer d'équipe en cliquant sur le bouton "Changement d'équipe"</span>
          <span class="text-subtitle-2">Renforcer une autre équipe en cliquant sur le bouton "Renfort"</span>
          <span class="text-subtitle-2">Consulter votre historique et vos changements à venir</span>
        </div>
      </v-card-text>
    </v-card>
  </v-navigation-drawer>
  </teleport>

  <v-dialog v-model="showConflictDialog" max-width="600px">
    <v-card rounded="xl" elevation="0" class="pa-6">
      <v-card-item prepend-icon="mdi-alert-outline" class="pa-0 ma-0">
        <v-card-title>Conflits détectés</v-card-title>
      </v-card-item>
      <v-card-text class="pa-0 my-4 ma-0">
        <div v-if="substitutionConflicts.length">
          <p>Les demandes suivantes sont impactées par le changement d'équipe / annulation et seront annulées :</p>
          <v-list class="pa-0 ga-3 my-2 d-flex flex-column">
       
                <v-card  v-for="(conf, idx) in substitutionConflicts" :key="idx" color="background" class="pa-4" rounded="xl" elevation="0">
                <v-list-item-title>
                  Demande du {{ toDisplayFormat(conf.sub?.posterShift?.date) }}
                </v-list-item-title>
                <v-list-item-subtitle>
                  Demande initiale : <strong>{{ conf.sub?.posterShift?.name }}</strong> → après changement : <strong>{{ conf.newShift?.name }}</strong>
                </v-list-item-subtitle>
              </v-card>
        
          </v-list>
        </div>
      </v-card-text>
      <v-card-actions class="justify-space-between">
        <v-btn variant="text" color="secondary" rounded="xl" @click="showConflictDialog = false">
          Annuler
        </v-btn>
        <v-btn variant="tonal" rounded="xl" color="primary" @click="handleDeleteAndSubmit">
          Valider et annuler les demandes
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

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

import ConfirmationDialog from '@/components/Dialogs/ConfirmationDialog.vue';


const emit = defineEmits(['show-team-change-dialog']);

const isHistoryRevealed = ref(false);


const promptDialog = (mode) => {
  emit('show-team-change-dialog', mode);
};

const authStore = useAuthStore();
const teamStore = useTeamStore();
const userId = computed(() => authStore.userId);

const permanentTeam = computed(() => teamStore.teamOccurrences?.permanentTeam);
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
  const conflicts = detectSubstitutionConflicts(occurrenceId);
  console.log("conflicts", conflicts);
  occurrenceToDelete.value = occurrenceId;
  showConfirmationDialog.value = true;
};


async function detectSubstitutionConflicts() {
  // Appel à l'API backend pour détecter les conflits
  const fromDate = toUTCNormalized(selectedDates.value.startDate);
  const newTeamId = selectedTeam.value;
  const params = {
    userId: userId.value,
    newTeamId,
    fromDate
  };
  try {
    const result = await substitutionService.detectTeamChangeConflicts(params);
    // On récupère les IDs des substitutions conflictuelles
    const conflicts = result.conflicts || [];

    // On filtre les substitutions locales pour afficher les infos dans la modale
    const allSubs = [
      ...ownDemands.value,
      ...acceptedAsAccepter.value
    ];

    conflicts.forEach(conflict => {
      const sub = allSubs.find(sub => sub._id === conflict.id);
      conflict.sub = sub;
    });

  
    substitutionConflicts.value = conflicts;
    return conflicts;
  } catch (e) {
    substitutionConflicts.value = [];
    return [];
  }
}

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
const isMounted = ref(false);


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
