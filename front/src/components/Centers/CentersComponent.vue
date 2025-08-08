<template>
  <v-container>

    <MainTitle title="Liste des centres" subtitle="Gérer et organiser les centres">

      <template #actions> 
        <v-btn @click="openAddCenterDialog" color="onBackground" height="48px" style="border-radius: 16px !important" class='px-4 add-center-btn' prepend-icon="mdi-plus">Ajouter un centre</v-btn>
      </template>

      </MainTitle>

    <v-row class="justify-space-between align-center mb-4">
      <v-col cols="12" md="6" >
        <v-chip-group v-model="selectedFilter" column variant="flat" color="onBackground"  >
          <v-chip variant="text" rounded="lg" value="all">Tous</v-chip>
          <v-chip variant="text"  rounded="lg" value="Approche">Approches</v-chip>
          <v-chip variant="text" rounded="lg" value="CRNA">CRNAs </v-chip>
          <v-chip variant="text" rounded="lg" value="Autre">Autres</v-chip>
        </v-chip-group>
      </v-col>
      
      <v-col cols="12" md="6" class="d-flex justify-end gap-2">
        <v-text-field
          v-model="searchQuery"
          label="Rechercher"
          variant="solo"
          flat
          rounded="xl"
          single-line
          hide-details
          density="compact"
          class="search-field"
          style="max-width: 300px"
          clearable
        />
        <v-menu color="onBackground" rounded="lg">
          <template v-slot:activator="{ props }">
            <v-btn color="primary" variant="text" rounded="lg" v-bind="props">
              <span class="text-overline">{{ sortBy ? sortBy : 'Trier par'}}</span>
              <v-icon>mdi-chevron-down</v-icon>
            </v-btn>
          </template>
          <v-list color="onBackground" bg-color="onBackground" rounded="xl" class="pa-4">
            <v-list-item rounded="lg" @click="sortBy = 'name'">
              <v-list-item-title>Nom</v-list-item-title>
            </v-list-item>
            <v-list-item rounded="lg" @click="sortBy = 'OACI'">
              <v-list-item-title>Indicateur OACI</v-list-item-title>
            </v-list-item>
            <v-list-item rounded="lg" @click="sortBy = 'usersCount'">
              <v-list-item-title>Nombre de membres</v-list-item-title>
            </v-list-item>
        
          </v-list>
        </v-menu>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" class="d-flex justify-space-between align-center">
        
     
        <v-progress-circular
          v-if="centerStore.loading"
          indeterminate
          color="primary"
          class="d-flex justify-center"
        />
      </v-col>
      <v-col v-for="center in filteredAndSortedCenters" :key="center._id" cols="12" md="6" lg="4" height="100%">
        <v-card class="px-2 ma-0" rounded="xl" variant="flat" @click="navigateToTeams(center._id)" height="100%">
          <v-card-item >
          <v-card-title>
            <span class="text-h6">{{ center.name }}</span>
          </v-card-title>
          <v-card-subtitle>
            <span class="text-h7">{{ center.OACI }}</span>
          </v-card-subtitle>
          <template #append> 
            <v-menu  color="onBackground" rounded="lg">
                <template v-slot:activator="{ props }">
                  <v-btn icon variant="text" v-bind="props" @click.stop>
                    <v-icon>mdi-dots-vertical</v-icon>
                  </v-btn>
                </template>
                <v-list color="onBackground" bg-color="onBackground" rounded="xl" class="pa-4">
                  <v-list-item rounded="lg" @click.stop="removeCenter(center._id)">
                    <v-list-item-title class="text-onError">Supprimer le centre</v-list-item-title>
                  </v-list-item>
                  <v-list-item rounded="lg" @click.stop="">
                    <v-list-item-title >Modifier le tour de service</v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-menu>
          </template>
          
          </v-card-item>
          <v-card-subtitle>
            <v-row>
              <v-col>
                <strong>Admins:</strong>
                <v-chip class="ml-1" v-for="admin in adminsByCenter[center._id]" :key="admin._id" color="onBackground" size="small" rounded="lg">{{ admin.name }}  {{ admin.lastName }}</v-chip>
              
              </v-col>
              <v-col>
                <strong>Membres:</strong> {{ usersCountByCenter[center._id] }}
              </v-col>
            </v-row>
          </v-card-subtitle>
          <v-card-text>
            <strong>Tour de service actif:</strong>
            <v-chip v-if="activeRotationOfCenter(center._id)" color="onBackground" size="small" rounded="lg" class="ml-1">
              {{ activeRotationOfCenter(center._id).name}}
            </v-chip>
            <span v-else class="text-medium-emphasis">Aucun tour de service actif</span>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="addDialog" max-width="500">
      <v-card rounded="xl" variant="flat" class="pa-6">
        <v-card-title class="pa-0">Ajouter un centre</v-card-title>
        <v-form ref="form" v-model="isFormValid" @submit.prevent="saveCenter">
          <v-card-text class="pa-0 my-6">
            <v-text-field 
              v-model="newCenter.name" 
              variant="outlined" 
              rounded="xl"
              label="Nom du centre" 
              :rules="[
                v => !!v || 'Le nom du centre est requis',
                v => v.length >= 2 || 'Le nom doit contenir au moins 2 caractères',
                v => v.length <= 50 || 'Le nom ne doit pas dépasser 50 caractères',
                () => !centerNameError.value || centerNameError.value
              ]"
              :error-messages="centerNameError"
              @blur="checkCenterNameExists(newCenter.name)"
              required 
            />
            <v-text-field 
              v-model="newCenter.OACI" 
              variant="underlined" 
              :rules="[
                v => !!v || 'L\'indicateur OACI est requis',
                v => v.length <= 4 || 'Maximum 4 caractères',
                v => /^[A-Z0-9]*$/.test(v) || 'Uniquement lettres majuscules et chiffres'
              ]"
              counter="4"
              maxlength="4"
              label="Indicateur OACI" 
              required 
              @blur="checkICAONameExists(newCenter.OACI)"
              :error-messages="ICAONameError"
              @input="newCenter.OACI = $event.target.value.toUpperCase()"
            />
            <v-select
              v-model="newCenter.type"
              :items="centerTypes"
              item-title="name"
              item-value="value"
              label="Type de centre"
              variant="underlined"
              :rules="[v => !!v || 'Le type de centre est requis']"
              required
            />
            <v-select
              rounded="xl"
              v-model="newCenter.adminId"
              :items="users"
              item-text="name"
              item-value="_id"
              label="Assigner un admin"
        
              return-object
              dense
              required
            />
            <v-text-field 
              v-model="newCenter.numberOfTeams" 
              variant="underlined" 
              type="number"
              :rules="[
                v => !!v || 'Le nombre d\'équipes est requis',
                v => v > 0 || 'Le nombre d\'équipes doit être supérieur à 0',
                v => v <= 50 || 'Le nombre d\'équipes ne doit pas dépasser 50'
              ]"
              label="Nombre d'équipes" 
              required 
            />
          </v-card-text>
          <v-card-actions class="pa-0 ">
      
            <v-btn text color="primary" @click="addDialog = false">Annuler</v-btn>
            <v-spacer></v-spacer>
            <v-btn 
              text 
              color="primary" 
              type="submit"
              :disabled="!isFormValid"
            >Enregistrer</v-btn>
          </v-card-actions>
        </v-form>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from "@/stores/authStore.js";
import { useCenterStore } from "@/stores/centerStore.js";
import { useRouter } from 'vue-router';
import { useSnackbarStore } from "@/stores/snackbarStore.js";

const authStore = useAuthStore();
const router = useRouter();
const centerStore = useCenterStore();
const snackbarStore = useSnackbarStore();

const centers = computed(() => centerStore.centers);
const adminsByCenter = computed(() => centerStore.adminsByCenter);
const usersCountByCenter = computed(() => centerStore.usersCountByCenter);

const isAdmin = computed(() => authStore.isAdmin);
const sortBy = ref('');
const sortDirection = ref('asc');

const selectedFilter = ref('all');

const users = ref([]);
const searchQuery = ref('');
const addDialog = ref(false);
const newCenter = ref({
  name: "",
  OACI: "",
  type: "",
  adminId: null,
  numberOfTeams: 12,
});
const centerTypes = ref([
  {
    name: 'Approche',
    value: 'app'
  },
  {
    name: 'CRNA',
    value: 'crna'
  },
  {
    name: 'Autre',
    value: 'other'
  }
])
const centerNameError = ref('');
const ICAONameError = ref('');

const activeRotationOfCenter = computed(() => (centerId) => centerStore.activeRotationsByCenter[centerId]);

const filteredAndSortedCenters = computed(() => {
  let filtered = centers.value;

  if (selectedFilter.value === 'Approche') {
    filtered = filtered.filter((center) => center.type === 'app');
  } else if (selectedFilter.value === 'CRNA') {
    filtered = filtered.filter((center) => center.type === 'crna');
  } else if (selectedFilter.value === 'Autre') {
    filtered = filtered.filter((center) => center.type === 'other');
  }

  
  // Filtrage par recherche
  if (searchQuery.value) {
    const searchLower = searchQuery.value.toLowerCase();
    filtered = filtered.filter(center => 
      center.name.toLowerCase().includes(searchLower) ||
      center.admin?.name?.toLowerCase().includes(searchLower)
    );
  }
  
  // Tri par nom
  return filtered.sort((a, b) => a.name.localeCompare(b.name));
});

const isFormValid = ref(false);
const form = ref(null);

const checkCenterNameExists = async (name) => {
  if (!name) return;
  const exists = centers.value.some(center => 
    center.name.toLowerCase() === name.toLowerCase()
  );
  if (exists) {
    centerNameError.value = 'Un centre avec ce nom existe déjà';
    isFormValid.value = false;
  } else {
    centerNameError.value = '';
  }
};

const checkICAONameExists = async (OACI) => {
  if (!OACI) return;
  const exists = centers.value.some(center => 
    center.OACI?.toLowerCase() === OACI.toLowerCase()
  );
  if (exists) {
    ICAONameError.value = 'Un centre avec ce code OACI existe déjà';
    isFormValid.value = false;
  } else {
    ICAONameError.value = '';
  }
};

const saveCenter = async () => {
  const { valid } = await form.value.validate();
  if (!valid) return;

  try {
    await centerStore.createCenter(newCenter.value);
    await centerStore.fetchCenters();
    addDialog.value = false;
    newCenter.value = { name: "", OACI: "", type: "", adminId: null, numberOfTeams: 12 };
    form.value.reset();
  } catch (error) {
    snackbarStore.showNotification(error.message, 'onError', 'mdi-alert-circle');
    console.error('Erreur lors de la sauvegarde du centre:', error);
  }
};

const removeCenter = async (centerId) => {
  try {
    await centerStore.deleteCenter(centerId);
    await centerStore.fetchCenters();
    snackbarStore.showNotification('Centre supprimé', 'onSuccess', 'mdi-check-circle');
  } catch (error) {
    snackbarStore.showNotification(error.message, 'onError', 'mdi-alert-circle');
    console.error('Erreur lors de la suppression du centre:', error);
  }
};

const openAddCenterDialog = () => {
  newCenter.value = { name: "", adminId: null };
  addDialog.value = true;
  if (form.value) {
    form.value.reset();
  }
};

const navigateToTeams = (centerId) => {
  router.push({ path: `/center/${centerId}/teams` });
};

onMounted(async () => {
  try {
    await Promise.all([
      centerStore.fetchCenters(),
      centerStore.fetchUsersCountByCenter(),
      centerStore.fetchAdminsByCenter(),
      centerStore.fetchActiveRotations()
    ]);
    snackbarStore.showNotification('Données chargées', 'onPrimary', 'mdi-check');
  } catch (error) {
    snackbarStore.showNotification('Erreur lors du chargement des données', 'onError', 'mdi-alert-circle');
  }

});

</script>

<style scoped>
.v-card {
  transition: transform 0.2s;
}

.add-center-btn {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.096), 0 0 0 1px rgba(255, 255, 255, 0.007), 0 4px 8px rgba(0, 0, 0, 0.048) ;
}


</style>
