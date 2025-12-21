<template>
    <LoadingScreen>

    </LoadingScreen>
</template>

<script setup>

definePage({
    meta:{
        layout: 'alternative'
    }
});

import { useInitializationStore } from '@/stores/initializationStore';
import { useAppInitialization } from '@/composables/useAppInitialization';
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
const initializationStore = useInitializationStore();
const { initializeApp } = useAppInitialization();
const router = useRouter();
onMounted(async () => {
    if (!initializationStore.isAppReady) {
        await initializeApp();
    }
    
    // Rediriger vers la route en attente ou dashboard par défaut
    const pendingRoute = initializationStore.getPendingRoute() || '/dashboard';
    router.push({ path: pendingRoute });
});

</script>