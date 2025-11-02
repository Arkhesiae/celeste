<template>
  <v-container>
    <MainTitle title="E-mails" :subtitle="`Envoyer des emails d'annonce à tous les utilisateurs`">
      <template v-slot:actions>
        <div class="d-flex ga-2 align-center">
          <v-btn color="surfaceContainerHigh" variant="flat" prepend-icon="mdi-plus" @click="openAnnouncementDialog"
            rounded="xl" flat height="32" size="small">
            Nouvel email
          </v-btn>
        </div>
      </template>
    </MainTitle>

    <!-- Statistiques -->
    <v-row class="mb-6">
      <v-col cols="12" md="4">
        <v-card class="pa-4 pl-8" rounded="xl" color="surfaceContainerLow" flat>
          <div class="d-flex align-center ga-4 ">
            <v-icon size="16" color="onBackground" class="mr-3">mdi-account-group</v-icon>
            <div>
              <div class="text-h6 font-weight-bold">{{ emailStore.userCount }}</div>
              <div class="text-body-2 text-medium-emphasis">Utilisateurs actifs</div>
            </div>
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card class="pa-4 pl-8" rounded="xl" color="surfaceContainerLow" flat>
          <div class="d-flex align-center ga-4">
            <v-icon size="16" color="surfaceContainerHighest" class="mr-3">mdi-email-check</v-icon>
            <div>
              <div class="text-h6 font-weight-bold">{{ emailStore.lastSentCount }}</div>
              <div class="text-body-2 text-medium-emphasis">Emails envoyés</div>
            </div>
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card class="pa-4 pl-8" rounded="xl" color="surfaceContainerLow" flat>
          <div class="d-flex align-center ga-4">
            <v-icon size="16" color="surfaceContainerHighest" class="mr-3">mdi-email-alert</v-icon>
            <div>
              <div class="text-h6 font-weight-bold">{{ emailStore.lastFailedCount }}</div>
              <div class="text-body-2 text-medium-emphasis">Échecs d'envoi</div>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Historique des envois -->
    <v-card class="mb-6 pa-6" rounded="xl" color="surfaceContainerLow" flat>
      <v-card-title class="pa-0 ma-0 mb-4">

        Historique des envois
      </v-card-title>
      <v-card-text class="pa-0">
        <v-data-table :headers="historyHeaders" :items="emailStore.emailHistory" :loading="emailStore.loading"
          class="elevation-0" density="compact">
          <template v-slot:item.templateType="{ item }">
            <v-chip :color="emailStore.getTemplateColor(item.templateType)" size="small" rounded="lg">
              {{ emailStore.getTemplateLabel(item.templateType) }}
            </v-chip>
          </template>
          <template v-slot:item.sentBy="{ item }">
            {{ formatSender(item.sentBy) }}
          </template>
          <template v-slot:item.sentAt="{ item }">
            {{ formatDate(item.sentAt) }}
          </template>
          <template v-slot:item.results="{ item }">
            <div class="d-flex align-center">
              <span class="text-success mr-2">{{ item.results.sent }} envoyés</span>
              <span v-if="item.results.failed > 0" class="text-error">{{ item.results.failed }} échecs</span>
            </div>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <!-- Dialog d'envoi d'annonce -->
    <v-dialog v-model="announcementDialog" max-width="900px" persistent :fullscreen="smAndDown">
      <v-card :rounded="smAndDown ? '' : 'xl'" color="surfaceContainerLow" flat class="pa-6">
        <v-card-title class="pa-0 ma-0">
          Nouveau message
        </v-card-title>

        <v-card-text class="pa-0 pt-8">

          <!-- Type de template -->
          <v-text-field v-model="formData.title" label="Titre" :rules="[v => !!v || 'Le titre est requis']" required
            variant="solo-filled" flat color="onBackground" bg-color="surfaceContainer" rounded="xl"
            class="mb-4"></v-text-field>

          <!-- Message -->
          <v-textarea variant="solo" rounded="xl" color="surfaceContainerHigh" flat v-model="formData.message"
            label="Message"
            :rules="[v => !!v || 'Le message est requis', v => v.length >= 10 || 'Le message doit contenir au moins 10 caractères']"
            rows="6" class="mb-4" placeholder="Entrez votre message ici..." />

          <!-- Portée d'envoi -->
          <v-row class="mb-4" align="center" v-if="isMasterAdmin">
            <v-col cols="12" md="5">

              <v-btn color="surfaceContainerHigh" variant="flat" rounded="xl" @click="toggleScopeMode" block
                :height="smAndDown ? '56px' : '56px'">
                <template #prepend>
                  <div class="icon-container d-flex align-center justify-center" style="transition: all 0.5s ease;"
                    :style="{ 'width': isGlobal ? '24px' : '0px' }">
                    <v-slide-x-reverse-transition mode="out-in">
                      <div v-if="isGlobal" key="icon">
                        <v-icon color="primary" icon="mdi-earth" size="16" />
                      </div>
                      <div v-else key="empty"></div>
                    </v-slide-x-reverse-transition>
                  </div>
                </template>
                {{ isGlobal ? 'Envoi global' : 'Envoi local' }}
              </v-btn>
            </v-col>
            <v-col cols="12" md="7" v-if="!isGlobal">
              <v-select v-model="formData.centerId" :items="centers" item-title="name" item-value="_id"
                label="Sélectionner un centre" variant="solo" rounded="xl" flat hide-details
                :rules="[v => !!v || 'Le centre est requis en mode local']"><template #content>
                  <v-icon size="16">mdi-chevron-down</v-icon>
                </template></v-select>
            </v-col>
          </v-row>


         

          <!-- Aperçu -->
          <!-- <div class="d-flex justify-end">
              <v-btn color="onBackground" @click="handlePreview" rounded="lg" :size="smAndDown ? 'default' : 'small'"
                :block="smAndDown">Aperçu</v-btn>
            </div> -->

        </v-card-text>

        <v-card-actions class="pa-0 mt-6">

          <v-btn color="onSurface" variant="text" @click="announcementDialog = false" :disabled="emailStore.sending">
            Annuler
          </v-btn>
          <v-spacer />
          <v-btn color="surfaceContainerHigh" class="px-4" variant="flat" @click="sendTest" rounded="lg">Envoi test
          </v-btn>
          <v-btn color="onBackground" variant="flat" rounded="xl" @click="sendAnnouncement"
            :loading="emailStore.sending" :disabled="!formValid" prepend-icon="mdi-send" class="px-4">
            <template #prepend>
              <v-icon size="12">mdi-send</v-icon>
            </template>
            Envoi
          </v-btn>

        </v-card-actions>
      </v-card>
    </v-dialog>


    <!-- Dialog d'aperçu -->
    <v-dialog v-model="previewDialog" max-width="1200px">
      <v-card rounded="xl" color="surfaceContainerLow" flat class="pa-6">
        <v-card-title class="pa-0 ma-0">
          Aperçu de l'email
        </v-card-title>
        <v-card-text class="pa-0 pt-8">
          <div v-if="emailPreview" v-html="emailPreview" class="email-preview"></div>
          <div v-else class="text-medium-emphasis text-center pa-4">
            Sélectionnez un type d'annonce et entrez un message pour voir l'aperçu
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Dialog de confirmation -->
    <v-dialog v-model="confirmDialog" max-width="500px">
      <v-card rounded="lg">
        <v-card-title class="text-h6">
          <v-icon class="mr-2" color="warning">mdi-alert</v-icon>
          Confirmation d'envoi
        </v-card-title>
        <v-card-text>
          <p>Vous êtes sur le point d'envoyer une annonce à <strong>{{ emailStore.userCount }} utilisateurs</strong>.
          </p>
          <p class="text-medium-emphasis">Cette action ne peut pas être annulée.</p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="confirmDialog = false">
            Annuler
          </v-btn>
          <v-btn color="primary" @click="confirmSend" :loading="emailStore.sending">
            Confirmer l'envoi
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/authStore';
import { useEmailStore } from '@/stores/emailStore';
import { useSnackbarStore } from '@/stores/snackbarStore';
import { useDisplay } from 'vuetify';
import { useCenterStore } from '@/stores/centerStore';

const emailStore = useEmailStore();
const { smAndDown } = useDisplay();
const authStore = useAuthStore();
const centerStore = useCenterStore();
const snackbarStore = useSnackbarStore();
const isMasterAdmin = computed(() => authStore.userData.isAdmin && authStore.userData.adminType === 'master');
// États
const announcementDialog = ref(false);
const confirmDialog = ref(false);

const previewDialog = ref(false);

const formData = ref({
  title: '',
  message: '',
  isGlobal: false,
  centerId: authStore.userData.centerId || '',
  testMode: false
});

const historyHeaders = ref([
  { title: 'Titre', key: 'title', sortable: true },
  { title: 'Message', key: 'message', sortable: true },
  { title: 'Envoyé le', key: 'sentAt', sortable: true },
  { title: 'Résultats', key: 'results', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false }
]);

// Global / Local toggle
const isGlobal = ref(false);

const toggleScopeMode = () => {
  isGlobal.value = !isGlobal.value;
  formData.value.isGlobal = isGlobal.value;
};

// Centers for local mode
const centers = computed(() => centerStore.centers || []);

// Méthodes
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatSender = (sentBy) => {
  if (!sentBy) return 'N/A';
  return `${sentBy.name} ${sentBy.lastName}`;
};

  

const sendTest = () => {
  if (formValid.value) {
    formData.value.testMode = true;
    confirmSend();
  } else {
    snackbarStore.showNotification('Veuillez remplir tous les champs', 'error', 'mdi-alert-circle');
  }
};

const formValid = computed(() => {
  return formData.value.title && formData.value.message && (isGlobal.value || formData.value.centerId);
});


const openAnnouncementDialog = () => {
 

  announcementDialog.value = true;
};

const sendAnnouncement = () => {
  if (formValid.value) {
    if (isGlobal.value) {
      formData.value.centerId = null;
    }
   
    confirmSend();
  } else {
    snackbarStore.showNotification('Veuillez remplir tous les champs', 'error', 'mdi-alert-circle');
  }
};



const confirmSend = async () => {
  confirmDialog.value = false;
  try {
    await emailStore.sendAnnouncement(formData.value);
    announcementDialog.value = false;
  } catch (error) {
    snackbarStore.showNotification('Erreur lors de l\'envoi de l\'annonce : ' + error.message, 'error', 'mdi-alert-circle');
    console.error(error);
  }
};

// Lifecycle
onMounted(async () => {
  await emailStore.initializeStore();
  try {
    if (isMasterAdmin.value) {
      await centerStore.fetchCenters();
    } else {
      formData.value.centerId = authStore.userData.centerId || '';
      console.log(formData.value.centerId);
    }
  } catch (e) {
    // ignore; UI will just show empty selector
  }
});


</script>

<style scoped>
.email-preview {
  border: 1px solid rgba(0, 0, 0, 0.012);
  border-radius: 8px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.955);
  max-height: 600px;
  overflow-y: auto;
}

.email-preview :deep(img) {
  max-width: 100%;
  height: auto;
}

.email-preview :deep(table) {
  border-collapse: collapse;
  width: 100%;
}

.email-preview :deep(td, th) {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}
</style>