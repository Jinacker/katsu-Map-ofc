const ADMIN_TOKEN_KEY = 'admin_token';

function getStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.sessionStorage;
}

function decodeTokenPayload(token) {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;

    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = normalizedPayload.padEnd(
      normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
      '=',
    );

    return JSON.parse(window.atob(paddedPayload));
  } catch {
    return null;
  }
}

export function getAdminToken() {
  return getStorage()?.getItem(ADMIN_TOKEN_KEY) ?? null;
}

export function storeAdminToken(token) {
  getStorage()?.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken() {
  getStorage()?.removeItem(ADMIN_TOKEN_KEY);
}

export function isAdminTokenValid() {
  const token = getAdminToken();
  if (!token) return false;

  const payload = decodeTokenPayload(token);
  if (!payload?.exp) return true;

  const isValid = payload.exp * 1000 > Date.now() + 5000;
  if (!isValid) {
    clearAdminToken();
  }

  return isValid;
}

export function getValidAdminToken() {
  return isAdminTokenValid() ? getAdminToken() : null;
}
