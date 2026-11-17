<script setup>
const props = defineProps({
  isDialogVisible: {
    type: Boolean,
    required: true,
  },
  rotation: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['update:dialogVisible', 'onSubmit']);

const localDialogVisible = computed({
  get: () => props.isDialogVisible,
  set: (value) => emit('update:dialogVisible', value),
});

const newName = ref(props.rotation.name);

const nameRules = [(v) => !!v || 'Le nom est requis'];

const submit = () => {
  emit('onSubmit', { ...props.rotation, name: newName.value });
  localDialogVisible.value = false;
};
</script>

<template>
  <BaseDialog v-model="localDialogVisible" title="Modifier le nom" :max-width="500">
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
