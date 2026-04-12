<template>
    <div>
        <v-alert v-if="!authStore.userData.centerId" color="error" variant="tonal" rounded="xl" class="mb-4 pa-4"
            icon="mdi-alert-outline" style="cursor: pointer;"
            @click="router.push('/profile/' + authStore.userData.userId)">
            <AlertContent title="Aucun centre assigné" chevron>
                <template #default>
                    <div class="text-medium-emphasis">Vous n'avez pas de centre assigné.</div>
                    <div>Vous n'appartenez à aucun centre. Le site ne sera pas fonctionnel.</div>
                </template>
            </AlertContent>
        </v-alert>

        <v-alert v-if="!teamStore.currentTeam" color="error" variant="tonal" rounded="xl" class="mb-4 pa-4"
            icon="mdi-alert-circle-outline" style="cursor: pointer;"
            @click="router.push('/profile/' + authStore.userData.userId)">
            <AlertContent title="Aucune équipe assignée" chevron>
                <template #default>
                    <div class="text-medium-emphasis">Vous n'avez pas d'équipe assignée. Vous ne pourrez pas effectuer
                        de remplacements ou de permutations.</div>
                    <div>Pour assigner une équipe, veuillez vous rendre sur la page profil.</div>
                </template>
            </AlertContent>
        </v-alert>

        <v-alert v-if="teamStore.currentTeam && !teamStore.currentTeam.cycleStartDate" color="error" variant="tonal"
            rounded="xl" class="mb-4 pa-4" icon="mdi-alert-outline" style="cursor: pointer;"
            @click="router.push('/contact-admin')">
            <AlertContent title="Equipe inactive" chevron>
                <template #default>
                    <div class="text-medium-emphasis">Votre équipe est inactive.</div>
                    <div>Vous ne pouvez pas poster de demandes de remplacements ou de permutations mais vous pourrez toujours en recevoir car votre équipe n'a pas
                        encore de début de cycle défini.</div>
                </template>
            </AlertContent>
        </v-alert>

        <v-alert v-if="!activeRotation" color="error" variant="tonal" rounded="xl" class="mb-4 pa-4"
            icon="mdi-alert-outline" style="cursor: pointer;"
            @click="router.push('/profile/' + authStore.userData.userId)">
            <AlertContent title="Aucun tour de service actif">
                <template #default>
                    <div class="text-medium-emphasis">Aucun tour de service n'est actuellement actif.</div>
                    <div>Sans tour de service actif, vous ne pourrez pas effectuer de remplacements ou de permutations.
                        Veuillez contacter un administrateur.</div>
                </template>
            </AlertContent>
        </v-alert>
    </div>
</template>

<script setup>
import { useAuthStore } from '@/stores/authStore';
import { useTeamStore } from '@/stores/teamStore';
import { useRotationStore } from '@/stores/rotationStore';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const teamStore = useTeamStore();
const rotationStore = useRotationStore();
const router = useRouter();

const activeRotation = computed(() =>
    rotationStore.sortedRotations.find(r => r.status === 'active') ?? null
);
</script>