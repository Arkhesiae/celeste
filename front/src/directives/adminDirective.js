import { useAuthStore } from '@/stores/authStore';

export const vAdmin = {
  mounted(el, binding) {
    const authStore = useAuthStore();
    const requiredAdminType = binding.value;

    if (!authStore.isAdmin || authStore.adminType !== requiredAdminType) {
      el.parentNode?.removeChild(el);
    }
  }
}; 