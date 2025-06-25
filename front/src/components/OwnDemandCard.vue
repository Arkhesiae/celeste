<template>
  <div>

    <v-card class="demand-card" :class="{
      'pending-demand-card': demand?.status === 'open' && isPoster,
      'accepted-demand-card': demand?.status === 'accepted' && isPoster,
      'to-do-demand-card': demand?.status === 'accepted' && !isPoster
    }" variant="flat" @click="toggleExpand">
      <v-card-item>


        <v-card-title class="text-subtitle-1 font-weight-medium">
          <div class="d-flex align-start ">
            <v-card-title class="pb-0 mb-0">
              <h2 class="text-h4 font-weight-medium">{{ demand?.posterShift?.name }}</h2>
            </v-card-title>
            <div class="d-flex align-start flex-column justify-space-between ml-2 ">
              <v-card-subtitle class="py-0">
                {{ demand?.posterShift?.startTime }} - {{ demand?.posterShift?.endTime }}
              </v-card-subtitle>
              <v-card-subtitle class="py-0 text-caption">Dans équipe {{ getTeamName }}</v-card-subtitle>

            </div>
          </div>
        </v-card-title>

        <div class=" pa-0 d-flex align-center justify-space-between">




          <v-card-subtitle class="text-caption d-flex align-center mt-1">
            {{ formatDate(demand?.posterShift?.date) }}
          </v-card-subtitle>
          <div>
            <div class="d-flex align-center justify-start " v-if="isPoster && getAccepter || !isPoster && getPoster">
            
              <div v-if="isPoster && getAccepter" class="d-flex align-center ">
                <v-avatar size="24" variant="tonal" class="me-2">
                <v-img v-if="getAccepter?.avatar" :src="`${API_URL}${getAccepter?.avatar}`" alt="Avatar" />
                <v-icon size="x-small" v-else>mdi-account</v-icon>
              </v-avatar>
                <span class="text-caption font-weight-medium"> {{ getAccepter?.name }} {{
                  getAccepter?.lastName
                  }}</span>

              </div>
              <div v-if="!isPoster && getPoster" class="d-flex align-center">
                <v-avatar size="24" variant="tonal" class="me-2">
                  <v-img v-if="getPoster?.avatar" :src="`${API_URL}${getPoster?.avatar}`" alt="Avatar" />
                  <v-icon size="x-small" v-else>mdi-account</v-icon>
                </v-avatar>
                <span class="text-caption font-weight-medium"> {{ getPoster?.name }} {{ getPoster?.lastName }}</span>
              </div>

            </div>
          </div>


        </div>

        <!-- <template v-slot:append>
        <v-chip
          :color="demand?.type === 'replacement' ? 'remplacement' : 'permutation'"
          variant="tonal"
          size="small"
          class="text-caption"
        >
          {{ demand?.posterShift?.shift?.name }}
        </v-chip>
      </template> -->
      </v-card-item>






      <div style="position :absolute ; top : 16px ; right : 16px" class="d-flex align-center">
        <div class="d-flex align-center mr-2">

          <v-chip variant="flat" size="small" rounded="lg" 
            class="font-weight-bold point-chip" @click.stop="showPointsDialog = true">
            <LogoCopy color="onBackground" style="top:-2px; position: relative;" />
            <span v-if="demand?.type === 'switch' && demand?.acceptedSwitches.length > 1">

            </span>
            <span v-else>
              {{ demand?.points }}
            </span>
            <v-icon v-if="demand?.acceptedSwitches.length > 0" icon="mdi-tune-variant"></v-icon>

          </v-chip>
          <!-- <v-icon color="onBackground" class="ml-1"
        icon="mdi-information-outline" size="x-small"></v-icon> -->
        </div>
        <v-chip v-if="demand?.comment" variant="flat" size="small" rounded="lg"
          class="mr-2 font-weight-bold comment-chip" @click.stop="showCommentDialog = true" style="cursor: pointer">
          <v-icon icon="mdi-comment-text-outline"></v-icon>
        </v-chip>

        <v-chip v-if="demand?.type === 'switch'" class="type-chip " color="permutation" variant="flat" size="small"
          rounded="lg">
          <v-icon class="" style="top: 1px; font-size: 16px;" icon="mdi-swap-horizontal"></v-icon>
          <span v-if="!small">Permutation</span>
        </v-chip>
        <v-chip v-if="demand?.type === 'hybrid'" class="hybrid-chip type-chip " color="remplacement" variant="flat"
          size="small" rounded="lg">
          <v-icon class="ml-n1" icon="mdi-account-arrow-left-outline "></v-icon>
          <v-icon class="ml-n2" style="top: 1px; font-size: 16px;" icon="mdi-swap-horizontal"></v-icon>
          <span v-if="!small">Hybride</span>
        </v-chip>
        <v-chip v-if="demand?.type === 'substitution'" class="type-chip" color="remplacement" variant="flat"
          size="small" rounded="lg">
          <v-icon class="" icon="mdi-account-arrow-left-outline "></v-icon>
          <span v-if="!small">Remplacement</span>
        </v-chip>
      </div>





    </v-card>

    <v-expand-transition>
      <div v-if="expanded" class="d-flex justify-end mt-2">
        <v-btn class="cancel-button" variant="flat" size="small" @click.stop="cancelDemand" color="onBackground"
          style="color: rgba(var(--v-theme-onError), 0.99) !important;">
          Annuler
        </v-btn>
      </div>
    </v-expand-transition>
  </div>


  <!-- Dialog pour afficher les points -->
  <v-dialog v-model="showPointsDialog" max-width="500px">
    <v-card class="pa-6" rounded="xl">
      <v-card-title class="text-h6 pa-0 mb-2">
        Points de {{ demand?.posterShift?.name }}
      </v-card-title>
      <v-card-text class="pa-0">
        <v-chip v-for="switchDay in demand?.acceptedSwitches" :key="switchDay" color="permutation" variant="flat"
          size="small" rounded="lg" class="mr-2">
          <v-icon class="mr-1" icon="mdi-swap-horizontal"></v-icon>
          <span class="font-weight-bold mr-2">{{  getDayName(switchDay.shift) }}</span>
          <LogoCopy color="onBackground" style="top:-2px; position: relative;" />
          <span class="font-weight-bold">{{ switchDay.points }}</span>
        </v-chip>
        <v-chip v-if="demand?.points > 0 && demand?.type !== 'switch'" color="remplacement" variant="flat" size="small"
          rounded="lg" class="mr-2">
          <v-icon class="mr-1" icon="mdi-account-arrow-left-outline"></v-icon>
          <span>{{  }}</span>
          <LogoCopy color="background" style="top:-2px; position: relative;" />
          <span class="font-weight-bold">{{ demand?.points }}</span>
        </v-chip>


      </v-card-text>
    </v-card>
  </v-dialog>


  <!-- Dialog pour afficher le commentaire -->
  <v-dialog v-model="showCommentDialog" max-width="500px">
    <v-card class="pa-6" rounded="xl">
      <v-card-title class="text-h6 pa-0">
        Commentaire de {{ demand?.posterShift?.name }}
      </v-card-title>
      <v-card-text class="pa-0">
        {{ demand?.comment }}
      </v-card-text>
      <v-card-actions class="pa-0">
        <v-spacer></v-spacer>
        <v-btn color="primary" variant="text" @click="showCommentDialog = false">
          Fermer
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Dialog de confirmation de suppression -->
  <v-dialog v-model="showConfirmDeleteDialog" max-width="400px">
    <v-card class="pa-6" rounded="xl">
      <v-card-title class="text-h6 pa-0 mb-4">
        Confirmer la suppression
      </v-card-title>
      <v-card-text class="pa-0 mb-4">
        Êtes-vous sûr de vouloir {{ isPoster ? 'annuler' : 'refuser' }} cette demande ?
        Cette action ne peut pas être annulée.
      </v-card-text>
      <v-card-actions class="pa-0">
        <v-spacer></v-spacer>
        <v-btn color="onBackground" variant="text" @click="showConfirmDeleteDialog = false">
          Annuler
        </v-btn>
        <v-btn color="error" variant="flat" @click="confirmDelete">
          Confirmer
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { useSubstitutionStore } from '@/stores/substitutionStore';
import { computed, ref } from 'vue';
import { useTeamStore } from '@/stores/teamStore';
import { useUserStore } from '@/stores/userStore';
import { API_URL } from '@/config/api';
import { useRotationStore } from '@/stores/rotationStore';
const teamStore = useTeamStore();
const rotationStore = useRotationStore();
const userStore = useUserStore();
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

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const getTeamName = computed(() => {
  return teamStore.centerTeams.find(team => team._id === props.demand.posterShift.teamId)?.name;
});

const getAccepter = computed(() => {
  if (!props.demand?.accepterId) return null;
  return userStore.users.find(user => user._id === props.demand.accepterId);
});

const getPoster = computed(() => {
  if (!props.demand?.posterId) return null;
  return userStore.users.find(user => user._id === props.demand.posterId);
});

const cancelDemand = async () => {
  showConfirmDeleteDialog.value = true;
};

const confirmDelete = async () => {
  try {
    if (props.isPoster) {
      await substitutionStore.cancelDemand(props.demand._id);
    } else {
      await substitutionStore.unacceptDemand(props.demand._id);
    }
    showConfirmDeleteDialog.value = false;
  } catch (error) {
    console.error('Erreur lors de la suppression de la demande:', error);
  }
};

const showPointsDialog = ref(false);
const showCommentDialog = ref(false);
const showConfirmDeleteDialog = ref(false);
const expanded = ref(false);

defineEmits(['accept', 'decline']);

// Ajout du gestionnaire de clic pour la carte
const toggleExpand = () => {
  expanded.value = !expanded.value;
};

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

</script>

<style scoped>
.demand-card {
  box-sizing: border-box;
  border-radius: 16px !important;
  transition: transform 0.2s ease-in-out;
}

.pending-demand-card {
  border: 1px dashed rgba(255, 196, 134, 0.157) !important;
  background: rgba(var(--v-theme-pendingDemand), 0.99) !important;
  color: rgba(var(--v-theme-onPendingDemand), 0.99) !important;
}

.accepted-demand-card {
  border: 1px solid rgba(111, 185, 141, 0.0000057) !important;
  background: rgba(var(--v-theme-acceptedDemand), 0.99) !important;
  color: rgba(var(--v-theme-onAcceptedDemand), 0.99) !important;
}

.to-do-demand-card {
  background-color: rgba(var(--v-theme-remplacement), 0.20) !important;
  color: rgba(var(--v-theme-remplacement), 1) !important;
}


.hybrid-chip {
  background: linear-gradient(to right, rgba(var(--v-theme-permutation), 1), rgba(var(--v-theme-remplacement), 1) 50%);
}

.accepted-demand-card .point-chip {
  background: rgba(var(--v-theme-background), 0.99) !important;
  color: rgba(var(--v-theme-onBackground), 0.99) !important;
}

.pending-demand-card .point-chip {
  background: rgba(var(--v-theme-background), 0.99) !important;
  color: rgba(var(--v-theme-onBackground), 0.99) !important;
}

.to-do-demand-card .point-chip {
  background: rgba(var(--v-theme-background), 0.99) !important;
  color: rgba(var(--v-theme-onBackground), 0.99) !important;
}

.accepted-demand-card .type-chip {
  background: rgba(var(--v-theme-background), 0.99) !important;
  color: rgba(var(--v-theme-acceptedDemand), 0.99) !important;
}

.pending-demand-card .type-chip {
  background: rgba(var(--v-theme-background), 0.99) !important;
  color: rgba(var(--v-theme-pendingDemand), 0.99) !important;
}

.to-do-demand-card .type-chip {
  color: rgba(var(--v-theme-background), 0.99) !important;
}

.pending-demand-card .comment-chip {
  background: rgba(var(--v-theme-background), 0.99) !important;
  color: rgba(var(--v-theme-onBackground), 0.99) !important;

}

.accepted-demand-card .comment-chip {
  background: rgba(var(--v-theme-background), 0.99) !important;
  color: rgba(var(--v-theme-onBackground), 0.99) !important;
}

.to-do-demand-card .comment-chip {
  background: rgba(var(--v-theme-background), 0.99) !important;
  color: rgba(var(--v-theme-remplacement), 0.99) !important;
}

.unicorn-logo .path1 {
  fill: rgb(var(--v-theme-onBackground)) !important;
}
.unicorn-logo .path2 {
  fill: rgb(var(--v-theme-onBackground)) !important;
}


</style>