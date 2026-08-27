import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { HapticEngine } from './forge-device';

export const REST_END_ID = 9101;
export const REST_HALF_ID = 9102;
const NATIVE = Capacitor.isNativePlatform();

let state = { active: false, endAt: 0, ticker: null, onComplete: null };

export const RestTimer = {
  get active() {
    return state.active;
  },
  get remaining() {
    return Math.max(0, state.endAt - Date.now());
  },

  async ensurePermissions() {
    if (!NATIVE) return true;
    try {
      const { display } = await LocalNotifications.checkPermissions();
      if (display === 'granted') return true;
      const res = await LocalNotifications.requestPermissions();
      return res.display === 'granted';
    } catch (_) {
      return false;
    }
  },

  async createChannel() {
    if (!NATIVE || Capacitor.getPlatform() !== 'android') return;
    try {
      await LocalNotifications.createChannel({
        id: 'forge-rest',
        name: 'Rest Timer',
        description: 'Rest countdown completion alerts',
        importance: 4,
        visibility: 1,
        vibration: true,
        lights: true,
        lightColor: 'FF6B35',
        sound: 'rest_complete',
      });
    } catch (_) {}
  },

  async start(seconds, { label = 'Next set — push the iron.', halfwayReminder = false, onComplete } = {}) {
    await this.cancel();
    state = { active: true, endAt: Date.now() + seconds * 1000, ticker: null, onComplete };

    if (NATIVE) {
      try {
        const notifications = [
          {
            id: REST_END_ID,
            channelId: 'forge-rest',
            title: 'FORGE — Rest Complete',
            body: label,
            schedule: { at: new Date(state.endAt), allowWhileIdle: true },
          },
        ];
        if (halfwayReminder && seconds >= 120) {
          notifications.push({
            id: REST_HALF_ID,
            channelId: 'forge-rest',
            title: 'FORGE — Halfway Rest',
            body: `${Math.round(seconds / 2)}s left`,
            schedule: { at: new Date(state.endAt - (seconds * 1000) / 2), allowWhileIdle: true },
          });
        }
        await LocalNotifications.schedule({ notifications });
      } catch (_) {}
    }

    state.ticker = setInterval(() => {
      if (Date.now() >= state.endAt) {
        this.finish(true);
      } else {
        document.dispatchEvent(
          new CustomEvent('forge:rest-tick', { detail: { remaining: this.remaining } })
        );
      }
    }, 250);

    HapticEngine.restTimerStart();
  },

  async finish(local = false) {
    const cb = state.onComplete;
    await this.cancel();
    if (local) {
      HapticEngine.restTimerEnd();
      cb?.();
    }
  },

  async cancel() {
    if (state.ticker) clearInterval(state.ticker);
    if (NATIVE) {
      try {
        const ids = [{ id: REST_END_ID }, { id: REST_HALF_ID }];
        await LocalNotifications.cancel({ notifications: ids });
        await LocalNotifications.removeDeliveredNotifications({ notifications: ids });
      } catch (_) {}
    }
    state.active = false;
  },
};
