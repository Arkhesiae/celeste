// Utilities
import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', {
  state: () => ({
    isLoggedIn: false,
    user: null,
    accessToken : null,
    compteur  : 0,
    userPreferences : {
      theme : false
    },
  }),
  actions: {
    setTheme(theme) {
      this.userPreferences.theme = theme
    },


  },
})
