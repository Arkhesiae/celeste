<script setup>
import { ref, computed } from 'vue';
import { useDisplay } from 'vuetify';
import DayDetail from '../DayDetail.vue';

const props = defineProps({
  days: {
    type: Array,
    required: true
  },
  isExpanded: {
    type: Boolean,
    required: true
  },
  variants: {
    type: Array,
    default: () => ['A', 'B', 'C']
  }
});

const emit = defineEmits(['onDeleteDay', 'onUpdateDay', 'onEditDay']);

const { smAndDown, mdAndDown } = useDisplay();
const showDetailsDialog = ref(false);
const selectedDay = ref(null);
const selectedDayIndex = ref(null);

const openDetails = (day, index) => {
  selectedDay.value = day;
  selectedDayIndex.value = index;
  showDetailsDialog.value = true;
};

const handleDelete = () => {
  emit('onDeleteDay', selectedDayIndex.value);
  showDetailsDialog.value = false;
};

const handleEdit = () => {
  emit('onEditDay', selectedDay.value);
  showDetailsDialog.value = false;
};



const handleUpdate = (updatedDay) => {
  console.log(updatedDay);
  emit('onUpdateDay', selectedDayIndex.value, updatedDay);
  showDetailsDialog.value = false;
};
</script>

<template>
  <div class="workshift-summary" >
    <v-expand-transition>
      <div v-if="isExpanded" :style="smAndDown ? '' : 'max-height: 400px; overflow-y: auto;  overflow-x: hidden '">
        <v-row  class="px-2 py-0">
          <v-col
            v-for="(day, index) in days"
            :key="index"
          cols="12"
            class=" my-0 mx-0 pa-1"
          >
            <v-card
              height="64px" 
              class="day-card pa-0 d-flex "
              color="background"
              flat
              @click="openDetails(day, index)"
            >
              <v-card-item class="my-0 flex-grow-1 py-0 align-center d-flex justify-space-between" >
                <div class="d-flex align-center">
                <div class="d-flex flex-column justify-center align-start ">
                  <div class="text-subtitle-1 font-weight-medium">{{ day.name }}</div>
                  <v-card-subtitle v-if="day.type !== 'rest'">{{ day.startTime || '--:--' }} - {{ day.endTime || '--:--' }}</v-card-subtitle>
                </div>
                <v-chip 
                        color="secondary"
                        variant="flat"
                        rounded="xl"
                        class="ml-2"
                        size="small"
                        v-if="day.variants?.length > 0" v-for="(variant) in day.variants"
                      >
                        {{ variant.name }}
                      </v-chip>
              </div>

                <template #append>
                    <v-chip
                      :color="day.type === 'rest' ? 'secondary' : 'primary'"
                      size="small"
                      rounded="lg"
                    variant="elevated"
                  >
                    {{ day.type === 'rest' ? 'Repos' : 'Travail' }}
                  </v-chip> </template>
        
              </v-card-item>
            </v-card>
          </v-col>
        </v-row>
      </div>
    </v-expand-transition>

    <!-- Desktop Dialog -->
    <v-dialog
      v-if="!smAndDown"
      v-model="showDetailsDialog"
      max-width="400"
    >
      <DayDetail
        rounded="xl"
        :day="selectedDay"
        :is-mobile="smAndDown"
        :deletable="true"
        :variants="variants"
        @close="showDetailsDialog = false"
        @onDelete="handleDelete"
        @onEdit="handleEdit"
        @onUpdate="handleUpdate"
      />
    </v-dialog>

    <!-- Mobile Bottom Sheet -->
    <v-bottom-sheet
      v-if="smAndDown"
      v-model="showDetailsDialog"
    >
      <DayDetail
        :is-mobile="smAndDown"
        :day="selectedDay"
        :deletable="true"
        :variants="variants"
        @close="showDetailsDialog = false"
        @onDelete="handleDelete"
        @onEdit="handleEdit"
        @onUpdate="handleUpdate"
      />
    </v-bottom-sheet>
  </div>
</template>

<style scoped>
.day-card {
  cursor: pointer;
  transition: transform 0.2s;
}

.day-card:hover {
  transform: translateY(-2px);
}
</style> 