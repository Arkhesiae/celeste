<script setup>
import ContactAdminForm from "@/components/Forms/ContactAdminForm.vue";
import { useDisplay } from 'vuetify';

const { smAndDown } = useDisplay();

defineOptions({
  name: "ContactAdmin"
});
</script>

<template>
  <v-container>
    <MainTitle title="Contacter un administrateur" subtitle="Besoin d'aide ? Envoyez un message à un administrateur" />

    <v-row >
      <v-col cols="12" >
        <v-slide-y-transition appear>
          <ContactAdminForm admins="both" />
        </v-slide-y-transition>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>

</style> 