// Shift24 API Client Service with JWT & Session Support

const rawBase = ((import.meta as any).env?.VITE_API_BASE_URL || '/api').trim().replace(/\/+$/, '');
const API_BASE = rawBase.endsWith('/api') ? rawBase : `${rawBase}/api`;

function getAuthHeaders(customHeaders: Record<string, string> = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders
  };

  if (customHeaders['Authorization']) {
    return headers;
  }

  const isAdminRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
  const rawToken = isAdminRoute
    ? (localStorage.getItem('adminToken') || localStorage.getItem('token'))
    : (localStorage.getItem('token') || localStorage.getItem('adminToken'));

  const token = (rawToken && rawToken !== 'null' && rawToken !== 'undefined' && rawToken.trim() !== '') ? rawToken.trim() : null;

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

// Authenticated fetch wrapper
async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = getAuthHeaders((options.headers as Record<string, string>) || {});
  const res = await fetch(url, { ...options, headers, credentials: 'include' });

  // If 401 Unauthorized in an admin view, clear expired admin session
  if (res.status === 401 && typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('isAdminLoggedIn');
  }

  return res;
}

export async function checkBackendHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`, {
      credentials: 'include'
    });
    if (!res.ok) throw new Error('Health check failed');
    return await res.json();
  } catch (err) {
    return { status: 'offline', error: err };
  }
}

// -------------------------------------------------------------
// Authentication API (JWT + Session)
// -------------------------------------------------------------

// Customer Registration
export async function apiRegister(userData: { name: string; email: string; password?: string; phone?: string }) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });
  return res.json();
}


// Customer Login
export async function apiLogin(email: string, password?: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return res.json();
}


// Admin Registration
export async function apiAdminRegister(adminData: { name: string; email: string; password?: string; phone?: string; adminSecretCode?: string }) {
  const res = await fetch(`${API_BASE}/auth/admin-register`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(adminData)
  });
  return res.json();
}


// Admin Login
export async function apiAdminLogin(email: string, password?: string) {
  const res = await fetch(`${API_BASE}/auth/admin-login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return res.json();
}


// Get Current User Profile (JWT/Session verification)
export async function apiGetMe(tokenOverride?: string) {
  const customHeaders: Record<string, string> = {};
  if (tokenOverride) {
    customHeaders['Authorization'] = `Bearer ${tokenOverride}`;
  }
  const res = await fetch(`${API_BASE}/auth/me`, {
    method: 'GET',
    credentials: 'include',
    headers: getAuthHeaders(customHeaders)
  });
  return res.json();
}


// Update User Addresses & Default Address
export async function apiUpdateAddresses(addresses: Array<{ title: string; address: string; isDefault: boolean }>) {
  const res = await fetch(`${API_BASE}/auth/addresses`, {
    method: 'PUT',
    credentials: 'include',
    headers: getAuthHeaders(),
    body: JSON.stringify({ addresses })
  });
  return res.json();
}


// Update User / Admin Profile
export async function apiUpdateProfile(profileData: { name?: string; phone?: string }) {
  const res = await fetch(`${API_BASE}/auth/profile`, {
    method: 'PUT',
    credentials: 'include',
    headers: getAuthHeaders(),
    body: JSON.stringify(profileData)
  });
  return res.json();
}


// Change Password
export async function apiChangePassword(passwords: { currentPassword: string; newPassword: string }) {
  const res = await fetch(`${API_BASE}/auth/change-password`, {
    method: 'PUT',
    credentials: 'include',
    headers: getAuthHeaders(),
    body: JSON.stringify(passwords)
  });
  return res.json();
}


// Request Password Reset Code via Email
export async function apiForgotPassword(email: string) {
  const res = await fetch(`${API_BASE}/auth/forgot-password`, {
    method: 'POST',
    credentials: 'include',
    headers: getAuthHeaders(),
    body: JSON.stringify({ email })
  });
  return res.json();
}


// Reset Password with Verification Code
export async function apiResetPassword(payload: { email: string; resetCode: string; newPassword: string }) {
  const res = await fetch(`${API_BASE}/auth/reset-password`, {
    method: 'POST',
    credentials: 'include',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  return res.json();
}


// Logout
export async function apiLogout() {
  const res = await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
    headers: getAuthHeaders()
  });
  return res.json();
}


// -------------------------------------------------------------
// Subscriptions
// -------------------------------------------------------------
export async function fetchSubscriptions(params?: { plan?: string; status?: string; search?: string; email?: string }) {
  const query = new URLSearchParams(params as any).toString();
  const res = await fetch(`${API_BASE}/subscriptions${query ? `?${query}` : ''}`, {
    credentials: 'include',
    headers: getAuthHeaders()
  });
  return res.json();
}


export async function createBackendSubscription(subscriptionData: any) {
  const res = await fetch(`${API_BASE}/subscriptions`, {
    method: 'POST',
    credentials: 'include',
    headers: getAuthHeaders(),
    body: JSON.stringify(subscriptionData)
  });
  return res.json();
}


export async function updateBackendSubscriptionStatus(
  id: string, 
  status: string, 
  details?: { pauseStartDate?: string; pauseEndDate?: string }
) {
  const res = await fetch(`${API_BASE}/subscriptions/${id}/status`, {
    method: 'PATCH',
    credentials: 'include',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status, ...details })
  });
  return res.json();
}


export async function updateBackendSubscriptionSlot(id: string, slot: string, slotLabel: string) {
  const res = await fetch(`${API_BASE}/subscriptions/${id}/slot`, {
    method: 'PATCH',
    credentials: 'include',
    headers: getAuthHeaders(),
    body: JSON.stringify({ slot, slotLabel })
  });
  return res.json();
}


export async function updateBackendSubscriptionDetails(id: string, data: Record<string, any>) {
  const res = await fetch(`${API_BASE}/subscriptions/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  return res.json();
}


// -------------------------------------------------------------
// Orders & Dispatch
// -------------------------------------------------------------
export async function fetchOrders(params?: { slot?: string; status?: string; search?: string }) {
  const query = new URLSearchParams(params as any).toString();
  const res = await fetch(`${API_BASE}/orders${query ? `?${query}` : ''}`, {
    credentials: 'include',
    headers: getAuthHeaders()
  });
  return res.json();
}


export async function generateBackendOrders(slot?: 'Breakfast' | 'Lunch' | 'Dinner', date?: string) {
  const params = new URLSearchParams();
  if (slot) params.append('slot', slot);
  if (date) params.append('date', date);
  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${API_BASE}/orders/generate${query}`, {
    method: 'POST',
    credentials: 'include',
    headers: getAuthHeaders(),
    body: JSON.stringify({ slot, date })
  });
  return res.json();
}


export async function deleteBackendOrder(id: string) {
  const res = await fetch(`${API_BASE}/orders/${id}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: getAuthHeaders()
  });
  return res.json();
}


export async function deleteBackendOrdersBulk(ids: string[]) {
  const res = await fetch(`${API_BASE}/orders/bulk-delete`, {
    method: 'POST',
    credentials: 'include',
    headers: getAuthHeaders(),
    body: JSON.stringify({ ids })
  });
  return res.json();
}


export async function deleteAllBackendOrders() {
  const res = await fetch(`${API_BASE}/orders/all`, {
    method: 'DELETE',
    credentials: 'include',
    headers: getAuthHeaders()
  });
  return res.json();
}


export async function updateBackendOrderStatus(id: string, status: string, extraData?: { distanceFromHub?: number; distanceFromPrevOrder?: number; deliveredAt?: string }) {
  const res = await fetch(`${API_BASE}/orders/${id}/status`, {
    method: 'PATCH',
    credentials: 'include',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status, ...extraData })
  });
  return res.json();
}


export async function assignDriverToBackendOrder(
  id: string, 
  data: { 
    driverId?: string; 
    driverName?: string; 
    driverPhone?: string; 
    driverVehicle?: string; 
    updateStatusToOutForDelivery?: boolean; 
  }
) {
  const res = await fetch(`${API_BASE}/orders/${id}/assign-driver`, {
    method: 'PATCH',
    credentials: 'include',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  return res.json();
}


export async function bulkAssignDriverToBackendOrders(
  orderIds: string[], 
  data: { 
    driverId?: string; 
    driverName?: string; 
    driverPhone?: string; 
    driverVehicle?: string; 
    updateStatusToOutForDelivery?: boolean; 
  }
) {
  const res = await fetch(`${API_BASE}/orders/bulk-assign-driver`, {
    method: 'POST',
    credentials: 'include',
    headers: getAuthHeaders(),
    body: JSON.stringify({ orderIds, ...data })
  });
  return res.json();
}

export async function updateBackendRouteSequence(
  sequence: Array<{ orderId: string; stopIndex: number; distanceFromHub?: number; distanceFromPrevOrder?: number }>
) {
  const res = await fetch(`${API_BASE}/orders/reorder-route`, {
    method: 'POST',
    credentials: 'include',
    headers: getAuthHeaders(),
    body: JSON.stringify({ sequence })
  });
  return res.json();
}


// -------------------------------------------------------------
// Drivers & Fleet
// -------------------------------------------------------------
export async function fetchDrivers() {
  const res = await fetch(`${API_BASE}/drivers`, {
    credentials: 'include',
    headers: getAuthHeaders()
  });
  return res.json();
}


export async function createBackendDriver(driverData: any) {
  const res = await fetch(`${API_BASE}/drivers`, {
    method: 'POST',
    credentials: 'include',
    headers: getAuthHeaders(),
    body: JSON.stringify(driverData)
  });
  return res.json();
}


export async function updateBackendDriver(id: string, updates: any) {
  const res = await fetch(`${API_BASE}/drivers/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: getAuthHeaders(),
    body: JSON.stringify(updates)
  });
  return res.json();
}


export async function deleteBackendDriver(id: string) {
  const res = await fetch(`${API_BASE}/drivers/${id}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: getAuthHeaders()
  });
  return res.json();
}


export async function apiDriverLogin(identifier: string, password: string = 'driver123') {
  try {
    const res = await fetch(`${API_BASE}/drivers/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ identifier, password })
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { success: false, message: err?.message || 'Server connection failed' };
  }
}

export async function fetchDriverAssignedOrders(driverId: string) {
  try {
    const res = await fetch(`${API_BASE}/drivers/${driverId}/orders`, {
      credentials: 'include',
      headers: getAuthHeaders()
    });
    return res.json();
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to fetch driver orders', data: [] };
  }
}

// -------------------------------------------------------------
// Kitchen
// -------------------------------------------------------------
export async function fetchKitchenPrepBoard() {
  const res = await fetch(`${API_BASE}/kitchen/prep-board`, {
    credentials: 'include',
    headers: getAuthHeaders()
  });
  return res.json();
}


// -------------------------------------------------------------
// Plans & Menu
// -------------------------------------------------------------
export async function fetchPlans() {
  const res = await fetch(`${API_BASE}/plans`, {
    credentials: 'include',
    headers: getAuthHeaders()
  });
  return res.json();
}


export async function createBackendPlan(planData: any) {
  const res = await fetch(`${API_BASE}/plans`, {
    method: 'POST',
    credentials: 'include',
    headers: getAuthHeaders(),
    body: JSON.stringify(planData)
  });
  return res.json();
}


export async function updateBackendPlan(id: string, planData: any) {
  const res = await fetch(`${API_BASE}/plans/${id}`, {
    method: 'PUT',
    credentials: 'include',
    headers: getAuthHeaders(),
    body: JSON.stringify(planData)
  });
  return res.json();
}


export async function deleteBackendPlan(id: string) {
  const res = await fetch(`${API_BASE}/plans/${id}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: getAuthHeaders()
  });
  return res.json();
}


export async function fetchWeeklyMenu(params?: { planId?: string; day?: number; mealType?: string } | number, mealTypeArg?: string) {
  let queryParams: any = {};
  if (typeof params === 'object' && params !== null) {
    queryParams = { ...params };
  } else if (typeof params === 'number') {
    queryParams.day = params;
    if (mealTypeArg) queryParams.mealType = mealTypeArg;
  }
  const query = new URLSearchParams(queryParams).toString();
  const res = await fetch(`${API_BASE}/menu${query ? `?${query}` : ''}`, {
    credentials: 'include',
    headers: getAuthHeaders()
  });
  return res.json();
}


export async function saveBackendMenuItem(itemData: any) {
  const res = await fetch(`${API_BASE}/menu`, {
    method: 'POST',
    credentials: 'include',
    headers: getAuthHeaders(),
    body: JSON.stringify(itemData)
  });
  return res.json();
}


export async function deleteBackendMenuItem(params: { id?: string; planId?: string; day?: number; mealType?: string }) {
  const query = new URLSearchParams(params as any).toString();
  const endpoint = params.id ? `${API_BASE}/menu/${params.id}` : `${API_BASE}/menu?${query}`;
  const res = await fetch(endpoint, {
    method: 'DELETE',
    credentials: 'include',
    headers: getAuthHeaders()
  });
  return res.json();
}


// -------------------------------------------------------------
// Customers
// -------------------------------------------------------------
export async function fetchCustomers(search?: string) {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  const res = await authFetch(`${API_BASE}/customers${query}`);
  return res.json();
}


function buildQueryString(params?: Record<string, any>): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '' && value !== 'undefined' && value !== 'null' && value !== 'All') {
      searchParams.append(key, String(value));
    }
  }
  const str = searchParams.toString();
  return str ? `?${str}` : '';
}

// -------------------------------------------------------------
// Purchases & Ingredient Expense Tracking
// -------------------------------------------------------------
export async function fetchPurchases(params?: { category?: string; status?: string; search?: string; startDate?: string; endDate?: string }) {
  const query = buildQueryString(params);
  const res = await authFetch(`${API_BASE}/purchases${query}`);
  return res.json();
}


export async function createPurchaseRecord(data: any) {
  const res = await authFetch(`${API_BASE}/purchases`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
  return res.json();
}


export async function updatePurchaseRecord(id: string, data: any) {
  const res = await authFetch(`${API_BASE}/purchases/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
  return res.json();
}


export async function deletePurchaseRecord(id: string) {
  const res = await authFetch(`${API_BASE}/purchases/${id}`, {
    method: 'DELETE'
  });
  return res.json();
}


// -------------------------------------------------------------
// Operational Expenses
// -------------------------------------------------------------
export async function fetchExpenses(params?: { category?: string; status?: string; search?: string; startDate?: string; endDate?: string }) {
  const query = buildQueryString(params);
  const res = await authFetch(`${API_BASE}/expenses${query}`);
  return res.json();
}


export async function createExpenseRecord(data: any) {
  const res = await authFetch(`${API_BASE}/expenses`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
  return res.json();
}


export async function updateExpenseRecord(id: string, data: any) {
  const res = await authFetch(`${API_BASE}/expenses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
  return res.json();
}


export async function deleteExpenseRecord(id: string) {
  const res = await authFetch(`${API_BASE}/expenses/${id}`, {
    method: 'DELETE'
  });
  return res.json();
}


// -------------------------------------------------------------
// Sales & Revenue
// -------------------------------------------------------------
export async function fetchSales(params?: { 
  category?: string; 
  status?: string; 
  source?: string;
  search?: string; 
  startDate?: string; 
  endDate?: string 
}) {
  const query = buildQueryString(params);
  const res = await authFetch(`${API_BASE}/sales${query}`);
  return res.json();
}


export async function createSaleRecord(data: any) {
  const res = await authFetch(`${API_BASE}/sales`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
  return res.json();
}


export async function updateSaleRecord(id: string, data: any) {
  const res = await authFetch(`${API_BASE}/sales/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
  return res.json();
}


export async function deleteSaleRecord(id: string) {
  const res = await authFetch(`${API_BASE}/sales/${id}`, {
    method: 'DELETE'
  });
  return res.json();
}


// -------------------------------------------------------------
// Admin Panel Users Management
// -------------------------------------------------------------
export async function apiGetAdminUsers() {
  const res = await authFetch(`${API_BASE}/auth/admin-users`);
  return res.json();
}


export async function apiCreateAdminUser(data: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: string;
  adminTitle?: string;
}) {
  const res = await authFetch(`${API_BASE}/auth/admin-users`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
  return res.json();
}


export async function apiUpdateAdminUser(id: string, data: {
  name?: string;
  phone?: string;
  role?: string;
  adminTitle?: string;
  status?: string;
  password?: string;
}) {
  const res = await authFetch(`${API_BASE}/auth/admin-users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
  return res.json();
}


export async function apiDeleteAdminUser(id: string) {
  const res = await authFetch(`${API_BASE}/auth/admin-users/${id}`, {
    method: 'DELETE'
  });
  return res.json();
}


// -------------------------------------------------------------
// Kitchen Location & System Settings
// -------------------------------------------------------------
export async function fetchKitchenSettings() {
  try {
    const res = await fetch(`${API_BASE}/settings/kitchen`, {
      credentials: 'include',
      headers: getAuthHeaders()
    });
    return res.json();
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to fetch kitchen settings' };
  }
}

export async function apiUpdateKitchenSettings(data: any) {
  try {
    const res = await authFetch(`${API_BASE}/settings/kitchen`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return res.json();
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to update kitchen settings' };
  }
}



