<template>
  <v-container>
    <MainTitle title="Paramètres" subtitle="Gérez vos paramètres" :back-button="true" />

    <v-row>
      <v-col cols="12" md="6">
        <SettingsSection title="Profil">
          <SettingsRow
            icon="mdi-email-outline"
            title="Modifier l'adresse email"
            :subtitle="authStore.userData.email"
            @click="showEmailDialog = true"
          />
          <SettingsRow
            icon="mdi-account-circle-outline"
            title="Modifier l'avatar"
            subtitle="Votre photo de profil"
            @click="showAvatarDialog = true"
          />
          <SettingsRow
            icon="mdi-phone-outline"
            title="Numéro de téléphone"
            :subtitle="authStore.userData.phone || 'Non renseigné'"
            :error="!authStore.userData.phone"
            @click="showPhoneDialog = true"
          />
          <SettingsRow
            icon="mdi-cake-variant-outline"
            title="Date de naissance"
            :subtitle="birthDay ? formatDay(birthDay) : 'Non renseignée'"
            @click="showBirthDateDialog = true"
          />
        </SettingsSection>

        <SettingsSection title="Apparence">
          <!-- Toute la ligne change le thème ; l'interrupteur ne fait que montrer l'état (il ne reçoit pas le clic) -->
          <SettingsRow
            icon="mdi-theme-light-dark"
            title="Changer le thème"
            :subtitle="isDark ? 'Sombre' : 'Clair'"
            @click="isDark = !isDark"
          >
            <template #append>
              <ThemeSwitch readonly tabindex="-1" class="pointer-events-none" />
            </template>
          </SettingsRow>
        </SettingsSection>

        <SettingsSection title="Mutation">
          <!-- Demande en cours : elle peut être annulée tant que l'administrateur du centre d'arrivée ne l'a pas acceptée -->
          <template v-if="transferStore.mine" #intro>
            <v-alert color="secondary" variant="tonal" rounded="xl" icon="mdi-swap-horizontal" class="mb-2">
              <div class="font-weight-bold">Mutation vers {{ transferStore.mine.toCenter.name }} en attente</div>
              <div class="text-body-small">
                Demandée le {{ formatDay(transferStore.mine.requestedAt) }} · motif : {{ transferStore.mine.reason }}
              </div>
              <div class="text-body-small mt-1">
                L'administrateur de ce centre doit l'accepter. D'ici là, vos équipes, vos points et vos remplacements sont figés.
              </div>
            </v-alert>
          </template>
          <SettingsRow
            v-if="transferStore.mine"
            icon="mdi-close-circle-outline"
            title="Annuler la demande de mutation"
            :loading="cancellingTransfer"
            @click="cancelTransfer"
          />
          <SettingsRow
            v-else
            icon="mdi-swap-horizontal"
            title="Demander une mutation"
            subtitle="Rejoindre un autre centre"
            @click="showTransferRequestDialog = true"
          />
        </SettingsSection>
      </v-col>

      <v-col cols="12" md="6">
        <SettingsSection title="Sécurité">
          <SettingsRow
            icon="mdi-lock-outline"
            title="Modifier le mot de passe"
            subtitle="Choisissez un nouveau mot de passe"
            @click="showPasswordDialog = true"
          />
        </SettingsSection>

        <SettingsSection title="Emails">
          <template #title-append>
            <v-chip v-if="noCategoryEnabled" color="error" variant="flat" class="rounded-pill py-0" size="small">
              <v-icon class="mr-2"> mdi-email-alert-outline </v-icon>
              <span class="text-body-small">Aucune catégorie sélectionnée</span>
            </v-chip>
          </template>

          <!-- Toute la ligne bascule ; les interrupteurs ne font que montrer l'état -->
          <SettingsRow icon="mdi-email-multiple-outline" title="Recevoir les emails" @click="emailGlobalEnabled = !emailGlobalEnabled">
            <template #append>
              <v-switch v-model="emailGlobalEnabled" readonly tabindex="-1" hide-details class="pointer-events-none" />
            </template>
          </SettingsRow>
          <SettingsRow
            v-for="option in emailOptions"
            :key="option.pref"
            :icon="option.icon"
            :title="option.label"
            :disabled="!emailGlobalEnabled"
            @click="emailCategories[option.pref] = !emailCategories[option.pref]"
          >
            <template #append>
              <v-switch
                v-model="emailCategories[option.pref]"
                readonly
                tabindex="-1"
                density="compact"
               
                hide-details
                class="pointer-events-none"
              />
            </template>
          </SettingsRow>
        </SettingsSection>
      </v-col>
    </v-row>

    <!-- Dialogues -->
    <EmailDialog v-model="showEmailDialog" @success="notifySuccess" @error="notifyError" />
    <PasswordDialog v-model="showPasswordDialog" @success="notifySuccess" @error="notifyError" />
    <AvatarDialog v-model="showAvatarDialog" @success="notifySuccess" @error="notifyError" />
    <PhoneDialog v-model="showPhoneDialog" @success="notifySuccess" @error="notifyError" />
    <BirthDateDialog v-model="showBirthDateDialog" @success="notifySuccess" @error="notifyError" />
    <TransferRequestDialog v-model="showTransferRequestDialog" @success="notifySuccess" @error="notifyError" />
  </v-container>
</template>

<script setup>
import { birthDayOf, formatDay } from '@/utils/dayFields.js';
import { useAuthStore } from '@/stores/authStore';
import { useSnackbarStore } from '@/stores/snackbarStore';
import { useCenterTransferStore } from '@/stores/centerTransferStore';
import ThemeSwitch from '@/layouts/components/AppBar/ThemeSwitch.vue';
import { useDarkMode } from '@/composables/useDarkMode';

const authStore = useAuthStore();
const snackbarStore = useSnackbarStore();
const transferStore = useCenterTransferStore();
const { isDark } = useDarkMode();

const birthDay = computed(() => birthDayOf(authStore.userData));

// La demande de mutation en cours, s'il y en a une
onMounted(() => transferStore.fetchMine().catch(() => {}));

// Les dialogues signalent leur résultat par `success` / `error` avec un message
const notifySuccess = (message) => snackbarStore.showNotification(message, 'onPrimary', 'mdi-check-circle');
const notifyError = (message) => snackbarStore.showNotification(message, 'onError', 'mdi-close-circle');

// États des dialogues
const showEmailDialog = ref(false);
const showPasswordDialog = ref(false);
const showAvatarDialog = ref(false);
const showPhoneDialog = ref(false);
const showBirthDateDialog = ref(false);
const showTransferRequestDialog = ref(false);

const cancellingTransfer = ref(false);
const cancelTransfer = async () => {
  cancellingTransfer.value = true;
  try {
    await transferStore.cancel();
    notifySuccess('Demande de mutation annulée');
  } catch (error) {
    notifyError(error.message || "Impossible d'annuler la demande");
  } finally {
    cancellingTransfer.value = false;
  }
};

// Catégories d'emails : `pref` est la clé enregistrée dans les préférences de l'utilisateur
const emailOptions = [
  { label: 'Demandes - Remplacement', pref: 'replacement', icon: 'mdi-account-arrow-left-outline' },
  { label: 'Demandes - Switch', pref: 'switch', icon: 'mdi-swap-horizontal-hidden' },
  { label: 'Annonces', pref: 'announcements', icon: 'mdi-bullhorn-outline' },
];

const emailPreferences = authStore.userData.preferences.emails;
const emailGlobalEnabled = ref(emailPreferences.all ?? true);
const emailCategories = ref(
  Object.fromEntries(emailOptions.map(({ pref }) => [pref, emailPreferences.categories[pref] ?? true])),
);
const setAllCategories = (enabled) => {
  for (const { pref } of emailOptions) emailCategories.value[pref] = enabled;
};

const noCategoryEnabled = computed(
  () => emailGlobalEnabled.value && !Object.values(emailCategories.value).some(Boolean),
);

// Enregistre les préférences d'emails dans le backend
const updateEmailPreferences = async () => {
  try {
    await authStore.updateUserPreferences({
      ...authStore.userData.preferences,
      emails: { all: emailGlobalEnabled.value, categories: { ...emailCategories.value } },
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour des préférences email:', error);
    notifyError('Erreur lors de la mise à jour des préférences email');
  }
};

// Désactiver les emails décoche toutes les catégories ; activer une catégorie réactive les emails
watch(emailGlobalEnabled, async (enabled) => {
  if (!enabled) setAllCategories(false);
  await updateEmailPreferences();
});

watch(
  emailCategories,
  async () => {
    if (!emailGlobalEnabled.value && Object.values(emailCategories.value).some(Boolean)) {
      emailGlobalEnabled.value = true;
    }
    await updateEmailPreferences();
  },
  { deep: true },
);
</script>

<style scoped>
.v-container {
  min-height: 100vh;
}

:deep(.v-switch__track) {
  height: 24px !important;
  border: 1px solid rgba(173, 154, 154, 0.21);
  min-width: 44px !important;
  background: rgba(255, 255, 255, 0.05) !important;
}

:deep(.v-switch__thumb) {
  height: 20px !important;
  width: 20px !important;
}
</style>
