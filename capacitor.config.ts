import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jvillot.grassrootsmanager',
  appName: 'Grassroots Manager',
  webDir: 'dist',
  backgroundColor: '#0b1120',
  android: {
    allowMixedContent: false,
  },
};

export default config;
