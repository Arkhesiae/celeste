<template>
  <v-card elevation="0" class="pa-6 bite" color="surfaceContainer" height="100%">
    <!-- En-tête avec l'icône et le menu -->
    <div class="d-flex justify-space-between align-center pa-0">
      <div class="d-flex align-center">
        <span class="text-title-large">Mon équipe</span>
        <v-btn
          icon
          variant="text"
          color="default"
          size="small"
          class="ml-1 text-medium-emphasis"
          @click="showInfo = true"
        >
          <v-icon>mdi-information-outline</v-icon>
        </v-btn>
      </div>
    </div>

    <v-card-title class="text-headline-large d-flex flex-column align-center">
      <div v-if="permanentTeam" class="d-flex flex-column align-center">
        <p class="text-label-medium text-medium-emphasis">équipe</p>
        <p class="text-display-large font-weight-medium text-primary">
          {{ permanentTeam ? permanentTeam.teamName : 'Aucune équipe' }}
        </p>
        <p class="team-subtitle">depuis le {{ formattedPermanentTeamDate }}</p>
      </div>
      <p v-else>Aucune équipe</p>

      <v-menu location="bottom end" offset="10" @click.stop>
        <template #activator="{ props }">
          <v-chip v-if="showTemporaryTeamChip" v-bind="props" color="onBackground" rounded="lg">
            <v-icon class="mr-2"> mdi-handshake-outline </v-icon>
            Renforce l'équipe {{ temporaryTeam?.teamName }} jusqu'au {{ formattedTemporaryTeamDate }} inclus
          </v-chip>
        </template>
        <v-list rounded="xl" class="pa-4" bg-color="onBackground">
          <v-list-item
            rounded="xl"
            prepend-icon="mdi-delete-outline"
            @click="handleDeleteOccurrence(temporaryTeam?._id)"
          >
            <v-list-item-title>Annuler le renfort</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-card-title>

    <div class="d-flex align-center justify-center mb-4">
      <div v-if="hasCenter" style="max-width: 600px" class="d-none d-md-flex ga-2">
        <!-- Prop stacked : l'icône (prepend-icon) est centrée au-dessus du libellé -->
        <v-btn
          stacked
          prepend-icon="mdi-account-switch-outline"
          size="small"
          variant="flat"
          height="52px"
          color="primary"
          class="team-change-btn"
          rounded="xl"
          @click="promptDialog('Changement')"
        >
          Changement d'équipe
        </v-btn>
        <v-btn
          stacked
          prepend-icon="mdi-handshake-outline"
          color="surfaceContainer"
          size="small"
          height="52px"
          variant="flat"
          class="team-reinforcement-btn"
          rounded="lg"
          @click="promptDialog('Renfort')"
        >
          Renfort
        </v-btn>
      </div>
      <div class="center-alert bg-error text-onError pa-4 rounded-xl ga-2 d-flex" v-else>
        <v-icon>mdi-alert-outline</v-icon>
        Aucun centre
      </div>
    </div>

    <div class="d-flex align-center justify-space-between pa-0 mb-3">
      <div class="text-body-large">
        {{ nextOccurrences?.length > 0 ? 'A venir' : 'Aucun changement à venir' }}
      </div>
      <div>
        <v-scroll-x-transition mode="out-in">
          <v-btn
            v-if="isHistoryRevealed === false"
            color="background"
            variant="flat"
            class="elevated-shadow"
            size="small"
            rounded="16"
            append-icon="mdi-history"
            @click="$router.push('/profile/' + authStore.userData.userId + '/change-history')"
          >
            Historique
          </v-btn>

          <v-btn
            v-else
            color="background"
            class="elevated-shadow"
            rounded="lg"
            append-icon="mdi-chevron-right"
            @click="isHistoryRevealed = false"
          >
            A venir
          </v-btn>
        </v-scroll-x-transition>
      </div>
    </div>
    <div />

    <v-card-text class="pa-0">
      <v-card color="transparent" class="pa-0" elevation="0" rounded=".">
        <v-scroll-x-transition mode="out-in">
          <div>
            <TeamOccurrence
              v-for="nextOccurrence in nextOccurrences"
              :key="nextOccurrence._id"
              :occurrence="nextOccurrence"
              @delete-occurrence="handleDeleteOccurrence"
            />
          </div>
        </v-scroll-x-transition>
      </v-card>
    </v-card-text>

    <!-- Mes équipes sur ~1 an : passé, présent et à venir ; les renforts sont hachurés -->
    <div v-if="timelineWindow" class="mt-6">
      <TeamTimeline :rows="timelineRows" :window="timelineWindow" empty-text="Aucune équipe sur cette période." />
    </div>
  </v-card>

  <!-- Dialogue d'information pour mobile -->

  <GenericDialog v-if="smAndDown" v-model="showInfo" title="Comment fonctionne mon équipe ?" retain-focus>
    <template #content>
      <p class="mb-4">Votre équipe actuelle est affichée en haut de la carte. Vous pouvez :</p>
      <div class="mb-4 d-flex flex-column ga-2">
        <span class="text-title-small">Changer d'équipe en cliquant sur le bouton "Changement d'équipe"</span>
        <span class="text-title-small">Renforcer une autre équipe en cliquant sur le bouton "Renfort"</span>
        <span class="text-title-small">Consulter votre historique et vos changements à venir</span>
      </div>
    </template>
  </GenericDialog>

  <!-- Panneau latéral pour desktop -->
  <teleport to="body">
    <v-navigation-drawer
      v-model="showInfo"
      style="z-index: 3500 !important"
      location="right"
      temporary=""
      order="-4"
      width="500"
      class="d-none d-md-block"
    >
      <v-card class="pa-6" flat>
        <v-card-text class="pa-6">
          <h2 class="text-headline-small mb-4">Comment fonctionne mon équipe ?</h2>
          <p class="mb-4">Votre équipe actuelle est affichée en haut de la carte. Vous pouvez :</p>
          <div class="mb-4 d-flex flex-column ga-2">
            <span class="text-title-small">Changer d'équipe en cliquant sur le bouton "Changement d'équipe"</span>
            <span class="text-title-small">Renforcer une autre équipe en cliquant sur le bouton "Renfort"</span>
            <span class="text-title-small">Consulter votre historique et vos changements à venir</span>
          </div>
        </v-card-text>
      </v-card>
    </v-navigation-drawer>
  </teleport>


  <ConfirmationDialog
    v-model="showConfirmationDialog"
    title="Suppression du changement"
    text="Êtes-vous sûr de vouloir supprimer ce changement ? Cette action est irréversible."
    icon="mdi-delete-outline"
    icon-color="error"
    confirm-text="Supprimer"
    @confirm="confirmDelete"
  />

  <TeamChangeImpactDialog
    v-model="showImpactDialog"
    :approval="impactApproval"
    :loading="impactLoading"
    @confirm="confirmDeleteWithImpact"
    @cancel="cancelImpact"
  />
</template>

<script setup>
import { occurrenceDays, formatDay } from '@/utils/dayFields.js';
import { useTeamStore } from '@/stores/teamStore.js';
import { useAuthStore } from '@/stores/authStore.js';
import { useDisplay } from 'vuetify';

const emit = defineEmits(['show-team-change-dialog']);

const { smAndDown } = useDisplay();
const isHistoryRevealed = ref(false);
const showInfo = ref(false);
const showConfirmationDialog = ref(false);
const occurrenceToDelete = ref(null);
const showImpactDialog = ref(false);
const impactApproval = ref(null);
const impactLoading = ref(false);

const promptDialog = (mode) => {
  emit('show-team-change-dialog', mode);
};

const authStore = useAuthStore();
const teamStore = useTeamStore();
const userId = computed(() => authStore.userData.userId);

// Frise des équipes de l'utilisateur (une ligne par équipe), rechargée quand ses occurrences changent
const timelineWindow = computed(() => teamStore.userTeamTimeline?.window ?? null);
const timelineRows = computed(() =>
  (teamStore.userTeamTimeline?.teams ?? []).map((team) => ({
    key: team.teamId,
    label: `Équipe ${team.teamName ?? '?'}`,
    segments: team.segments,
  })),
);
const loadTimeline = () => (userId.value ? teamStore.fetchUserTeamTimeline(userId.value) : null);
onMounted(loadTimeline);
watch(() => teamStore.teamOccurrences, loadTimeline);
const hasCenter = computed(() => !!authStore.userData.centerId);

const permanentTeam = computed(() => teamStore.teamOccurrences?.permanentTeam);
const temporaryTeam = computed(() => teamStore.teamOccurrences?.temporaryTeam);
const allOccurrences = computed(() => teamStore.teamOccurrences?.allOccurrences);
const nextOccurrences = computed(() => teamStore.teamOccurrences?.nextOccurrences);

const formattedPermanentTeamDate = computed(() => {
  return formatDay(occurrenceDays(permanentTeam.value).from);
});

const formattedTemporaryTeamDate = computed(() => {
  return formatDay(occurrenceDays(temporaryTeam.value).to);
});

const showTemporaryTeamChip = computed(() => temporaryTeam.value);

const handleDeleteOccurrence = (occurrenceId) => {
  occurrenceToDelete.value = occurrenceId;
  showConfirmationDialog.value = true;
};

const confirmDelete = async () => {
  try {
    const result = await teamStore.deleteTeamOccurrence(userId.value, occurrenceToDelete.value);

    // 409 : des demandes / entrées de calendrier seraient annulées → confirmation détaillée
    if (result?.needsApproval) {
      impactApproval.value = result;
      showImpactDialog.value = true;
      return;
    }
    occurrenceToDelete.value = null;
  } catch (error) {
    console.error("Erreur lors de la suppression de l'occurrence :", error);
    occurrenceToDelete.value = null;
  } finally {
    showConfirmationDialog.value = false;
  }
};

const confirmDeleteWithImpact = async () => {
  try {
    impactLoading.value = true;
    await teamStore.deleteTeamOccurrence(userId.value, occurrenceToDelete.value, true);
  } catch (error) {
    console.error("Erreur lors de la suppression de l'occurrence :", error);
  } finally {
    impactLoading.value = false;
    cancelImpact();
  }
};

const cancelImpact = () => {
  showImpactDialog.value = false;
  impactApproval.value = null;
  occurrenceToDelete.value = null;
};
</script>

<style>
.team-subtitle {
  color: rgba(var(--v-theme-onSurface), 0.7);
  font-size: 12px;
}

.team-reinforcement-btn {
  border-radius: 12px !important;
}

.elevated-shadow {
  box-shadow:
    0 4px 20px rgba(0, 0, 0, 0.096),
    0 0 0 1px rgba(255, 255, 255, 0.007),
    0 4px 8px rgba(0, 0, 0, 0.048);
}

.gradient {
  color: transparent;
  font-weight: 700 !important;
  background: linear-gradient(
    to right,
    rgb(var(--v-theme-primary)) 00%,
    #a779cd 40%,
    rgb(var(--v-theme-permutation)) 90%,
    #dc8474 80%
  );
  background-size: 200% auto;
  background-clip: text;
  animation: animatedTextGradient 15s linear infinite;
}
</style>
