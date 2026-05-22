export const ACTIVE_BUSINESS_KEY = 'spark360:active-business-id';

export function getStoredActiveBusinessId() {
  return localStorage.getItem(ACTIVE_BUSINESS_KEY);
}

export function setStoredActiveBusinessId(businessId: string | null) {
  if (businessId) localStorage.setItem(ACTIVE_BUSINESS_KEY, businessId);
  else localStorage.removeItem(ACTIVE_BUSINESS_KEY);
  window.dispatchEvent(new CustomEvent('spark360:business-changed', { detail: businessId }));
}
