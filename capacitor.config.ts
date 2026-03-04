import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.giapha.app',
  appName: 'Gia Pha',
  webDir: 'app-launcher',
  server: {
    cleartext: true,
    allowNavigation: [
      '*'
    ]
  }
};

export default config;
