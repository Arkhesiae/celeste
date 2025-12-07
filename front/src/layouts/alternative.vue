<template>


    
        <v-main>
          <router-view   v-slot="{ Component, route }">
            <transition name="fade" mode="out-in">

                <component :is="Component"   />
      
          </transition>
        </router-view>
        </v-main>
   
   
</template>


<script setup>
// Layout minimaliste sans app bar ni navigation
</script>

<style scoped>

</style> 