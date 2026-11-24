<template>
  <router-view />
</template>

<script setup>
// Racine des pages ouvertes aux visiteurs (tout `pages/(public)/`, groupe sans effet sur l'adresse) : layout `public`, et un compte connecté
// en est renvoyé par le routeur (`meta.public`).
definePage({
  meta: {
    layout: 'public',
    public: true,
  },
});
</script>
