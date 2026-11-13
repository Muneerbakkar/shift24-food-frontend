// Centralised session storage.
//
// The customer site, admin portal and driver portal each keep their own keys.
// Writing all three from one login is what used to make an admin appear as a
// logged-in customer on the public site, so every sign-in now starts from a
// clean slate for the other portals.

const CUSTOMER_KEYS = ['isLoggedIn', 'token', 'user', 'userName', 'userEmail', 'userPhone'];
const ADMIN_KEYS = ['isAdminLoggedIn', 'adminToken', 'adminUser'];
const DRIVER_KEYS = ['isDriverLoggedIn', 'driverToken', 'driverUser'];

const removeKeys = (keys: string[]) => {
  keys.forEach((key) => localStorage.removeItem(key));
};

const notify = () => {
  window.dispatchEvent(new Event('auth-change'));
};

export function clearCustomerSession() {
  removeKeys(CUSTOMER_KEYS);
  localStorage.removeItem('activeSubscription');
}

export function clearAdminSession() {
  removeKeys(ADMIN_KEYS);
}

export function clearDriverSession() {
  removeKeys(DRIVER_KEYS);
}

export function clearAllSessions() {
  clearCustomerSession();
  clearAdminSession();
  clearDriverSession();
}

/** Customer sign-in: drop any admin/driver credentials first. */
export function beginCustomerSession(res: any, fallbackEmail = '') {
  clearAllSessions();
  localStorage.setItem('token', res.token);
  localStorage.setItem('isLoggedIn', 'true');
  localStorage.setItem('user', JSON.stringify(res.user));
  localStorage.setItem('userName', res.user?.name || 'Customer');
  localStorage.setItem('userEmail', res.user?.email || fallbackEmail);
  notify();
}

/** Admin sign-in: the public site must stay logged out. */
export function beginAdminSession(res: any) {
  clearAllSessions();
  localStorage.setItem('adminToken', res.token);
  localStorage.setItem('isAdminLoggedIn', 'true');
  localStorage.setItem('adminUser', JSON.stringify(res.user));
  notify();
}

/** Driver sign-in: the public site and admin portal stay logged out. */
export function beginDriverSession(driver: any, token?: string) {
  clearAllSessions();
  if (token) localStorage.setItem('driverToken', token);
  localStorage.setItem('isDriverLoggedIn', 'true');
  localStorage.setItem('driverUser', JSON.stringify(driver));
  notify();
}

/**
 * Older builds could leave a customer session and an admin session in storage
 * at the same time. Force one fresh sign-in instead of guessing which one wins.
 */
export function resetMixedSessionState() {
  const isCustomer = localStorage.getItem('isLoggedIn') === 'true';
  const isAdmin = localStorage.getItem('isAdminLoggedIn') === 'true';
  const isDriver = localStorage.getItem('isDriverLoggedIn') === 'true';

  // More than one portal marked as signed in: force a fresh sign-in rather
  // than letting an admin session leak into the customer UI.
  if ([isCustomer, isAdmin, isDriver].filter(Boolean).length > 1) {
    clearAllSessions();
    return;
  }

  // Exactly one portal: drop every key that belongs to the others, including
  // tokens and profiles left behind by older builds.
  if (isAdmin) {
    clearCustomerSession();
    clearDriverSession();
    return;
  }

  if (isDriver) {
    clearCustomerSession();
    clearAdminSession();
    return;
  }

  if (isCustomer) {
    clearAdminSession();
    clearDriverSession();

    // Older builds stored an admin/staff user under the customer keys. Drop
    // that customer session so the public site cannot render an admin as a
    // customer.
    try {
      const user = JSON.parse(localStorage.getItem('user') || 'null');
      const role = String(user?.role || '');
      if (role && role !== 'customer') clearCustomerSession();
    } catch {}
  }
}