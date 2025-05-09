<template>
  <v-card
    :class="['expandable-selector', { 'expanded': isExpanded }]"
    rounded="xl"
    width="200px"
    class="pa-4 position-absolute"
    elevation="0"

  >


      <v-row class="d-flex pa-1 align-center"  @click="toggleExpand" >
        <!-- Selected value column -->

        <v-col class="pa-2" link>
          <v-card color="primary" variant="tonal" link>
            <v-card-title class="text-body-1"> <span>{{ selectedValue }}</span></v-card-title>
          </v-card>
        </v-col>

        <!-- Chevron icon, aligned to the right -->
        <v-col class="d-flex justify-end">
          <v-btn icon size="sm" variant="outlined" class="text-medium-emphasis">
            <v-icon :class="{'rotate-180': isExpanded}" size="24px">mdi-menu-down</v-icon>
          </v-btn>
        </v-col>
      </v-row>

    <!-- Expandable section -->
    <v-expand-transition>
      <div class="pa-1" v-show="isExpanded" >
        <v-divider class="pb-2"></v-divider>

        <v-row
          v-for="choice in filteredChoices"

          :key="choice"
          @click.stop="selectValue(choice)"
        >
          <v-col class="d-flex pa-2" >
            <v-card color="primary" variant="tonal" link >
              <v-card-title class="text-body-1"> <span>aeaeaaazeaeaa{{ choice }}</span></v-card-title>
            </v-card>

          </v-col>
        </v-row>
      </div>

    </v-expand-transition>
  </v-card>
</template>

<script setup>
import { ref, computed } from 'vue';

// State variables
const isExpanded = ref(false);
const selectedValue = ref('Select an option');
const choices = ref(['Option 1', 'Option 2', 'Option 3', 'Option 4']);

// Methods
const toggleExpand = () => {
  isExpanded.value = !isExpanded.value;
};

const filteredChoices = computed(() => {
  return choices.value.filter(choice => choice !== selectedValue.value);
});

const selectValue = (choice) => {
  selectedValue.value = choice;
  isExpanded.value = false; // Collapse after selection
};
</script>

<style scoped>


.circled {
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.35);
}

.rotate-180 {
  transform: rotate(180deg);
}
</style>
