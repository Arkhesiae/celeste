<template>

   
 
  <div class="d-flex align-center ga-1" >
    <v-icon  v-if="prependIcon" size="small" class="">mdi-chevron-down</v-icon>
    <span :style=" 'color :' + getStatusColor(status) + ' !important'" class="text-subtitle-2 id font-weight-medium">{{ getStatusLabel(status) }}</span>
  </div>

</template>

<script setup>
import { ref } from 'vue';


const props = defineProps({
  ticketId: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true
  },
  size: {
    type: String,
    default: 'small'
  },
  prependIcon: {
    type: Boolean,
    default: true
  }
});




const emit = defineEmits(['status-updated']);


const getStatusColor = (status) => {
  switch (status) {
    case 'new':
      return 'rgba(var(--v-theme-new),1)';
    case 'in_progress':
      return 'rgba(var(--v-theme-pending),1)';
    case 'done':
      return 'rgba(var(--v-theme-done),1)';
    case 'closed':
      return 'rgba(100,100,100,1)';
    default:
      return 'rgba(100,100,100,1)';
  }
};

const getStatusLabel = (status) => {
  switch (status) {
    case 'new':
      return 'A traiter';
    case 'in_progress':
      return 'En cours';
    case 'done':
      return 'Traité';
    case 'closed':
      return 'Fermé';
  
  }
};


</script>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}
</style>
