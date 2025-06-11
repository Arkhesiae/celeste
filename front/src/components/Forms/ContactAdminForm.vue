<template>
  <v-form ref="form" v-model="isValid" @submit.prevent="handleSubmit">
    <v-card color="transparent" rounded="xl" elevation="0" class="pa-0">
      <v-card-text>
        <div class="mb-4">
          
          <div class="text-subtitle-2 mb-2">Administrateur à contacter</div>
          <v-chip-group
            v-model="formData.adminId"
            mandatory
            color="surface"
            base-color="surface"
        
            class="mb-2"
          >
            <v-chip
              v-for="admin in adminsChip"
              :key="admin.type"
              :value="admin.type"
              variant="flat"
              rounded="lg"
              class="ma-1"
            >
              <v-icon start  :color="admin.type === 'master' ? 'primary' : 'secondary'">
                {{ admin.type === 'master' ? 'mdi-star-four-points' : 'mdi-shield-account' }}
              </v-icon>
              {{ admin.name }}
              <v-tooltip
                :text="admin.type === 'master' ? 'Administrateur principal' : 'Administrateur local'"
                location="top"
              >
                <template v-slot:activator="{ props }">
                  <v-icon
                    v-bind="props"
                    end
                    size="small"
                    class="ml-1"
                  >
                    mdi-information-outline
                  </v-icon>
                </template>
              </v-tooltip>
            </v-chip>
          </v-chip-group>
          <div v-if="!formData.adminId" class="text-caption text-error">
            Veuillez sélectionner un administrateur
          </div>
        </div>

        <v-select
          v-model="formData.type"
          :items="messageTypes"
          label="Type de message"
          :rules="[v => !!v || 'Le type de message est requis']"
          required
          variant="solo"
          rounded="lg"
          class="mb-4"
        ></v-select>

        <v-text-field
          v-model="formData.email"
          label="Email"
          :rules="[v => !!v || 'L\'email est requis']"
          required
          variant="outlined"
          rounded="xl"
          class="mb-4"
        ></v-text-field>

        <v-text-field
          v-model="formData.subject"
          label="Sujet"
          :rules="[v => !!v || 'Le sujet est requis']"
          required
          variant="solo-filled"
          flat
          rounded="xl"
          class="mb-4"
        ></v-text-field>

  

        <v-textarea
          v-model="formData.message"
          label="Message"
          :rules="[v => !!v || 'Le message est requis']"
          required
          variant="solo-filled"
          flat
          rounded="xl"
          rows="5"
          class="mb-4"
        ></v-textarea>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          color="primary"
          type="submit"
          :loading="loading"
          :disabled="!isValid || loading"
          rounded="lg"
          height="48"
          class="px-8"
        >
          Envoyer
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-form>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { useSnackbarStore } from '@/stores/snackbarStore';
import { useUserStore } from '@/stores/userStore';
import { messageService } from '@/services/messageService';

const props = defineProps({
  admins: {
    type: String,
    required: true
  }
});


const snackbarStore = useSnackbarStore();
const form = ref(null);
const isValid = ref(false);
const loading = ref(false);

const admins = ref([
  { name: 'Admin Principal', type: 'master' },
  { name: 'Admin Local', type: 'local' }
]);

const adminsChip = computed(() => {
  if (props.admins === 'both' || !props.admins) {
    return admins.value;
  } else if (props.admins === 'master') {
    return admins.value.filter(admin => admin.type === 'master');
  } else if (props.admins === 'local') {
    return admins.value.filter(admin => admin.type === 'local');
  }
});

const messageTypes = [
  { title: 'Demande d\'assistance', value: 'assistance' },
  { title: 'Signaler un bug', value: 'review' },
  { title: 'Autre', value: 'other' }
];

const formData = reactive({
  adminId: '',
  type: '',
  subject: '',
  email: '',
  message: ''
});

const handleSubmit = async () => {
  if (!form.value.validate()) return;

  loading.value = true;
  try {
    await messageService.createMessage({
      adminId: formData.adminId,
      type: formData.type,
      subject: formData.subject,
      email: formData.email,
      message: formData.message
    });
    
    snackbarStore.showNotification('Message envoyé avec succès !', 'onPrimary', 'mdi-email-fast-outline');
    resetForm();
  } catch (error) {
    console.error('Erreur lors de l\'envoi du message:', error);
    snackbarStore.showNotification(
      error.message || 'Erreur lors de l\'envoi du message',
      'error',
      'mdi-alert-circle'
    );
  } finally {
    loading.value = false;
  }
};

const resetForm = () => {
  formData.adminId = '';
  formData.type = '';
  formData.subject = '';
  formData.email = '';
  formData.message = '';
  form.value.reset();
};

onMounted(async () => {
  try {
    // TODO: Récupérer la liste des administrateurs depuis l'API
    // const response = await userStore.fetchAdmins();
    // admins.value = response;
  } catch (error) {
    snackbarStore.showNotification('Erreur lors du chargement des administrateurs', 'error', 'mdi-alert-circle');
  }
});
</script>

<style scoped>
.v-card {
  background: rgba(var(--v-theme-background), 0.4);
  backdrop-filter: blur(10px);
}

.selected-admin {
  border: 2px solid rgb(var(--v-theme-primary));
}
</style> 