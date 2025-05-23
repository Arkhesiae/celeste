<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/authStore'

const authStore = useAuthStore()
const requests = ref([])
const loading = ref(true)
const error = ref('')

const fetchRequests = async () => {
  try {
    const response = await fetch('/api/account-recovery', {
      headers: {
        'Authorization': `Bearer ${authStore.token}`
      }
    })
    if (!response.ok) throw new Error('Erreur lors de la récupération des demandes')
    requests.value = await response.json()
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

const updateRequestStatus = async (id, newStatus) => {
  try {
    const response = await fetch(`/api/account-recovery/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify({ status: newStatus })
    })

    if (!response.ok) throw new Error('Erreur lors de la mise à jour')
    await fetchRequests()
  } catch (err) {
    error.value = err.message
  }
}

onMounted(fetchRequests)
</script>

<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <v-card class="elevation-2">
          <v-card-title class="text-h4 d-flex align-center">
            <v-icon icon="mdi-account-sync" class="mr-2" />
            Demandes de récupération de compte
          </v-card-title>

          <v-card-text>
            <v-alert
              v-if="error"
              type="error"
              variant="tonal"
              class="mb-4"
            >
              {{ error }}
            </v-alert>

            <v-progress-circular
              v-if="loading"
              indeterminate
              color="primary"
              class="ma-4"
            />

            <v-data-table
              v-else
              :headers="[
                { title: 'Date', key: 'createdAt', sortable: true },
                { title: 'Email', key: 'email', sortable: true },
                { title: 'Prénom', key: 'firstName', sortable: true },
                { title: 'Nom', key: 'lastName', sortable: true },
                { title: 'Centre', key: 'center', sortable: true },
                { title: 'Statut', key: 'status', sortable: true },
                { title: 'Actions', key: 'actions', sortable: false }
              ]"
              :items="requests"
              class="elevation-1"
            >
              <template v-slot:item.createdAt="{ item }">
                {{ new Date(item.createdAt).toLocaleDateString() }}
              </template>

              <template v-slot:item.status="{ item }">
                <v-chip
                  :color="item.status === 'PENDING' ? 'warning' : item.status === 'APPROVED' ? 'success' : 'error'"
                  variant="tonal"
                >
                  {{ item.status }}
                </v-chip>
              </template>

              <template v-slot:item.actions="{ item }">
                <v-btn
                  v-if="item.status === 'PENDING'"
                  color="success"
                  size="small"
                  class="mr-2"
                  @click="updateRequestStatus(item._id, 'APPROVED')"
                  prepend-icon="mdi-check"
                >
                  Approuver
                </v-btn>
                <v-btn
                  v-if="item.status === 'PENDING'"
                  color="error"
                  size="small"
                  @click="updateRequestStatus(item._id, 'REJECTED')"
                  prepend-icon="mdi-close"
                >
                  Rejeter
                </v-btn>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.v-card {
  border-radius: 16px;
}

.v-card-title {
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
}
</style> 