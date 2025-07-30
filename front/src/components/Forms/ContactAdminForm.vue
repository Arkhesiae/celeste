<template>
  <v-form ref="form" v-model="isValid" @submit.prevent="handleSubmit">
    <v-card color="transparent" rounded="xl" elevation="0" class="pa-0">
      <v-card-text>
        <v-row>
          <v-col cols="12" md="6">
            <div class="mb-4">
          
          <!-- <div class="text-subtitle-2 mb-2">Administrateur à contacter</div> -->
          <v-chip-group
            v-model="formData.adminType"
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
                :text="admin.type === 'master' ? 'Votre ticket sera envoyé à l\'administrateur principal' : 'Votre ticket sera envoyé à votre administrateur local mais sera également visible par l\'administrateur principal'"
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
          <div v-if="!formData.adminType" class="text-caption text-error">
            Veuillez sélectionner un administrateur
          </div>
        </div>
          
        <div  class="my-6" >
        <VersionSelector :modelValue="formData.center" :title="formData.center ? formData.center.name : 'Selectionnez un centre' "  :subtitle="formData.center ? formData.center.OACI : 'Selectionnez un centre'">
          <template #dialog>  
            <EntitySelector
              title=""
              @update:modelValue="formData.center = $event"
              :modelValue="formData.center"
              :items="centers"
              item-title="name"
              item-subtitle="OACI"
              item-key="_id"
              item-status="status"
              item-prefix="Centre"
            />
          </template>
        </VersionSelector>
        <div v-if="formData.adminType && formData.adminType !== 'master' && !formData.center" class="text-caption text-error mt-4">
          Le centre est obligatoire pour un administrateur local
        </div>
      </div>
      <v-select
          v-model="formData.type"
          :items="ticketTypes"
          placeholder="Type de ticket"
          :rules="[v => !!v || 'Le type de ticket est requis']"
          required
          flat
          variant="solo"
          rounded="xl"
          class="my-4 "
          density="default"
        >

        <template #item="{ props, item }">

          <v-list-item  v-bind="props" :title="item.title" />
        </template>


        <template #selection="{ props, item }">
          <v-list-item style="font-weight: 700;" base-color="onSurface" v-bind="props" :title="item.title" >
            <template #prepend>
              <v-icon :icon="item.value === 'assistance' ? 'mdi-help-circle' : item.value === 'review' ? 'mdi-bug' : 'mdi-email'" />
            </template> 

          </v-list-item>
        </template>
      </v-select>
          </v-col>
          <v-col cols="12" md="12">  

          

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
          label="Ticket"
          :rules="[v => !!v || 'Le ticket est requis']"
          required
          variant="solo-filled"
          flat
          rounded="xl"
          rows="5"
          class="mb-4"
        ></v-textarea>
          </v-col>
        </v-row>

     






      </v-card-text>

      <v-card-actions class="px-6 py-0 mb-16 justify-end">
    
        <v-btn
          color="onBackground"
          type="submit"
          :block="smAndDown ? true : false"
          :loading="loading"
          :disabled="!canSubmit || loading"
          :rounded="smAndDown ? 'xl' : 'lg'"
          :height="smAndDown ? '48' : '32'"
          variant="flat"
          class="px-4"
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
import { ticketService } from '@/services/ticketService';
import { useCenterStore } from '@/stores/centerStore';
import { useDisplay } from 'vuetify';

const { smAndDown } = useDisplay();

const props = defineProps({
  admins: {
    type: String,
    required: true
  }
});

const centerStore = useCenterStore();
const centers = computed(() => centerStore.centers);
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

// Computed property pour vérifier si le formulaire peut être envoyé
const canSubmit = computed(() => {
  // Vérifier que tous les champs requis sont remplis
  const hasRequiredFields = formData.type && formData.subject && formData.email && formData.message;
  
  // Vérifier qu'un admin est sélectionné
  const hasAdminSelected = !!formData.adminType;
  
  // Si l'admin n'est pas master, le centre est obligatoire
  const hasValidCenter = formData.adminType === 'master' || (formData.adminType && formData.center);
  
  return hasRequiredFields && hasAdminSelected && hasValidCenter;
});

const ticketTypes = [
  { title: 'Demande d\'assistance', value: 'assistance' },
  { title: 'Signaler un bug', value: 'review' },
  { title: 'Autre', value: 'other' }
];

const formData = reactive({
  adminType: '',
  type: null,
  subject: '',
  email: '',
  message: '',
  center: null
});

const handleSubmit = async () => {
  if (!form.value.validate()) return;

  // Validation personnalisée
  if (!formData.adminType) {
    snackbarStore.showNotification('Veuillez sélectionner un administrateur', 'error', 'mdi-alert-circle');
    return;
  }

  // Si l'admin n'est pas master, le centre est obligatoire
  if (formData.adminType !== 'master' && !formData.center) {
    snackbarStore.showNotification('Le centre est obligatoire pour un administrateur local', 'error', 'mdi-alert-circle');
    return;
  }

  loading.value = true;
  try {
    await ticketService.createTicket({
      adminType: formData.adminType,
      type: formData.type,
      subject: formData.subject,
      email: formData.email,
      message: formData.message,
      centerId: formData.center?._id
    });
    
    snackbarStore.showNotification('Ticket envoyé !', 'onPrimary', 'mdi-email-fast-outline');
    resetForm();
  } catch (error) {
    console.error('Erreur lors de l\'envoi du ticket:', error);
    snackbarStore.showNotification(
      error.message || 'Erreur lors de l\'envoi du ticket',
      'error',
      'mdi-alert-circle'
    );
  } finally {
    loading.value = false;
  }
};

const resetForm = () => {
  formData.adminType = '';
  formData.type = 'aze';
  formData.subject = '';
  formData.center = null;
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