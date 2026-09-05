/**
 * VANT Cloud Database Engine — Hybrid Firebase Architecture
 * Integrates AuthManager (Email + Google Auth) and SyncEngine (IndexedDB Outbox Sync).
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { AuthManager } from './auth-manager';
import { SyncEngine } from './sync-engine';

export const DEFAULT_FIREBASE_CONFIG = {
  projectId: "vant-strength-os",
  appId: "1:462534748948:web:c3e7d929094cf131d9f001",
  storageBucket: "vant-strength-os.firebasestorage.app",
  apiKey: "AIzaSyAL6gUmWg8jvpqVP9VSwIAtCQ5UVu2Uzlk",
  authDomain: "vant-strength-os.firebaseapp.com",
  messagingSenderId: "462534748948"
};

class FirebaseCloudEngine {
  constructor() {
    this.app = null;
    this.db = null;
    this.authManager = null;
    this.syncEngine = null;
    this.isInitialized = false;
  }

  /**
   * Initialize Firebase app, AuthManager, and SyncEngine
   */
  async init(firebaseConfig = DEFAULT_FIREBASE_CONFIG) {
    const config = firebaseConfig || DEFAULT_FIREBASE_CONFIG;
    if (!config || !config.apiKey) {
      console.warn('[VANT Cloud] Missing Firebase config.');
      return false;
    }

    try {
      if (!getApps().length) {
        this.app = initializeApp(config);
      } else {
        this.app = getApp();
      }

      this.db = getFirestore(this.app);

      try {
        await enableIndexedDbPersistence(this.db);
      } catch (err) {
        if (err.code !== 'failed-precondition') {
          console.warn('[VANT Cloud] Persistence warning:', err.code);
        }
      }

      this.authManager = new AuthManager(this.app);
      await this.authManager.initializeAuth();

      this.syncEngine = new SyncEngine(this.app, this.authManager);
      
      this.isInitialized = true;
      console.log('[VANT Cloud] VANT Cloud Hybrid Engine Initialized (Auth + Sync Ready)');
      return true;
    } catch (err) {
      console.error('[VANT Cloud] Initialization error:', err);
      return false;
    }
  }

  getCurrentUser() {
    return this.authManager?.getCurrentUser() || null;
  }

  onAuthStateChanged(cb) {
    if (this.authManager) {
      this.authManager.onAuthStateChanged(cb);
    }
  }

  async signUpWithEmail(email, password, displayName) {
    if (!this.authManager) throw new Error("AuthManager not initialized");
    return await this.authManager.signUpWithEmail(email, password, displayName);
  }

  async signInWithEmail(email, password) {
    if (!this.authManager) throw new Error("AuthManager not initialized");
    return await this.authManager.signInWithEmail(email, password);
  }

  async signInWithGoogle() {
    if (!this.authManager) throw new Error("AuthManager not initialized");
    return await this.authManager.signInWithGoogle();
  }

  async sendPasswordReset(email) {
    if (!this.authManager) throw new Error("AuthManager not initialized");
    return await this.authManager.sendPasswordReset(email);
  }

  async logout() {
    if (!this.authManager) throw new Error("AuthManager not initialized");
    return await this.authManager.logout();
  }

  async logWorkout(workoutData) {
    if (!this.syncEngine) return false;
    return await this.syncEngine.logWorkoutLocally(workoutData);
  }

  async saveTemplate(templateData) {
    if (!this.syncEngine) return false;
    return await this.syncEngine.saveTemplateLocally(templateData);
  }

  async saveProfile(profileData) {
    if (!this.syncEngine) return false;
    return await this.syncEngine.saveProfileLocally(profileData);
  }

  async syncState(state) {
    if (!this.syncEngine) return false;
    return await this.syncEngine.syncState(state);
  }

  async pullAndMergeState(localState) {
    if (!this.syncEngine) return localState;
    return await this.syncEngine.pullAndMergeState(localState);
  }

  async flushSync() {
    if (!this.syncEngine) return false;
    return await this.syncEngine.flushSync();
  }
}

export const FirebaseCloud = new FirebaseCloudEngine();
if (typeof window !== 'undefined') {
  window.VANTFirebase = FirebaseCloud;
  window.addEventListener('DOMContentLoaded', () => {
    FirebaseCloud.init();
  });
}
