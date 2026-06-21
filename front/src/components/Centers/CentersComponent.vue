<template>
  <v-container>
    <MainTitle title="Liste des centres" subtitle="Gérer et organiser les centres">
      <template #actions>
        <v-btn color="onBackground" height="48px" style="border-radius: 16px !important" class="px-4 add-center-btn"
          prepend-icon="mdi-plus" @click="openAddCenterDialog">
          Ajouter un centre
        </v-btn>
      </template>
    </MainTitle>

    <v-row class="justify-space-between align-center mb-4">
      <v-col cols="12" md="6">
        <v-chip-group v-model="selectedFilter" column variant="flat" color="onBackground">
          <v-chip variant="text" rounded="lg" value="all">
            Tous
          </v-chip>
          <v-chip variant="text" rounded="lg" value="Approche">
            Approches
          </v-chip>
          <v-chip variant="text" rounded="lg" value="CRNA">
            CRNAs
          </v-chip>
          <v-chip variant="text" rounded="lg" value="Autre">
            Autres
          </v-chip>
        </v-chip-group>
      </v-col>

      <v-col cols="12" md="6" class="d-flex justify-end gap-2">
        <v-text-field v-model="searchQuery" label="Rechercher" variant="solo" flat rounded="xl" single-line hide-details
          density="compact" class="search-field" style="max-width: 300px" clearable />
        <v-menu color="onBackground" rounded="lg">
          <template #activator="{ props }">
            <v-btn color="primary" variant="text" rounded="lg" v-bind="props">
              <span class="text-label-medium">{{ sortBy ? sortBy : 'Trier par' }}</span>
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
        <v-progress-circular v-if="centerStore.loading" indeterminate color="primary" class="d-flex justify-center" />
      </v-col>
      <v-col v-for="center in filteredAndSortedCenters" :key="center._id" cols="12" md="6" lg="4" height="100%">
        <v-card class="pa-0 ma-0" rounded="xl" variant="flat" height="100%" @click="navigateToTeams(center._id)">
          <v-card-item class="pa-0 ma-0 pr-2 pl-4 mt-2 d-flex justify-space-between align-start">
            <v-card-title>
              <span class="text-title-large">{{ center.name }}</span>
            </v-card-title>
            <v-card-subtitle>
              <span class="text-body-large">{{ center.OACI }}</span>
            </v-card-subtitle>
            <template #append>
              <v-menu color="onBackground" rounded="lg">
                <template #activator="{ props }">
                  <v-btn icon variant="text" v-bind="props" @click.stop>
                    <v-icon>mdi-dots-vertical</v-icon>
                  </v-btn>
                </template>
                <v-list color="onBackground" bg-color="onBackground" rounded="xl" class="pa-4">
                  <v-list-item rounded="lg" @click.stop="removeCenter(center._id)">
                    <v-list-item-title class="text-onError">
                      Supprimer le centre
                    </v-list-item-title>
                  </v-list-item>
                  <v-list-item rounded="lg" @click.stop="">
                    <v-list-item-title>Modifier le tour de service</v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-menu>
            </template>
          </v-card-item>
          <v-card-subtitle>
            <v-row>
              <v-col>
                <strong>Admins:</strong>
                <v-chip v-for="admin in adminsByCenter[center._id]" :key="admin._id" class="ml-1" color="onBackground"
                  size="small" rounded="lg">
                  {{ admin.name }} {{ admin.lastName }}
                </v-chip>
              </v-col>
              <v-col>
                <strong>Membres:</strong> {{ usersCountByCenter[center._id] }}
              </v-col>
            </v-row>
          </v-card-subtitle>
          <v-card-text>
            <strong>Tour de service actif:</strong>
            <v-chip v-if="activeRotationOfCenter(center._id)" color="onBackground" size="small" rounded="lg"
              class="ml-1">
              {{ activeRotationOfCenter(center._id).name }}
            </v-chip>
            <span v-else class="text-medium-emphasis">Aucun tour de service actif</span>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>


    <BaseDialog icon="mdi-airport" v-model="addDialog" title="Ajouter un centre" >
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
              v => !centers.some(c => c.name.toLowerCase() === v.toLowerCase()) || 'Un centre avec ce nom existe déjà'
            ]"
            required
          />

          <v-text-field
            v-model="oaciModel"
            variant="underlined"
            :rules="[
              v => !!v || 'L\'indicateur OACI est requis',
              v => v.length <= 4 || 'Maximum 4 caractères',
              v => /^[A-Z0-9]*$/.test(v) || 'Uniquement lettres majuscules et chiffres',
              v => !centers.some(c => c.OACI?.toLowerCase() === v.toLowerCase()) || 'Un centre avec ce code OACI existe déjà'
            ]"
            counter="4"
            maxlength="4"
            label="Indicateur OACI"
            required
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

          <v-text-field
            v-model.number="newCenter.numberOfTeams"
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
      </v-form>

      <template #actions>
        <v-btn variant="text" color="primary" @click="addDialog = false">
          Annuler
        </v-btn>
        <v-spacer />
        <v-btn variant="text" color="primary" :disabled="!isFormValid" @click="saveCenter">
          Enregistrer
        </v-btn>
      </template>
    </BaseDialog>
  </v-container>
</template>

<script setup>
import { useCenterStore } from "@/stores/centerStore.js";
import { useRouter } from 'vue-router';
import { useSnackbarStore } from "@/stores/snackbarStore.js";

const router = useRouter();
const centerStore = useCenterStore();
const snackbarStore = useSnackbarStore();

const centers = computed(() => centerStore.centers);
const adminsByCenter = computed(() => centerStore.adminsByCenter);
const usersCountByCenter = computed(() => centerStore.usersCountByCenter);

const sortBy = ref('');
const selectedFilter = ref('all');
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
  { name: 'Approche', value: 'app' },
  { name: 'CRNA', value: 'crna' },
  { name: 'Autre', value: 'other' }
]);

const oaciModel = computed({
  get: () => newCenter.value.OACI,
  set: (val) => { newCenter.value.OACI = (val || '').toUpperCase(); }
});

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

  if (searchQuery.value) {
    const searchLower = searchQuery.value.toLowerCase();
    filtered = filtered.filter(center =>
      center.name.toLowerCase().includes(searchLower) ||
      center.admin?.name?.toLowerCase().includes(searchLower)
    );
  }

  return filtered.sort((a, b) => a.name.localeCompare(b.name));
});

const isFormValid = ref(false);
const form = ref(null);

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
  newCenter.value = { name: "", OACI: "", type: "", adminId: null, numberOfTeams: 12 };
  addDialog.value = true;
  form.value?.reset();
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
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.096), 0 0 0 1px rgba(255, 255, 255, 0.007), 0 4px 8px rgba(0, 0, 0, 0.048);
}
</style>