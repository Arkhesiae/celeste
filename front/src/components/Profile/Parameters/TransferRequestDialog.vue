<template>
  <v-dialog v-model="localDialogVisible" max-width="500px" :fullscreen="smAndDown">
    <v-card :rounded="smAndDown ? '' : 'xl'"  class="pa-0 pt-6">
      <v-card-item class="py-1 px-6 mb-2">
        <v-card-title class="d-flex justify-space-between align-center">Demander une mutation</v-card-title>
        <template #append v-if="!smAndDown">
          <v-btn icon="mdi-close" variant="text" @click="close"></v-btn>
        </template>
        <template #prepend v-else>
          <v-btn icon="mdi-arrow-left" variant="text" @click="close"></v-btn>
        </template>
      </v-card-item>

      <v-card-text class="px-6">
        <v-form ref="form" v-model="valid">
          <v-select
            v-model="selectedCenter"
            :items="centers"
            label="Centre de destination"
            prepend-inner-icon="mdi-office-building-outline"
            variant="outlined"
            color="primary"
            rounded="xl"
            bg-color="surface"
            hide-details="auto"
            :rules="[v => !!v || 'Le centre de destination est requis']"
          ></v-select>

          <v-textarea
            v-model="reason"
            label="Motif de la demande"
            prepend-inner-icon="mdi-text-box-outline"
            variant="outlined"
            color="primary"
            rounded="xl"
            bg-color="surface"
            hide-details="auto"
            class="mt-4"
            :rules="[v => !!v || 'Le motif est requis']"
          ></v-textarea>
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
          :disabled="!valid"

        >
          Envoyer la demande
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useDisplay } from 'vuetify'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'success', 'error'])

const { smAndDown } = useDisplay()
const form = ref(null)
const valid = ref(false)
const loading = ref(false)
const selectedCenter = ref('')
const reason = ref('')

// TODO: Remplacer par la liste réelle des centres
const centers = [
  'Centre A',
  'Centre B',
  'Centre C'
]

const localDialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => {
    emit('update:modelValue', value)
    if (!value) {
      resetForm()
    }
  }
})

const resetForm = () => {
  selectedCenter.value = ''
  reason.value = ''
  form.value?.reset()
}

const close = () => {
  localDialogVisible.value = false
}

const submit = async () => {
  if (!form.value?.validate()) return

  loading.value = true
  try {
    // TODO: Implémenter l'appel API pour envoyer la demande de mutation
    await new Promise(resolve => setTimeout(resolve, 1000))
    emit('success', 'Votre demande de mutation a été envoyée avec succès')
    close()
  } catch (error) {
    emit('error', error.message || 'Une erreur est survenue')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>

.v-btn {
  text-transform: none;
  letter-spacing: 0;
}
</style> 