<template>
  <GenericDialog title="Modifier l'avatar" v-model="modelValue" :fullscreen="smAndDown">
    <template #content>
      <span class="text-subtitle-2">
        Taille max : 10MB (une erreur ne permet pas la persistance pour le moment)
      </span>

      <v-form ref="form" v-model="valid" class="d-flex flex-column py-6">
        <v-file-input v-model="selectedFile" accept="image/*" label="Choisir une image" prepend-icon="mdi-camera"
          variant="solo-filled" flat color="primary" rounded="xl" bg-color="surface"
          @update:model-value="handleFileSelect" />

        <v-btn v-if="previewUrl" color="error" height="48px" variant="tonal" rounded="xl" class="mt-4"
          @click="removeImage">
          Supprimer l'image
        </v-btn>
      </v-form>
    </template>

    <template #footer>
      <div class="d-flex justify-space-between align-center">
        <v-btn color="primary" variant="text" rounded="xl" :disabled="loading" @click="close">
          Annuler
        </v-btn>
        <v-btn color="primary" variant="tonal" rounded="xl" :loading="loading"
          :disabled="!valid || (!selectedFile && !previewUrl)" @click="submit">
          Enregistrer
        </v-btn>
      </div>
    </template>
  </GenericDialog>
</template>

<script setup>
import { useDisplay } from 'vuetify'
import { useAuthStore } from '@/stores/authStore'
import { useSnackbarStore } from '@/stores/snackbarStore'

const { smAndDown } = useDisplay()
const authStore = useAuthStore()
const snackbarStore = useSnackbarStore()

const modelValue = defineModel({ type: Boolean, default: false })
const emit = defineEmits(['success', 'error'])

const form = ref(null)
const valid = ref(false)
const loading = ref(false)
const selectedFile = ref(null)
const previewUrl = ref(null)

watch(modelValue, (value) => {
  if (!value) resetForm()
})

const resetForm = () => {
  selectedFile.value = null
  previewUrl.value = null
  form.value?.reset()
}

const handleFileSelect = (file) => {
  previewUrl.value = file ? URL.createObjectURL(file) : null
}

const removeImage = () => {
  selectedFile.value = null
  previewUrl.value = null
}

const close = () => {
  modelValue.value = false
}

const submit = async () => {
  loading.value = true
  try {
    const formData = new FormData()
    formData.append('avatar', selectedFile.value)
    await authStore.updateAvatar(formData)
    snackbarStore.showNotification('Avatar mis à jour avec succès', 'success')
    close()
  } catch (error) {
    const message = error.message || "Erreur lors de la mise à jour de l'avatar"
    snackbarStore.showNotification(message, 'error')
    emit('error', error)
  } finally {
    loading.value = false
  }
}
</script>