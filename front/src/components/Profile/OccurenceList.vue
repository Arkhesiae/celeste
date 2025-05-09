<template>
  <v-card v-for="(occurrence, index) in occurrences" :key="occurrence._id" class="pa-1 my-1" flat
    :color="index === 0 ? 'background' : 'background'" :class="{
      'card-border-top': index === 0,
      'card-border-bottom': index === occurrences.length - 1
    }">

    <v-card-item :prepend-icon="occurrence.type === 'Renfort' ? 'mdi-handshake-outline' : 'mdi-account-switch-outline'">
      <div class="d-flex align-start justify-space-between">

        <div class="d-flex align-start flex-column">

          <v-card-title>Equipe {{ occurrence?.teamName }}</v-card-title>



          <v-card-subtitle v-if="occurrence.type === 'Renfort'">
            Du
            <v-chip variant="tonal" rounded="lg">{{ formattedOccurenceDate(occurrence.fromDate) }}</v-chip>
            au
            <v-chip rounded="lg">{{ formattedOccurenceDate(occurrence.toDate) }}</v-chip>
          </v-card-subtitle>
          <v-card-subtitle v-else>
            A partir du
            <span class="">{{ formattedOccurenceDate(occurrence.fromDate) }}</span>
          </v-card-subtitle>




        </div>
        <div>


          <!-- <v-chip
                          
                          class=""
                          color="onBackground"
                          size="small"
                          rounded="lg"
                        >
                          {{ "Dans 3 jours" }}
                        </v-chip> -->


        </div>
      </div>





      <template #append>
        <v-scroll-x-transition mode="out-in">
          <div v-if="activeCardId !== occurrence._id" key="not-active">
            <v-btn rounded="xl" variant="text" color="onBackground" icon
              @click.stop="handleDelete(occurrence._id)"><v-icon>mdi-delete-outline</v-icon></v-btn>

          </div>

          <div v-else key="not-subscribed" class="text-caption">
            <v-btn rounded="lg" prepend-icon="mdi-delete" color="error "
              @click.stop="handleDelete(occurrence._id)">CONFIRMER</v-btn>
          </div>
        </v-scroll-x-transition>

      </template>

    </v-card-item>
  </v-card>
</template>

<script setup>
import { ref, computed } from "vue";
import { useAuthStore } from "@/stores/authStore.js";
import { useTeamStore } from "@/stores/teamStore.js";

const props = defineProps({
  occurrences: {
    type: Array,
    required: true,
  },
});

const emit = defineEmits(['delete-occurrence']);

const activeCardId = ref(null);
const authStore = useAuthStore();
const teamStore = useTeamStore();
const userId = computed(() => authStore.userId);

const formattedOccurenceDate = computed(() => (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
});


const handleDelete = (occurrenceId) => {
  emit('delete-occurrence', occurrenceId);
};
</script>


<style scoped>
.card-border {
  border-radius: 18px !important;
}

.card-border-top {
  border-top-left-radius: 18px !important;
  border-top-right-radius: 18px !important;
}

.card-border-bottom {
  border-bottom-left-radius: 18px !important;
  border-bottom-right-radius: 18px !important;
}
</style>
