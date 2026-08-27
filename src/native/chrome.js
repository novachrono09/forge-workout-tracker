import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { RestTimer, REST_END_ID, REST_HALF_ID } from './rest-timer';
import { ForgeNative } from './forge-native';

export async function initNativeChrome(router) {
  if (!Capacitor.isNativePlatform()) return;

  await RestTimer.createChannel();

  try {
    await StatusBar.setOverlaysWebView({ overlay: true });
    await StatusBar.setStyle({ style: Style.Dark });
  } catch (_) {}

  try {
    const insets = await ForgeNative.getSafeAreaInsets();
    for (const side of ['top', 'bottom', 'left', 'right']) {
      if ((insets[side] ?? 0) > 0) {
        document.documentElement.style.setProperty(`--safe-${side}`, `${insets[side]}px`);
      }
    }
  } catch (_) {}

  LocalNotifications.addListener('localNotificationActionPerformed', (e) => {
    if (e.notification.id === REST_END_ID || e.notification.id === REST_HALF_ID) {
      if (router?.open) router.open('session');
    }
  });

  App.addListener('appStateChange', ({ isActive }) => {
    if (isActive && RestTimer.active && RestTimer.remaining === 0) {
      RestTimer.finish(true);
    }
  });
}

export async function hideSplash() {
  if (Capacitor.isNativePlatform()) {
    try {
      await SplashScreen.hide({ fadeOutDuration: 220 });
    } catch (_) {}
  }
}
