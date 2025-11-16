<script setup>
import { computed, onMounted } from 'vue';
import { useTeamStore } from '@/stores/teamStore';
import { useSubstitutionStore } from '@/stores/substitutionStore';
import { useAuthStore } from '@/stores/authStore';
import { useUserStore } from '@/stores/userStore';

const userStore = useUserStore();
const teamStore = useTeamStore();
const substitutionStore = useSubstitutionStore();
const authStore = useAuthStore();
const props = defineProps({
  date : { type: Date, required: true },
  text: { type: String },

});

const type = ref('');



const findAcceptedAsAccepter = computed(() => {
  return substitutionStore.findAcceptedAsAccepter(props.date.toISOString());
});

const teamName = computed(() => {
  return teamStore.centerTeams.find(team => team._id === findAcceptedAsAccepter.value.posterShift.teamId)?.name;
});

const shiftType = computed(() => {
  return findAcceptedAsAccepter.value?.type;
});

const userName = computed(() => {
  return userStore.users.find(user => user._id === findAcceptedAsAccepter.value?.posterId)?.name + ' ' + userStore.users.find(user => user._id === findAcceptedAsAccepter.value?.posterId)?.lastName;
});


</script>

<template>

    <v-chip
 
      rounded="lg"
      color="background"
      variant="flat"
      size="x-small"
      style=" opacity: 1; transform: scale(1) ; border-color: rgba(var(--v-theme-remplacement), 0.4);"
      class="text-caption font-weight-bold px-2 overflow-visible"
    >
    <div class="mr-2">
      <v-icon color="error"  v-if="findAcceptedAsAccepter.length > 1">mdi-alert-circle-outline</v-icon>
      <v-icon color="remplacement"  >mdi-crowd</v-icon>
    
    </div>
    
      <div v-if="findAcceptedAsAccepter" > 

        <span v-if="findAcceptedAsAccepter.type === 'substitution'">Remplace dans l'équipe {{teamName}}</span> 
        <span v-if="findAcceptedAsAccepter.type === 'hybrid' && !findAcceptedAsAccepter.accepterShift">Remplace dans l'équipe {{teamName}}</span> 
        <span v-if="findAcceptedAsAccepter.type === 'switch' || (findAcceptedAsAccepter.type === 'hybrid' && findAcceptedAsAccepter.accepterShift)">Permute avec {{ userName }}</span>
        


      </div>
      <div  v-else>
       
        <span >?</span>
      </div>
    </v-chip>

</template>
