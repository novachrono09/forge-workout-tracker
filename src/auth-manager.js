/**
 * VANT Auth Engine — Email & Password + Google Authentication Manager
 */

import { 
  getAuth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  signInWithPopup,
  signInAnonymously, 
  onAuthStateChanged,
  GoogleAuthProvider, 
  linkWithCredential,
  signInWithCredential
} from 'firebase/auth';

export class AuthManager {
  constructor(firebaseApp) {
    this.auth = getAuth(firebaseApp);
    this.currentUser = null;
    this.authStateListeners = [];
  }

  async initializeAuth() {
    return new Promise((resolve) => {
      onAuthStateChanged(this.auth, async (user) => {
        this.currentUser = user;
        this.notifyListeners(user);
        resolve(user);
      });
    });
  }

  getCurrentUser() {
    return this.auth.currentUser || this.currentUser;
  }

  onAuthStateChanged(cb) {
    this.authStateListeners.push(cb);
    if (this.currentUser !== undefined) cb(this.currentUser);
  }

  notifyListeners(user) {
    this.authStateListeners.forEach((cb) => cb(user));
  }

  async signUpWithEmail(email, password, displayName) {
    try {
      const cred = await createUserWithEmailAndPassword(this.auth, email, password);
      if (displayName) {
        await updateProfile(cred.user, { displayName });
      }
      this.currentUser = cred.user;
      this.notifyListeners(cred.user);
      return { user: cred.user };
    } catch (err) {
      console.error('[VANT Auth] Sign up error:', err);
      throw err;
    }
  }

  async signInWithEmail(email, password) {
    try {
      const cred = await signInWithEmailAndPassword(this.auth, email, password);
      this.currentUser = cred.user;
      this.notifyListeners(cred.user);
      return { user: cred.user };
    } catch (err) {
      console.error('[VANT Auth] Sign in error:', err);
      throw err;
    }
  }

  async signInWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(this.auth, provider);
      this.currentUser = cred.user;
      this.notifyListeners(cred.user);
      return { user: cred.user };
    } catch (err) {
      console.error('[VANT Auth] Google sign in error:', err);
      throw err;
    }
  }

  async sendPasswordReset(email) {
    try {
      await sendPasswordResetEmail(this.auth, email);
      return true;
    } catch (err) {
      console.error('[VANT Auth] Password reset error:', err);
      throw err;
    }
  }

  async logout() {
    try {
      await signOut(this.auth);
      this.currentUser = null;
      this.notifyListeners(null);
      return true;
    } catch (err) {
      console.error('[VANT Auth] Sign out error:', err);
      throw err;
    }
  }
}
