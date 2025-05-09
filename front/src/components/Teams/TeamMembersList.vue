<template>
  <v-list
    bg-color="onBackground"
    rounded="xl"
  >
    <v-list-item
      color="primary"
      rounded="lg"
      bg-color="onBackground"
      v-for="user in members"
      :key="user._id"
    >
      <v-list-item-title>
        {{ user.name }} {{ user.lastName.toUpperCase() }}
      </v-list-item-title>
    </v-list-item>
    <v-list-item
      v-for="user in renforts"
      :key="user._id"
    >
      <v-list-item-title>
        {{ user.name }} {{ user.lastName.toUpperCase() }} (Renfort)
      </v-list-item-title>
    </v-list-item>
  </v-list>
</template>

<script setup>
defineProps({
  members: {
    type: Array,
    required: true
  },
  renforts: {
    type: Array,
    required: true
  }
});
</script> 