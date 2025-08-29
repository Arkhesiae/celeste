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
const updatedDay = ref(null);

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

const variantKey = (day) => {
  if (day.variants && day.variants.length > 0) {
    return 'variants';
  } else if (day.variations && day.variations.length > 0) {
    return 'variations';
  }

};

const handleUpdate = (updatedDay) => {
  updatedDay.value = updatedDay;
  emit('onUpdateDay', selectedDayIndex.value, updatedDay.value);
  showDetailsDialog.value = false;
};

const updateDay = (day) => {
  updatedDay.value = day;
  emit('update:day', day);
};
</script>

<template>
  <div class="workshift-summary" >
    <v-expand-transition>
      <div v-if="isExpanded" :style="smAndDown ? '' : 'max-height: 400px; overflow-y: auto;  overflow-x: hidden '" class="hide-scrollbar">
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
                  <div class="d-flex align-center ga-3">
                  <div class="text-subtitle-1 font-weight-medium">{{ day.name }}</div>
                  <v-chip
                    v-if="day.optional"
                      color="surfaceContainer"
                      size="x-small"
                     variant="flat"
                      rounded="lg"
                      flat
                  >
                  <div class="d-flex align-center ga-2">
                    <span class="text-caption text-onSurface">Option</span>
                    <v-icon  size="small" icon="mdi-plus-box-outline" class="text-onSurface"></v-icon>
                  </div>
                   
                  </v-chip>
                  </div>
                  <v-card-subtitle v-if="day.type !== 'rest'">{{ day?.default?.startTime ? day.default.startTime : day.startTime || '--:--' }} - {{ day?.default?.endTime ? day.default.endTime : day.endTime || '--:--' }}<span v-if="day?.default?.endsNextDay || day?.endsNextDay" class="ml-1 0"
                    style="font-size: 10px; opacity: 0.8; top: -2px; position: relative;">+1</span>
</v-card-subtitle>
                </div>
               
              </div>

                <template #append>
                  <div class="ml-2 ga-1 d-flex align-start">
                  <v-chip 
                        color="secondary"
                        variant="flat"
                        rounded="xl"
                        class=""
                        size="x-small"
                        v-if="day[variantKey(day)]?.length > 0" v-for="(variant) in day[variantKey(day)]"
                      >
                        <span class="text-caption">{{ day.name + ' ' + variant.name }}</span>
                      </v-chip>
                      </div>
                    <v-chip
                    v-if="day.type === 'rest'"
                      :color="day.type === 'rest' ? 'secondary' : 'primary'"
                      size="x-small"
                      rounded="lg"
                    variant="elevated"
                  >
                    <v-icon v-if="day.type === 'rest'" size="small" icon="mdi-sleep"></v-icon>
                   
                  </v-chip>
                  </template>
        
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
      style="z-index: 3150 !important;"
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
      style="z-index: 3150 !important;"
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