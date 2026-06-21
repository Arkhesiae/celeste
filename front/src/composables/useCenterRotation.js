import { useCenterScopedResource } from '../composables/useCenterScopedRessource.js';
import { rotationService } from '@/services/rotationService.js';

export function useCenterRotations() {
  const { items: rotations, ...rest } = useCenterScopedResource(
    (centerId) => rotationService.fetchRotations(centerId)
  );
  return { rotations, ...rest };
}