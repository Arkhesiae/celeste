<template>
  <div>
    <div
      class="position-fixed ma-2 d-flex align-end"
      style="bottom: 0; right: 0 ; z-index: 99"
    >
      <v-btn
        color="background"
        flat
        class="mr-2 auto-login-btn"
        :class="{ 'selected': selectedRole === 'master' }"
        icon="mdi-star-four-points"
        @click="autoLogin('master')"
      >
        Master
      </v-btn>
      <v-btn
        v-if="selectedRole === 'master'"
        color="background"
        flat
        class="mr-2 auto-login-btn"
        icon="mdi-database-plus-outline"
        :loading="seeding"
        @click="seedDefaultConfig"
      >
        Seed LFBB
      </v-btn>
      <v-btn
        color="background"
        flat
        class="mr-2 auto-login-btn"
        :class="{ 'selected': selectedRole === 'admin' }"
        icon="mdi-shield-crown-outline"
        @click="autoLogin('admin')"
      >
        Local
      </v-btn>

      <v-menu
        v-model="showTeamUsers"
        :close-on-content-click="false"
        location="top"
      >
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            color="background"
            flat
            class="mr-2 auto-login-btn"
            :class="{ 'selected': !selectedRole && authStore.isLoggedIn }"
            icon="mdi-account-outline"
            @click="openTeamUsersMenu"
          >
            User
          </v-btn>
        </template>

        <v-card min-width="320" max-height="420" class="overflow-y-auto">
          <v-card-title class="d-flex align-center text-body-1">
            Agents test
            <v-spacer />
            <v-btn
              icon="mdi-refresh"
              variant="text"
              size="small"
              :loading="loadingUsers"
              @click="fetchTeamUsers"
            />
          </v-card-title>
          <v-divider />
          <v-card-text class="pa-0">
            <div v-if="loadingUsers" class="pa-4 text-center text-medium-emphasis">
              Chargement…
            </div>
            <div v-else-if="!teamUsers.length" class="pa-4 text-center text-medium-emphasis">
              Aucun agent. Lance d’abord Seed LFBB.
            </div>
            <v-list v-else density="compact">
              <v-list-item
                v-for="user in sortedTeamUsers"
                :key="user.email"
                :title="userDisplayName(user)"
                :subtitle="user.email"
                @click="autoLoginTeamUser(user)"
              >
                <template #prepend>
                  <v-avatar color="primary" size="32">
                    {{ userInitial(user) }}
                  </v-avatar>
                </template>
                <template v-if="user.isAdmin" #append>
                  <v-chip size="x-small" color="primary" variant="tonal">
                    {{ user.adminType || 'admin' }}
                  </v-chip>
                </template>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-menu>

      <v-btn
        icon="mdi-logout"
        color="error"
        @click="handleLogout"
      />
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/authStore.js';
import { useSnackbarStore } from '@/stores/snackbarStore.js';
import { apiFetch, API_URL } from '@/config/api';

const authStore = useAuthStore();
const snackbarStore = useSnackbarStore();
const router = useRouter();

const seeding = ref(false);
const showTeamUsers = ref(false);
const loadingUsers = ref(false);
const teamUsers = ref([]);

const adminEmail = import.meta.env.VITE_ADMIN_MAIL;
const adminPassword = import.meta.env.VITE_ADMIN_PASS;

const localAdminEmail = import.meta.env.VITE_LOCAL_ADMIN_MAIL || 'admin-lfbb@celeste-app.fr';
const localAdminPassword = import.meta.env.VITE_LOCAL_ADMIN_PASS || 'admin-lfbb';

const TEST_USER_PASSWORD = import.meta.env.VITE_USER_PASS || 'user';

const handleLogout = async () => {
  authStore.logOut();
  await router.push({ path: '/login', replace: true });
};

const selectedRole = computed(() => authStore.userData?.adminType);

const sortedTeamUsers = computed(() =>
  [...teamUsers.value].sort((a, b) =>
    String(a.email).localeCompare(String(b.email), 'fr', { numeric: true })
  )
);

const userDisplayName = (user) => {
  const full = [user.name, user.lastName].filter(Boolean).join(' ');
  return full || user.email;
};

const userInitial = (user) => (user.name || user.email || '?').charAt(0).toUpperCase();

const autoLogin = async (role) => {
  try {
    await authStore.logOut();

    const credentialsByRole = {
      master: { email: adminEmail, password: adminPassword },
      admin: { email: localAdminEmail, password: localAdminPassword },
    };

    const credentials = credentialsByRole[role];
    if (!credentials?.email || !credentials?.password) {
      throw new Error(`Identifiants manquants pour le rôle ${role}`);
    }

    await authStore.logIn(credentials);
    router.push({ path: '/dashboard', replace: true });
  } catch (error) {
    console.error(`Échec de la connexion automatique en tant que ${role}:`, error);
    snackbarStore.showNotification(
      `Connexion ${role} échouée : ${error.message}`,
      'onError',
      'mdi-alert-circle'
    );
  }
};

const fetchTeamUsers = async () => {
  try {
    loadingUsers.value = true;
    // Endpoint public (pas d'auth) — fetch direct pour pouvoir lister hors session
    const response = await fetch(`${API_URL}/users/devlist?role=team`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    teamUsers.value = await response.json();
  } catch (error) {
    console.error('Erreur lors de la récupération des agents test:', error);
    teamUsers.value = [];
    snackbarStore.showNotification(
      `Impossible de charger les agents : ${error.message}`,
      'onError',
      'mdi-alert-circle'
    );
  } finally {
    loadingUsers.value = false;
  }
};

const openTeamUsersMenu = async () => {
  if (!teamUsers.value.length) {
    await fetchTeamUsers();
  }
};

const autoLoginTeamUser = async (user) => {
  try {
    showTeamUsers.value = false;
    await authStore.logOut();
    await authStore.logIn({
      email: user.email,
      password: TEST_USER_PASSWORD,
    });
    router.push({ path: '/dashboard', replace: true });
  } catch (error) {
    console.error('Échec de la connexion agent:', error);
    snackbarStore.showNotification(
      `Connexion agent échouée : ${error.message}`,
      'onError',
      'mdi-alert-circle'
    );
  }
};

const seedDefaultConfig = async () => {
  try {
    seeding.value = true;
    const result = await apiFetch('/dev/seed-default-config', { method: 'POST' });
    const summary = [
      result.center?.created ? 'centre LFBB' : 'centre LFBB (existant)',
      `${result.teams?.created ?? 0} équipe(s)`,
      `${result.agents?.created ?? 0} agent(s)`,
      result.rotation?.created ? 'TDS Densifié Ete' : 'TDS (existant)',
    ].join(', ');
    snackbarStore.showNotification(
      `Seed OK : ${summary}`,
      'onSuccess',
      'mdi-check-circle'
    );
    await fetchTeamUsers();
  } catch (error) {
    console.error('Échec du seed LFBB:', error);
    snackbarStore.showNotification(
      `Seed échoué : ${error.message}`,
      'onError',
      'mdi-alert-circle'
    );
  } finally {
    seeding.value = false;
  }
};
</script>


<style scoped>
  .auto-login-btn {
    border-radius: 16px !important;
    padding: 8px 16px !important;
    font-size: 11px !important;
    font-weight: 500 !important;
    border: 1px solid rgba(var(--v-theme-surface), 0.8) !important;
  }

  .auto-login-btn.selected {
    border: 1px solid rgba(var(--v-theme-primary), 1) !important;
  }
</style>
