<template>
  <v-slide-y-reverse-transition>
    <div
      v-if="modelValue && smAndDown"
      class="d-flex"
      style="
        margin-top: calc(64px + var(--safe-area-top));
        height: calc(100vh - 64px - var(--safe-area-top) - var(--safe-area-bottom));
        width: 100%;
        z-index: 4000 !important;
        position: fixed;
        top: 0;
        left: 0;
      "
    >
      <v-card
        class="pa-0 px-6 d-flex flex-column align-center flex-0-0 rounded-0"
        tile
        color="background"
        flat
        style="width: 100%; height: 100%; overflow-y: auto"
      >
        <!-- Utilisateur : ouvre le profil ; le bouton à droite déconnecte -->
        <v-scale-transition appear>
          <v-card
            v-if="isLoggedIn"
            max-width="400px"
            color="surfaceContainer"
            flat
            rounded="100"
            class="flex-0-0 my-16 pa-4 d-flex justify-space-between"
            width="100%"
            @click="handleClick(`/profile/${authStore.userData.userId}`)"
          >
            <div class="d-flex justify-space-between align-center ga-2 pl-2">
              <v-badge :model-value="missingPhone" color="error" icon="mdi-exclamation-thick" overlap location="top start">
                <div
                  class="d-flex align-center justify-center"
                  style="
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    background: linear-gradient(90deg, rgb(var(--v-theme-primary)) 0%, transparent 100%);
                    position: relative;
                  "
                >
                  <v-avatar size="32" variant="flat" style="background-color: rgba(var(--v-theme-background), 0.8)">
                    <v-img v-if="authStore.userData.avatar" :src="`${API_URL}${authStore.userData.avatar}`" alt="Avatar" />
                    <span v-else class="text-body-small">{{ authStore.userData.name.slice(0, 1) }}</span>
                  </v-avatar>
                </div>
              </v-badge>

              <div class="d-flex flex-column ml-2">
                <span class="text-title-small">{{ firstName }}</span>
                <span class="text-title-small">
                  <b>{{ lastName }}</b>
                </span>
              </div>
            </div>

            <v-btn
              color="error"
              variant="text"
              icon="mdi-logout"
              aria-label="Se déconnecter"
              @click.stop="handleLogout"
            />
          </v-card>
        </v-scale-transition>

        <div class="d-flex w-100 flex-column" style="max-width: 400px">
          <v-fade-transition v-if="isLoggedIn" group appear>
            <v-list class="pa-0 ga-1 d-flex flex-column" bg-color="transparent" rounded="30">
              <v-list-item
                v-for="link in menuLinks"
                :key="link.path"
                class="bg-surfaceContainer text-body-medium font-weight-bold pa-6 rounded-lg"
                :title="link.title"
                @click="handleClick(link.path)"
              >
                <template #prepend>
                  <v-icon :icon="link.icon" color="primary" />
                </template>
              </v-list-item>
            </v-list>
          </v-fade-transition>

          <v-btn
            v-else
            class="my-8"
            variant="flat"
            rounded="lg"
            color="onBackground"
            append-icon="mdi-arrow-right"
            width="100%"
            style="height: 48px; border-radius: 16px !important"
            @click="handleClick('/login')"
          >
            Se connecter
          </v-btn>

          <!-- Liens externes -->
          <v-list nav class="d-flex justify-space-around align-center pt-8 text-body-small" bg-color="background">
            <template v-for="(link, index) in externalLinks" :key="link.href">
              <v-divider v-if="index > 0" vertical />
              <a :href="link.href" target="_blank" rel="noopener noreferrer" class="d-flex" style="color: inherit; text-decoration: none">
                <span>{{ link.title }}</span>
                <v-icon class="text-medium-emphasis ml-3"> mdi-open-in-new </v-icon>
              </a>
            </template>
          </v-list>

          <div class="d-flex align-center ma-6 justify-space-evenly">
            <span class="text-primary text-body-small font-weight-bold">Celeste</span>
          </div>
        </div>
      </v-card>
    </div>
  </v-slide-y-reverse-transition>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';
import { useAuthStore } from '@/stores/authStore.js';
import { useUserStore } from '@/stores/userStore.js';
import { API_URL } from '@/config/api.js';

defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
});

const emit = defineEmits(['update:modelValue']);

const router = useRouter();
const { smAndDown } = useDisplay();
const authStore = useAuthStore();
const userStore = useUserStore();

const isLoggedIn = computed(() => authStore.isLoggedIn);
const missingPhone = computed(() => !authStore.userData?.phone);

// Les pages principales sont dans la barre du bas ; le tiroir porte le reste
const menuLinks = [
  { title: 'Assistance', path: '/contact-admin', icon: 'mdi-help-circle-outline' },
  { title: 'Informations', path: '/information', icon: 'mdi-information-outline' },
  { title: 'Paramètres', path: '/user-params', icon: 'mdi-cog-outline' },
];

const externalLinks = [
  { title: 'Icnagenda', href: 'https://icnagenda.FR' },
  { title: 'Olafatco', href: 'https://olafatco.dsna.aviation-civile.gouv.fr/gerer-la-licence' },
];

const userInfo = computed(() => userStore.users.find((user) => user._id === authStore.userData.userId));
const firstName = computed(() => {
  const name = userInfo.value?.name ?? '';
  return name.charAt(0).toUpperCase() + name.slice(1);
});
const lastName = computed(() => userInfo.value?.lastName?.toUpperCase() ?? '');

const handleClick = (path) => {
  router.push({ path });
  emit('update:modelValue', false);
};

const handleLogout = async () => {
  await authStore.logOut();
  emit('update:modelValue', false);
  await router.push({ path: '/login', replace: true });
};
</script>
