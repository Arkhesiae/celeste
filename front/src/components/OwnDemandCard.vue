<template>
  <v-card
    class="demand-card mb-2"
     
    color="surfaceContainerLow"
   variant="flat"

  >
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
     
      <div class=" pa-0">
        <div  class="d-flex align-center mt-1 ga-2">
            <div v-if="isPoster && getAccepter" class="d-flex align-center mt-1">
              <v-avatar :image="getAccepter?.avatar ? `${API_URL}${getAccepter.avatar}` : 'https://cdn.vuetifyjs.com/images/john-smirk.png'" size="24" class="mr-2" />
              <span class="text-caption font-weight-medium">Par {{ getAccepter?.name }} {{ getAccepter?.lastName }}</span>
            </div>  
            <div v-if="!isPoster && getPoster" class="d-flex align-center mt-1">
              <v-avatar :image="getPoster?.avatar ? `${API_URL}${getPoster.avatar}` : 'https://cdn.vuetifyjs.com/images/john-smirk.png'" size="24" class="mr-2" />
              <span class="text-caption font-weight-medium">De {{ getPoster?.name }} {{ getPoster?.lastName }}</span>
            </div>  




            <v-card-subtitle class="text-caption d-flex align-center mt-1">  
              {{ formatDate(demand?.posterShift?.date) }}
            </v-card-subtitle>
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

        <v-chip color="onBackground" variant="flat" size="small" rounded="lg"
          prepend-icon="mdi-unicorn-variant" class="font-weight-bold">
          {{ demand?.points }}
        
        </v-chip>
        <!-- <v-icon color="onBackground" class="ml-1"
        icon="mdi-information-outline" size="x-small"></v-icon> -->
        </div>
        <v-chip v-if="demand?.comment" 
          color="onBackground" 
          variant="flat" 
          size="small" 
          rounded="lg"
          class="mr-2 font-weight-bold"
          @click="showCommentDialog = true"
          style="cursor: pointer">
          <v-icon color="background" 
            icon="mdi-comment-text-outline"></v-icon>
        </v-chip>
     
        <v-chip v-if="demand?.type === 'switch'" color="permutation" variant="flat" size="small" rounded="lg"
          prepend-icon="mdi-swap-horizontal">
          Permutation
        </v-chip>
        <v-chip v-if="demand?.type === 'hybrid'" class="hybrid-chip" color="remplacement" variant="flat" size="small"
          rounded="lg" prepend-icon="mdi-account-arrow-left"> <v-icon color="background" class="ml-n1"
            icon="mdi-swap-horizontal"></v-icon>
          Hybride
        </v-chip>
        <v-chip v-if="demand?.type === 'substitution'" color="remplacement" variant="flat" size="small" rounded="lg"
          prepend-icon="mdi-account-arrow-left-outline">
          Remplacement
        </v-chip>
      </div>


      <v-btn 
       class="position-absolute bottom-0 right-0 ma-2"
        variant="text"
        color="error"
        size="small"
        @click="cancelDemand"
      >
        Annuler
      </v-btn>
 

  </v-card>

  <!-- Dialog pour afficher le commentaire -->
  <v-dialog v-model="showCommentDialog" max-width="500px" >
    <v-card class="pa-6" rounded="xl">
      <v-card-title class="text-h6 pa-0" >
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
</template>

<script setup>
import { useSubstitutionStore } from '@/stores/substitutionStore';
import { computed, ref } from 'vue';
import { useTeamStore } from '@/stores/teamStore';
import { useUserStore } from '@/stores/userStore';
import { API_URL } from '@/config/api';
const teamStore = useTeamStore();

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
  try {
    console.log(props.demand);
    if (props.isPoster) {
      await substitutionStore.cancelDemand(props.demand._id);
    } else {
      await substitutionStore.unacceptDemand(props.demand._id);
    }
  } catch (error) {
    console.error('Erreur lors de la suppression de la demande:', error);
  }
};

const showCommentDialog = ref(false);

defineEmits(['accept', 'decline']);


</script>

<style scoped>
.demand-card {
  border-radius: 16px !important;
  transition: transform 0.2s ease-in-out;
}

.hybrid-chip {
  background: linear-gradient(to right, rgba(var(--v-theme-permutation), 1), rgba(var(--v-theme-remplacement), 1) 50%);
}

</style> 