<script setup>
const props = defineProps({
  rotation: {
    type: Object,
    required: true,
  },
});

const modelValue = defineModel({ type: Boolean, required: true });
const emit = defineEmits(['onSubmit']);

const newName = ref(props.rotation.name);

const nameRules = [(v) => !!v || 'Le nom est requis'];

const submit = () => {
  emit('onSubmit', { ...props.rotation, name: newName.value });
  modelValue.value = false;
};
</script>

<template>
  <BaseDialog v-model="modelValue" title="Modifier le nom" :max-width="500">
    <p class="text-medium-emphasis text-body-medium mb-4">Modifiez le nom du tour de service</p>
    <v-text-field
      v-model="newName"
      label="Nom du tour de service"
      :rules="nameRules"
      variant="outlined"
      rounded="xl"
      hide-details="auto"
    />

    <template #actions>
      <v-spacer />
      <v-btn color="primary" :disabled="!newName" @click="submit">Enregistrer</v-btn>
    </template>
  </BaseDialog>
</template>
