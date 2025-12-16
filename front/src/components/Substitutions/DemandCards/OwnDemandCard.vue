<template>
  <div>
    <v-card :class="demandCardClasses" variant="flat" rounded="lg" class="demand-card pl-4 pa-3"
      @click="openDetails">

      <div class="d-flex align-center justify-space-between">
        <div class="d-flex align-center mr-3 ga-2">
          <v-icon v-if="isOwner" size="12" color="primary">mdi-account-star-outline</v-icon>
          <span style="font-weight: 800; font-size: .75rem;" :class="{ 'text-primary': isOwner }">{{ posterName
          }}</span>
          <span v-if="!isOwner" class="text-truncate" style="max-width: 80px; font-size: .70rem; font-weight: 600;">({{
            posterTeamName }})</span>
          <div class="small-dot"></div>
          <span class="text-caption font-weight-medium text-medium-emphasis">{{ formatDate(demand?.posterShift?.date)
          }}</span>

          <v-icon v-if="demand?.comment" size="x-small" color="onBackground" style="opacity: 0.8;"
            @click.stop="showCommentDialog = true">
            mdi-comment-text-outline
          </v-icon>

          <v-chip variant="outlined" size="x-small" rounded="lg" class="font-weight-bold point-chip mr-2"
            @click.stop="showPointsDialog = true">
            <LogoCopy color="onBackground" style="top:-2px; position: relative; transform: scale(0.7);" />
            <span style="font-size: .75rem; font-weight: 600;">{{ totalPoints }}</span>
          </v-chip>
        </div>



        <div class="d-flex align-center">
          <v-icon v-if="demand?.isNew" size="x-small" color="error" class="mr-1">
            mdi-circle
          </v-icon>
          <div class="d-flex align-center ga-2">
            <span class=" text-medium-emphasis" style="font-size: .75rem; font-weight: 500;">{{ labelOption }}</span>
            <div>
              <div class="d-flex align-center justify-end">
                <v-chip class="type-chip " color="surfaceContainer" variant="flat" size="x-small" rounded="lg">

                  <div class="d-flex align-center ga-2" v-if="demand?.type === 'switch'">
                    <v-icon class="" style="top: 1px; font-size: 16px;" icon="mdi-swap-horizontal"></v-icon>


                  </div>
                  <div class="d-flex align-center ga-2" v-if="demand?.type === 'substitution'">
                    <v-icon class="" icon="mdi-account-arrow-left-outline "></v-icon>


                  </div>
                  <div class="d-flex align-center ga-2" v-if="demand?.type === 'hybrid'">
                    <v-icon class="ml-n1" icon="mdi-account-arrow-left-outline "></v-icon>
                    <v-icon class="ml-n2" style="top: 1px; font-size: 12px; " icon="mdi-swap-horizontal"></v-icon>


                  </div>
                  <v-icon :color="statusIconColor" :icon="statusIcon" size="x-small"></v-icon>
                </v-chip>




              </div>


            </div>

          </div>
        </div>
      </div>



      <div class="d-flex align-center flex-shrink-0 ga-2">


        <div class="d-flex align-center ga-1">
          <span v-if="firstShift" :style="{ fontWeight: isFirstShiftBold ? '800' : '500' }"
            style="font-size: .75rem; opacity: 0.7;">{{ firstShift }}</span>
          <v-icon v-if="isAccepted" size="x-small" icon="mdi-arrow-right-drop-circle-outline" color="primary"
            style="opacity: 0.8;"></v-icon>
          <span v-if="secondShift" :style="{ fontWeight: isSecondShiftBold ? '800' : '500' }"
            style="font-size: .75rem; opacity: 0.7">{{ secondShift }}</span>
        </div>




      </div>

      <div class="d-flex align-center flex-shrink-0 justify-space-between">




        <div class="d-flex align-center ga-1">
          <v-icon size="x-small" icon="mdi-eye-outline" color="onBackground" style="opacity: 0.8;"></v-icon>
          <span class="text-medium-emphasis" style="font-size: .70rem; font-weight: 600;">{{ demand?.seenBy?.length || 0
          }}</span>
        </div>


        <div class="d-flex align-center ml-4">
          <template v-if="accepter">
            <v-avatar size="20" color="surfaceContainer" class="mr-1">
              <v-img v-if="accepter?.avatar" :src="`${API_URL}${accepter?.avatar}`" alt="Avatar" />
              <v-icon size="16" v-else>mdi-account-check-outline</v-icon>
            </v-avatar>
            <div class="d-flex align-center text-left ga-1">
              <span class="font-weight-bold text-truncate" :class="isAccepter ? 'text-primary' : ''"
                style="max-width: 100px; font-size: .75rem;">
                {{ accepterName }}
              </span>
              <span class="text-truncate" v-if="isOwner"
                style="max-width: 80px; font-size: .70rem; font-weight: 600;">({{
                  accepterTeamName }})</span>
            </div>
          </template>
          <template v-else>
            <div class="empty-accepter-avatar mr-1">
              <v-icon size="12" color="text-medium-emphasis">mdi-account-plus-outline</v-icon>
            </div>
            <v-chip size="x-small" rounded="pill" color="transparent" variant="flat">
              <span style="font-size: .75rem; opacity: 0.3; letter-spacing: 0.1px;">__________ </span>
            </v-chip>
          </template>
        </div>
      </div>

    </v-card>
  </div>

  <!-- <DemandModal v-model="showDemandDetailsModal" :demand="demand" :isPoster="isPoster"
    @cancel-demand="confirmCancelOrWithdraw" @accept="$emit('accept')" @decline="$emit('decline')" /> -->

</template>

<script setup>
import { useSubstitutionStore } from '@/stores/substitutionStore';
import { computed, ref } from 'vue';
import { useTeamStore } from '@/stores/teamStore';
import { useUserStore } from '@/stores/userStore';
import { useRotationStore } from '@/stores/rotationStore';
import { useAuthStore } from '@/stores/authStore';
import { useSnackbarStore } from '@/stores/snackbarStore';
import { API_URL } from '@/config/api'


const teamStore = useTeamStore();
const rotationStore = useRotationStore();
const userStore = useUserStore();
const authStore = useAuthStore();
const snackbarStore = useSnackbarStore();
const substitutionStore = useSubstitutionStore();
const props = defineProps({
  demand: {
    type: Object,
    required: true
  },
  isPoster: {
    type: Boolean,
    required: false,
    default: false
  },
  small: {
    type: Boolean,
    required: false,
    default: false
  }
});

const showPointsDialog = ref(false);
const showCommentDialog = ref(false);
const showConfirmDeleteDialog = ref(false);
const showDemandDetailsModal = ref(false);

const emit = defineEmits(['accept', 'decline', 'openDetails']);

// --- Utility Functions/Comptuted Properties (Unchanged) ---

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
};

const getTeamById = (teamId) => teamStore.teams.find((team) => team._id === teamId);
const getUserById = (userId) => userStore.users.find((user) => user._id === userId);

const accepter = computed(() => {
  if (!props.demand?.accepterId) return null;
  // Si accepterId est déjà un objet (populated), le retourner directement
  if (typeof props.demand.accepterId === 'object' && props.demand.accepterId !== null) {
    return props.demand.accepterId;
  }
  // Sinon, c'est un ID, chercher l'utilisateur
  return getUserById(props.demand.accepterId);
});


const poster = computed(() => {
  if (!props.demand?.posterId) return null;
  // Si posterId est déjà un objet (populated), le retourner directement
  if (typeof props.demand.posterId === 'object' && props.demand.posterId !== null) {
    return props.demand.posterId;
  }
  // Sinon, c'est un ID, chercher l'utilisateur
  return getUserById(props.demand.posterId);
});

const posterName = computed(() => {
  return poster.value?.name + ' ' + poster.value?.lastName.split(' ').map(word => word[0] + '.') || 'Demandeur';
});

const accepterName = computed(() => {
  return accepter.value?.name + ' ' + accepter.value?.lastName.split(' ').map(word => word[0] + '.') || 'Accepteur';
});


const isOwner = computed(() => {
  return props.demand?.posterId === authStore.userData.userId;
});

const isAccepted = computed(() => {
  return props.demand?.accepterId && props.demand?.status === 'accepted';
});

const isAccepter = computed(() => {
  return props.demand?.accepterId === authStore.userData.userId;
});

// New computed properties for names and teams for clear identification
const posterTeamName = computed(() => {
  const teamId = poster.value?.currentTeam?.teamId;
  return teamId ? getTeamById(teamId)?.name : 'N/A';
});
const accepterTeamName = computed(() => {
  const teamId = accepter.value?.currentTeam?.teamId;
  return teamId ? getTeamById(teamId)?.name : 'N/A';
});


const getDayName = (dayId) => {
  const rotation = rotationStore.rotations.find(rotation =>
    rotation.days?.find(day => day._id === dayId)
  );
  if (rotation) {
    const day = rotation.days.find(day => day._id === dayId);
    return day?.name || 'Aucune vacations';
  }
  return 'Aucune vacations';
};

// --- Modern Design / Explicit Fields (Unchanged, except involvedUser removed as it's no longer needed) ---

const demandTypeLabel = computed(() => {
  switch (props.demand?.type) {
    case 'switch':
      return 'Permutation';
    case 'hybrid':
      return 'Hybride';
    case 'substitution':
      return 'Remplacement';
    default:
      return 'Demande';
  }
});

const typeIcon = computed(() => {
  switch (props.demand?.type) {
    case 'switch':
      return 'mdi-swap-horizontal';
    case 'hybrid':
      return 'mdi-file-swap-outline';
    case 'substitution':
      return 'mdi-account-arrow-left-outline';
    default:
      return 'mdi-help-circle-outline';
  }
});

const typeChipColor = computed(() => {
  if (props.demand?.type === 'switch') return 'permutation';
  if (props.demand?.type === 'hybrid' || props.demand?.type === 'substitution') return 'remplacement';
  return 'default';
});

const statusIcon = computed(() => {
  switch (props.demand?.status) {
    case 'open':
      return 'mdi-help';
    case 'accepted':
      return 'mdi-check';
    default:
      return 'mdi-help-circle-outline';
  }
});

const firstShift = computed(() => {
  if (isOwner.value) {
    return props.demand?.posterShift?.shift?.name
  } else if (isAccepter.value && props.demand?.accepterShift) {
    return props.demand?.accepterShift?.shift?.name
  }
});

const secondShift = computed(() => {
  if (isOwner.value && props.demand?.accepterShift) {
    return props.demand?.accepterShift?.shift?.name
  } else if (isAccepter.value) {
    return props.demand?.posterShift?.shift?.name
  }
});

const isFirstShiftBold = computed(() => {
  return isOwner.value && !isAccepted.value
});

const isSecondShiftBold = computed(() => {
  return true
});

const statusIconColor = computed(() => {
  switch (props.demand?.status) {
    case 'open':
      return 'pendingDemand';
    case 'accepted':
      return 'acceptedDemand';
    default:
      return 'default';
  }
});



const totalPoints = computed(() => {
  if (props.demand?.type === 'switch' && props.demand?.acceptedSwitches.length > 0) {
    return `${props.demand.acceptedSwitches.length} Perm.`;
  }
  return props.demand?.points || 0;
});

const hasReplacementPoints = computed(() => props.demand?.points > 0 && props.demand?.type !== 'switch');
const hasSwitchPoints = computed(() => props.demand?.acceptedSwitches?.length > 0);

// --- Styling Classes & Actions (Unchanged) ---

const demandCardClasses = computed(() => {
  const classes = { 'demand-card': true };
  if (props.demand?.status === 'open' && props.isPoster) {
    classes['pending-demand-card'] = true;
  } else if (props.demand?.status === 'accepted' && props.isPoster) {
    classes['accepted-demand-card'] = true;
  } else if (props.demand?.status === 'accepted' && !props.isPoster) {
    classes['to-do-demand-card'] = true;
  }
  return classes;
});


const labelOption = computed(() => {
  if (props.demand?.accepterShift && isAccepted.value) {
    return "Je permute";
  }

  if (isAccepter.value && isAccepted.value && !props.demand?.accepterShift) {
    return "Je remplace";
  }

  if (isOwner.value && isAccepted.value && !props.demand?.accepterShift) {
    return "Je suis remplacé";
  }

  if (isOwner.value && (props.demand?.status === 'open' || !props.demand?.accepterId)) {
    return "En attente";
  }

  return "Statut inconnu";
});


const openDetails = () => {
  emit('openDetails', props.demand);
};


const confirmCancelOrWithdraw = () => {
  showConfirmDeleteDialog.value = true;
  showDemandDetailsModal.value = false;
};

const confirmDelete = async () => {
  try {
    if (props.isPoster) {
      await substitutionStore.cancelDemand(props.demand._id);
      snackbarStore.showNotification("Demande annulée", "success", "mdi-close");
    } else {
      await substitutionStore.unacceptDemand(props.demand._id);
      snackbarStore.showNotification("Votre proposition de remplacement a été annulée", "error", "mdi-close");
    }
    showConfirmDeleteDialog.value = false;
  } catch (error) {
    console.error('Erreur lors de la suppression de la demande:', error);
    snackbarStore.showNotification("Erreur lors de l'action", "error", "mdi-alert");
  }
};
</script>

<style scoped>
/* Scoped styles remain the same for visual consistency */
.demand-card {
  box-sizing: border-box;
  border-radius: 16px !important;
  transition: transform 0.2s ease-in-out;
  background-color: rgba(var(--v-theme-surfaceContainer), 0.29) !important;
  cursor: pointer;
}

/* Original status styles */
.pending-demand-card {
  border: 1px dashed rgba(255, 196, 134, 0.157) !important;
}

.accepted-demand-card {
  border: 1px solid rgba(111, 185, 141, 0.0000057) !important;
}

.to-do-demand-card {
  background-color: rgba(var(--v-theme-remplacement), 0.20) !important;
  color: rgba(var(--v-theme-remplacement), 1) !important;
}

/* Original chip styles (adapted to new chip structure) */
.accepted-demand-card .point-chip,
.pending-demand-card .point-chip,
.to-do-demand-card .point-chip {
  border: 1px solid rgba(var(--v-theme-onBackground), 0.1) !important;
  background: transparent !important;
  color: rgba(var(--v-theme-primary), 0.99) !important;
}

.empty-accepter-avatar {
  /* Mimic v-avatar size="small" (e.g., 28px) */
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  /* Dashed border styling */
  border: 1px dashed rgba(var(--v-theme-onBackground), 0.5);
  background: rgba(var(--v-theme-surface-variant), 0.01);
  /* Light background */
}


.small-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background-color: rgba(var(--v-theme-onBackground), 0.5);

}
</style>