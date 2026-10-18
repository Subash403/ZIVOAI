export const AUTH_STATE_CHANGED_EVENT = 'zivo-auth-state-changed';

export function notifyAuthStateChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_STATE_CHANGED_EVENT));
  }
}
