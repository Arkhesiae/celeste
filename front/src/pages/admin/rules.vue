<template>
  <div class="rules-page">
    <v-container>
      <v-row>
        <v-col cols="12">
          <v-card class="pa-6" rounded="xl" flat>
            <div class="d-flex justify-space-between align-center mb-6">
              <h1 class="text-h4">Règles de l'application</h1>
              <v-btn
                color="primary"
                prepend-icon="mdi-refresh"
                @click="initializeRules"
                :loading="isInitializing"
                :disabled="isInitializing"
              >
                Initialiser les règles
              </v-btn>
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
              type="success"
              class="mb-4"
              closable
            >
              {{ success }}
            </v-alert>

            <v-table>
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
                  <td>{{ formatRuleName(rule.name) }}</td>
                  <td>{{ rule.description }}</td>
                  <td>
                    <v-text-field
                      v-model.number="rule.value"
                      type="number"
                      density="compact"
                      hide-details
                      class="rule-input"
                      :disabled="!isEditing[rule.name]"
                    ></v-text-field>
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
    snackbarStore.showNotification('Règles initialisées avec succès', 'success');
  } catch (err) {
    error.value = err.message || 'Erreur lors de l\'initialisation des règles';
    console.error(err);
  } finally {
    isInitializing.value = false;
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
    snackbarStore.showNotification('Règle mise à jour avec succès', 'success');
    await fetchRules();
  } catch (err) {
    error.value = err.message || 'Erreur lors de la mise à jour de la règle';
    console.error(err);
  } finally {
    isSaving.value[rule.name] = false;
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