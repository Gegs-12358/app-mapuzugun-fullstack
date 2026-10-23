import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'cl.kimanke.app',
  appName: 'Kimanke',
  webDir: 'www/browser',
  server: {
    androidScheme: 'https'
  }
};

export default config;