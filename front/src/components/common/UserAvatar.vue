<template>
  <v-badge :model-value="badge" color="error" icon="mdi-exclamation-thick" overlap location="top start">
    <!-- Avec `ring`, un liseré en dégradé primaire entoure l'avatar (2 px de chaque côté) -->
    <div v-if="ring" class="user-avatar__ring" :style="{ width: `${size + 4}px`, height: `${size + 4}px` }">
      <v-avatar :size="size" variant="flat" class="user-avatar__inner">
        <v-img v-if="src" :src="src" alt="Avatar" />
        <span v-else-if="fallback === 'initial'" class="text-body-small">{{ initial }}</span>
        <v-icon v-else icon="mdi-account" />
      </v-avatar>
    </div>

    <v-avatar v-else :size="size" variant="tonal" :color="color">
      <v-img v-if="src" :src="src" alt="Avatar" />
      <span v-else-if="fallback === 'initial'" class="text-body-small">{{ initial }}</span>
      <v-icon v-else icon="mdi-account" />
    </v-avatar>
  </v-badge>
</template>

<script setup>
import { API_URL } from '@/config/api.js';
import { useAuthStore } from '@/stores/authStore.js';

// Avatar d'un utilisateur ; sans `avatar` ni `name`, celui de l'utilisateur connecté.
const props = defineProps({
  // Diamètre de l'avatar en px (liseré non compris)
  size: {
    type: [Number, String],
    default: 40,
  },
  // Chemin de l'image, tel que le serveur le renvoie (préfixé par API_URL ici)
  avatar: {
    type: String,
    default: undefined,
  },
  name: {
    type: String,
    default: undefined,
  },
  // Liseré en dégradé primaire autour de l'avatar (désactivé : fond teinté de `color`)
  ring: {
    type: Boolean,
    default: true,
  },
  // Pastille rouge « ! » (par exemple : numéro de téléphone manquant)
  badge: {
    type: Boolean,
    default: false,
  },
  // Sans image : l'initiale du nom ou une icône (« icon »)
  fallback: {
    type: String,
    default: 'initial',
    validator: (value) => ['icon', 'initial'].includes(value),
  },
  // Couleur du fond teinté (sans liseré)
  color: {
    type: String,
    default: undefined,
  },
});

const authStore = useAuthStore();

const avatarPath = computed(() => props.avatar ?? authStore.userData?.avatar);
const src = computed(() => (avatarPath.value ? `${API_URL}${avatarPath.value}` : null));
const initial = computed(() => (props.name ?? authStore.userData?.name ?? '').slice(0, 1));
</script>

<style scoped>
.user-avatar__ring {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: linear-gradient(90deg, rgb(var(--v-theme-primary)) 0%, transparent 100%);
}

.user-avatar__inner {
  background-color: color-mix(in srgb, rgb(var(--v-theme-background)) 80%, transparent);
}
</style>
