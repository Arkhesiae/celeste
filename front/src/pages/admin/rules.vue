<template>
  <v-container>
    <main-title title="Règles de l'application" />
    <v-row>
      <v-col cols="12">

        <v-card :rounded="smAndDown ? '0' : 'xl'" flat
          :color="smAndDown ? 'transparent' : 'surfaceContainer px-6 py-4'">
          <div class="d-flex flex-column align-start ga-0">
            <div v-for="(rule, index) in rules" :key="index" class="w-100  " @click.stop="startEditing(rule)">
              <div class="d-flex align-center justify-space-between py-3">
                <div class="d-flex align-start   ga-3">
                  <div class="d-flex  flex-column align-start">
                    <div class="d-flex align-center ga-1">
                      <span style="font-size: 12px; font-weight: bold;" :class="rule.locked ? 'opacity-50' : ''">{{
                        rule.name }}</span>
                      <v-icon v-if="rule.locked" icon="mdi-lock-outline" size="x-small" color="error" />
                      <v-chip v-if="rule.isOverridden" color="primary" size="small" density="compact" rounded="xl"
                        variant="tonal" inset>
                        Modifiée
                      </v-chip>
                    </div>


                    <span class=" opacity-50" style="font-size: 11px;">{{ rule.description }}</span>
                  </div>
                  <div class="d-flex ga-2 mt-1">
                    <!-- <v-chip v-if="rule.locked" color="error" size="small" density="compact" rounded="xl" variant="tonal" inset>Verrouillée</v-chip> -->
                  </div>
                </div>

                <div class="d-flex align-center ga-3">
                  <div>
                    <v-switch v-if="typeof (rule.value) === 'boolean'" v-model="rule.value"
                      :class="smAndDown ? '' : 'custom-switch'" hide-details :disabled="rule.locked && !isMasterAdmin"
                      :color="rule.locked ? 'primary' : 'primary'" density="compact" inset />
                    <span v-else-if="rule.name === 'Mailing administration'"
                      style="font-size: 14px; font-weight: bold;">
                      {{ rule.value?.enabled ? 'Activé (' + (rule.value?.emails?.length || 0) + ' dest.)' : 'Désactivé'
                      }}
                    </span>
                    <span v-else style="font-size: 14px; font-weight: bold;">{{ rule.value }}</span>
                  </div>
                  <v-btn v-if="rule.isOverridden && !isMasterAdmin" icon="mdi-refresh" size="small" variant="text" inset
                    @click.stop="resetRule(rule)" />
                  <v-btn v-if="isMasterAdmin" :color="rule.locked ? 'primary' : 'primary'"
                    :icon="rule.locked ? 'mdi-lock-outline' : 'mdi-lock-open-variant-outline'" size="small"
                    variant="text" inset @click.stop="lockRule(rule)" />
                </div>
              </div>
              <v-divider v-if="index < rules.length - 1" />
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="isEditing" width="500">
      <v-card class="pa-6 rounded-xl">
        <span class="text-title-large">{{ ruleToEdit.name }}</span>
        <span class="opacity-50">Définir une nouvelle valeur pour cette règle ?</span>

        <v-number-input v-model="ruleToEdit.value" class="my-4" type="number" control-variant="split" rounded="xl" flat
          hide-details color="primary" size="small" variant="underlined" inset />
        <div class="d-flex align-center justify-space-between mt-4">
          <v-spacer />
          <v-btn color="primary" variant="text" @click="isEditing = false">
            Annuler
          </v-btn>
          <v-btn color="primary" variant="text" @click="updateRuleDialog">
            Confirmer
          </v-btn>
        </div>
      </v-card>
    </v-dialog>

    <v-dialog v-model="isEditingMailing" width="550">
      <v-card v-if="mailingRuleToEdit" class="pa-6 rounded-xl">
        <span class="text-title-large">{{ mailingRuleToEdit.name }}</span>
        <span class="opacity-50 mb-4 d-block">{{ mailingRuleToEdit.description }}</span>

        <v-switch v-model="mailingRuleToEdit.value.enabled" label="Activer l'envoi de mails à l'administration"
          color="primary" inset hide-details class="mb-4" />

        <v-expand-transition>
          <div v-if="mailingRuleToEdit.value.enabled">
            <v-text-field v-model="mailingEmailsInput"
              label="Adresses e-mail des destinataires (séparées par des virgules)"
              placeholder="admin1@example.com, admin2@example.com" variant="outlined" density="comfortable" rounded="lg"
              class="mb-4" hide-details />

            <div class="d-flex justify-start mb-4">
              <v-btn variant="outlined" color="primary" prepend-icon="mdi-eye-outline" rounded="xl"
                @click="showTemplatePreview = true">
                Prévisualiser le modèle
              </v-btn>
            </div>
          </div>
        </v-expand-transition>

        <div class="d-flex align-center justify-space-between mt-4">
          <v-spacer />
          <v-btn color="primary" variant="text" @click="isEditingMailing = false">
            Annuler
          </v-btn>
          <v-btn color="primary" variant="text" :loading="isSaving" @click="updateMailingRule">
            Confirmer
          </v-btn>
        </div>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showTemplatePreview" width="600">
      <v-card class="pa-6 rounded-xl">
        <div class="d-flex align-center justify-space-between mb-4">
          <span class="text-title-large">Aperçu du modèle d'email</span>
          <v-btn icon="mdi-close" variant="text" size="small" @click="showTemplatePreview = false" />
        </div>
      </v-card>
    </v-dialog>


    <ConfirmationDialog v-model="confirmLock" title="Confirmation"
      :text="ruleToEdit?.locked ? 'Voulez-vous déverrouiller cette règle ?' : 'Voulez-vous verrouiller cette règle?'"
      @close="confirmLock = false" :onConfirm="handleLockAction">
    </ConfirmationDialog>
  </v-container>
</template>

<script setup>

import { useAuthStore } from '@/stores/authStore';
import { useSnackbarStore } from '@/stores/snackbarStore';
// import { useRouter } from 'vue-router';
import { ruleService } from '@/services/ruleService';
import MainTitle from '@/components/common/Titles/MainTitle.vue';
import { useDisplay } from 'vuetify';


defineOptions({
  name: 'AdminRules',
  meta: {
    requiresAuth: true,
    requiresAuth: true,
    requiresAdmin: true, // Changed from requiresMasterAdmin because local admins also access
    layout: 'default'
  }
});

// const router = useRouter();
const authStore = useAuthStore();
const snackbarStore = useSnackbarStore();

const { smAndDown } = useDisplay();
const rules = ref([]);
const ruleToEdit = ref(null);
const error = ref('');
const success = ref('');
// const isInitializing = ref(false);
const confirmLock = ref(false);
const isEditing = ref(false);
const isEditingMailing = ref(false);
const showTemplatePreview = ref(false);
const mailingRuleToEdit = ref(null);
const mailingEmailsInput = ref('');
const isSaving = ref(false);
const isResetting = ref(false);
// const showResetConfirmation = ref(false);
const centerId = computed(() =>
  authStore.userData.adminType === 'master' ? null : authStore.userData.centerId);

// const formatRuleName = (name) => {
//   return name
//     .split('_')
//     .map(word => word.charAt(0) + word.slice(1).toLowerCase())
//     .join(' ');
// };

// const formatDate = (date) => {
//   return new Date(date).toLocaleDateString('fr-FR', {
//     day: '2-digit',
//     month: '2-digit',
//     year: 'numeric',
//     hour: '2-digit',
//     minute: '2-digit'
//   });
// };

// const getRuleType = (rule) => {
//   return rule.type || 'text';
// };

const fetchRules = async () => {
  try {
    rules.value = await ruleService.getAllRules(centerId.value);
  } catch (err) {
    error.value = 'Erreur lors du chargement des règles';
    console.error(err);
  }
};


const isMasterAdmin = computed(() => authStore.userData.isAdmin && authStore.userData.adminType === 'master'); // Assuming role check
// Or checking specific permission flag if available. using isAdmin is likely local admin too.

const startEditing = (rule) => {
  if (rule.locked) {
    if (!isMasterAdmin.value) {
      snackbarStore.showNotification('Règle verrouillée', 'warning', 'mdi-lock');
    }
    return;
  }

  if (rule.name === 'Mailing administration') {
    mailingRuleToEdit.value = JSON.parse(JSON.stringify(rule)); // deep copy
    mailingEmailsInput.value = mailingRuleToEdit.value.value?.emails?.join(', ') || '';
    isEditingMailing.value = true;
    return;
  }

  if (typeof (rule.value) === 'boolean') {
    // Dictate the value directly for boolean toggle
    const newValue = !rule.value;
    // We need to call save immediately for switch
    saveRule({ ...rule, value: newValue });
    return;
  }

  ruleToEdit.value = { ...rule }; // Copy to avoid direct mutation before save
  isEditing.value = true;
};

const lockRule = (rule) => {
  if (!isMasterAdmin.value) return;

  ruleToEdit.value = rule;

  // If already locked, we are unlocking
  if (rule.locked) {
    // Direct unlock or confirm? Let's direct unlock or use confirm with different text
    // Reuse dialog for lock/unlock
    confirmLock.value = true;
  } else {
    confirmLock.value = true;
  }
};

const handleLockAction = async () => {
  if (!ruleToEdit.value) return;
  try {
    const newLockState = !ruleToEdit.value.locked;
    await ruleService.toggleLock(ruleToEdit.value.name, newLockState);

    await fetchRules();
    success.value = newLockState ? 'Règle verrouillée' : 'Règle déverrouillée';
    snackbarStore.showNotification(success.value, 'onPrimary', 'mdi-check');
  } catch (err) {
    error.value = err.message || 'Erreur lors du verrouillage/déverrouillage';
    console.error(err);
  } finally {
    confirmLock.value = false;
    ruleToEdit.value = null;
  }
};




const resetRule = async (rule) => {
  const centerIdValue = authStore.userData.adminType === 'master' ? null : authStore.userData.centerId;
  // If master admin sees reset button, it might be for a specific center context? 
  // But currently master admin doesn't seem to view specific center rules unless via some switcher not shown.
  // The user request implies "reset to default", likely for the current context.

  if (!centerIdValue) return; // Should not happen if button is visible only for overridden rules which implies center context

  // Ideally show confirmation
  // For now direct reset as per instructions "add logic".

  try {
    isResetting.value = true;
    await ruleService.resetRule(rule.name, centerIdValue);
    await fetchRules();
    snackbarStore.showNotification('Règle réinitialisée', 'onPrimary', 'mdi-check');
  } catch (err) {
    console.error(err);
    snackbarStore.showNotification('Erreur lors de la réinitialisation', 'error', 'mdi-alert');
  } finally {
    isResetting.value = false;
  }
};

const updateRuleDialog = async () => {
  if (!ruleToEdit.value) return;
  await saveRule(ruleToEdit.value);
  isEditing.value = false;
};

const updateMailingRule = async () => {
  if (!mailingRuleToEdit.value) return;

  const emailsArray = mailingEmailsInput.value
    ? mailingEmailsInput.value.split(',').map(e => e.trim()).filter(Boolean)
    : [];

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  for (const email of emailsArray) {
    if (!emailRegex.test(email)) {
      snackbarStore.showNotification('Adresse e-mail invalide : ' + email, 'error', 'mdi-alert');
      return;
    }
  }

  mailingRuleToEdit.value.value.emails = emailsArray;
  await saveRule(mailingRuleToEdit.value);
  isEditingMailing.value = false;
};

const saveRule = async (ruleData) => {
  // ruleData contains { name, value, ... }
  try {
    isSaving.value = true; // Global loading or per rule? Code used to have object. I'll stick to simple ref for dialog or blocking.

    const centerId = isMasterAdmin.value ? null : (authStore.userData.center?._id || authStore.userData.centerId);

    await ruleService.updateRule(ruleData.name, centerId, {
      value: ruleData.value,
      mode: 'static' // Defaulting to static for now as UI doesn't support dynamic config yet
    });

    success.value = 'Règle mise à jour avec succès';
    // snackbarStore.showNotification('Règle mise à jour avec succès', 'onPrimary', 'mdi-check');
    await fetchRules();
  } catch (err) {
    error.value = err.message || 'Erreur lors de la mise à jour de la règle';
    console.error(err);
    await fetchRules();
  } finally {
    isSaving.value = false;
  }
};



onMounted(() => {
  fetchRules();
});

</script>

<style scoped>
.rules-page {
  padding-top: 2rem;
}

.rule-input {
  max-width: 100px;
}

.gap-2 {
  gap: 8px;
}

.custom-switch {
  transform: scale(1);
}

:deep(.v-switch__track) {
  background: rgba(var(--v-theme-primary), 1) !important;
  /* background: rgba(255, 42, 42, 1) !important; */
  opacity: .5 !important;
}

:deep(.v-switch__thumb) {
  background: rgba(var(--v-theme-background), 1) !important;
}

:deep(.v-selection-control--dirty .v-switch__track) {
  opacity: 1 !important;
  background: rgba(var(--v-theme-primary), 1) !important;
}


.custom-switch:deep(.v-switch__track) {
  height: 24px !important;
  border: 1px solid rgba(173, 154, 154, 0.21);
  min-width: 44px !important;
  background: rgba(255, 255, 255, 0.05) !important;
}

.custom-switch:deep(.v-switch__thumb) {
  height: 20px !important;
  background: rgba(var(--v-theme-primary), 1) !important;
  width: 20px !important;
}
</style>