import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.syntaxerror2.disasterlink',
  appName: 'DisasterLink Security',
  webDir: 'dist',
  server: {
    cleartext: true
  }
};

export default config;
