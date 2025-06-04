<template>
  <v-card
    class="demand-card mb-2"
    
    color="background"
   variant="flat"
    rounded="xl"
  >
    <v-card-item>
      

      <v-card-title class="text-subtitle-1 font-weight-medium">
        <div class="d-flex align-start ">
          <v-card-title class="pb-0 mb-0">
            <h2 class="text-h4 font-weight-medium">{{ demand?.posterShift?.name }}</h2>
          </v-card-title>
          <div class="d-flex align-start flex-column justify-space-between ml-2">
            <v-card-subtitle class="py-0">
              {{ demand?.posterShift?.startTime }} - {{ demand?.posterShift?.endTime }}
            </v-card-subtitle>
            <v-card-subtitle class="py-0 text-caption">Dans équipe {{ getTeamName }}</v-card-subtitle>

          </div>
        </div>
      </v-card-title>

      <v-card-subtitle class="text-caption">
        {{(demand?.posterShift?.date) }}
      </v-card-subtitle>

      <template v-slot:append>
        <v-chip
          :color="demand?.type === 'replacement' ? 'remplacement' : 'permutation'"
          variant="tonal"
          size="small"
          class="text-caption"
        >
          {{ demand?.posterShift?.shift?.name }}
        </v-chip>
      </template>
    </v-card-item>


       

      

      <div style="position :absolute ; top : 16px ; right : 16px" class="d-flex align-center">
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
        @click="$emit('accept', demand)"
      >
        Annuler
      </v-btn>
 

  </v-card>
</template>

<script setup>
defineProps({
  demand: {
    type: Object,
    required: true
  }
});

defineEmits(['accept', 'decline']);


</script>

<style scoped>
.demand-card {
  transition: transform 0.2s ease-in-out;
}


</style> 