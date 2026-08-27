import { Capacitor } from '@capacitor/core';
import { HapticEngine, KeepAwake } from './native/forge-device';
import { RestTimer } from './native/rest-timer';
import { initNativeChrome, hideSplash } from './native/chrome';
import { initBackHandler } from './native/back-button';

// Bridge Native Haptics to FORGE window.Haptics
window.Haptics = {
  light: () => HapticEngine.tabSwitch(),
  medium: () => HapticEngine.setLoggedNormal(),
  heavy: () => HapticEngine.setLoggedFailure(),
  success: () => HapticEngine.setLoggedNormal(),
  warmup: () => HapticEngine.setLoggedWarmup(),
  failure: () => HapticEngine.setLoggedFailure(),
  restStart: () => HapticEngine.restTimerStart(),
  restEnd: () => HapticEngine.restTimerEnd(),
};

// Expose native helpers globally for FORGE runtime
window.FORGEKeepAwake = KeepAwake;
window.FORGERestTimer = RestTimer;

// UI bridge for Android hardware back button
const uiBridge = {
  closeTopLayer: () => {
    const activeOverlay = document.querySelector('.overlay.show, #restOv.show, .modal.show');
    if (activeOverlay) {
      activeOverlay.classList.remove('show');
      return true;
    }
    return false;
  },
  goBack: () => {
    const activeTab = document.querySelector('.nav-btn.active, .tab-btn.active');
    if (activeTab && activeTab.dataset?.tab !== 'dashboard') {
      const dashBtn = document.querySelector('[data-tab="dashboard"]');
      if (dashBtn) {
        dashBtn.click();
        return true;
      }
    }
    return false;
  }
};

if (Capacitor.isNativePlatform()) {
  initNativeChrome();
  initBackHandler(uiBridge);
  window.addEventListener('DOMContentLoaded', () => {
    hideSplash();
  });
}
