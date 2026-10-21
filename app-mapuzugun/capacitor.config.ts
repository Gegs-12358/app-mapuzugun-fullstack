import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',   // CAMBIAR antes de publicar en una tienda (ver nota)
  appName: 'Kimanke',
  webDir: 'www',
  server: {
    androidScheme: 'https'     // coincide con https://localhost en CORS_ORIGIN
  }
};

export default config;