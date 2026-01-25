
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useUserStore } from '@/stores/userStore'
import { useCenterStore } from '@/stores/centerStore'
import { useTicketStore } from '@/stores/ticketStore'

export function useAdminData () {
    const router = useRouter()
    const authStore = useAuthStore()
    const userStore = useUserStore()
    const centerStore = useCenterStore()
    const ticketStore = useTicketStore()

    const adminType = computed(() => authStore.userData.adminType)

    const stats = ref({
        totalUsers: 0,
        pendingUsers: 0,
        pendingTickets: 0,
        totalCenters: 0
    })

    // Action needed logic
    const actionNeeded = (stat) => {
        if (stat.key === 'pendingUsers') {
            return stats.value.pendingUsers > 0
        }
        if (stat.key === 'pendingTickets') {
            return stats.value.pendingTickets > 0
        }
        return false
    }

    // Quick stats
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
        }
    ])

    // Main sections logic
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
                    subtitle: 'Voir et gérer tous les utilisateurs',
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
                    subtitle: 'Gérer tous les centres du système',
                    icon: 'mdi-office-building-marker',
                    iconColor: 'success',
                    path: '/center/centers',
                    requiresMaster: true
                },
                {
                    id: 'teams',
                    title: adminType.value === 'master' ? 'Équipes par centre' : 'Mon centre',
                    subtitle: adminType.value === 'master' ? 'Gérer les équipes de chaque centre' : 'Gérer les équipes de mon centre',
                    icon: 'mdi-account-group',
                    iconColor: 'info',
                    path: `/center/${authStore.userData.centerId}/teams`,
                    requiresMaster: false
                },
                {
                    id: 'center-demands',
                    title: 'Demandes du centre',
                    subtitle: 'Voir toutes les demandes de remplacement et permutation',
                    icon: 'mdi-swap-horizontal',
                    iconColor: 'remplacement',
                    path: '/admin/demands',
                    requiresMaster: false
                }
            ]
        },
        {
            id: 'support',
            title: 'Support & Tickets',
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
                    subtitle: 'Envoyer et gérer les emails',
                    icon: 'mdi-email',
                    iconColor: 'primary',
                    path: '/admin/emails',
                    requiresMaster: false
                }
            ]
        },
        {
            id: 'system',
            title: 'Configuration Système',
            description: 'Paramètres avancés du système',
            icon: 'mdi-cog',
            color: 'error',
            requiresMaster: true,
            items: [
                {
                    id: 'rules',
                    title: 'Règles de l\'application',
                    subtitle: 'Configurer les règles système',
                    icon: 'mdi-server-security',
                    iconColor: 'error',
                    path: '/admin/rules',
                    requiresMaster: true
                }
            ]
        }
    ])

    // Load stats
    const loadStats = async () => {
        try {
            if (authStore.userData.adminType === 'master') {
                await userStore.fetchUsers()
                await centerStore.fetchCenters()
            } else {
                await userStore.fetchUsersByCenter(authStore.userData.centerId)
            }

            await ticketStore.fetchTickets()

            stats.value.totalUsers = userStore.users.length
            stats.value.pendingUsers = userStore.users.filter(user => user.registrationStatus === 'pending').length
            stats.value.pendingTickets = ticketStore.tickets.filter(ticket => ticket.status != 'closed').length
            stats.value.totalCenters = centerStore.centers.length

        } catch (error) {
            console.error('Erreur lors du chargement des statistiques:', error)
        }
    }

    return {
        stats,
        adminType,
        quickStats,
        mainSections,
        loadStats,
        actionNeeded,
        authStore // Export authStore if needed for user name display
    }
}
