<template>
  <div class="d-flex align-start ga-2">
    <div class="dot-big" :class="dotClass" />
    <v-card :class="smAndDown ? 'demand-card__mobile pl-2' : 'pl-4'" variant="flat" rounded="lg"
      class="demand-card pa-3 flex-1-1" @click="openDetails">
      <div class="d-flex align-center justify-space-between">
        <div class="d-flex align-center mr-3 ga-2">
          <v-icon v-if="isOwner" size="12" color="primary">
            mdi-account-star-outline
          </v-icon>
          <span style="font-weight: 800; font-size: .75rem;" :class="{ 'text-primary': isOwner }">{{ posterName
            }}</span>
          <span v-if="!isOwner" class="text-truncate" style="max-width: 80px; font-size: .70rem; font-weight: 600;">({{
            posterTeamName }})</span>
          <div class="small-dot" />
          <span class="text-caption font-weight-medium text-medium-emphasis">{{ formatDate(demand?.posterShift?.date)
          }}</span>

          <v-icon v-if="demand?.comment" size="x-small" color="onBackground" style="opacity: 0.8;">
            mdi-comment-text-outline
          </v-icon>

          <v-chip variant="outlined" size="x-small" rounded="lg" class="font-weight-bold point-chip mr-2">
            <LogoCopy color="onBackground" style="top:-2px; position: relative; transform: scale(0.87);" />
            <span :class="pointClass" style="font-size: .875rem; font-weight: 600;">{{ totalPoints }}</span>
            <v-icon v-if="hasVariablePoints && !demand.accepterId" color="primary" style="position: relative; top: 0px;"
              icon="mdi-tune" />
          </v-chip>
        </div>



        <div class="d-flex align-center">

          <div class="d-flex align-center " style="position: relative; width: 20px;">
            <div v-if="demand?.type === 'switch'" class="d-flex align-center ga-2">
              <v-icon class="" style="top: 1px; font-size: 14px;" icon="mdi-swap-horizontal" />
            </div>
            <div v-if="demand?.type === 'substitution'" class="d-flex align-center ga-2">
              <v-icon class="" style="top: 1px; font-size: 14px;" icon="mdi-account-arrow-left-outline " />
            </div>
            <div v-if="demand?.type === 'hybrid'" class="d-flex align-center ga-2 position-relative">
              <v-icon class="ml-n1" style="top: 1px; font-size: 14px;" icon="mdi-account-arrow-left-outline " />
              <v-icon class="ml-n2" style="top: 2px; font-size: 14px; position: absolute; left: 10px;"
                icon="mdi-swap-horizontal" />
            </div>
          </div>

        </div>
      </div>



      <div class="d-flex align-center  ga-2 my-1">
        <div class="d-flex align-center ga-1">
          <span v-if="firstShift" :style="{ fontWeight: isFirstShiftBold ? '800' : '500' }"
            style="font-size: .875rem; opacity: 0.7;">{{ firstShift }}</span>
          <v-icon v-if="isAccepted" size="x-small" icon="mdi-arrow-right-drop-circle-outline" color="primary"
            style="opacity: 0.8;" />
          <span v-if="secondShift" :style="{ fontWeight: isSecondShiftBold ? '800' : '500' }"
            style="font-size: .875rem; opacity: 0.7">{{ secondShift }}</span>
        </div>
        <div class="mt-0">
          <div class="custom-small-chip">
            <span class="text-medium-emphasis" style="font-size: .690rem; font-weight: 500;">{{ labelOption
            }}</span>
          </div>
        </div>
      </div>

      <div class="d-flex align-center flex-shrink-0 justify-space-between">
        <div class="d-flex align-center ga-1">
          <v-icon size="x-small" icon="mdi-eye-outline" color="onBackground" style="opacity: 0.8;" />
          <span class="text-medium-emphasis" style="font-size: .70rem; font-weight: 600;">{{ demand?.seenBy?.length || 0
          }}</span>
        </div>


        <div class="d-flex align-center ml-4">
          <template v-if="accepter">
            <v-avatar size="20" color="surfaceContainer" class="mr-1">
              <v-img v-if="accepter?.avatar" :src="`${API_URL}${accepter?.avatar}`" alt="Avatar" />
              <v-icon v-else size="16">
                mdi-account-check-outline
              </v-icon>
            </v-avatar>
            <div class="d-flex align-center text-left ga-1">
              <span class="font-weight-bold text-truncate" :class="isAccepter ? 'text-primary' : ''"
                style="max-width: 100px; font-size: .75rem;">
                {{ accepterName }}
              </span>
              <span v-if="isOwner" class="text-truncate"
                style="max-width: 80px; font-size: .70rem; font-weight: 600;">({{
                  accepterTeamName }})</span>
            </div>
          </template>
          <template v-else>
            <div class="empty-accepter-avatar mr-1">
              <v-icon size="12" color="text-medium-emphasis">
                mdi-account-question-outline
              </v-icon>
            </div>
          </template>
        </div>
      </div>
    </v-card>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useTeamStore } from '@/stores/teamStore';
import { useUserStore } from '@/stores/userStore';
import { useRotationStore } from '@/stores/rotationStore';
import { useAuthStore } from '@/stores/authStore';
import { useDisplay } from 'vuetify';
import { API_URL } from '@/config/api'
import { resolveTripleslashReference } from 'typescript';


const teamStore = useTeamStore();
const rotationStore = useRotationStore();
const userStore = useUserStore();
const { smAndDown } = useDisplay();
const authStore = useAuthStore();
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

const emit = defineEmits(['accept', 'decline', 'openDetails']);

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

const posterTeamName = computed(() => {
  const teamId = poster.value?.currentTeam?.teamId;
  return teamId ? getTeamById(teamId)?.name : 'N/A';
});

const accepterTeamName = computed(() => {
  const teamId = accepter.value?.currentTeam?.teamId;
  return teamId ? getTeamById(teamId)?.name : 'N/A';
});

const destinationTeamName = computed(() => {
  const teamId =
    props.demand?.accepterShift
      ? isAccepter.value
        ? props.demand.posterShift.teamId
        : props.demand.accepterShift.teamId
      : isAccepter.value
        ? props.demand?.posterShift?.teamId
        : null;

  if (!teamId) return 'N/A';

  return typeof teamId === 'object'
    ? teamId.name
    : getTeamById(teamId)?.name || 'N/A';
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


const isSwitch = (demand) => demand?.type === 'switch'
const isHybrid = (demand) => demand?.type === 'hybrid'

const hasVariablePoints = computed(() => {
  const demand = props.demand
  if (!demand) return false

  if (isSwitch(demand)) {
    const points = demand.acceptedSwitches.map(s => s.points)
    return !points.every(p => p === points[0]) // true if values differ
  }

  if (isHybrid(demand)) return true

  return false
})

const totalPoints = computed(() => {
  const demand = props.demand
  if (!demand) return 0

  if (!demand.accepterId) {
    if (isSwitch(demand)) {
      return hasVariablePoints.value ? '' : '0'
    }

    if (isHybrid(demand)) return demand.points

    return demand.points || 0
  } else {
    if (isSwitch(demand) || isHybrid(demand)) {
      if (demand.accepterShift) {
        const points = demand.acceptedSwitches.find(s => s.id === demand.accepterShift.shift)
        return points ? points.points : 0
      }
      else {
        return demand.points
      }
    }
    return demand.points || 0
  }
})

const pointClass = computed(() => {
  if (hasVariablePoints.value && !props.demand.accepterId) {
    return 'variable'
  }
  return ''
})

const dotClass = computed(() => {
  return {
    'dot-big--pending': props.demand?.status === 'open',
    'dot-big--owner': isOwner.value,
  }
})

const labelOption = computed(() => {
  if (props.demand?.accepterShift && isAccepted.value) {
    return "Je permute dans équipe " + destinationTeamName.value;
  }

  if (isAccepter.value && isAccepted.value && !props.demand?.accepterShift) {
    return "Je remplace dans équipe " + destinationTeamName.value;
  }

  if (isOwner.value && isAccepted.value && !props.demand?.accepterShift) {
    return "Je suis remplacé";
  }

  if (isOwner.value && (props.demand?.status === 'open' || !props.demand?.accepterId)) {
    return "En attente...";
  }

  return "Statut inconnu";
});


const openDetails = () => {
  emit('openDetails', props.demand);
};


</script>

<style scoped>
/* Scoped styles remain the same for visual consistency */
.demand-card {
  box-sizing: border-box;
  border-radius: 16px !important;
  transition: transform 0.2s ease-in-out;
  background-color: rgba(var(--v-theme-surfaceContainer), 0.00) !important;
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
.demand-card .point-chip {
  border: 1px solid rgba(var(--v-theme-onBackground), 0.001) !important;
  background: transparent !important;
  color: rgba(var(--v-theme-primary), 0.99) !important;
}

.demand-card {
  background-color: rgba(var(--v-theme-surfaceContainer), 1) !important;
}

.demand-card.demand-card__mobile {
  background-color: rgba(var(--v-theme-surfaceContainer), 0.00) !important;
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

.dot-big {
  width: 7px;
  top: 18px;
  position: relative;
  height: 7px;
  border-radius: 50%;
  background-color: rgba(var(--v-theme-onBackground), 1);
}

.dot-big.dot-big--pending {
  opacity: 0.5;
}

.dot-big.dot-big--owner {
  background-color: rgba(var(--v-theme-primary), 1) !important;
}

.small-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background-color: rgba(var(--v-theme-onBackground), 0.5);
}

.variable {
  color: rgba(var(--v-theme-primary), 0.8) !important;
  font-weight: 600 !important;
}

.custom-small-chip {
  border: 1px solid rgba(var(--v-theme-onBackground), 0.05) !important;
  border-radius: 16px !important;
  opacity: 0.8 !important;
  padding: 1px 6px !important;
  background: rgba(var(--v-theme-surfaceContainer), 0.0005) !important;
  font-size: .690rem !important;
}
</style>