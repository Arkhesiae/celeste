<template>
  <div class="rules-page">
    <v-container>
      <h1 class="text-h5 font-weight-bold mb-4">Règles de l'application</h1>
      <v-row>
        <v-col cols="12">
          <v-card class="pa-6" rounded="xl" flat>
            <div class="d-flex justify-end align-center mb-6">
             
              <div class="d-flex justify-end ga-3">

                <v-btn
                  color="remplacement"
                  variant="text"
                  class="text-uppercase"
                  rounded="lg"
                  
                  @click="initializeRules"
                  :loading="isInitializing"
                  :disabled="isInitializing"
                >
                  Initialiser les règles
                </v-btn>
                <v-btn
                  color="onBackground"
                  variant="flat"
                 
                  prepend-icon="mdi-restore"
                  @click="showResetConfirmation = true"
                  :loading="isResetting"
                  :disabled="isResetting"
                >
                  Réinitialiser 
                </v-btn>
              </div>
            </div>

            <v-alert
              v-if="error"
              type="error"
              class="mb-4"
              closable
            >
              {{ error }}
            </v-alert>

            <v-alert
              v-if="success"
              rounded="lg"
              color="onBackground"
              
              prepend-icon="mdi-check"
              class="mb-4"
              closable
            >
            <v-icon icon="mdi-check" size="small" color="success" ></v-icon>
              {{ success }}
            </v-alert>

            <v-table >
              <thead>
                <tr>
                  <th>Règle</th>
                  <th>Description</th>
                  <th>Valeur</th>
                  <th>Dernière mise à jour</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="rule in rules" :key="rule.name">
                  <td class="text-overline">{{ formatRuleName(rule.name) }}</td>
                  <td class="text-body-2">{{ rule.description }}</td>
                  <td>
                    <template v-if="getRuleType(rule) === 'Boolean'">
                      <template v-if="isEditing[rule.name]">
                        <v-switch
                          v-model="rule.value"
                          :disabled="!isEditing[rule.name]"
                          color="primary"
                          hide-details
                          density="compact"
                          :true-value="true"
                          :false-value="false"
                        ></v-switch>
                      </template>
                      <template v-else>
                        <v-chip
                          :color="rule.value === true ? 'success' : 'error'"
                          size="small"
                          rounded="lg"
                          variant="flat"
                        >
                          {{ rule.value === true ? 'Activé' : 'Désactivé' }}
                        </v-chip>
                      </template>
                    </template>
                    <template v-else>
                      <v-text-field
                        v-model.number="rule.value"
                        :type="getRuleType(rule) === 'Number' ? 'number' : 'text'"
                        density="compact"
                        hide-details
                        class="rule-input"
                        :disabled="!isEditing[rule.name]"
                        :min="getRuleType(rule) === 'Number' ? 0 : undefined"
                      ></v-text-field>
                    </template>
                  </td>
                  <td>{{ formatDate(rule.updatedAt) }}</td>
                  <td>
                    <div class="d-flex gap-2">
                      <v-btn
                        v-if="!isEditing[rule.name]"
                        icon="mdi-pencil"
                        variant="text"
                        size="small"
                        @click="startEditing(rule)"
                      ></v-btn>
                      <template v-else>
                        <v-btn
                          icon="mdi-check"
                          variant="text"
                          color="success"
                          size="small"
                          @click="saveRule(rule)"
                          :loading="isSaving[rule.name]"
                        ></v-btn>
                        <v-btn
                          icon="mdi-close"
                          variant="text"
                          color="error"
                          size="small"
                          @click="cancelEditing(rule)"
                        ></v-btn>
                      </template>
                    </div>
                  </td>
                </tr>
              </tbody>
            </v-table>
          </v-card>
        </v-col>
      </v-row>
    </v-container>

    <!-- Boîte de dialogue de confirmation pour la réinitialisation -->
    <v-dialog v-model="showResetConfirmation" max-width="400">
      <v-card rounded="xl" color="onBackground" variant="flat" class="pa-6 " >
        <v-card-title class="text-h6 font-weight-bold mb-4 pa-0 ma-0">
          Confirmer la réinitialisation
        </v-card-title>
        <v-card-text class="text-body-2 pa-0 ma-0">
          Êtes-vous sûr de vouloir réinitialiser toutes les règles avec leurs valeurs par défaut ? 
          Cette action supprimera toutes les modifications personnalisées.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="grey"
            variant="text"
            @click="showResetConfirmation = false"
          >
            Annuler
          </v-btn>
          <v-btn
            color="onBackground"
            variant="flat"
            @click="confirmReset"
            :loading="isResetting"
          >
            Réinitialiser
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useAuthStore } from '@/stores/authStore';
import { useSnackbarStore } from '@/stores/snackbarStore';
import { useRouter } from 'vue-router';
import { ruleService } from '@/services/ruleService';

defineOptions({
  name: 'admin-rules',
  meta: {
    requiresAuth: true,
    requiresMasterAdmin: true,
    layout: 'default'
  }
});

const router = useRouter();
const authStore = useAuthStore();
const snackbarStore = useSnackbarStore();

const rules = ref([]);
const error = ref('');
const success = ref('');
const isInitializing = ref(false);
const isEditing = ref({});
const isSaving = ref({});
const isResetting = ref(false);
const showResetConfirmation = ref(false);

const formatRuleName = (name) => {
  return name
    .split('_')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getRuleType = (rule) => {
  return rule.type || 'text';
};

const fetchRules = async () => {
  try {
    rules.value = await ruleService.getAllRules();
  } catch (err) {
    error.value = 'Erreur lors du chargement des règles';
    console.error(err);
  }
};

const initializeRules = async () => {
  try {
    isInitializing.value = true;
    await ruleService.initializeRules();
    await fetchRules();
    success.value = 'Les règles ont été initialisées avec succès';
    snackbarStore.showNotification('Règles initialisées avec succès', 'onPrimary', 'mdi-check');
  } catch (err) {
    error.value = err.message || 'Erreur lors de l\'initialisation des règles';
    console.error(err);
  } finally {
    isInitializing.value = false;
  }
};

const resetRules = async () => {
  try {
    isResetting.value = true;
    await ruleService.resetRules();
    await fetchRules();
    success.value = 'Les règles ont été réinitialisées avec succès';
    snackbarStore.showNotification('Règles réinitialisées avec succès', 'onPrimary', 'mdi-check');
  } catch (err) {
    error.value = err.message || 'Erreur lors de la réinitialisation des règles';
    console.error(err);
  } finally {
    isResetting.value = false;
  }
};

const startEditing = (rule) => {
  isEditing.value[rule.name] = true;
};

const cancelEditing = (rule) => {
  isEditing.value[rule.name] = false;
  fetchRules(); // Recharger les données originales
};

const saveRule = async (rule) => {
  try {
    isSaving.value[rule.name] = true;
    await ruleService.updateRule(rule.name, {
      name: rule.name,
      value: rule.value,
      description: rule.description
    });
    isEditing.value[rule.name] = false;
    success.value = 'Règle mise à jour avec succès';
    snackbarStore.showNotification('Règle mise à jour avec succès', 'onPrimary', 'mdi-check');
    await fetchRules();
  } catch (err) {
    error.value = err.message || 'Erreur lors de la mise à jour de la règle';
    console.error(err);
  } finally {
    isSaving.value[rule.name] = false;
  }
};

const confirmReset = async () => {
  try {
    await resetRules();
    showResetConfirmation.value = false;
  } catch (err) {
    error.value = err.message || 'Erreur lors de la confirmation de la réinitialisation';
    console.error(err);
  }
};

onMounted(() => {
  if (!authStore.isAdmin) {
    router.push('/');
    return;
  }
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
</style> 