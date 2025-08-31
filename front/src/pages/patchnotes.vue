<template>
  <v-container :class="smAndDown ? 'mb-16' : ''">
    <!-- En-tête -->

        <MainTitle title="Patch Notes" subtitle="Historique des versions">
          <template #actions>
            <v-btn v-if="!smAndDown" height="48px"
              class="px-6 bg-surfaceContainerHighest text-remplacement highlight-shadow" flat
              style="border-radius: 16px !important" prepend-icon="mdi-github" @click="openGitHub">
              Voir sur GitHub
            </v-btn>
            <v-btn v-else size="small" height="32px"
              class="px-6 bg-surfaceContainerHighest text-remplacement highlight-shadow" flat
              style="border-radius: 16px !important" prepend-icon="mdi-github" @click="openGitHub">
              Voir sur GitHub
            </v-btn>
          </template>
        </MainTitle>

    <!-- Contenu principal -->
    <v-row>
      <!-- Navigation latérale ou sélecteur mobile -->
      <v-col cols="12" md="4" lg="3" >
        <!-- Desktop : navigation latérale -->
        <template v-if="!smAndDown">
          <EntitySelector :items="filteredVersions" itemKey="id" itemTitle="version" :itemSubtitle="'releaseDate'"
            :itemStatus="'status'" :modelValue="selectedVersion" title="Versions" maxHeight="70vh"
            @update:modelValue="selectVersion">
            <template #statusChip="{ item }">
              <v-chip v-if="item.status === 'future'" size="x-small" color="warning" variant="tonal" rounded="lg">
                Future
              </v-chip>
              <v-chip v-else-if="item.status === 'current'" size="x-small" color="onBackground" variant="flat"
                rounded="lg">
                Actuelle
              </v-chip>
              <v-chip v-else size="x-small" color="grey" variant="tonal" rounded="lg">
                Passée
              </v-chip>
            </template>
            <template #itemDetails="{ item }">
              <v-expand-transition>
                <div v-if="item.id === selectedVersion?.id">
                  <div class="d-flex align-center mb-1">
                    <v-icon icon="mdi-plus" size="16" color="success" class="mr-2" />
                    <span class="text-caption">{{ item.improvements?.length || 0 }} améliorations</span>
                  </div>
                  <div class="d-flex align-center">
                    <v-icon icon="mdi-bug" size="16" color="error" class="mr-2" />
                    <span class="text-caption">{{ item.bugFixes?.length || 0 }} corrections</span>
                  </div>
                </div>
              </v-expand-transition>
            </template>
          </EntitySelector>
        </template>
        <!-- Mobile : carte compacte + dialog -->
        <template v-else>
          <VersionSelector :modelValue="selectedVersion" :width="400"
            :title="selectedVersion?.version || 'Sélectionner une version'"
            :subtitle="selectedVersion?.releaseDate || ''"
            :defaultText="selectedVersion?.version || 'Sélectionner une version'">
            <template #statusChip>
              <v-chip v-if="selectedVersion?.status === 'future'" size="x-small" color="warning" variant="tonal"
                rounded="lg">
                Future
              </v-chip>
              <v-chip v-else-if="selectedVersion?.status === 'current'" size="x-small" color="onBackground"
                variant="flat" rounded="lg">
                Actuelle
              </v-chip>
            </template>
            <template #dialog>
              <EntitySelector :items="filteredVersions" itemKey="id" itemTitle="version" :itemSubtitle="'releaseDate'"
                :itemStatus="'status'" :modelValue="selectedVersion" title="Sélectionner une version" maxHeight="40vh"
                @update:modelValue="selectVersionFromDialog">
                <template #statusChip="{ item }">
                  <v-chip v-if="item.status === 'future'" size="x-small" color="warning" variant="tonal" rounded="lg">
                    Future
                  </v-chip>
                  <v-chip v-else-if="item.status === 'current'" size="x-small" color="onBackground" variant="flat"
                    rounded="lg">
                    Actuelle
                  </v-chip>
                  <v-chip v-else size="x-small" color="grey" variant="tonal" rounded="lg">
                    Passée
                  </v-chip>
                </template>
                <template #itemDetails="{ item }">
                  <v-expand-transition>
                    <div v-if="item.id === selectedVersion?.id">
                      <div class="d-flex align-center mb-1">
                        <v-icon icon="mdi-plus" size="16" color="success" class="mr-2" />
                        <span class="text-caption">{{ item.improvements?.length || 0 }} améliorations</span>
                      </div>
                      <div class="d-flex align-center">
                        <v-icon icon="mdi-bug" size="16" color="error" class="mr-2" />
                        <span class="text-caption">{{ item.bugFixes?.length || 0 }} corrections</span>
                      </div>
                    </div>
                  </v-expand-transition>
                </template>
              </EntitySelector>
            </template>
          </VersionSelector>
        </template>
      </v-col>

      <!-- Détails de la version -->
      <v-col cols="12" md="8" lg="9" >
        <v-card v-if="selectedVersion" :class="!smAndDown ? 'pl-16' : 'pl-2 pr-2'" rounded="xl" elevation="0" class="smooth-shadow pa-2 pt-16" color="transparent">
          <!-- En-tête de la version -->
          <div class="d-flex align-center justify-space-between mb-6">
            <div>
              <div class="d-flex align-center mb-2">
                <span class="text-h4 font-weight-bold">{{ selectedVersion.version }}</span>

              </div>
              <div class="text-medium-emphasis">
                Sortie le {{ selectedVersion.releaseDate }}
              </div>
            </div>
            <v-btn icon="mdi-share-variant" variant="tonal" rounded="lg" color="remplacement" @click="shareVersion" />
          </div>

          <!-- Description -->
          <div v-if="selectedVersion.description" class="mb-6">

            <p class="text-body-1 opacity-70">{{ selectedVersion.description }}</p>
          </div>

          <!-- Améliorations -->
          <div v-if="selectedVersion.improvements?.length > 0" class="mb-6">
            <div class="d-flex align-center mb-4">
              <v-icon icon="mdi-plus-circle" color="success" size="16" class="mr-3" />
              <h3 class="text-h6 font-weight-medium">Améliorations</h3>
            </div>
            <v-list class="bg-transparent">
              <v-list-item v-for="(improvement, index) in selectedVersion.improvements" :key="index"
                class="mb-2 rounded-lg improvement-item">
                <template v-slot:prepend>
                  <v-icon icon="mdi-plus" color="success" size="20" />
                </template>
                <v-list-item-title class="font-weight-medium">{{ improvement.title }}</v-list-item-title>
                <v-list-item-subtitle v-if="improvement.description" class="mt-1">
                  {{ improvement.description }}
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </div>

          <!-- Corrections de bugs -->
          <div v-if="selectedVersion.bugFixes?.length > 0" class="mb-6">
            <div class="d-flex align-center mb-4">
              <v-icon icon="mdi-bug-check" color="pendingDemand" size="16" class="mr-3" />
              <h3 class="text-h6 font-weight-medium">Corrections de bugs</h3>
            </div>
            <v-list class="bg-transparent">
              <v-list-item v-for="(bugFix, index) in selectedVersion.bugFixes" :key="index"
                class="mb-2 rounded-lg bugfix-item">
                <template v-slot:prepend>
                  <v-icon icon="mdi-bug" color="pendingDemand" size="20" />
                </template>
                <v-list-item-title class="font-weight-medium">{{ bugFix.title }}</v-list-item-title>
                <v-list-item-subtitle v-if="bugFix.description" class="mt-1">
                  {{ bugFix.description }}
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </div>

          <!-- Notes techniques -->
          <div v-if="selectedVersion.technicalNotes?.length > 0" class="mb-6">
            <div class="d-flex align-center mb-4">
              <v-icon icon="mdi-cog" color="info" size="16" class="mr-3" />
              <h3 class="text-h6 font-weight-medium">Notes techniques</h3>
            </div>
            <v-list class="bg-transparent">
              <v-list-item v-for="(note, index) in selectedVersion.technicalNotes" :key="index"
                class="mb-2 rounded-lg technical-note-item">
                <template v-slot:prepend>
                  <v-icon icon="mdi-information" color="info" size="20" />
                </template>
                <v-list-item-title class="font-weight-medium">{{ note.title }}</v-list-item-title>
                <v-list-item-subtitle v-if="note.description" class="mt-1">
                  {{ note.description }}
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </div>

          <!-- Liens -->
          <div v-if="selectedVersion.links?.length > 0" class="mb-6">
            <h3 class="text-h6 font-weight-medium mb-3">Liens utiles</h3>
            <div class="d-flex flex-wrap gap-2">
              <v-btn v-for="link in selectedVersion.links" :key="link.url" :href="link.url" target="_blank"
                variant="tonal" color="remplacement" prepend-icon="mdi-open-in-new">
                {{ link.label }}
              </v-btn>
            </div>
          </div>
        </v-card>

        <!-- État vide -->
        <v-card v-else rounded="xl" elevation="0" class="smooth-shadow pa-6" color="surfaceContainer">
          <div class="text-center">
            <v-icon icon="mdi-file-document-outline" size="64" color="medium-emphasis" class="mb-4" />
            <h3 class="text-h6 font-weight-medium mb-2">Sélectionnez une version</h3>
            <p class="text-medium-emphasis">
              Choisissez une version dans la liste pour voir ses détails
            </p>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useDisplay } from 'vuetify';
import { useSnackbarStore } from '@/stores/snackbarStore';
import { usePatchnotesStore } from '@/stores/patchnotesStore';
import VersionSelector from '@/components/common/Selector/VersionSelector.vue';
import EntitySelector from '@/components/common/Selector/EntitySelector.vue';

const { smAndDown } = useDisplay();
const snackbarStore = useSnackbarStore();
const patchnotesStore = usePatchnotesStore();

// État réactif
const showBetaInfo = ref(true);
const selectedFilter = ref('all');
const selectedVersion = ref(null);
const versionList = ref(null);
const dialogOpen = ref(false); // Pour le dialog mobile

function parseReleaseDate(dateStr) {
  // Si c'est déjà un format ISO ou reconnu, ça marche directement
  


  // Sinon, on tente le format dd/mm/yyyy
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dateStr);

  if (match) {
    const [, day, month, year] = match;
    return new Date(`${year}-${month}-${day}T00:00:00`);
  }
  // Si tout échoue, retourne une date invalide
  return new Date(NaN);
}

function getStatus(versions) {
  const today = new Date();
  // Trie les versions par date décroissante
  const sorted = [...versions].sort((a, b) => parseReleaseDate(b.releaseDate) - parseReleaseDate(a.releaseDate));
  return sorted.map((v, idx) => {
    const releaseDate = parseReleaseDate(v.releaseDate);
    console.log(releaseDate, today);
    if (releaseDate >= today) {
      return { ...v, status: 'future' };
    }
    if (idx === 0) {
      // La plus récente déjà sortie
      return { ...v, status: 'current' };
    }
    return { ...v, status: 'stable' };
  });
}

// Remplace l’accès direct à patchnotesStore.allVersions par une version enrichie
const computedVersions = computed(() => getStatus(patchnotesStore.allVersions));

// Utilise computedVersions dans filteredVersions
const filteredVersions = computed(() => {
  if (selectedFilter.value === 'all') {
    return computedVersions.value;
  } else {
    return computedVersions.value.filter(v => v.status === selectedFilter.value);
  }
});

// Méthodes
const selectVersion = (version) => {
  selectedVersion.value = version;

  // Scroll vers le haut sur mobile
  if (smAndDown.value) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};
const selectVersionFromDialog = (version) => {
  selectedVersion.value = version;
  dialogOpen.value = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const getStatusColor = (status) => {
  switch (status) {
    case 'future': return 'warning';
    case 'current': return 'green';
    default: return 'info';
  }
};

const getStatusLabel = (status) => {
  switch (status) {
    case 'future': return 'Future';
    case 'current': return 'Actuelle';
    default: return 'Stable';
  }
};

const openGitHub = () => {
  window.open('https://github.com/your-repo/releases', '_blank');
};

const shareVersion = () => {
  if (navigator.share && selectedVersion.value) {
    navigator.share({
      title: `Patch Notes ${selectedVersion.value.version}`,
      text: `Découvrez les nouveautés de la version ${selectedVersion.value.version}`,
      url: window.location.href
    });
  } else {
    // Fallback pour les navigateurs qui ne supportent pas l'API Share
    navigator.clipboard.writeText(window.location.href);
    snackbarStore.showMessage('Lien copié dans le presse-papiers', 'success');
  }
};

// Lifecycle
onMounted(() => {
  // Sélectionner automatiquement la version actuelle
  const currentVersion = patchnotesStore.currentVersion;
  if (currentVersion) {
    selectedVersion.value = currentVersion;
  }
});
</script>

<style>
:root {
  --green-color: 100, 150, 100;
}

.version-list {
  max-height: 70vh;
  overflow-y: auto;
}

.version-item {
  border: 1px solid transparent;
  transition: all 0.2s ease-in-out;
}

.version-hover:hover {
  background-color: rgba(var(--v-theme-remplacement), 0.05);
  border-color: rgba(var(--v-theme-remplacement), 0.1);
}

.selected-version {
  background-color: rgba(var(--v-theme-remplacement), 0.1);
  border-color: rgba(var(--v-theme-remplacement), 0.3);
}

.future-version {
  border-left: 3px solid rgb(var(--v-theme-warning));
}

.current-version {
  border-left: 3px solid rgb(var(--green-color));
}

.improvement-item {
  background-color: rgba(var(--green-color), 0.05);
  border-left: 3px solid rgb(var(--green-color));
}

.bugfix-item {
  background-color: rgba(var(--v-theme-pendingDemand), 0.05);
  border-left: 3px solid rgb(var(--v-theme-pendingDemand));
}

.technical-note-item {
  background-color: rgba(var(--v-theme-info), 0.05);
  border-left: 3px solid rgb(var(--v-theme-info));
}

.cursor-pointer {
  cursor: pointer;
}

.transition-all {
  transition: all 0.2s ease-in-out;
}

/* Scrollbar personnalisée */
.version-list::-webkit-scrollbar {
  width: 6px;
}

.version-list::-webkit-scrollbar-track {
  background: rgba(var(--v-theme-on-surface), 0.05);
  border-radius: 3px;
}

.version-list::-webkit-scrollbar-thumb {
  background: rgba(var(--v-theme-remplacement), 0.3);
  border-radius: 3px;
}

.version-list::-webkit-scrollbar-thumb:hover {
  background: rgba(var(--v-theme-remplacement), 0.5);
}

/* Responsive */
@media (max-width: 960px) {
  .version-list {
    max-height: 50vh;
  }
}
</style>