

export function useCenterScopedResource(fetchFn) {
  const itemsByCenter = ref({});
  const loadingCenterId = ref(null);
  const selectedCenterId = ref(null);

  const items = computed(() => {
    if (!selectedCenterId.value) return [];
    return itemsByCenter.value[selectedCenterId.value] || [];
  });

  const fetchForCenter = async (centerId, { force = false } = {}) => {
    if (!centerId) return;
    if (itemsByCenter.value[centerId] && !force) {
      selectedCenterId.value = centerId;
      return;
    }
    loadingCenterId.value = centerId;
    try {
      itemsByCenter.value[centerId] = await fetchFn(centerId);
      selectedCenterId.value = centerId;
    } finally {
      loadingCenterId.value = null;
    }
  };

  return { items, selectedCenterId, loadingCenterId, fetchForCenter };
}