<template>
  <v-container>
    <MainTitle title="E-mails" :subtitle="`Envoyer des emails d'annonce à tous les utilisateurs`">
      <template v-slot:actions>
        <div class="d-flex ga-2 align-center">
          <v-btn
            color="surfaceContainerHigh"
            variant="flat"
            prepend-icon="mdi-plus"
            @click="openAnnouncementDialog"
            rounded="xl"
            flat
            height="32"
            size="small"
          >
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
        <v-data-table
          :headers="historyHeaders"
          :items="emailStore.emailHistory"
          :loading="emailStore.loading"
          class="elevation-0"
          density="compact"
        >
          <template v-slot:item.templateType="{ item }">
            <v-chip :color="emailStore.getTemplateColor(item.templateType)" size="small">
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
    <v-dialog v-model="announcementDialog" max-width="600px" persistent :fullscreen="smAndDown">
      <v-card :rounded="smAndDown ? '' : 'xl'" color="surfaceContainerLow" flat class="pa-6">
        <v-card-title class="pa-0 ma-0">
          Nouveau message
        </v-card-title>

        <v-card-text class="pa-0 pt-8" >
          <v-form ref="announcementForm" v-model="formValid">
            <!-- Type de template -->
            <v-select
               v-model="formData.templateType"
               :items="templates"
               variant="outlined"
               rounded="xl"
             
               flat
               item-title="label"
               item-value="value"
               label="Type d'annonce"
               :rules="[v => !!v || 'Le type d\'annonce est requis']"
               class="mb-4"
             >
            
            </v-select>

            <!-- Message -->
            <v-textarea
              variant="solo"
              rounded="xl"
              color="surfaceContainerHigh"
              flat
              v-model="formData.message"
              label="Message"
              :rules="[v => !!v || 'Le message est requis', v => v.length >= 10 || 'Le message doit contenir au moins 10 caractères']"
              rows="6"
              class="mb-4"
              placeholder="Entrez votre message ici..."
            />

            <!-- Durée (pour maintenance) -->
            <v-text-field
              v-if="formData.templateType === 'maintenance'"
              v-model="formData.duration"
              label="Durée estimée (optionnel)"
              placeholder="ex: 2 heures"
              class="mb-4"
            />

            <!-- Mode test -->
            <v-alert
              v-model="formData.testMode"
              type="info"
              variant="tonal"
              class="mb-4"
            >
              <template v-slot:prepend>
                <v-icon>mdi-test-tube</v-icon>
              </template>
              <div class="d-flex align-center justify-space-between">
                <span>Mode test - L'email sera envoyé uniquement à votre adresse</span>
                <v-switch
                  v-model="formData.testMode"
                  color="primary"
                  hide-details
                />
              </div>
            </v-alert>

            <!-- Aperçu -->
             <div class="d-flex justify-end">
              <v-btn  color="onBackground" @click="handlePreview" rounded="lg" :size="smAndDown ? 'default' : 'small'" :block="smAndDown">Aperçu</v-btn>
             </div>
          </v-form>
        </v-card-text>

        <v-card-actions class="pa-0 mt-6">
   
                     <v-btn
             color="onSurface"
             variant="text"
             @click="announcementDialog = false"
             :disabled="emailStore.sending"
           >
            Annuler
          </v-btn>
          <v-spacer />
          <v-btn color="surfaceContainerHigh" variant="flat" @click="sendTest" rounded="lg" :size="smAndDown ? 'small' : 'small'" >Envoi test  </v-btn>
          <v-btn
             color="remplacement"
             variant="flat"
             rounded="lg"
             @click="sendAnnouncement"
             :loading="emailStore.sending"
             :disabled="!formValid"
             prepend-icon="mdi-send"
           >
            {{ formData.testMode ? 'Envoyer le test' : 'Envoyer à tous' }}
          </v-btn>

        </v-card-actions>
      </v-card>
    </v-dialog>


    <!-- Dialog d'aperçu -->
    <v-dialog v-model="previewDialog" max-width="1200px" >
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
                     <p>Vous êtes sur le point d'envoyer une annonce à <strong>{{ emailStore.userCount }} utilisateurs</strong>.</p>
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
import { ref, computed, onMounted, watch } from 'vue';
import { useAuthStore } from '@/stores/authStore';
import { useEmailStore } from '@/stores/emailStore';
import { useRouter } from 'vue-router';
import { emailService } from '@/services/emailService.js';
import { useDisplay } from 'vuetify';

const authStore = useAuthStore();
const emailStore = useEmailStore();
const router = useRouter();
const { smAndDown } = useDisplay();

const templates = computed(() => emailStore.availableTemplates);
console.log(templates.value);
// États
const announcementDialog = ref(false);
const confirmDialog = ref(false);
const formValid = ref(false);
const previewDialog = ref(false);
const previewData = ref({
  templateType: '',
  message: '',
  duration: '',
  testMode: false
});

const formData = ref({
  templateType: '',
  message: '',
  duration: '',
  testMode: false
});

// Headers pour l'historique
const historyHeaders = [
  { title: 'Type', key: 'templateType', sortable: true },
  { title: 'Envoyé le', key: 'sentAt', sortable: true },
  { title: 'Résultats', key: 'results', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false }
];

// Computed
const emailPreview = ref(null);



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

const handlePreview = () => {
  generateEmailPreview();
  previewDialog.value = true;
};

const generateEmailPreview = async () => {
  if (!formData.value.templateType || !formData.value.message) {
    emailPreview.value = null;
    return;
  }
  
  try {
    const response = await emailService.getTemplatePreview(formData.value.templateType, formData.value);
    emailPreview.value = response.html;
  } catch (error) {
    console.error('Erreur lors de la génération de l\'aperçu:', error);
    emailPreview.value = null;
  }
};



const openAnnouncementDialog = () => {
  formData.value = {
    templateType: '',
    message: '',
    duration: '',
    testMode: false
  };
  emailPreview.value = null;
  announcementDialog.value = true;
};

const sendAnnouncement = () => {
  formData.value.testMode = false;
  confirmSend();
};

const sendTest = () => {
  formData.value.testMode = true;
  confirmSend();
};

const confirmSend = async () => {
  confirmDialog.value = false;
  
  try {
    await emailStore.sendAnnouncement(formData.value);
    announcementDialog.value = false;
  } catch (error) {
    console.error('Erreur lors de l\'envoi:', error);
  }
};

// Lifecycle
onMounted(async () => {
  await emailStore.initializeStore();
  console.log(templates.value);
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