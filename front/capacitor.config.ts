import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'fr.celeste.app',
  appName: 'celeste',
  webDir: 'dist',
  
  plugins: {
    SplashScreen: {
      launchShowDuration: 0
    }
  },

};

export default config;
