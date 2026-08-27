import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { ForgeNative } from './forge-native';

const NATIVE = Capacitor.isNativePlatform();
const webVibrate = (pattern) => {
  try {
    navigator.vibrate?.(pattern);
  } catch (_) {}
};

export const HapticEngine = {
  setLoggedWarmup: () => (NATIVE ? Haptics.impact({ style: ImpactStyle.Light }) : webVibrate(10)),
  setLoggedNormal: () => (NATIVE ? Haptics.impact({ style: ImpactStyle.Medium }) : webVibrate(25)),
  setLoggedFailure: () =>
    NATIVE ? ForgeNative.hapticWaveform({ pattern: [0, 70, 90, 70] }) : webVibrate([70, 90, 70]),
  restTimerStart: () => (NATIVE ? Haptics.vibrate({ duration: 20, intensity: 0.6 }) : webVibrate(20)),
  restTimerEnd: () =>
    NATIVE ? ForgeNative.hapticWaveform({ pattern: [0, 220, 130, 220] }) : webVibrate([220, 130, 220]),
  tabSwitch: () => (NATIVE ? Haptics.selection() : webVibrate(8)),
};

let webLock = null;
export const KeepAwake = {
  async enable() {
    if (NATIVE) return ForgeNative.keepScreenOn({ keep: true });
    try {
      if ('wakeLock' in navigator) {
        webLock = await navigator.wakeLock.request('screen');
      }
    } catch (_) {}
  },
  async disable() {
    if (NATIVE) return ForgeNative.keepScreenOn({ keep: false });
    try {
      await webLock?.release();
      webLock = null;
    } catch (_) {}
  },
};
