<template>
  <v-container>
    <div class="my-16 d-flex justify-space-between align-center">
      <div class="d-flex flex-column">
        <div class="d-flex align-center gap-2">
          <v-btn
            v-if="authStore.adminType === 'master'"
            icon
            variant="text"
            @click="router.push('/center/centers')"
            class="back-btn mr-2"
          >
            <v-icon>mdi-arrow-left</v-icon>
          </v-btn>
          <span class="text-h4 font-weight-medium">{{centerName}}</span>
        </div>
        <span class="text-h4 text-overline text-medium-emphasis">Liste des équipes et leurs membres</span>
      </div>
      <v-btn @click="openAddTeamDialog" color="onBackground" style="border-radius: 16px !important" height="48px"  class="px-4   add-team-btn" prepend-icon="mdi-plus">Ajouter une équipe</v-btn>
    </div>

    <v-row class="justify-space-between align-center mb-4">
      <v-col cols="12" md="6">
        <v-chip-group v-model="selectedFilter" column variant="flat" color="onBackground">
          <v-chip variant="text" rounded="lg" value="all">Toutes</v-chip>
          <v-chip variant="text" color="tertiary" rounded="lg" value="active">Actives</v-chip>
          <v-chip variant="text" rounded="lg" value="inactive">Inactives</v-chip>
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
        <v-btn
          v-if="isAdmin"
          color="primary"
          variant="text"
          rounded="lg"
          @click="openReorderDialog"
          prepend-icon="mdi-sort"
        >
          <span class="text-overline">Réorganiser</span>
        </v-btn>
      </v-col>
    </v-row>

    <v-row>
      <span v-if="filteredAndSortedTeams.length === 0">Aucune équipe trouvée</span>
      <v-col v-for="team in filteredAndSortedTeams" :key="team._id" cols="12" md="6" lg="4">
        <TeamCard
          :team="team"
          :is-admin="isAdmin"
          :members-count="teamMembers(team._id).length + teamRenforts(team._id).length"
          :renforts-count="teamRenforts(team._id).length"
          :next-cycle-date="getNextCycleDate(team)"
          @edit-team-name="openEditTeamNameDialog"
          @edit-cycle="openDatePickerDialog"
          @add-member="openAddMemberDialog"
          @remove-team="removeTeam"
          @view-members="openMembersPanel"
        />
      </v-col>
    </v-row>

    <!-- Dialog pour ajouter une équipe -->
    <v-dialog v-model="addTeamDialog" max-width="500">
      <v-card rounded="xl" class="pa-6">
        <v-card-title class="pa-0">Ajouter une équipe</v-card-title>
        <v-card-text class="pa-0 mt-4">
          <v-text-field
            v-model="newTeamName"
            label="Nom de l'équipe"
            variant="outlined"
            flat
            rounded="xl"
            required
          />
        </v-card-text>
        <v-card-actions class="pa-0">
          <v-btn text color="primary" @click="addTeamDialog = false">Annuler</v-btn>
          <v-btn text color="primary" @click="addNewTeam">Enregistrer</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog pour le sélecteur de date -->
    <v-dialog v-model="datePickerDialog" max-width="380" persistent>
      <v-card rounded="xl" class="pa-6">
        <v-card-title>Définir le début de cycle</v-card-title>
        <v-card-text class="pa-0">
          <v-date-picker
            elevation="0"
            flat
            rounded="xl"
            v-model="selectedDate"
            locale="fr"
          />
        </v-card-text>
        <v-card-actions>
          <v-btn text @click="closeDatePickerDialog">Annuler</v-btn>
          <v-btn text color="primary" @click="setCycleStartDate">Définir</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog pour ajouter un membre -->
    <v-dialog v-model="addMemberDialog" max-width="500">
      <v-card>
        <v-card-title>Ajouter un membre</v-card-title>
        <v-card-text>
          <v-select
            v-model="selectedUser"
            :items="availableUsers"
            item-title="name"
            item-value="_id"
            label="Sélectionner un utilisateur"
            return-object
            dense
          />
        </v-card-text>
        <v-card-actions>
          <v-btn text @click="addMemberDialog = false">Annuler</v-btn>
          <v-btn text color="primary" @click="addUserToTeam">Ajouter</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog pour modifier le nom de l'équipe -->
    <v-dialog v-model="editTeamNameDialog" max-width="360">
      <v-card rounded="xl" class="pa-6">
        <v-card-title class="pa-0">Modifier le nom de l'équipe</v-card-title>
        <v-card-text class="pa-0 my-6">
          <v-text-field
            variant="underlined"
            flat
            rounded="xl"
            v-model="editedTeamName"
            label="Nom de l'équipe"
            required
          />
        </v-card-text>
        <v-card-actions class="pa-0">
          <v-btn text @click="editTeamNameDialog = false">Annuler</v-btn>
          <v-btn text color="primary" @click="renameTeam">Enregistrer</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog pour réorganiser les équipes -->
    <v-dialog v-model="reorderDialog" max-width="800" persistent>
      <v-card rounded="xl" class="pa-6">
        <v-card-title class="d-flex justify-space-between align-center pa-0">
          <span>Réorganiser les équipes</span>
          <v-btn icon @click="closeReorderDialog" variant="text">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text>
          <div class="text-body-2 text-medium-emphasis mb-4">
            Glissez-déposez les équipes pour modifier leur ordre. L'ordre sera sauvegardé automatiquement.
          </div>
          <VueDraggable
            v-model="orderedTeams"
            :animation="150"
            ghostClass="ghost"
            target=".sort-target"
            class="flex flex-col gap-2 pr-4 w-300px bg-gray-500/5 rounded"
          >
            <TransitionGroup
              type="transition"
              tag="div"
              name="fade"
              class="sort-target"
            >
              <div v-for="item in orderedTeams" :key="item._id" class="cursor-move my-4 rounded-lg pa-2" style="background-color: rgba(var(--v-theme-background), 1)">
                <v-icon>mdi-drag</v-icon>
                {{ item.name }}
              </div>
            </TransitionGroup>
          </VueDraggable>
        </v-card-text>
        <v-card-actions class="pa-0">
          <v-btn
            color="primary"
            variant="text"
            @click="closeReorderDialog"
          >
            Fermer
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Panneau latéral pour les membres -->
    <v-navigation-drawer
      v-model="membersPanel"
      location="right"
      order="-6"
      style="z-index: 3000;"
      width="400"
      floating
      temporary
      v-if="!smAndDown"
    >
      <v-card-title class="d-flex justify-space-between align-center pa-4">
        <span class="text-h6">Equipe {{ selectedTeamForMembers?.name }}</span>
        <v-btn variant="text" icon @click="membersPanel = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-card-text>
        <TeamMembersList
          :members="teamMembers(selectedTeamForMembers?._id)"
          :renforts="teamRenforts(selectedTeamForMembers?._id)"
        />
      </v-card-text>
    </v-navigation-drawer>

    <!-- Feuille du bas pour les membres -->
    <v-bottom-sheet
      v-model="membersPanel"
      v-if="smAndDown"
    >
      <v-card rounded="0">
        <v-card-title class="d-flex justify-space-between align-center pa-4">
          <span class="text-h6">Membres de l'équipe {{ selectedTeamForMembers?.name }}</span>
          <v-btn variant="text" icon @click="membersPanel = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text>
          <TeamMembersList
            :members="teamMembers(selectedTeamForMembers?._id)"
            :renforts="teamRenforts(selectedTeamForMembers?._id)"
          />
        </v-card-text>
      </v-card>
    </v-bottom-sheet>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useTeamStore } from '@/stores/teamStore';
import { useUserStore } from '@/stores/userStore';
import { useRouter, useRoute } from 'vue-router';
import { useSnackbarStore } from '@/stores/snackbarStore';
import { VueDraggable } from 'vue-draggable-plus'
import { useRotationStore } from '@/stores/rotationStore';
import { useCenterStore } from '@/stores/centerStore';
import { useDisplay } from 'vuetify';
import { useAuthStore } from '@/stores/authStore';


const teamStore = useTeamStore();
const userStore = useUserStore();
const router = useRouter();
const route = useRoute();
const snackbarStore = useSnackbarStore();
const rotationStore = useRotationStore();
const centerStore = useCenterStore();
const authStore = useAuthStore();
const isAdmin = computed(() => authStore.isAdmin);
const centerId = route.params.centerId;
const teams = computed(() => teamStore.centerTeams);
const usersGroupedByTeam = computed(() => userStore.usersGroupedByTeam);
const users = computed(() => userStore.users);
const { smAndDown } = useDisplay();

// Ajout de la computed property pour le nom du centre
const centerName = computed(() => {
  const center = centerStore.centers.find(c => c._id === centerId);
  return center ? center.name : centerId;
});

// États
const selectedFilter = ref('all');
const searchQuery = ref('');
const sortBy = ref('order');
const sortDirection = ref('asc');
const addTeamDialog = ref(false);
const datePickerDialog = ref(false);
const addMemberDialog = ref(false);
const newTeamName = ref('');
const selectedDate = ref(new Date());
const selectedTeam = ref(null);
const selectedUser = ref(null);
const minDate = new Date().toISOString().split('T')[0];
const editTeamNameDialog = ref(false);
const editedTeamName = ref('');
const selectedTeamForEdit = ref(null);
const orderedTeams = ref([]);
const reorderDialog = ref(false);
const membersPanel = ref(false);
const selectedTeamForMembers = ref(null);

// Computed properties
const filteredAndSortedTeams = computed(() => {
  let filtered = teams.value;

  if (selectedFilter.value === 'active') {
    filtered = filtered.filter(team => team.isActive);
  } else if (selectedFilter.value === 'inactive') {
    filtered = filtered.filter(team => !team.isActive);
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(team => 
      team.name.toLowerCase().includes(query)
    );
  }

  if (sortBy.value === 'order') {
    return filtered.sort((a, b) => a.order - b.order);
  }

  return filtered.sort((a, b) => {
    let comparison = 0;
    if (sortBy.value === 'members') {
      comparison = teamMembers(a._id).length - teamMembers(b._id).length;
    } else if (sortBy.value === 'cycleStartDate') {
      comparison = new Date(a.cycleStartDate || 0) - new Date(b.cycleStartDate || 0);
    } else {
      comparison = String(a[sortBy.value]).localeCompare(String(b[sortBy.value]));
    }
    return sortDirection.value === 'asc' ? comparison : -comparison;
  });
});

const availableUsers = computed(() => {
  return users.value.filter(user => 
    !selectedTeam.value?.members?.includes(user._id)
  );
});

const teamMembers = computed(() => (teamId) => {
  return usersGroupedByTeam.value.find(team => team.teamId === teamId)?.users || [];
});

const teamRenforts = computed(() => (teamId) => {
  return usersGroupedByTeam.value.find(team => team.teamId === teamId)?.renforts || [];
});

const openAddTeamDialog = () => {
  newTeamName.value = '';
  addTeamDialog.value = true;
};

const addNewTeam = async () => {
  if (!newTeamName.value) return;
  
  try {
    await teamStore.addTeam(centerId, newTeamName.value);
    snackbarStore.showNotification('Equipe ajoutée avec succès', 'onPrimary', "mdi-check");
    addTeamDialog.value = false;
    newTeamName.value = '';
  } catch (error) {
    console.error('Erreur lors de l\'ajout de l\'équipe:', error);
    snackbarStore.showNotification('Erreur lors de l\'ajout de l\'équipe : ' + error.message, 'onError');
  }
};

const removeTeam = async (teamId) => {
  if (!confirm('Êtes-vous sûr de vouloir supprimer cette équipe ?')) return;
  
  try {
    await teamStore.deleteTeam(teamId);
    snackbarStore.showNotification('Équipe supprimée avec succès', 'primary');
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'équipe:', error);
    snackbarStore.showNotification('Erreur lors de la suppression de l\'équipe : ' + error.message, 'onError');
  }
};

const openDatePickerDialog = (team) => {
  selectedTeam.value = team;
  selectedDate.value = team.cycleStartDate ? new Date(team.cycleStartDate) : new Date();
  datePickerDialog.value = true;
};

const closeDatePickerDialog = () => {
  datePickerDialog.value = false;
  selectedTeam.value = null;
};

const setCycleStartDate = async () => {
  if (!selectedTeam.value) return;
  
  try {
    // Créer une nouvelle date à partir de la date sélectionnée
    const date = new Date(selectedDate.value);
    // Convertir en UTC en gardant la même date
    const utcDate = new Date(Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      0, 0, 0, 0
    ));

    await teamStore.updateTeamCycleStartDate(selectedTeam.value._id, utcDate.toISOString());
    snackbarStore.showNotification('Date de cycle mise à jour avec succès', 'onPrimary', "mdi-check");
    datePickerDialog.value = false;
  } catch (error) {
    snackbarStore.showNotification('Erreur lors de la mise à jour de la date de cycle : ' + error.message, 'onError', "mdi-alert-circle-outline");
  }
};

const openAddMemberDialog = (team) => {
  selectedTeam.value = team;
  selectedUser.value = null;
  addMemberDialog.value = true;
};

const addUserToTeam = async () => {
  if (!selectedTeam.value || !selectedUser.value) return;
  
  try {
    await teamStore.assignUserToTeam(selectedUser.value._id, selectedTeam.value._id);
    snackbarStore.showNotification('Membre ajouté avec succès', 'success');
    addMemberDialog.value = false;
  } catch (error) {
    console.error('Erreur lors de l\'ajout du membre:', error);
    snackbarStore.showNotification('Erreur lors de l\'ajout du membre', 'onError');
  }
};

const openEditTeamNameDialog = (team) => {
  selectedTeamForEdit.value = team;
  editedTeamName.value = team.name;
  editTeamNameDialog.value = true;
};

const renameTeam = async () => {
  if (!selectedTeamForEdit.value || !editedTeamName.value) return;
  
  try {
    await teamStore.renameTeam(selectedTeamForEdit.value._id, editedTeamName.value);
    snackbarStore.showNotification('Nom de l\'équipe mis à jour avec succès', 'onPrimary', "mdi-check");
    editTeamNameDialog.value = false;
  } catch (error) {
    console.error('Erreur lors de la mise à jour du nom de l\'équipe:', error);
    snackbarStore.showNotification('Erreur lors de la mise à jour du nom de l\'équipe : ' + error.message, 'onError');
  }
};

const onDragEnd = async () => {
  try {
    // Mettre à jour l'ordre des équipes dans le store
    await teamStore.updateTeamsOrder(orderedTeams.value.map(team => team._id));
    snackbarStore.showNotification('Ordre des équipes mis à jour avec succès', 'onPrimary', "mdi-check");
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'ordre des équipes:', error);
    snackbarStore.showNotification('Erreur lors de la mise à jour de l\'ordre des équipes', 'onError');
  }
};

const openReorderDialog = () => {
  orderedTeams.value = [...teams.value];
  reorderDialog.value = true;
};

const closeReorderDialog = async () => {
  await onDragEnd();
  reorderDialog.value = false;
};

// Fonction pour calculer la prochaine date de cycle
const getNextCycleDate = (team) => {
  if (!team.cycleStartDate) return 'Non défini';
  
  const activeRotation = centerStore.activeRotationsByCenter[centerId];
  if (!activeRotation) return null;
  
  const cycleStartDate = new Date(team.cycleStartDate);
  const now = new Date();
  const rotationDays = activeRotation.days?.length;

  
  // Calculer combien de cycles complets se sont écoulés depuis la date de début
  const daysSinceStart = Math.floor((now - cycleStartDate) / (1000 * 60 * 60 * 24));
  const completedCycles = Math.floor(daysSinceStart / rotationDays);
  
  // Calculer la date du prochain cycle
  const nextCycleDate = new Date(cycleStartDate);
  nextCycleDate.setDate(cycleStartDate.getDate() + (completedCycles + 1) * rotationDays);
  
  return nextCycleDate.toLocaleDateString();
};

const openMembersPanel = (team) => {
  selectedTeamForMembers.value = team;
  membersPanel.value = true;
};

onMounted(async () => {
  try {
    await Promise.all([
      teamStore.fetchCenterTeams(centerId),
      userStore.fetchUsersAndGroupByTeam(centerId),
      centerStore.fetchActiveRotationOfCenter(centerId),
      centerStore.fetchCenters(),
    ]);
    orderedTeams.value = teams.value;
  } catch (error) {
    console.error('Erreur lors du chargement des données:', error);
    snackbarStore.showNotification('Erreur lors du chargement des données', 'onError');
  }
});
</script>

<style scoped>
.v-card {
  transition: transform 0.2s;
}

.add-team-btn {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.096), 0 0 0 1px rgba(255, 255, 255, 0.007), 0 4px 8px rgba(0, 0, 0, 0.048);
}

.gap-1 {
  gap: 4px;
}

.gap-2 {
  gap: 8px;
}

.search-field {
  max-width: 300px;
}

/* Styles pour le glisser-déposer */
.ghost {
  opacity: 0.8;
  border: 1px dashed rgba(var(--v-theme-onBackground), .1) !important;
}

div .sortable-drag{
  background-color: blue !important;
  opacity: 0 !important;
  cursor: grabbing;
}

/* .fade-move{
  transition: all 0.2s cubic-bezier(0.55, 0, 0.1, 1);
  
}
.fade-enter-active,
.fade-leave-active {
  transition: all 0.2s cubic-bezier(0.55, 0, 0.1, 1);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: scaleY(0.01) translate(30px, 0);
}

.fade-leave-active {
  position: absolute;
} */

/* Style pour l'icône de glisser-déposer */
.mdi-drag {
  cursor: grab;
  opacity: 0.5;
  transition: opacity 0.2s;
}

.mdi-drag:hover {
  opacity: 1;
}
</style>
