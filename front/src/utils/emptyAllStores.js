import { useUserStore } from '@/stores/userStore.js'
import { useSubstitutionStore } from '@/stores/substitutionStore.js'
import { useRotationStore } from '@/stores/rotationStore.js'
import { usePointStore } from '@/stores/pointStore.js'
import { useShiftStore } from '@/stores/shiftStore.js'
import { usePlanningModificationStore } from '@/stores/planningModificationStore.js'
import { useEmailStore } from '@/stores/emailStore.js'

export function emptyAllStores() {
    try {
        // Vider tous les stores qui ont une fonction emptyStore
        const userStore = useUserStore()
        if (userStore.emptyStore) {
            userStore.emptyStore()
        }

        const substitutionStore = useSubstitutionStore()
        if (substitutionStore.emptyStore) {
            substitutionStore.emptyStore()
        }

        const rotationStore = useRotationStore()
        if (rotationStore.emptyStore) {
            rotationStore.emptyStore()
        }

        const pointStore = usePointStore()
        if (pointStore.emptyStore) {
            pointStore.emptyStore()
        }

        const shiftStore = useShiftStore()
        if (shiftStore.emptyStore) {
            shiftStore.emptyStore()
        }

        const planningModificationStore = usePlanningModificationStore()
        if (planningModificationStore.emptyStore) {
            planningModificationStore.emptyStore()
        }

        // Vider le store email qui utilise resetStore
        const emailStore = useEmailStore()
        if (emailStore.resetStore) {
            emailStore.resetStore()
        }

        console.log('Tous les stores ont été vidés avec succès')
    } catch (error) {
        console.error('Erreur lors du vidage des stores:', error)
        throw error
    }
}