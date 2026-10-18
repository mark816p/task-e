/**
 * Task E - Google Authentication Module (ES Module)
 * Supports Google Identity Services (GIS), client-side JWT credential decoding,
 * session persistence in localStorage, and seamless quick-login fallback for testing.
 */

const USER_STORAGE_KEY = 'task_e_user_v1';
const CLIENT_ID_STORAGE_KEY = 'task_e_google_client_id_v1';

// Default Demo/Public Google OAuth Client ID placeholder
// Users can provide their own Google Cloud OAuth 2.0 Web Client ID in settings
const DEFAULT_CLIENT_ID = '384291845892-sampleclientid.apps.googleusercontent.com';

let currentUser = null;
let authChangeCallbacks = [];

/**
 * Initializes Google Identity Services (GIS)
 * @param {Function} onUserChange Callback when user signs in or out
 */
export function initAuth(onUserChange) {
  if (onUserChange && typeof onUserChange === 'function') {
    authChangeCallbacks.push(onUserChange);
  }

  // Load persisted user session from localStorage
  currentUser = loadStoredUser();
  notifyAuthChange(currentUser);

  // Setup Google Identity Services when script loads
  setupGoogleIdentityServices();

  return currentUser;
}

/**
 * Returns current authenticated user profile or null
 * @returns {Object|null}
 */
export function getCurrentUser() {
  if (!currentUser) {
    currentUser = loadStoredUser();
  }
  return currentUser;
}

/**
 * Retrieves the configured Google Client ID
 * @returns {string}
 */
export function getGoogleClientId() {
  return localStorage.getItem(CLIENT_ID_STORAGE_KEY) || '';
}

/**
 * Saves a custom Google Cloud Client ID
 * @param {string} clientId
 */
export function setGoogleClientId(clientId) {
  if (clientId && clientId.trim()) {
    localStorage.setItem(CLIENT_ID_STORAGE_KEY, clientId.trim());
  } else {
    localStorage.removeItem(CLIENT_ID_STORAGE_KEY);
  }
  setupGoogleIdentityServices();
}

/**
 * Decodes Google JWT Credential Response
 * @param {string} credentialToken
 */
export function handleCredentialResponse(response) {
  try {
    const payload = parseJwt(response.credential);
    const user = {
      id: payload.sub,
      name: payload.name || payload.email.split('@')[0],
      email: payload.email,
      picture: payload.picture || null,
      provider: 'google',
      signedInAt: new Date().toISOString()
    };

    saveUserSession(user);
    notifyAuthChange(user);
    return user;
  } catch (err) {
    console.error('Failed to parse Google credential token:', err);
    throw err;
  }
}

/**
 * Quick Sign-In / Demo Authentication (for testing or when custom client ID is not yet provided)
 * @param {string} [name='Task E User']
 * @param {string} [email='user@example.com']
 */
export function quickSignIn(name = 'Google User', email = 'user@gmail.com') {
  const user = {
    id: 'usr_' + Date.now(),
    name: name,
    email: email,
    picture: null,
    provider: 'google',
    signedInAt: new Date().toISOString()
  };

  saveUserSession(user);
  notifyAuthChange(user);
  return user;
}

/**
 * Signs the user out
 */
export function signOut() {
  currentUser = null;
  localStorage.removeItem(USER_STORAGE_KEY);

  if (window.google && window.google.accounts && window.google.accounts.id) {
    try {
      window.google.accounts.id.disableAutoSelect();
    } catch (e) {
      // Ignored
    }
  }

  notifyAuthChange(null);
}

/**
 * Renders official Google Sign-In button into a specified container
 * @param {HTMLElement} container
 * @param {Object} [options]
 */
export function renderGoogleButton(container, options = {}) {
  if (!container) return;

  const clientId = getGoogleClientId() || DEFAULT_CLIENT_ID;

  if (window.google && window.google.accounts && window.google.accounts.id) {
    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (resp) => {
          handleCredentialResponse(resp);
        },
        auto_select: false
      });

      window.google.accounts.id.renderButton(container, {
        theme: options.theme || 'outline',
        size: options.size || 'medium',
        type: 'standard',
        shape: 'pill',
        text: 'signin_with',
        logo_alignment: 'left',
        ...options
      });
    } catch (err) {
      console.warn('GIS renderButton notice:', err);
    }
  }
}

/* ==========================================================================
   Internal Helpers
   ========================================================================== */

function setupGoogleIdentityServices() {
  const clientId = getGoogleClientId();

  const initGIS = () => {
    if (window.google && window.google.accounts && window.google.accounts.id && clientId) {
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredentialResponse,
          auto_select: false
        });
      } catch (e) {
        console.warn('GIS initialization notice:', e);
      }
    }
  };

  if (window.google && window.google.accounts) {
    initGIS();
  } else {
    // Check if script already attached
    let script = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
    if (!script) {
      script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initGIS;
      document.head.appendChild(script);
    } else {
      script.addEventListener('load', initGIS);
    }
  }
}

function loadStoredUser() {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveUserSession(user) {
  currentUser = user;
  try {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } catch (err) {
    console.error('Failed to store user session:', err);
  }
}

function notifyAuthChange(user) {
  authChangeCallbacks.forEach((cb) => {
    try {
      cb(user);
    } catch (e) {
      console.error('Error in auth change listener:', e);
    }
  });
}

function parseJwt(token) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split('')
      .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );
  return JSON.parse(jsonPayload);
}
