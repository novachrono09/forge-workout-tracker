import { App } from '@capacitor/app';
import { HapticEngine } from './forge-device';

let lastBackPress = 0;
const EXIT_WINDOW_MS = 2000;

export function initBackHandler(ui) {
  App.addListener('backButton', () => {
    if (ui?.closeTopLayer && ui.closeTopLayer()) return;
    if (ui?.goBack && ui.goBack()) return;

    const now = Date.now();
    if (now - lastBackPress < EXIT_WINDOW_MS) {
      App.exitApp();
    } else {
      lastBackPress = now;
      HapticEngine.tabSwitch();
      if (window.toast) {
        window.toast('Press back again to exit FORGE');
      }
    }
  });
}
