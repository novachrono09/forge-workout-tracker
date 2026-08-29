/**
 * VANT Auth Engine — Frictionless Anonymous & Account Linking Manager
 */

import { 
  getAuth, 
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
        if (user) {
          this.currentUser = user;
          this.notifyListeners(user);
          resolve(user);
        } else {
          try {
            const anonCred = await signInAnonymously(this.auth);
            this.currentUser = anonCred.user;
            this.notifyListeners(anonCred.user);
            resolve(anonCred.user);
          } catch (err) {
            console.error('[VANT Auth] Anonymous auth failed:', err);
            resolve(null);
          }
        }
      });
    });
  }

  getCurrentUser() {
    return this.auth.currentUser || this.currentUser;
  }

  onAuthStateChanged(cb) {
    this.authStateListeners.push(cb);
    if (this.currentUser) cb(this.currentUser);
  }

  notifyListeners(user) {
    this.authStateListeners.forEach((cb) => cb(user));
  }

  async linkWithGoogle(idToken) {
    const user = this.getCurrentUser();
    if (!user) throw new Error("No active user session.");

    const credential = GoogleAuthProvider.credential(idToken);

    try {
      const userCredential = await linkWithCredential(user, credential);
      this.currentUser = userCredential.user;
      this.notifyListeners(this.currentUser);
      return { status: 'LINKED', user: this.currentUser };
    } catch (error) {
      if (error.code === 'auth/credential-already-in-use') {
        return { 
          status: 'ACCOUNT_COLLISION', 
          credential,
          message: 'This Google Account is already linked to another user.' 
        };
      }
      throw error;
    }
  }

  async resolveCollisionBySwitching(credential) {
    const userCredential = await signInWithCredential(this.auth, credential);
    this.currentUser = userCredential.user;
    this.notifyListeners(this.currentUser);
    return this.currentUser;
  }
}
