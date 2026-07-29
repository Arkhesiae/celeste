<template>
  <v-card
    class="demand-card pa-6"
    rounded="xl"
    elevation="0"
    variant="flat"
    color="surface"
  >
    <v-card-item class="pa-0">
      <div class="d-flex align-start justify-space-between mb-4">
        <div class="d-flex align-center ga-2">
          <div class="d-flex align-center ga-2">
            <v-icon
              :icon="typeIcon"
              :color="typeColor"
              size="20"
            />
            <span class="text-title-large font-weight-bold">{{ getTypeName(demand?.type) }}</span>
          </div>
          <div
            class="d-flex align-center ga-2"
            style="cursor: pointer"
            @click="showUserDialog('poster')"
          >
            <v-avatar
              size="24"
              variant="tonal"
            >
              <v-img
                v-if="posterData?.avatar"
                :src="`${API_URL}${posterData?.avatar}`"
                alt="Avatar"
              />
              <v-icon
                v-else
                size="x-small"
              >
                mdi-account
              </v-icon>
            </v-avatar>
            <span class="text-body-medium font-weight-bold">{{ posterData?.name }} {{ posterData?.lastName }}</span>
          </div>
        </div>
 
  
        <div class="d-flex align-end flex-column  ga-2">
          <v-chip 
            :color="getStatusColor(demand?.status)" 
            variant="tonal" 
            size="small" 
            rounded="lg"
            class="font-weight-bold"
          >
            {{ getStatusLabel(demand?.status) }}
          </v-chip>
          <v-chip
            size="x-small"
            variant="flat"
            color="surfaceContainerHigh"
            rounded="pill"
          >
            <v-icon
              icon="mdi-clock-time-three-outline"
              size="x-small"
              class="mr-1"
            />
            Créée {{ timeSinceCreation }}
          </v-chip>
        </div>
      </div>

      <!-- Date et vacation -->
      <div class="mb-4">
        <div class="d-flex align-center ga-2 mb-2">
          <v-chip 
          
            color="surface"
            size="x-small" 
            rounded="lg"
            class="font-weight-bold text-onBackground"
          >
            <v-icon
              icon="mdi-calendar"
              size="16"
              color="primary"
            />
            <span class=" font-weight-bold">{{ formatDate(demand?.posterShift?.date) }}</span>
          </v-chip>
        </div>
        <div class="d-flex align-center ga-2">
          <v-icon
            icon="mdi-clock-outline"
            size="16"
            color="onSurface"
          />
          <span class="text-body-medium">{{ getShiftName }}</span>
          <span class="text-body-medium">{{ getShiftHours.startTime }} - {{ getShiftHours.endTime }}</span>
        </div>
      </div>

      <div
        v-if="visibleComment"
        class="d-flex align-start ga-2 mb-4 pa-3 rounded-lg"
        style="background-color: rgba(var(--v-theme-onSurface), 0.04);"
      >
        <v-icon
          icon="mdi-comment-text-outline"
          size="16"
          color="primary"
          class="mt-1"
        />
        <div>
          <span class="text-body-small font-weight-bold opacity-70 d-block mb-1">Commentaire</span>
          <span class="text-body-medium" style="white-space: pre-wrap;">{{ visibleComment }}</span>
        </div>
      </div>

     
      


      <div
        v-if="demand?.accepterId"
        class="d-flex align-center justify-space-between"
      >
        <div class="d-flex align-center ga-2">
          <v-icon
            icon="mdi-account-check-outline"
            size="20"
            color="success"
          />
          <span class="text-body-small font-weight-bold opacity-70">Accepteur</span>
        </div>
        <div
          class="d-flex align-center ga-2"
          style="cursor: pointer"
          @click="showUserDialog('accepter')"
        >
          <v-avatar
            size="24"
            variant="tonal"
          >
            <v-img
              v-if="accepterData?.avatar"
              :src="`${API_URL}${accepterData?.avatar}`"
              alt="Avatar"
            />
            <v-icon
              v-else
              size="x-small"
            >
              mdi-account
            </v-icon>
          </v-avatar>
          <span class="text-body-medium font-weight-bold">{{ accepterData?.name }} {{ accepterData?.lastName }}</span>
        </div>
      </div>

      <!-- Points -->
      <v-divider class="my-3" />
      
      <div class="d-flex align-center justify-space-between">
        <span class="text-body-small font-weight-bold opacity-70">Points</span>
        <v-chip 
          color="primary" 
          variant="tonal" 
          size="small" 
          rounded="lg"
          class="font-weight-bold"
        >
          <LogoCopy
            color="primary"
            style="top:-2px; position: relative;"
          />
          {{ demand?.points }}
        </v-chip>
      </div>
    </v-card-item>

    <!-- Dialog utilisateur -->
    <v-dialog
      v-model="showUserDialogModal"
      max-width="350"
    >
      <v-card
        rounded="xl"
        color="surfaceContainer"
        class="pa-6"
      >
        <div class="d-flex flex-column ga-2">
          <div class="d-flex align-center ga-2">
            <v-avatar
              size="40"
              variant="tonal"
            >
              <v-img
                v-if="selectedUserData?.avatar"
                :src="`${API_URL}${selectedUserData?.avatar}`"
                alt="Avatar"
              />
              <v-icon v-else>
                mdi-account
              </v-icon>
            </v-avatar>
            <div>
              <div class="text-body-large font-weight-bold">
                {{ selectedUserData?.name }} {{ selectedUserData?.lastName }}
              </div>
              <div class="text-body-small opacity-70">
                {{ selectedUserData?.email }}
              </div>
            </div>
          </div>
          <v-divider class="my-2" />
          <div class="text-body-small">
            <strong>Téléphone:</strong> {{ selectedUserData?.personalData?.phoneNumber || 'N/A' }}
          </div>
        </div>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup>

import { useDate } from 'vuetify';
import { API_URL } from '@/config/api';
import LogoCopy from '@/components/Assets/LogoCopy.vue';
import { getVisibleDemandComment } from '@/utils/demandComment';

const props = defineProps({
  demand: {
    type: Object,
    required: true
  }
});

const date = useDate();
const timeSinceCreation = ref('');
const showUserDialogModal = ref(false);
const selectedUserData = ref(null);

const visibleComment = computed(() =>
  getVisibleDemandComment(props.demand?.comment)
);

// const posterUpdated = computed(() => props.demand?.posterId);
// const accepterUpdated = computed(() => props.demand?.accepterId);

// Extraire les données des utilisateurs depuis le demand
const posterData = computed(() => {
  if (!props.demand?.posterId) return null;
  
  // Si posterId est un objet (populé), retourner l'objet
  if (typeof props.demand.posterId === 'object' && props.demand.posterId !== null) {
    return props.demand.posterId;
  }
  
  return null;
});

const accepterData = computed(() => {
  if (!props.demand?.accepterId) return null;
  
  // Si accepterId est un objet (populé), retourner l'objet
  if (typeof props.demand.accepterId === 'object' && props.demand.accepterId !== null) {
    return props.demand.accepterId;
  }
  
  return null;
});

const typeIcon = computed(() => {
  if (props.demand?.type === 'switch') return 'mdi-swap-horizontal';
  if (props.demand?.type === 'hybrid') return 'mdi-account-arrow-left-outline';
  return 'mdi-account-arrow-left-outline';
});

const getTypeName = (type) => {
  return type;
  // const types = {
  //   'substitution': 'Remplacement',
  //   'switch': 'Permutation',
  //   'hybrid': 'Hybride'
  // };
  // return types[type] || type.charAt(0).toUpperCase() + type.slice(1);
};

const typeColor = computed(() => {
  if (props.demand?.type === 'switch') return 'permutation';
  if (props.demand?.type === 'hybrid') return 'primary';
  return 'remplacement';
});

const getStatusLabel = (status) => {
  return status;
};

const getStatusColor = (status) => {
  const statusColors = {
    'open': 'primary',
    'accepted': 'success',
    'completed': 'info',
    'cancelled': 'error',
    'expired': 'warning',
    'system-cancelled': 'error'
  };
  return statusColors[status] || 'surfaceContainerHigh';
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const currentYear = new Date().getFullYear();
  const dateYear = new Date(dateString).getFullYear();
  
  if (dateYear !== currentYear) {
    return date.format(dateString, 'fullDate');
  } else {
    return date.format(dateString, 'normalDate');
  }
};

const calculateTimeSinceCreation = () => {
  if (!props.demand?.createdAt) return '';
  
  const now = new Date();
  const createdAt = new Date(props.demand.createdAt);
  const diffInHours = Math.floor((now - createdAt) / (1000 * 60 * 60));
  
  if (diffInHours < 1) {
    const diffInMinutes = Math.floor((now - createdAt) / (1000 * 60));
    return `il y a ${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''}`;
  } else if (diffInHours < 24) {
    return `il y a ${diffInHours} heure${diffInHours > 1 ? 's' : ''}`;
  } else {
    const diffInDays = Math.floor(diffInHours / 24);
    return `il y a ${diffInDays} jour${diffInDays > 1 ? 's' : ''}`;
  }
};

const getShiftName = computed(() => {
  return props.demand?.posterShift?.shift?.name || props.demand?.posterShift?.name || '';
});

const getShiftHours = computed(() => {
  const shift = props.demand?.posterShift?.shift || props.demand?.posterShift;
  return {
    startTime: shift?.default?.startTime || shift?.startTime,
    endTime: shift?.default?.endTime || shift?.endTime
  };
});

const showUserDialog = (type) => {
  if (type === 'poster') {
    selectedUserData.value = posterData.value;
  } else if (type === 'accepter') {
    selectedUserData.value = accepterData.value;
  }
  showUserDialogModal.value = true;
};

let intervalId = null;

onMounted(() => {
  timeSinceCreation.value = calculateTimeSinceCreation();
  intervalId = setInterval(() => {
    timeSinceCreation.value = calculateTimeSinceCreation();
  }, 60000);
});

onUnmounted(() => {
  if (intervalId) {
    clearInterval(intervalId);
  }
});
</script>

<script>
// Filtres
export default {
  filters: {
    capitalizeType(type) {
      if (!type) return '';
      const types = {
        'substitution': 'Remplacement',
        'switch': 'Permutation',
        'hybrid': 'Hybride'
      };
      return types[type] || type.charAt(0).toUpperCase() + type.slice(1);
    },
    capitalizeStatus(status) {
      if (!status) return '';
      const statuses = {
        'open': 'Ouverte',
        'accepted': 'Acceptée',
        'completed': 'Terminée',
        'cancelled': 'Annulée',
        'expired': 'Expirée',
        'system-cancelled': 'Annulée Système'
      };
      return statuses[status] || status.charAt(0).toUpperCase() + status.slice(1);
    }
  }
};
</script>

<style scoped>
.demand-card {
  transition: all 0.2s ease;
}

.demand-card:hover {
  
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
}
</style>

