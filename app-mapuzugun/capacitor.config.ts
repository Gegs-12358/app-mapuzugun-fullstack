import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'cl.kimanke.app',
  appName: 'Kimanke',
  webDir: 'www/browser',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    // Ícono blanco de la barra de notificaciones (lo genera scripts/crear_icono_notificacion.py)
    LocalNotifications: {
      smallIcon: 'ic_stat_kimanke',
      iconColor: '#5B2A86'
    }
  }
};

export default config;