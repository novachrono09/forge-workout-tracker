/**
 * VANT Offline-First Sync & Mutation Outbox Engine
 * Powered by IndexedDB and Firestore Batch Operations for Zero-Quota-Overflow Sync
 */

import { 
  getFirestore, 
  writeBatch, 
  doc, 
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
}
