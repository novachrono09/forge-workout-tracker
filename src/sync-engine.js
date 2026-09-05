/**
 * VANT Offline-First Sync & Mutation Outbox Engine
 * Powered by IndexedDB and Firestore Batch Operations for Zero-Quota-Overflow Sync
 */

import { 
  getFirestore, 
  writeBatch, 
  doc, 
  getDoc,
  collection, 
  query, 
  where, 
  getDocs,
  setDoc 
} from 'firebase/firestore';

const DB_NAME = 'vant_local_db';
const DB_VERSION = 1;
let idbInstance = null;

export class SyncEngine {
  constructor(firebaseApp, authManager) {
    this.firestore = getFirestore(firebaseApp);
    this.authManager = authManager;
    this.isSyncing = false;
    this.syncDebounceTimer = null;
    this.latestPendingState = null;
    this.initIDB();
    this.registerNetworkListeners();
  }

  async initIDB() {
    if (idbInstance) return idbInstance;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('workouts')) {
          db.createObjectStore('workouts', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('templates')) {
          db.createObjectStore('templates', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('profile')) {
          db.createObjectStore('profile', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('sync_outbox')) {
          const outbox = db.createObjectStore('sync_outbox', { keyPath: 'id', autoIncrement: true });
          outbox.createIndex('status', 'status', { unique: false });
        }
      };
      request.onsuccess = (e) => {
        idbInstance = e.target.result;
        resolve(idbInstance);
      };
      request.onerror = (e) => reject(e.target.error);
    });
  }

  registerNetworkListeners() {
    window.addEventListener('online', () => {
      console.log('[VANT Sync] Network restored — draining outbox & pulling deltas');
      this.drainOutbox();
      this.pullRemoteDeltas();
    });
  }

  /**
   * Log workout locally first with zero latency and queue mutation outbox event
   */
  async logWorkoutLocally(workoutData) {
    const db = await this.initIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['workouts', 'sync_outbox'], 'readwrite');
      const workoutStore = tx.objectStore('workouts');
      const outboxStore = tx.objectStore('sync_outbox');

      workoutData.updatedAt = Date.now();
      workoutStore.put(workoutData);

      outboxStore.add({
        action: 'UPSERT_WORKOUT',
        payload: workoutData,
        status: 'PENDING',
        createdAt: Date.now()
      });

      tx.oncomplete = () => {
        resolve(workoutData);
        if (navigator.onLine) {
          this.drainOutbox();
        }
      };
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Save template locally and queue mutation outbox event
   */
  async saveTemplateLocally(templateData) {
    const db = await this.initIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['templates', 'sync_outbox'], 'readwrite');
      const templateStore = tx.objectStore('templates');
      const outboxStore = tx.objectStore('sync_outbox');

      templateData.updatedAt = Date.now();
      templateStore.put(templateData);

      outboxStore.add({
        action: 'UPSERT_TEMPLATE',
        payload: templateData,
        status: 'PENDING',
        createdAt: Date.now()
      });

      tx.oncomplete = () => {
        resolve(templateData);
        if (navigator.onLine) {
          this.drainOutbox();
        }
      };
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Save profile locally and queue mutation outbox event
   */
  async saveProfileLocally(profileData) {
    const db = await this.initIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['profile', 'sync_outbox'], 'readwrite');
      const profileStore = tx.objectStore('profile');
      const outboxStore = tx.objectStore('sync_outbox');

      profileData.id = 'current_user_profile';
      profileData.updatedAt = Date.now();
      profileStore.put(profileData);

      outboxStore.add({
        action: 'UPSERT_PROFILE',
        payload: profileData,
        status: 'PENDING',
        createdAt: Date.now()
      });

      tx.oncomplete = () => {
        resolve(profileData);
        if (navigator.onLine) {
          this.drainOutbox();
        }
      };
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Drain pending outbox mutations via Firestore WriteBatch
   */
  async drainOutbox() {
    if (this.isSyncing || !navigator.onLine) return;
    const user = this.authManager.getCurrentUser();
    if (!user) return;

    this.isSyncing = true;
    const db = await this.initIDB();

    const pendingMutations = await new Promise((resolve, reject) => {
      const tx = db.transaction('sync_outbox', 'readonly');
      const store = tx.objectStore('sync_outbox');
      const index = store.index('status');
      const request = index.getAll('PENDING');
      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e.target.error);
    });

    if (pendingMutations.length === 0) {
      this.isSyncing = false;
      return;
    }

    try {
      const batch = writeBatch(this.firestore);
      const processedIds = [];

      for (const item of pendingMutations.slice(0, 500)) {
        if (item.action === 'UPSERT_WORKOUT') {
          const ref = doc(this.firestore, `users/${user.uid}/workouts/${item.payload.id}`);
          batch.set(ref, item.payload, { merge: true });
          processedIds.push(item.id);
        } else if (item.action === 'UPSERT_TEMPLATE') {
          const ref = doc(this.firestore, `users/${user.uid}/templates/${item.payload.id}`);
          batch.set(ref, item.payload, { merge: true });
          processedIds.push(item.id);
        } else if (item.action === 'UPSERT_PROFILE') {
          const ref = doc(this.firestore, `users/${user.uid}`);
          batch.set(ref, item.payload, { merge: true });
          processedIds.push(item.id);
        }
      }

      await batch.commit();

      const deleteTx = db.transaction('sync_outbox', 'readwrite');
      const outboxStore = deleteTx.objectStore('sync_outbox');
      for (const id of processedIds) {
        outboxStore.delete(id);
      }
      
      await new Promise((resolve) => {
        deleteTx.oncomplete = () => resolve();
      });

      console.log(`[VANT Sync] Flushed ${processedIds.length} outbox mutations to Firestore.`);
    } catch (err) {
      console.error('[VANT Sync] Outbox drain failed:', err);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Delta sync pull for workouts updated after local timestamp
   */
  async pullRemoteDeltas() {
    const user = this.authManager.getCurrentUser();
    if (!user || !navigator.onLine) return;

    const lastSync = parseInt(localStorage.getItem('vant_last_sync') || '0', 10);
    const workoutsRef = collection(this.firestore, `users/${user.uid}/workouts`);
    const q = query(workoutsRef, where('updatedAt', '>', lastSync));

    try {
      const snapshot = await getDocs(q);
      if (snapshot.empty) return;

      const db = await this.initIDB();
      const tx = db.transaction('workouts', 'readwrite');
      const store = tx.objectStore('workouts');

      let maxUpdated = lastSync;
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        store.put(data);
        if (data.updatedAt > maxUpdated) maxUpdated = data.updatedAt;
      });

      localStorage.setItem('vant_last_sync', maxUpdated.toString());
      console.log(`[VANT Sync] Synced ${snapshot.size} remote workout deltas.`);
    } catch (err) {
      console.warn('[VANT Sync] Delta pull failed:', err);
    }
  }

  /**
   * Sync complete VANT state with debounced cloud backup
   */
  async syncState(state) {
    if (!state) return;
    this.latestPendingState = state;

    // Always persist to IndexedDB as an additional offline replica
    this.saveStateLocally(state).catch(() => {});

    // Debounce cloud write by 1 second to avoid rapid write bursts
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
    }

    this.syncDebounceTimer = setTimeout(() => {
      this.pushStateToCloud(this.latestPendingState).catch((err) => {
        console.warn('[VANT Sync] Debounced push error:', err);
      });
    }, 1000);
  }

  /**
   * Force immediate flush of pending state (e.g. before unload or on session save)
   */
  async flushSync() {
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
      this.syncDebounceTimer = null;
    }
    if (this.latestPendingState) {
      await this.pushStateToCloud(this.latestPendingState);
    }
  }

  /**
   * Push full state payload and individual workouts to Firestore
   */
  async pushStateToCloud(state) {
    const user = this.authManager.getCurrentUser();
    if (!user || user.isAnonymous) return;

    if (!navigator.onLine) {
      console.log('[VANT Sync] Offline — state queued for reconnect');
      return;
    }

    try {
      const statePayload = {
        version: state.version || 1,
        onboarded: state.onboarded ?? true,
        profile: state.profile || {},
        routine: state.routine || {},
        customEx: state.customEx || [],
        workouts: (state.workouts || []).slice(0, 1000),
        body: state.body || [],
        measures: state.measures || [],
        notes: state.notes || [],
        prefs: state.prefs || {},
        updatedAt: Date.now()
      };

      const ref = doc(this.firestore, `users/${user.uid}/data/state`);
      await setDoc(ref, statePayload, { merge: true });

      // Also ensure recent completed workouts are individual documents for queries
      if (Array.isArray(state.workouts) && state.workouts.length > 0) {
        const batch = writeBatch(this.firestore);
        const recent = state.workouts.slice(-20);
        for (const wo of recent) {
          if (wo && wo.id) {
            const wRef = doc(this.firestore, `users/${user.uid}/workouts/${wo.id}`);
            batch.set(wRef, { ...wo, updatedAt: wo.updatedAt || Date.now() }, { merge: true });
          }
        }
        await batch.commit().catch(() => {});
      }

      console.log('[VANT Sync] Cloud state backup successful.');
    } catch (err) {
      console.error('[VANT Sync] Cloud push failed:', err);
    }
  }

  /**
   * Restore cloud state and merge with local state
   */
  async pullAndMergeState(localState) {
    const user = this.authManager.getCurrentUser();
    if (!user || user.isAnonymous) return localState;

    try {
      const ref = doc(this.firestore, `users/${user.uid}/data/state`);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        // Initial sync: Upload local state to Firestore
        console.log('[VANT Sync] No existing cloud backup. Uploading local state.');
        await this.pushStateToCloud(localState);
        return localState;
      }

      const remote = snap.data();
      console.log('[VANT Sync] Restoring and merging remote cloud state.');

      // Merge workouts by unique ID
      const workoutMap = new Map();
      (localState.workouts || []).forEach(w => { if (w && w.id) workoutMap.set(w.id, w); });
      (remote.workouts || []).forEach(w => {
        if (w && w.id) {
          const localW = workoutMap.get(w.id);
          if (!localW || (w.ended || 0) >= (localW.ended || 0)) {
            workoutMap.set(w.id, w);
          }
        }
      });

      // Merge custom exercises by ID
      const exMap = new Map();
      (localState.customEx || []).forEach(e => { if (e && e.id) exMap.set(e.id, e); });
      (remote.customEx || []).forEach(e => { if (e && e.id) exMap.set(e.id, e); });

      // Merge body weigh-ins by date
      const bodyMap = new Map();
      (localState.body || []).forEach(b => { if (b && b.date) bodyMap.set(b.date, b); });
      (remote.body || []).forEach(b => { if (b && b.date) bodyMap.set(b.date, b); });

      // Merge measures by date
      const measureMap = new Map();
      (localState.measures || []).forEach(m => { if (m && m.date) measureMap.set(m.date, m); });
      (remote.measures || []).forEach(m => { if (m && m.date) measureMap.set(m.date, m); });

      const mergedState = {
        ...localState,
        version: Math.max(localState.version || 1, remote.version || 1),
        onboarded: localState.onboarded || remote.onboarded || true,
        profile: { ...(remote.profile || {}), ...(localState.profile || {}) },
        routine: (remote.routine && Object.keys(remote.routine.days || {}).length > 0) ? remote.routine : localState.routine,
        customEx: Array.from(exMap.values()),
        workouts: Array.from(workoutMap.values()).sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.started || 0) - (b.started || 0)),
        body: Array.from(bodyMap.values()).sort((a, b) => (a.date || '').localeCompare(b.date || '')),
        measures: Array.from(measureMap.values()).sort((a, b) => (a.date || '').localeCompare(b.date || '')),
        notes: Array.isArray(remote.notes) && remote.notes.length > (localState.notes?.length || 0) ? remote.notes : (localState.notes || []),
        prefs: { ...(remote.prefs || {}), ...(localState.prefs || {}) }
      };

      this.saveStateLocally(mergedState).catch(() => {});
      return mergedState;
    } catch (err) {
      console.error('[VANT Sync] pullAndMergeState error:', err);
      return localState;
    }
  }

  async saveStateLocally(state) {
    try {
      const db = await this.initIDB();
      const tx = db.transaction(['profile'], 'readwrite');
      const profileStore = tx.objectStore('profile');
      profileStore.put({ id: 'current_user_profile', ...state.profile, updatedAt: Date.now() });
      tx.oncomplete = () => {};
    } catch (e) {
      // safe ignore IDB warnings
    }
  }
}
