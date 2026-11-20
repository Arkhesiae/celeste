import { useTheme } from 'vuetify';
import { useAuthStore } from '@/stores/authStore';

// Thème sombre ou clair : lire donne le thème courant, écrire change le thème et l'enregistre dans les préférences de l'utilisateur
export function useDarkMode() {
  const theme = useTheme();
  const authStore = useAuthStore();

  const isDark = computed({
    get: () => theme.global.current.value.dark,
    set: (dark) => {
      theme.change(dark ? 'darkTheme' : 'lightTheme');
      authStore.updateUserPreferences({ theme: dark });
    },
  });

  return { isDark };
}
