import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';

export function useScrollPosition() {
  const scrollPosition = ref(0);
  const router = useRouter();

  const saveScrollPosition = () => {
    scrollPosition.value = window.scrollY;
  };

  const restoreScrollPosition = () => {
    window.scrollTo(0, scrollPosition.value);
  };

  const resetScroll = () => {
    window.scrollTo(0, 0);
  };

 

  return {
    scrollPosition,
    saveScrollPosition,
    restoreScrollPosition,
    resetScroll
  };
} 