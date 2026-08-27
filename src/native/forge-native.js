import { registerPlugin } from '@capacitor/core';

/**
 * Custom Kotlin Native Bridge plugin for composite haptics, keep-awake, and Android safe area insets.
 */
export const ForgeNative = registerPlugin('ForgeNative', {
  web: () => ({
    hapticWaveform: async () => {},
    keepScreenOn: async () => {},
    getSafeAreaInsets: async () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  }),
});
