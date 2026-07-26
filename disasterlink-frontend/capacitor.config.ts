import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.disasterlink.app',
  appName: 'DisasterLink Security',
  webDir: 'dist',
  server: {
    cleartext: true
  }
};

export default config;
