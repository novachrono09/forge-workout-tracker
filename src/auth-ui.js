/**
 * VANT Auth UI — Production Sign Up & Sign In Modal Controller
 */

export class AuthUI {
  constructor() {
    this.mode = 'signup'; // 'signup' | 'signin' | 'reset'
    this.initOverlay();
  }

  initOverlay() {
    let authOverlay = document.getElementById('authOverlay');
    if (!authOverlay) {
      authOverlay = document.createElement('div');
      authOverlay.id = 'authOverlay';
      authOverlay.className = 'overlay';
      authOverlay.style.cssText = `
        position: fixed; inset: 0; z-index: 9999;
        background: rgba(4, 5, 8, 0.85); backdrop-filter: blur(12px);
        display: none; align-items: center; justify-content: center; p-padding: 16px;
      `;
      document.body.appendChild(authOverlay);
    }
    this.overlay = authOverlay;

    // Listen to Firebase Auth State Changes
    window.addEventListener('DOMContentLoaded', () => {
      if (window.VANTFirebase) {
        window.VANTFirebase.onAuthStateChanged((user) => {
          this.updateUserBadge(user);
        });
      }
    });
  }

  show(mode = 'signup') {
    this.mode = mode;
    this.render();
    this.overlay.style.display = 'flex';
    this.overlay.classList.add('show');
  }

  hide() {
    this.overlay.style.display = 'none';
    this.overlay.classList.remove('show');
  }

  updateUserBadge(user) {
    const avatarEl = document.getElementById('avatar');
    const sideNameEl = document.getElementById('sideName');
    const sideGoalEl = document.getElementById('sideGoal');
    const authBtnEl = document.getElementById('authTopbarBtn');

    if (user && !user.isAnonymous) {
      const name = user.displayName || user.email.split('@')[0];
      if (avatarEl) avatarEl.textContent = name.slice(0, 1).toUpperCase();
      if (sideNameEl) sideNameEl.textContent = name;
      if (sideGoalEl) sideGoalEl.textContent = user.email || 'Cloud Synced';
      if (authBtnEl) {
        authBtnEl.textContent = name;
        authBtnEl.classList.add('active-user');
      }
    } else if (user && user.isAnonymous) {
      if (sideGoalEl) sideGoalEl.textContent = 'Guest (Unsynced)';
      if (authBtnEl) {
        authBtnEl.textContent = 'Sign Up';
        authBtnEl.classList.remove('active-user');
      }
    } else {
      if (sideNameEl) sideNameEl.textContent = 'Athlete';
      if (sideGoalEl) sideGoalEl.textContent = 'Offline';
      if (authBtnEl) {
        authBtnEl.textContent = 'Sign Up';
        authBtnEl.classList.remove('active-user');
      }
    }
  }

  render() {
    const user = window.VANTFirebase?.getCurrentUser();
    const isLoggedIn = user && !user.isAnonymous;

    if (isLoggedIn) {
      this.overlay.innerHTML = `
        <div class="auth-card" style="background: var(--bg-card, #0e1118); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 28px; width: 100%; max-width: 420px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); font-family: inherit; color: #fff; text-align: center;">
          <div style="width: 56px; height: 56px; margin: 0 auto 16px; background: rgba(214, 255, 63, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(214, 255, 63, 0.3);">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#D6FF3F" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>
          <h3 style="font-size: 22px; font-weight: 700; margin: 0 0 6px;">Signed In</h3>
          <p style="color: rgba(255,255,255,0.6); font-size: 14px; margin: 0 0 20px;">${user.email || user.displayName || 'VANT User'}</p>
          <div style="background: rgba(214, 255, 63, 0.08); border: 1px solid rgba(214, 255, 63, 0.2); border-radius: 12px; padding: 12px; font-size: 13px; color: #D6FF3F; margin-bottom: 20px; text-align: left;">
            ✓ Workouts, templates & PRs auto-syncing to VANT Cloud.
          </div>
          <button id="authLogoutBtn" class="btn lg" style="width: 100%; background: rgba(255, 77, 77, 0.15); color: #ff4d4d; border: 1px solid rgba(255,77,77,0.3); border-radius: 12px; padding: 12px; font-weight: 600; cursor: pointer;">Sign Out</button>
          <button id="authCloseBtn" class="btn sm" style="width: 100%; margin-top: 10px; background: transparent; color: rgba(255,255,255,0.5); border: none; cursor: pointer;">Close</button>
        </div>
      `;

      document.getElementById('authLogoutBtn').onclick = async () => {
        await window.VANTFirebase.logout();
        this.hide();
      };
      document.getElementById('authCloseBtn').onclick = () => this.hide();
      return;
    }

    const isSignUp = this.mode === 'signup';
    const isReset = this.mode === 'reset';

    this.overlay.innerHTML = `
      <div class="auth-card" style="background: #0e1118; border: 1px solid rgba(255,255,255,0.12); border-radius: 24px; padding: 28px; width: 100%; max-width: 420px; box-shadow: 0 24px 48px rgba(0,0,0,0.6); font-family: inherit; color: #fff;">
        <!-- Header & Tabs -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 36px; height: 36px; background: #08090C; border-radius: 10px; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.1);">
              <svg viewBox="0 0 108 108" width="24" height="24">
                <path fill="#FFFFFF" d="M 28 28 L 44 28 L 54 48 L 64 28 L 80 28 L 62 64 L 46 64 Z"/>
                <path fill="#D6FF3F" d="M 49 70 L 59 70 L 54 80 Z"/>
              </svg>
            </div>
            <h3 style="font-size: 20px; font-weight: 700; margin: 0; letter-spacing: -0.02em;">VANT Cloud</h3>
          </div>
          <button id="authCloseBtn" style="background: none; border: none; color: rgba(255,255,255,0.4); cursor: pointer; font-size: 20px; padding: 4px;">✕</button>
        </div>

        ${!isReset ? `
          <div style="display: flex; background: rgba(255,255,255,0.05); padding: 4px; border-radius: 12px; margin-bottom: 20px;">
            <button id="tabSignUp" style="flex: 1; padding: 10px; border: none; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer; transition: all 0.2s; ${isSignUp ? 'background: #D6FF3F; color: #000;' : 'background: transparent; color: rgba(255,255,255,0.6);'}">Sign Up</button>
            <button id="tabSignIn" style="flex: 1; padding: 10px; border: none; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer; transition: all 0.2s; ${!isSignUp ? 'background: #D6FF3F; color: #000;' : 'background: transparent; color: rgba(255,255,255,0.6);'}">Sign In</button>
          </div>
        ` : `
          <h4 style="margin: 0 0 16px; font-size: 16px; color: rgba(255,255,255,0.8);">Reset Password</h4>
        `}

        <div id="authMsg" style="display: none; padding: 10px 14px; border-radius: 10px; font-size: 13px; margin-bottom: 16px;"></div>

        <form id="authForm" style="display: flex; flex-direction: column; gap: 14px;">
          ${isSignUp ? `
            <div>
              <label style="display: block; font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.6); margin-bottom: 6px;">FULL NAME</label>
              <input type="text" id="authName" required placeholder="Alex Walker" style="width: 100%; box-sizing: border-box; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 12px 14px; color: #fff; font-size: 14px; outline: none;" />
            </div>
          ` : ''}

          <div>
            <label style="display: block; font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.6); margin-bottom: 6px;">EMAIL</label>
            <input type="email" id="authEmail" required placeholder="athlete@vant.app" style="width: 100%; box-sizing: border-box; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 12px 14px; color: #fff; font-size: 14px; outline: none;" />
          </div>

          ${!isReset ? `
            <div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                <label style="font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.6);">PASSWORD</label>
                ${!isSignUp ? `<a id="linkReset" style="font-size: 12px; color: #D6FF3F; text-decoration: none; cursor: pointer;">Forgot?</a>` : ''}
              </div>
              <input type="password" id="authPassword" required minlength="6" placeholder="••••••••" style="width: 100%; box-sizing: border-box; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 12px 14px; color: #fff; font-size: 14px; outline: none;" />
            </div>
          ` : ''}

          <button type="submit" id="authSubmitBtn" style="width: 100%; background: #D6FF3F; color: #000; border: none; border-radius: 12px; padding: 14px; font-size: 15px; font-weight: 700; cursor: pointer; margin-top: 6px;">
            ${isReset ? 'Send Reset Link' : (isSignUp ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        ${!isReset ? `
          <div style="display: flex; align-items: center; margin: 18px 0; color: rgba(255,255,255,0.3); font-size: 12px;">
            <div style="flex: 1; height: 1px; background: rgba(255,255,255,0.1);"></div>
            <span style="padding: 0 10px;">OR</span>
            <div style="flex: 1; height: 1px; background: rgba(255,255,255,0.1);"></div>
          </div>

          <button id="authGoogleBtn" type="button" style="width: 100%; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; padding: 12px; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px;">
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            Continue with Google
          </button>
        ` : ''}

        ${isReset ? `
          <button id="btnBackAuth" style="width: 100%; margin-top: 12px; background: transparent; border: none; color: rgba(255,255,255,0.6); font-size: 13px; cursor: pointer;">← Back to Sign In</button>
        ` : ''}
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    document.getElementById('authCloseBtn')?.addEventListener('click', () => this.hide());
    document.getElementById('tabSignUp')?.addEventListener('click', () => { this.mode = 'signup'; this.render(); });
    document.getElementById('tabSignIn')?.addEventListener('click', () => { this.mode = 'signin'; this.render(); });
    document.getElementById('linkReset')?.addEventListener('click', () => { this.mode = 'reset'; this.render(); });
    document.getElementById('btnBackAuth')?.addEventListener('click', () => { this.mode = 'signin'; this.render(); });

    const form = document.getElementById('authForm');
    const msgEl = document.getElementById('authMsg');

    const showMessage = (text, type = 'error') => {
      msgEl.style.display = 'block';
      msgEl.textContent = text;
      if (type === 'error') {
        msgEl.style.background = 'rgba(255, 77, 77, 0.15)';
        msgEl.style.color = '#ff4d4d';
        msgEl.style.border = '1px solid rgba(255, 77, 77, 0.3)';
      } else {
        msgEl.style.background = 'rgba(214, 255, 63, 0.15)';
        msgEl.style.color = '#D6FF3F';
        msgEl.style.border = '1px solid rgba(214, 255, 63, 0.3)';
      }
    };

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('authEmail')?.value.trim();
      const password = document.getElementById('authPassword')?.value;
      const name = document.getElementById('authName')?.value?.trim();
      const submitBtn = document.getElementById('authSubmitBtn');

      if (!email) return;

      submitBtn.disabled = true;
      submitBtn.opacity = 0.7;

      try {
        if (this.mode === 'signup') {
          showMessage('Creating your VANT Cloud account...', 'info');
          await window.VANTFirebase.signUpWithEmail(email, password, name);
          showMessage('Account created successfully!', 'success');
          setTimeout(() => this.hide(), 800);
        } else if (this.mode === 'signin') {
          showMessage('Signing in...', 'info');
          await window.VANTFirebase.signInWithEmail(email, password);
          showMessage('Welcome back!', 'success');
          setTimeout(() => this.hide(), 800);
        } else if (this.mode === 'reset') {
          showMessage('Sending password reset email...', 'info');
          await window.VANTFirebase.sendPasswordReset(email);
          showMessage('Password reset email sent!', 'success');
        }
      } catch (err) {
        showMessage(err.message.replace('Firebase: ', ''), 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.opacity = 1;
      }
    });

    document.getElementById('authGoogleBtn')?.addEventListener('click', async () => {
      try {
        showMessage('Connecting to Google...', 'info');
        const res = await window.VANTFirebase.signInWithGoogle();
        if (res && res.redirect) {
          showMessage('Redirecting to Google Sign-In...', 'info');
        } else {
          showMessage('Signed in with Google!', 'success');
          setTimeout(() => this.hide(), 800);
        }
      } catch (err) {
        showMessage(err.message.replace('Firebase: ', ''), 'error');
      }
    });
  }
}

export const vantAuthUI = new AuthUI();
if (typeof window !== 'undefined') {
  window.VANTAuthUI = vantAuthUI;
}
