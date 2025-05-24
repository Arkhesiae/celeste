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
    <div class="d-flex justify-space-between">
      <div class="my-16 d-flex flex-column">
        <span class="text-h4 font-weight-medium">Contacter un administrateur</span>
        <span class="text-h4 text-overline text-medium-emphasis">
          Besoin d'aide ? Envoyez un message à un administrateur
        </span>
      </div>
    </div>

    <v-row justify="">
      <v-col cols="12" md="8" lg="6">
        <v-slide-y-transition appear>
          <ContactAdminForm />
        </v-slide-y-transition>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.v-container {
  min-height: 100vh;
}
</style> 