<template>
<v-dialog v-model="localDialogVisible" :fullscreen="smAndDown" max-width="900px" @update:model-value="handleDialogClose">
  <v-card rounded="xl" elevation="0" class="pa-6">
    <v-card-item prepend-icon="mdi-alert-outline" class="pa-0 ma-0">
      <v-card-title>
        Confirmation de changement
        <v-chip 
          rounded="xl"
          size="small" 
          color="primary" 
          variant="tonal" 
          class="ml-2 font-weight-bold"
        >
          {{ changeIndex + 1 }} / {{ totalChangesCount }}
        </v-chip>
      </v-card-title>
    </v-card-item>

    <v-card-text class="pa-0 my-4 ma-0">
      <span class="text-caption">Les changements suivants seront appliqués au tour de service. En conséquence, les vacations pendant cette période seront converties de la façon suivante :</span>
      
      <v-alert 
        v-if="pendingActivation.changes?.length > 1" 
        type="info" 
        variant="tonal" 
        class="my-3"
        density="compact"
      >
        <v-progress-linear 
          :model-value="(changeIndex / totalChangesCount) * 100" 
          color="primary"
          height="8"
          rounded
        />
        <div class="d-flex justify-space-between mt-2">
          <span class="text-caption">Approuvé: {{ changeIndex }} / {{ totalChangesCount }}</span>
          <span class="text-caption">Restants: {{ totalChangesCount - changeIndex }}</span>
        </div>
      </v-alert>

      <template v-if="currentChange">
        <v-card class="pa-4 my-8" rounded="xl" elevation="0" 
          color="surfaceContainer"
          
        >
          <div class="d-flex align-center ga-1">
            <span class="text-caption" v-if="currentChange.to">Du </span>
            <span class="text-caption" v-else>À partir du </span>
            <v-chip color="primary" variant="tonal" size="x-small" rounded="xl">
              {{ formatDate(currentChange.from) }}
            </v-chip>

            <span class="text-caption" v-if="currentChange.to">au </span>
            <v-chip v-if="currentChange.to" color="primary" variant="tonal" size="x-small" rounded="xl">
              {{ formatDate(currentChange.to) }}
            </v-chip>
          </div>

          <v-divider class="my-2" />
          <v-row>
            <v-col cols="12">
                <div class="d-flex align-center justify-center ga-1">
                  <v-chip color="onBackground" variant="tonal" size="x-small" rounded="xl">
                    {{ rotationName(currentChange.oldRule) }}
                  </v-chip>
                  <v-icon icon="mdi-arrow-right" size="x-small" color="primary" />
                  <v-chip color="onBackground" variant="tonal" size="x-small" rounded="xl">
                    {{ rotationName(currentChange.newRule) }}
                  </v-chip>
                
                </div>
                 
            </v-col>
         
            <v-col cols="12">   
              <v-card class="pa-4" rounded="xl" elevation="0" color="transparent">
            
                <div class="d-flex flex-wrap flex-column ga-1">
                <div v-for="daySlot in maxRotationDays(currentChange)" :key="daySlot">

                  <div class="d-flex align-center justify-center">  
                    <v-chip color="onBackground"  size="x-small" rounded="xl" :variant="daySlot <= rotationDays(currentChange.oldRule).length ? 'flat' : 'tonal'">
                    <template v-if="daySlot <= rotationDays(currentChange.oldRule).length">
                      {{ rotationDays(currentChange.oldRule)[(daySlot - 1) % rotationDays(currentChange.oldRule).length]?.name }}
                    </template>
                    <template v-else>
                      Empty
                    </template>
                  </v-chip>
                  <v-icon icon="mdi-arrow-right" size="12" color="onBackground" />
                  <v-chip color="onBackground"  size="x-small" rounded="xl" :variant="daySlot <= rotationDays(currentChange.newRule).length ? 'flat' : 'tonal'">
                    {{ rotationDays(currentChange.newRule)[(daySlot - 1) % rotationDays(currentChange.newRule).length]?.name }}
                  </v-chip>
                  </div>

                
                </div>
                </div>
              </v-card>     
            </v-col>
       
          </v-row>
          <v-chip v-if="differentLength(currentChange)" color="error" variant="tonal" class="" size="x-small" rounded="xl" >
                    Nombre de jours différent
                </v-chip>

                <div v-if="differentLength(currentChange)" class="d-flex align-center justify-center ga-2 my-2" style="font-size: 11px !important;  ">
                Lorsqu'un tour de service ne comporte pas le même nombre de jours que le précédent, les demandes de remplacement et permutations pendant la période concernée seront pas converties et seront annulées. De plus, il est possible que les équipes n'apparaissent pas avec les bonnes vacations. Ce cas de figure très rare est déconseillé, doit être évité si possible.
           </div>
           <div v-else class="d-flex align-center justify-center ga-2 my-2" style="font-size: 11px !important;  ">
            Les demandes de remplacement et permutations dans la période concernée seront également converties en conséquence selon le schéma ci-dessus
           </div>

           <div  class="d-flex align-center justify-center ga-2 my-2" style="font-size: 11px !important;  ">
            <v-chip v-if="currentChange.demandsToConvert?.length > 0" :color="differentLength(currentChange) ? 'error' : 'remplacement'" variant="tonal"  rounded="xl" >
              <div class="d-flex align-center ga-1 font-weight-bold">
                <v-icon :icon="differentLength(currentChange) ? 'mdi-alert-outline' : 'mdi-swap-horizontal'" size="small" :color="differentLength(currentChange) ? 'error' : 'remplacement'" />
                <span class="text-caption font-weight-bold">{{ currentChange.demandsToConvert.length }} demandes de remplacement et permutations seront {{ differentLength(currentChange) ? 'annulées' : 'converties' }}</span>
              </div>
            </v-chip>
            <v-chip v-else color="surfaceContainerHigh" variant="flat"  rounded="xl" >
              <div class="d-flex align-center ga-1 font-weight-bold">
                <v-icon icon="mdi-swap-horizontal" size="small" color="onBackground" />
                <span class="text-caption font-weight-bold text-onBackground">Aucune demande concernée</span>
              </div>
            </v-chip>

            
          
           
           </div>
        </v-card>
      </template>

        <v-card class="pa-0 my-4" flat  elevation="0" color="transparent">
         
           <div class="d-flex align-center justify-center rounded-xl pa-4 " style="font-size: 12px !important;  background-color: rgba(var(--v-theme-remplacement), 0.1);">
            <span class="text-remplacement"> Des erreurs de compatibilités peuvent parfois apparaitre si les demandes ne sont pas compatibles avec le nouveau tour de service au regard de l'arrêté 2024, il est donc conseillé de vérifier les demandes après la confirmation</span>
           </div>
           
          
        </v-card>
    </v-card-text>

    <v-card-actions class="pa-0">
      <v-btn color="secondary" variant="outlined" @click="handleCancel">
        Annuler
      </v-btn>
      <v-spacer />

      <div class="d-flex align-center ga-2">
        <v-btn 
          v-if="changeIndex > 0"
          color="secondary" 
          variant="text" 
          @click="handlePreviousChange"
          size="small"
        >
          <v-icon start>mdi-chevron-left</v-icon>
          Précédent
        </v-btn>

        <v-btn 
          v-if="changeIndex < totalChangesCount - 1"
          color="primary" 
          variant="elevated" 
          @click="approveChange"
          :disabled="!currentChange"
        >
          Accepter
        </v-btn>


        <v-btn 
          v-if="changeIndex === totalChangesCount - 1"
          color="remplacement" 
          variant="tonal" 
          @click="handleConfirm"
        >
          <v-icon start>mdi-check</v-icon>
          Confirmer tous les changements
        </v-btn>
      </div>
    </v-card-actions>
  </v-card>
</v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import formatDate from '@/utils/formatDate';
import { useRotationStore } from '@/stores/rotationStore';
import { useDisplay } from 'vuetify';

const { smAndDown } = useDisplay();
const rotationStore = useRotationStore();

const emit = defineEmits(['update:dialogVisible', 'confirm', 'cancel']);

const props = defineProps({
  dialogVisible: {
    type: Boolean,
    required: true,
  },
  pendingActivation: {
    type: Object,
    required: true,
  },
});


const changeIndex = ref(0);

const localDialogVisible = computed({
  get: () => props.dialogVisible,
  set: (value) => emit("update:dialogVisible", value),
});

// Computed properties
const totalChangesCount = computed(() => props.pendingActivation?.changes?.length || 0);



const currentChange = computed(() => {
  if (!props.pendingActivation?.changes || props.pendingActivation.changes.length === 0) {
    return null;
  }
  return props.pendingActivation.changes[changeIndex.value];
});

const rotationName = (rotationId) => {
  const rotation = rotationStore.rotations.find(rotation => rotation._id === rotationId);
  return rotation?.name || '';
};

const rotationDays = (rotationId) => {
  const rotation = rotationStore.rotations.find(rotation => rotation._id === rotationId);
  return rotation?.days|| [];
};

const differentLength = (change) => {
  return rotationDays(change.oldRule).length !== rotationDays(change.newRule).length;
};

const maxRotationDays = (change) => {
  return Math.max(rotationDays(change.oldRule).length, rotationDays(change.newRule).length);
};


const approveChange = (changeId) => {
  changeIndex.value++;
};

const handleCancel = () => {
  changeIndex.value = 0;
  emit('cancel');
  localDialogVisible.value = false;
};

const handleConfirm = () => {
  console.log('handleConfirm', changeIndex.value, totalChangesCount.value);
  if (changeIndex.value === totalChangesCount.value - 1) {
    emit('confirm');
    localDialogVisible.value = false;
  }
};



const handlePreviousChange = () => {
  if (changeIndex.value > 0) {
    changeIndex.value--;
  }
};

const handleDialogClose = (value) => {
  if (!value) {
    changeIndex.value = 0;
  }
};

watch(() => props.pendingActivation?.changes, (changes) => {
  changeIndex.value = 0;

}, { immediate: true });

watch(() => props.dialogVisible, (visible) => {
  if (visible) {
    changeIndex.value = 0;

    
  
  }
});
</script>