  <template>
    <v-dialog transition="scroll-x-reverse-transition" v-model="localDialogVisible" max-width="500px" :fullscreen="smAndDown">
    <v-card :rounded="smAndDown ? '' : 'xl'"  class="pa-0 pt-6">
      <v-card-item class="py-1 px-6 mb-2">
        <v-card-title class="d-flex justify-space-between align-center">Modifier l'avatar</v-card-title>
        <template #append v-if="!smAndDown">
          <v-btn icon="mdi-close" variant="text" @click="close"></v-btn>
        </template>
        <template #prepend v-else>
          <v-btn icon="mdi-arrow-left" variant="text" @click="close"></v-btn>
        </template>
        <span class="text-subtitle-2">Taille max : 10MB (une erreur ne permet pas la persistance pour le moment)</span>
      </v-card-item>

      <v-card-text class="px-6">
        <v-form ref="form" v-model="valid">
          <div class="d-flex flex-column py-6">
         
            
            <v-file-input
              v-model="selectedFile"
              accept="image/*"
              label="Choisir une image"
              prepend-icon="mdi-camera"
              variant="solo-filled"
              flat
              color="primary"
              rounded="xl"
              bg-color="surface"
              
              @update:model-value="handleFileSelect"
            ></v-file-input>

            <v-btn
              v-if="previewUrl"
              color="error"
              height="48px"
              variant="tonal"
              rounded="xl"
              class="mt-4"
              @click="removeImage"
            >
              Supprimer l'image
            </v-btn>
          </div>
        </v-form>
      </v-card-text>

      <v-card-actions class="pa-6">
        <v-spacer></v-spacer>
        <v-btn
          color="primary"
          variant="text"
          rounded="xl"
          @click="close"
          :disabled="loading"

        >
          Annuler
        </v-btn>
        <v-btn
          color="primary"
          variant="tonal"
          rounded="xl"
          @click="submit"
          :loading="loading"
          :disabled="!valid || (!selectedFile && !previewUrl)"

        >
          Enregistrer
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useDisplay } from 'vuetify'
import { useAuthStore } from '@/stores/authStore'
import { useSnackbarStore } from '@/stores/snackbarStore'

const STORAGE_KEY = 'authData';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'success', 'error'])

const { smAndDown } = useDisplay()
const authStore = useAuthStore()
const snackbarStore = useSnackbarStore()
const form = ref(null)
const valid = ref(false)
const loading = ref(false)
const selectedFile = ref(null)
const previewUrl = ref(null)

const localDialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const handleFileSelect = (file) => {
  if (file) {
    previewUrl.value = URL.createObjectURL(file)
  } else {
    previewUrl.value = null
  }
}

const removeImage = () => {
  selectedFile.value = null
  previewUrl.value = null
}

const close = () => {
  selectedFile.value = null
  previewUrl.value = null
  localDialogVisible.value = false
}

const submit = async () => {
  try {
    loading.value = true
    const formData = new FormData()
    formData.append('avatar', selectedFile.value)
    await authStore.updateAvatar(formData)
    snackbarStore.showNotification('Avatar mis à jour avec succès', 'success')
    close()
  } catch (error) {
    const errorMessage = error.message || "Erreur lors de la mise à jour de l'avatar"
    snackbarStore.showNotification(errorMessage, 'error')
    emit('error', error)
  } finally {
    loading.value = false
  }
}
</script>  