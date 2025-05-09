import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.remplacer.app',
  appName: 'Remplacer',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config; 