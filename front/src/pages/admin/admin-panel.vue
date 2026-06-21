<template>
  <v-container class="admin-panel">
    <!-- En-tête avec titre et informations admin -->
    <v-row class="my-16">
      <v-col cols="12">
        <v-card
          class="pa-6"
          rounded="xl"
          variant="flat"
          color="surface"
        >
          <div class="d-flex align-center justify-space-between">
            <div>
              <div class="align-center ga-2 font-weight-bold d-flex ">
                <v-icon
                  icon="mdi-shield-crown"
                  size="20"
                />
                <span class="text-title-large font-weight-bold "> Panneau d'Administration </span>
              </div>
              <p class="text-body-medium opacity-50 mb-0">
                Bienvenue {{ authStore.userData.name }}, {{ adminType === 'master' ? 'Administrateur Principal' :
                  'Administrateur Local' }}
              </p>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Statistiques rapides -->
    <v-row class="mb-6">
      <v-col
        v-for="stat in quickStats"
        :key="stat.key"
        cols="12"
        :sm="stat.key === 'totalUsers' ? 12 : 6"
        md="4"
      >
        <v-card
          class="pa-4 opacity-100 px-6"
          rounded="xl"
          variant="flat"
          color="surfaceContainerHighest"
          :class="actionNeeded(stat) ? 'action-needed' : ''"
          @click="navigateTo(stat.path)"
        >
          <div class="d-flex align-center">
            <v-avatar
              :color="actionNeeded(stat) ? 'pending' : 'onBackground'"
              variant="tonal"
              size="24"
              class="mr-4"
            >
              <v-icon
                :icon="stat.icon"
                size="12"
              />
            </v-avatar>
            <div>
              <div class="text-title-large font-weight-bold">
                {{ stat.value }}
              </div>
              <div class="text-body-small opacity-50">
                {{ stat.label }}
              </div>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Sections principales -->
    <v-row :class="smAndDown ? 'mx-n4 ' : ''">
      <v-col
        v-for="section in mainSections"
        v-show="!section.requiresMaster || adminType === 'master'"
        :key="section.id"
        :class="smAndDown ? 'mx-0 pa-0 ' : ''"
        cols="12"
        md="6"
        class="mb-4"
      >
        <v-card
          :class="smAndDown ? 'pa-0' : 'pa-6'"
          :rounded="smAndDown ? '0' : 'xl'"
          variant="flat"
          :color="smAndDown ? 'transparent' : 'surface'"
          height="100%"
        >
          <div
            class="d-flex align-center mb-4 "
            :class="smAndDown ? 'px-4' : ''"
          >
            <div>
              <span class="text-body-large font-weight-bold">{{ section.title }}</span>
              <p class="text-body-medium opacity-50 mb-0">
                {{ section.description }}
              </p>
            </div>
          </div>

          <div class="pa-0 d-flex flex-column b">
            <div
              v-for="(item, index) in section.items"
              v-show="!item.requiresMaster || adminType === 'master'"
              :key="item.id"
              v-ripple
              class="cursor-pointer"
              :class="{ 'px-4': smAndDown, 'action-needed': actionNeeded(item) }"
              height="60"
              rounded="xl"
              @click="navigateTo(item.path)"
            >
              <div
                class="d-flex align-center justify-space-between"
                :class="smAndDown ? 'py-6' : 'py-4'"
              >
                <div>
                  <div class="title">
                    {{ item.title }}
                  </div>
                  <div class="subtitle">
                    {{ item.subtitle }}
                  </div>
                </div>
                <v-icon
                  icon="mdi-chevron-right"
                  size="16"
                  color="primary"
                />
              </div>
              <!-- <template v-slot:prepend>
            
                <v-icon  :icon="item.icon" color="onSurface" size="16" />
              </template> -->

              <!-- <template v-slot:append>
                <v-icon icon="mdi-chevron-right" />
              </template> -->
              <v-divider v-if="index !== section.items.length - 1" />
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>

definePage({
  name: 'admin-panel',
  path: '/admin/admin-panel',
  meta: {
    layout: 'default'
  }
})

import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useUserStore } from '@/stores/userStore'
import { useCenterStore } from '@/stores/centerStore'
import { useTicketStore } from '@/stores/ticketStore'
import { useDisplay } from 'vuetify'


const router = useRouter()
const authStore = useAuthStore()
const userStore = useUserStore()
const centerStore = useCenterStore()
const ticketStore = useTicketStore()
const { smAndDown } = useDisplay()

const route = useRoute();

console.log(route.meta)


// Navigation guard - vérifier les droits d'admin
if (!authStore.userData.isAdmin) {
  router.push('/dashboard')
}

const adminType = computed(() => authStore.userData.adminType)

const actionNeeded = (stat) => {
  if (stat.key === 'pendingUsers') {
    return stats.value.pendingUsers > 0
  }
  if (stat.key === 'pendingTickets') {
    return stats.value.pendingTickets > 0
  }
  return false
}

// Statistiques
const stats = ref({
  totalUsers: 0,
  pendingUsers: 0,
  pendingTickets: 0,
  totalCenters: 0
})

// Statistiques rapides pour v-for
const quickStats = computed(() => [
  {
    key: 'totalUsers',
    value: stats.value.totalUsers,
    label: 'Utilisateurs',
    icon: 'mdi-account-group',
    color: 'primary'
  },
  {
    key: 'pendingUsers',
    value: stats.value.pendingUsers,
    label: 'En attente',
    icon: 'mdi-account-clock',
    path: '/admin/pending-users',
    color: 'warning'
  },
  {
    key: 'pendingTickets',
    value: stats.value.pendingTickets,
    label: 'Tickets',
    icon: 'mdi-account-question',
    path: '/admin/tickets',
    color: 'info'
  },
  // {
  //   key: 'totalCenters',
  //   value: stats.value.totalCenters,
  //   label: 'Centres',
  //   icon: 'mdi-airport',
  //   color: 'success'
  // }
])

// Sections principales pour v-for
const mainSections = computed(() => [
  {
    id: 'users',
    title: 'Gestion des Utilisateurs',
    description: 'Gérer les utilisateurs et leurs permissions',
    icon: 'mdi-account-group',
    color: 'primary',
    requiresMaster: false,
    items: [
      {
        id: 'pending-users',
        title: 'Candidatures en attente',
        subtitle: `${stats.value.pendingUsers} utilisateurs en attente d'approbation`,
        icon: 'mdi-account-clock',
        key: 'pendingUsers',
        iconColor: 'warning',
        path: '/admin/pending-users',
        requiresMaster: false
      },
      {
        id: 'all-users',
        title: 'Tous les utilisateurs',
       
        icon: 'mdi-account-multiple',
        iconColor: 'primary',
        path: '/users',
        requiresMaster: false
      }
    ]
  },
  {
    id: 'centers',
    title: 'Centres & Équipes',
    description: 'Gérer les centres et leurs équipes',
    icon: 'mdi-office-building',
    color: 'success',
    requiresMaster: false,
    items: [
      {
        id: 'all-centers',
        title: 'Tous les centres',
    
        icon: 'mdi-office-building-marker',
        iconColor: 'success',
        path: '/center/centers',
        requiresMaster: true
      },
      {
        id: 'teams',
        title: adminType.value === 'master' ? 'Équipes par centre' : 'Mon centre',
       
        icon: 'mdi-account-group',
        iconColor: 'info',
        path: `/center/${authStore.userData.centerId}/teams`,
        requiresMaster: false
      },

      {
        id: 'center-demands',
        title: 'Demandes du centre',
       
        icon: 'mdi-swap-horizontal',
        iconColor: 'remplacement',
        path: '/admin/demands',
        requiresMaster: false
      }
    ]
  },
  {
    id: 'support',
    title: 'Tickets et E-mails',
    description: 'Gérer les demandes de support',
    icon: 'mdi-help-circle',
    color: 'info',
    requiresMaster: false,
    items: [
      {
        id: 'tickets',
        title: 'Tickets de support',
        subtitle: `${stats.value.pendingTickets} tickets en attente`,
        icon: 'mdi-message-question',
        iconColor: 'info',
        key: 'pendingTickets',
        path: '/admin/tickets',
        requiresMaster: false,
        badge: {
          content: stats.value.pendingTickets,
          show: stats.value.pendingTickets > 0,
          color: 'error'
        }
      },
      {
        id: 'emails',
        title: 'Gestion des emails',
       
        icon: 'mdi-email',
        iconColor: 'primary',
        path: '/admin/emails',
        requiresMaster: false
      }
    ]
  },
  {
    id: 'system',
    title: 'Configuration système',
    description: 'Paramètres avancés du système',
    icon: 'mdi-cog',
    color: 'error',
    requiresMaster: false,
    items: [
      {
        id: 'rules',
        title: 'Règles de l\'application',
       
        icon: 'mdi-server-security',
        iconColor: 'error',
        path: '/admin/rules',
        requiresMaster: false
      },
      {
        id: 'announcements',
        title: 'Annonces publiques',
        subtitle: 'Gérer les bannières du tableau de bord',
        icon: 'mdi-bullhorn',
        iconColor: 'primary',
        path: '/admin/announcements',
        requiresMaster: false
      },
      //   {
      //     id: 'account-recovery',
      //     title: 'Récupération de comptes',
      //     subtitle: 'Gérer les demandes de récupération',
      //     icon: 'mdi-account-sync',
      //     iconColor: 'warning',
      //     path: '/admin/account-recovery',
      //     requiresMaster: true
      //   }
    ]
  }
])

// Actions rapides pour v-for
// const quickActions = computed(() => [
//   {
//     id: 'approve-users',
//     title: 'Approuver des candidatures',
//     color: 'primary',
//     icon: 'mdi-account-plus',
//     path: '/admin/pending-users',
//     requiresMaster: false
//   },
//   {
//     id: 'view-tickets',
//     title: 'Voir les tickets',
//     color: 'info',
//     icon: 'mdi-message-question',
//     path: '/admin/tickets',
//     requiresMaster: false
//   },
//   {
//     id: 'configure-rules',
//     title: 'Configurer les règles',
//     color: 'error',
//     icon: 'mdi-server-security',
//     path: '/admin/rules',
//     requiresMaster: true
//   },
//   {
//     id: 'manage-teams',
//     title: 'Gérer les équipes',
//     color: 'success',
//     icon: 'mdi-office-building',
//     path: `/center/${authStore.userData.centerId}/teams`,
//     requiresMaster: false
//   }
// ])

// Fonction de navigation
const navigateTo = (path) => {
  router.push(path)
}

// Charger les statistiques
const loadStats = async () => {
  try {
    // Charger les utilisateurs
    if (authStore.userData.adminType === 'master') {
      await userStore.fetchUsers()
      await centerStore.fetchCenters()
    } else {
      await userStore.fetchUsersByCenter(authStore.userData.centerId)
    }

    // Charger les tickets
    await ticketStore.fetchTickets()

    // Calculer les statistiques
    stats.value.totalUsers = userStore.users.length
    stats.value.pendingUsers = userStore.users.filter(user => user.registrationStatus === 'pending').length
    stats.value.pendingTickets = ticketStore.tickets.filter(ticket => ticket.status != 'closed').length
    stats.value.totalCenters = centerStore.centers.length

  } catch (error) {
    console.error('Erreur lors du chargement des statistiques:', error)
  }
}



onMounted(() => {
  loadStats()
})
</script>

<style scoped>
.admin-panel {
  padding-top: 2rem;
  padding-bottom: 2rem;
}

.admin-type-chip {
  position: absolute;
  top: 16px;
  right: 16px;
}

.v-list-item {
  transition: all 0.2s ease;
}

.v-list-item:hover {
  background-color: rgba(var(--v-theme-primary), 0.04);
}

.gap-3 {
  gap: 12px;
}

@media (max-width: 600px) {
  .admin-panel {
    padding-top: 1rem;
    padding-bottom: 1rem;
  }
}


.action-needed {
  position: relative;
  /* border-radius: 24px !important; */
  color: rgba(var(--v-theme-onPending), 1) !important;
  background-color: rgba(var(--v-theme-pending), 0.01) !important;
  overflow: hidden;
  box-shadow: 0 0 28px 0 rgba(var(--v-theme-pending), 0.4) !important;
}

.title {
  font-size: 14px !important;
  font-weight: 500 !important;
  color: rgba(var(--v-theme-onBackground), 1) !important;
}


.subtitle {
  font-size: 11px !important;
  color: rgba(var(--v-theme-onBackground), 0.5) !important;
}
</style>
