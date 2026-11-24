<template>
  <div class="d-flex align-start ga-2">
    <div v-if="dot" class="dot dot-big" :class="dotClass" />
    <v-card
      v-touch-hold.mouse="openMenu"
      :class="[smAndDown ? 'demand-card__mobile pl-2' : 'pl-4', { 'demand-card--owner': isOwner && !smAndDown }]"
      variant="flat"
      rounded="lg"
      class="demand-card pa-3 flex-1-1"
      @click="openDetails"
      @contextmenu.prevent
    >
      <!-- Ma demande : cinq formes très discrètes en fond (pas dans le flux : la mise en page ne change pas) -->
      <template v-if="isOwner">
        <ArtTarget
          v-for="(spot, index) in ownerShapes"
          :key="index"
          class="art owner-shape"
          :shape="spot.shape"
          :tone="spot.tone"
          :outlined="spot.outlined"
          :rotation="spot.rotation"
          :style="{ top: spot.top, left: spot.left, width: spot.size }"
        />
      </template>
      <div class="d-flex align-start justify-space-between">
        <div class="d-flex align-start mr-3 ga-2">
          <v-icon v-if="isOwner" size="12" color="primary" style="height: 14px"> mdi-account-star-outline </v-icon>
          <span
            class="d-flex flex-column"
            style="font-weight: 800; font-size: 0.75rem; line-height: 1.15"
            :class="{ 'text-primary': isOwner }"
          >
            <span v-for="line in posterNameLines" :key="line">{{ line }}</span>
          </span>
          <!-- Équipe, date, icônes et points : centrés sur la première ligne du nom, même quand le nom tient sur deux lignes -->
          <div class="d-flex align-center ga-2" style="height: 14px">
            <div
              v-if="!isOwner"
              style="
                height: 14px;
                width: 14px;
                border-radius: 50%;
                border: 1px solid rgba(var(--v-theme-primary), 0.02);
                background-color: rgba(var(--v-theme-primary), 0.1);
              "
              class="d-flex align-center justify-center"
            >
              <span class="text-truncate font-weight-bold opacity-80" style="font-size: 0.625rem;">{{
                posterTeamName
              }}</span>
            </div>
            <div class="dot dot--xs" />
            <span class="text-body-small font-weight-medium text-medium-emphasis">{{
              formatDayMonth(posterDay(demand))
            }}</span>

            <template v-if="isMailingEnabled">
              <div class="dot dot--xs" />
              <v-icon class="opacity-70"
                :icon="demand?.mailStatus === 'sent' ? 'mdi-email-check-outline' : 'mdi-email-outline'"
                :color="demand?.mailStatus === 'sent' ? 'primary' : 'medium-emphasis'"
                size="x-small"
              />
            </template>

            <v-icon
              v-if="demand?.dependsOn?.length"
              size="x-small"
              color="primary"
              icon="mdi-link-variant"
              title="Liée à une autre demande"
              aria-label="Liée à une autre demande"
            />
            <v-icon class="opacity-80" v-if="demand?.comment" size="x-small" color="onBackground">
              mdi-comment-text-outline
            </v-icon>

            <v-chip variant="outlined" size="x-small" rounded="lg" class="font-weight-bold point-chip mr-2">
              <LogoCopy class="position-relative" color="onBackground" style="top: -2px; transform: scale(0.87);" />
              <span :class="pointClass" style="font-size: 0.875rem; font-weight: 600">{{ totalPoints }}</span>
              <v-icon class="position-relative"
                v-if="hasVariablePoints && !demand.accepterId"
                color="primary"
                style="top: 0px;"
                icon="mdi-tune"
              />
            </v-chip>
          </div>
        </div>

        <div class="d-flex align-start" style="height: 14px">
          <div class="d-flex align-center position-relative" style="width: 20px;">
            <v-icon size="x-small"> {{ getDemandIcon(demand, authStore.userData.userId) }}</v-icon>
          </div>
        </div>
      </div>

      <div class="d-flex align-center ga-2 my-1">
        <div class="d-flex align-center ga-1 flex-wrap">
          <div v-if="firstShift" class="d-flex align-center ga-2">
            <span :style="{ fontWeight: isFirstShiftBold ? '800' : '500' }" style="font-size: 0.875rem; opacity: 0.7">{{
              firstShift
            }}</span>
            <!-- <span v-if="firstShiftHours" class="text-body-small font-weight-medium text-medium-emphasis"
              style="font-size: .70rem;">{{ firstShiftHours.startTime }} - {{ firstShiftHours.endTime }}</span> -->
          </div>
          <v-icon class="opacity-80"
            v-if="isAccepted"
            size="x-small"
            icon="mdi-arrow-right-drop-circle-outline"
            color="primary"
          />
          <div v-if="secondShift" class="d-flex align-center ga-2">
            <span
              :style="{ fontWeight: isSecondShiftBold ? '800' : '500' }"
              style="font-size: 0.875rem; opacity: 0.7"
              >{{ secondShift }}</span
            >
            <!-- <span v-if="secondShiftHours" class="text-body-small font-weight-medium text-medium-emphasis"
              style="font-size: .70rem;">{{ secondShiftHours.startTime }} - {{ secondShiftHours.endTime }}</span> -->
          </div>
        </div>
        <div class="mt-0">
          <div class="custom-small-chip">
            <span class="text-medium-emphasis">{{ labelOption }}</span>
          </div>
        </div>
      </div>

      <div class="d-flex align-center flex-shrink-0 justify-space-between">
        <div class="d-flex align-center ga-1">
          <v-icon class="opacity-80" size="x-small" icon="mdi-eye-outline" color="onBackground" />
          <span class="text-medium-emphasis" style="font-size: 0.7rem; font-weight: 600">{{
            demand?.seenBy?.length || 0
          }}</span>
        </div>

        <div class="d-flex align-center ml-4">
          <template v-if="accepter">
            <v-avatar size="20" color="surfaceContainer" class="mr-1">
              <v-img v-if="accepter?.avatar" :src="`${API_URL}${accepter?.avatar}`" alt="Avatar" />
              <v-icon v-else size="16"> mdi-account-check-outline </v-icon>
            </v-avatar>
            <div class="d-flex align-center text-left ga-1">
              <span
                class="d-flex flex-column font-weight-bold"
                :class="isAccepter ? 'text-primary' : ''"
                style="max-width: 150px; font-size: 0.75rem; line-height: 1.15"
              >
                <span class="text-truncate">{{ accepterName }}</span>
              </span>
              <div
                v-if="!isAccepter"
                style="
                  height: 14px;
                  width: 14px;
                  border-radius: 50%;
                  border: 1px solid rgba(var(--v-theme-primary), 0.02);
                  background-color: rgba(var(--v-theme-primary), 0.1);
                "
                class="d-flex align-center justify-center"
              >
                <span class="text-truncate font-weight-bold opacity-80" style="font-size: 0.625rem;">{{
                  accepterTeamName
                }}</span>
              </div>
            </div>
          </template>
          <template v-else>
            <div class="empty-accepter-avatar mr-1">
              <v-icon size="12" color="text-medium-emphasis"> mdi-account-question-outline </v-icon>
            </div>
          </template>
        </div>
      </div>
    </v-card>

    <!-- Menu d'un appui long : annuler (demandeur) ou se désister (accepteur) -->
    <CompactMenu
      v-model:open="menuOpen"
      :model-value="null"
      :items="menuItems"
      :target="menuTarget"
      label="Actions de la demande"
      @select="onMenuSelect"
    />
  </div>
</template>

<script setup>
import { posterDay } from '@/utils/dayFields.js';
import { formatDayMonth } from '@/utils/formatDate';
import { getDemandIcon } from '@/utils/demandToIcon.js';
import { useTeamStore } from '@/stores/teamStore';
import { useUserStore } from '@/stores/userStore';
import { useAuthStore } from '@/stores/authStore';
import { useDemandStore } from '@/stores/demandStore';
import { useDisplay } from 'vuetify';
import { API_URL } from '@/config/api';
import { getEffectiveShiftTimes } from '@/utils/getEffectiveShiftTimes';

const teamStore = useTeamStore();
const userStore = useUserStore();
const demandStore = useDemandStore();
const { smAndDown } = useDisplay();
const authStore = useAuthStore();
const isMailingEnabled = computed(() => demandStore.isMailingEnabled);
const props = defineProps({
  demand: {
    type: Object,
    required: true,
  },
  small: {
    type: Boolean,
    required: false,
    default: false,
  },
  dot: {
    type: Boolean,
    required: false,
    default: true,
  },
  // Noms complets, sur deux lignes (prénom, puis NOM) ; sinon abrégés sur une ligne (prénom et initiales du nom)
  fullName: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(['accept', 'decline', 'openDetails', 'cancelDemand', 'withdrawDemand']);

// Menu de l'appui long : annuler si l'on est le demandeur, se désister si l'on est l'accepteur d'une demande acceptée
// Les cinq formes du fond d'une demande à moi : positions fixes (en % de la carte), formes et teintes choisies une fois pour toutes
const ownerShapes = [
  { shape: 'circle', tone: 'primary', outlined: false, rotation: 0, top: '-14%', left: '58%', size: '44px' },
  { shape: 'triangle', tone: 'secondary', outlined: true, rotation: 20, top: '52%', left: '80%', size: '36px' },
  { shape: 'square', tone: 'primary', outlined: true, rotation: 12, top: '60%', left: '38%', size: '28px' },
  { shape: 'hexagon', tone: 'primary', outlined: false, rotation: 0, top: '-20%', left: '88%', size: '30px' },
  { shape: 'diamond', tone: 'secondary', outlined: false, rotation: 0, top: '70%', left: '64%', size: '22px' },
];

const menuOpen = ref(false);
const menuTarget = ref(undefined);

const menuItems = computed(() => {
  const items = [];
  if (isOwner.value) items.push({ title: 'Annuler', value: 'cancel', icon: 'mdi-delete-outline' });
  if (isAccepter.value && isAccepted.value) {
    items.push({ title: 'Se désister', value: 'withdraw', icon: 'mdi-account-minus-outline' });
  }
  return items;
});

const openMenu = ({ clientX, clientY }) => {
  if (!menuItems.value.length) return;
  menuTarget.value = [clientX, clientY];
  menuOpen.value = true;
};

const onMenuSelect = ({ value }) => {
  emit(value === 'cancel' ? 'cancelDemand' : 'withdrawDemand', props.demand);
};


const getTeamById = teamStore.getCenterTeam;
const getUserById = userStore.getUser;

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

// Les lignes à afficher pour le nom d'un utilisateur : [prénom, NOM] en nom complet, [« prénom N. »] en nom abrégé
const nameLines = (user, fallback) => {
  if (!user?.name) return [fallback];
  const lastName = user.lastName ?? '';
  if (props.fullName) return lastName ? [user.name, lastName.toUpperCase()] : [user.name];
  const initials = lastName
    .split(' ')
    .filter(Boolean)
    .map((word) => `${word[0]}.`)
    .join(' ');
  return [initials ? `${user.name} ${initials}` : user.name];
};

const posterNameLines = computed(() => nameLines(poster.value, 'Demandeur'));
// L'accepteur : toujours le nom complet (prénom, puis NOM) sur une seule ligne, quel que soit `fullName`
const accepterName = computed(() =>
  accepter.value?.name
    ? [accepter.value.name, accepter.value.lastName?.toUpperCase()].filter(Boolean).join(' ')
    : 'Accepteur',
);

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
  if (typeof teamId === 'object' && teamId !== null) {
    return teamId.name;
  }
  return teamId ? getTeamById(teamId)?.name : 'N/A';
});

const destinationTeamName = computed(() => {
  const teamId = props.demand?.accepterShift
    ? isAccepter.value
      ? props.demand.posterShift.teamId
      : props.demand.accepterShift.teamId
    : isAccepter.value
      ? props.demand?.posterShift?.teamId
      : null;

  if (!teamId) return 'N/A';

  return typeof teamId === 'object' ? teamId.name : getTeamById(teamId)?.name || 'N/A';
});

// const getDayName = (dayId) => {
//   const rotation = rotationStore.rotations.find(rotation =>
//     rotation.days?.find(day => day._id === dayId)
//   );
//   if (rotation) {
//     const day = rotation.days.find(day => day._id === dayId);
//     return day?.name || 'Aucune vacations';
//   }
//   return 'Aucune vacations';
// };

const firstShift = computed(() => {
  if (isOwner.value) {
    const ps = props.demand?.posterShift;
    return ps?.shift?.name;
  } else if (isAccepter.value && props.demand?.accepterShift) {
    const as = props.demand?.accepterShift;
    return as?.shift?.name;
  }
  return '';
});

const secondShift = computed(() => {
  if (isOwner.value && props.demand?.accepterShift) {
    const as = props.demand?.accepterShift;
    return as?.shift?.name;
  } else if (isAccepter.value) {
    const ps = props.demand?.posterShift;
    return ps?.shift?.name;
  }
  return '';
});

const firstShiftHours = computed(() => {
  if (isOwner.value) {
    const ps = props.demand?.posterShift;
    return ps?.shift ? getEffectiveShiftTimes(ps.shift, ps?.selectedVariation) : null;
  }
  if (isAccepter.value && props.demand?.accepterShift) {
    const as = props.demand?.accepterShift;
    return as?.shift ? getEffectiveShiftTimes(as.shift, as?.selectedVariation) : null;
  }
  return null;
});

const secondShiftHours = computed(() => {
  if (isOwner.value && props.demand?.accepterShift) {
    const as = props.demand?.accepterShift;
    return as?.shift ? getEffectiveShiftTimes(as.shift, as?.selectedVariation) : null;
  }
  if (isAccepter.value) {
    const ps = props.demand?.posterShift;
    return ps?.shift ? getEffectiveShiftTimes(ps.shift, ps?.selectedVariation) : null;
  }
  return null;
});

const isFirstShiftBold = computed(() => {
  return isOwner.value && !isAccepted.value;
});

const isSecondShiftBold = computed(() => {
  return true;
});

const isSwitch = (demand) => demand?.type === 'switch';
const isHybrid = (demand) => demand?.type === 'hybrid';

const hasVariablePoints = computed(() => {
  const demand = props.demand;
  if (!demand) return false;

  if (isSwitch(demand)) {
    const points = demand.acceptedSwitches.map((s) => s.points);
    return !points.every((p) => p === points[0]); // true if values differ
  }

  if (isHybrid(demand)) return true;

  return false;
});

const totalPoints = computed(() => {
  const demand = props.demand;
  if (!demand) return 0;

  if (!demand.accepterId) {
    if (isSwitch(demand)) {
      return hasVariablePoints.value ? '' : '0';
    }

    if (isHybrid(demand)) return demand.points;

    return demand.points || 0;
  } else {
    if (isSwitch(demand) || isHybrid(demand)) {
      if (demand.accepterShift) {
        const points = demand.acceptedSwitches.find((s) => s.id === demand.accepterShift.shift);
        return points ? points.points : 0;
      } else {
        return demand.points;
      }
    }
    return demand.points || 0;
  }
});

const pointClass = computed(() => {
  if (hasVariablePoints.value && !props.demand.accepterId) {
    return 'variable';
  }
  return '';
});

const dotClass = computed(() => {
  return {
    'dot-big--pending': props.demand?.status === 'open',
    'dot-big--owner': isOwner.value,
  };
});

const labelOption = computed(() => {
  if (props.demand?.accepterShift && isAccepted.value) {
    return 'Je permute dans équipe ' + destinationTeamName.value;
  }

  if (isAccepter.value && isAccepted.value && !props.demand?.accepterShift) {
    return 'Je remplace dans équipe ' + destinationTeamName.value;
  }

  if (isOwner.value && isAccepted.value && !props.demand?.accepterShift) {
    return 'Je suis remplacé';
  }

  if (isOwner.value && (props.demand?.status === 'open' || !props.demand?.accepterId)) {
    return 'En attente...';
  }

  return 'Statut inconnu';
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
  background-color: rgba(var(--v-theme-surfaceContainer), 0) !important;
  cursor: pointer;
}

/* Original status styles */

/* Original chip styles (adapted to new chip structure) */
.demand-card .point-chip {
  border: 1px solid rgba(var(--v-theme-onBackground), 0.001) !important;
  background: transparent !important;
  color: rgba(var(--v-theme-primary), 0.99) !important;
}

.demand-card {
  background-color: rgba(var(--v-theme-surfaceContainer), 1) !important;
}

/* Mes demandes : mince liseré primaire, tracé en ombre intérieure pour ne changer ni la taille ni la mise en page */
.owner-shape {
  position: absolute;
  z-index: -1; /* derrière le contenu, dans le contexte d'empilement de la carte */
  opacity: 0.1;
}

.demand-card--owner {
  box-shadow: inset 0 0 0 2px color-mix(in srgb, rgb(var(--v-theme-primary)) 20%, transparent);
}

.demand-card.demand-card__mobile {
  background-color: rgba(var(--v-theme-surfaceContainer), 0) !important;
}

/* Pastille d'en-tête (styles/dot.css) : 7 px, pleine, décalée ; atténuée si la demande est en attente, primaire pour son auteur */
.dot-big {
  --dot-size: 7px;
  --dot-color: rgb(var(--v-theme-onBackground));
  position: relative;
  top: 18px;
}

.dot-big--pending {
  opacity: 0.5;
}

.dot-big--owner {
  --dot-color: rgb(var(--v-theme-primary));
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

.variable {
  color: rgba(var(--v-theme-primary), 0.8) !important;
  font-weight: 600 !important;
}

.custom-small-chip {
  border: 1px solid rgba(var(--v-theme-onBackground), 0.005) !important;
  color: rgba(var(--v-theme-onBackground), 0.87) !important;
  border-radius: 16px !important;
  font-weight: 500 !important;
  opacity: 0.9 !important;
  /* padding: 1px 6px !important; */
  background: rgba(var(--v-theme-surfaceContainer), 0.0005) !important;
  font-size: 0.65rem !important;
}
</style>
