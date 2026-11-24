<template>
  <div>
    <!-- Membres, candidatures et mutations reliés en un seul groupe (les deux dernières : administrateurs) -->
    <v-container v-if="isAdmin" class="pb-0">
      <div class="d-flex justify-center mt-4">
        <v-btn-toggle
          :model-value="section"
          mandatory
          connected
          variant="flat"
          color="primary"
          :size="smAndDown ? 'small' : 'default'"
          aria-label="Utilisateurs"
          @update:model-value="goTo"
        >
          <v-btn v-for="item in sections" :key="item.value" :value="item.value" :prepend-icon="item.icon">
            {{ item.title }}
            <v-badge
              v-if="item.badge > 0"
              color="error"
              :content="item.badge"
              inline
              class="ml-2"
              :aria-label="`${item.badge} en attente`"
            />
          </v-btn>
        </v-btn-toggle>
      </div>
    </v-container>

    <router-view />
  </div>
</template>

<script setup>
// Membres, candidatures et mutations reliés en un seul groupe, le contenu de la page est dessous (`<router-view />`). Les deux jeux de pages
// (`pages/(tabs)/center/users*` pour le centre, `pages/admin/users*` pour l'administration) l'utilisent avec leur adresse de base.
import { useRoute, useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';
import { useAuthStore } from '@/stores/authStore.js';
import { useUserStore } from '@/stores/userStore.js';
import { useCenterTransferStore } from '@/stores/centerTransferStore.js';

defineOptions({
  name: 'UsersSections',
});

const props = defineProps({
  // Adresse des pages : `/center/users` ou `/admin/users`
  basePath: {
    type: String,
    required: true,
  },
});

const route = useRoute();
const router = useRouter();
const { smAndDown } = useDisplay();
const authStore = useAuthStore();
const userStore = useUserStore();
const transferStore = useCenterTransferStore();

// Les demandes de mutation à accepter donnent leur pastille à l'onglet « Mutations »
onMounted(() => {
  if (isAdmin.value) transferStore.fetchAll().catch(() => {});
});

const isAdmin = computed(() => authStore.userData.isAdmin);

const pendingUsersCount = computed(
  () => userStore.users.filter((user) => user.registrationStatus === 'pending').length,
);

const sections = computed(() => [
  { value: 'members', path: props.basePath, title: 'Utilisateurs', icon: 'mdi-account-group-outline' },
  {
    value: 'candidatures',
    path: `${props.basePath}/candidatures`,
    title: 'Candidatures',
    icon: 'mdi-account-clock-outline',
    badge: pendingUsersCount.value,
  },
  {
    value: 'mutations',
    path: `${props.basePath}/mutations`,
    title: 'Mutations',
    icon: 'mdi-swap-horizontal',
    badge: transferStore.pendingCount,
  },
]);

const section = computed(() => sections.value.find((item) => item.path === route.path)?.value ?? 'members');

const goTo = (value) => {
  const target = sections.value.find((item) => item.value === value);
  if (target && value !== section.value) router.push({ path: target.path, query: route.query });
};
</script>
