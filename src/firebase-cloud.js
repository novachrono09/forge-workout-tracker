/**
 * VANT Cloud Database Engine — Hybrid Firebase Architecture
 * Integrates AuthManager (Anonymous + Account Linking) and SyncEngine (IndexedDB Outbox Sync).
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

      // Enable offline persistence for Firestore web client
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
      console.log('[VANT Cloud] VANT Cloud Hybrid Engine Initialized (Anonymous Auth + Outbox Sync ready)');
      return true;
    } catch (err) {
      console.error('[VANT Cloud] Initialization error:', err);
      return false;
    }
  }

  /**
   * Log workout locally (IndexedDB) and push to Firestore outbox queue
   */
  async logWorkout(workoutData) {
    if (!this.syncEngine) return false;
    return await this.syncEngine.logWorkoutLocally(workoutData);
  }

  /**
   * Save template locally (IndexedDB) and push to Firestore outbox queue
   */
  async saveTemplate(templateData) {
    if (!this.syncEngine) return false;
    return await this.syncEngine.saveTemplateLocally(templateData);
  }

  /**
   * Save user profile locally (IndexedDB) and push to Firestore outbox queue
   */
  async saveProfile(profileData) {
    if (!this.syncEngine) return false;
    return await this.syncEngine.saveProfileLocally(profileData);
  }

  /**
   * Link current Anonymous session with Google credentials
   */
  async linkGoogleAccount(idToken) {
    if (!this.authManager) return null;
    return await this.authManager.linkWithGoogle(idToken);
  }
}

export const FirebaseCloud = new FirebaseCloudEngine();
if (typeof window !== 'undefined') {
  window.VANTFirebase = FirebaseCloud;
  // Auto-initialize on load
  window.addEventListener('DOMContentLoaded', () => {
    FirebaseCloud.init();
  });
}
