/**
 * VANT Auth Engine — Email & Password + Native & Web Google Authentication Manager
 */

import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { 
  getAuth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
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
    if (Capacitor.isNativePlatform()) {
      try {
        const nativeState = await FirebaseAuthentication.getCurrentUser();
        if (nativeState && nativeState.user && !this.auth.currentUser) {
          const tokenRes = await FirebaseAuthentication.getIdToken({ forceRefresh: false }).catch(() => null);
          if (tokenRes && tokenRes.token) {
            const credential = GoogleAuthProvider.credential(tokenRes.token);
            await signInWithCredential(this.auth, credential).catch(() => null);
          }
        }
      } catch (err) {
        console.warn('[VANT Auth] Native auth restore warning:', err);
      }
    } else {
      try {
        const redirectRes = await getRedirectResult(this.auth);
        if (redirectRes && redirectRes.user) {
          this.currentUser = redirectRes.user;
          this.notifyListeners(redirectRes.user);
        }
      } catch (err) {
        console.warn('[VANT Auth] Web redirect check warning:', err);
      }
    }

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
    // If running in Native Capacitor Android APK, trigger Native Google Sign-In Sheet
    if (Capacitor.isNativePlatform()) {
      try {
        const result = await FirebaseAuthentication.signInWithGoogle();
        const idToken = result?.credential?.idToken || result?.idToken;
        if (idToken) {
          const credential = GoogleAuthProvider.credential(idToken);
          const userCred = await signInWithCredential(this.auth, credential);
          this.currentUser = userCred.user;
          this.notifyListeners(userCred.user);
          return { user: userCred.user };
        } else if (result && result.user) {
          try {
            const tokenRes = await FirebaseAuthentication.getIdToken({ forceRefresh: false });
            if (tokenRes && tokenRes.token) {
              const credential = GoogleAuthProvider.credential(tokenRes.token);
              const userCred = await signInWithCredential(this.auth, credential);
              this.currentUser = userCred.user;
              this.notifyListeners(userCred.user);
              return { user: userCred.user };
            }
          } catch (tErr) {
            console.warn('[VANT Auth] Token sync fallback warning:', tErr);
          }
          this.currentUser = result.user;
          this.notifyListeners(result.user);
          return { user: result.user };
        }
      } catch (nativeErr) {
        console.warn('[VANT Auth] Native Google sign in error:', nativeErr);
        throw nativeErr;
      }
    }

    // Web Browser environment
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      const cred = await signInWithPopup(this.auth, provider);
      this.currentUser = cred.user;
      this.notifyListeners(cred.user);
      return { user: cred.user };
    } catch (err) {
      console.warn('[VANT Auth] Popup sign in failed, trying redirect:', err);
      try {
        await signInWithRedirect(this.auth, provider);
        return { redirect: true };
      } catch (redirectErr) {
        console.error('[VANT Auth] Web Google redirect error:', redirectErr);
        throw redirectErr;
      }
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
      if (Capacitor.isNativePlatform()) {
        try {
          await FirebaseAuthentication.signOut();
        } catch (e) {
          // ignore native signout warning
        }
      }
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
