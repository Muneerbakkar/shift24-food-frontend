export interface UserNotification {
  id: string;
  _id?: string;
  notificationId?: string;
  role?: 'customer' | 'admin' | 'driver' | 'all';
  title: string;
  message: string;
  time: string;
  timestamp: number;
  type: 'order' | 'delivery' | 'kitchen' | 'dispatch' | 'system' | 'driver' | 'success' | 'alert' | 'calendar' | 'promo';
  status?: string;
  unread: boolean;
  link?: string;
  subscriptionId?: string;
  orderId?: string;
}

export interface UserContext {
  role: 'customer' | 'admin' | 'driver';
  email: string;
  name: string;
  id?: string;
  phone?: string;
}

const rawBase = ((import.meta as any).env?.VITE_API_BASE_URL || (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api').trim().replace(/\/+$/, '');
const API_BASE = rawBase.endsWith('/api') ? rawBase : `${rawBase}/api`;

export function getResolvedUserEmail(userEmailOverride?: string): string {
  if (userEmailOverride && userEmailOverride.trim()) {
    return userEmailOverride.trim().toLowerCase();
  }

  const direct = localStorage.getItem('userEmail');
  if (direct && direct.trim()) {
    return direct.trim().toLowerCase();
  }

  try {
    const rawUser = localStorage.getItem('user');
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      if (parsed?.email) {
        return String(parsed.email).trim().toLowerCase();
      }
    }
  } catch (e) {}

  try {
    const rawSub = localStorage.getItem('activeSubscription');
    if (rawSub) {
      const parsed = JSON.parse(rawSub);
      if (parsed?.customerEmail) {
        return String(parsed.customerEmail).trim().toLowerCase();
      }
    }
  } catch (e) {}

  return '';
}

export function isUserLoggedIn(): boolean {
  return (
    localStorage.getItem('isLoggedIn') === 'true' ||
    localStorage.getItem('isAdminLoggedIn') === 'true' ||
    localStorage.getItem('isDriverLoggedIn') === 'true'
  );
}

export function getCurrentUserContext(): UserContext {
  if (!isUserLoggedIn()) {
    return { role: 'customer', email: '', name: 'Guest' };
  }

  // 1. Admin
  if (localStorage.getItem('isAdminLoggedIn') === 'true') {
    let email = 'admin@shift24.com';
    let name = 'Admin';
    try {
      const stored = localStorage.getItem('adminUser');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.email) email = parsed.email;
        if (parsed.name) name = parsed.name;
      }
    } catch {}
    return { role: 'admin', email, name };
  }

  // 2. Driver
  if (localStorage.getItem('isDriverLoggedIn') === 'true') {
    let email = '';
    let name = 'Driver';
    let id = '';
    let phone = '';
    try {
      const stored = localStorage.getItem('driverUser');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.id || parsed._id) id = parsed.id || parsed._id;
        if (parsed.email) email = parsed.email;
        if (parsed.name) name = parsed.name;
        if (parsed.phone) phone = parsed.phone;
      }
    } catch {}
    return { role: 'driver', id, email, name, phone };
  }

  // 3. Customer
  const email = getResolvedUserEmail();
  const name = localStorage.getItem('userName') || 'Customer';
  return { role: 'customer', email, name };
}

function getAuthHeaders(customHeaders: Record<string, string> = {}) {
  const token = localStorage.getItem('token') || localStorage.getItem('adminToken') || localStorage.getItem('driverToken');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

function formatRelativeTime(dateInput?: string | Date | number): string {
  if (!dateInput) return 'Recently';
  const targetDate = new Date(dateInput);
  if (isNaN(targetDate.getTime())) return 'Recently';

  const now = new Date();
  const diffMs = now.getTime() - targetDate.getTime();
  if (diffMs < 0) return 'Scheduled';

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 2) return 'Just now';
  if (diffMin < 60) return `${diffMin} mins ago`;
  if (diffHour === 1) return '1 hour ago';
  if (diffHour < 24) return `${diffHour} hours ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay} days ago`;

  return targetDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

export async function getUserNotifications(options?: {
  role?: 'customer' | 'admin' | 'driver';
  email?: string;
  driverId?: string;
}): Promise<UserNotification[]> {
  // If not logged in at all, strictly do not query or return any customer's notifications
  if (!isUserLoggedIn()) {
    return [];
  }

  const ctx = getCurrentUserContext();
  const role = options?.role || ctx.role;
  const email = options?.email || ctx.email;
  const driverId = options?.driverId || ctx.id;

  const params = new URLSearchParams();
  if (role) params.set('role', role);
  if (email) params.set('email', email);
  if (driverId) params.set('driverId', driverId);

  try {
    const res = await fetch(`${API_BASE}/notifications?${params.toString()}`, {
      credentials: 'include',
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      return json.data.map((item: any) => ({
        id: item.notificationId || item._id,
        _id: item._id,
        notificationId: item.notificationId,
        role: item.role,
        title: item.title,
        message: item.message,
        time: formatRelativeTime(item.updatedAt || item.createdAt),
        timestamp: new Date(item.updatedAt || item.createdAt).getTime(),
        type: item.type || 'order',
        status: item.status,
        unread: !!item.unread,
        link: item.link || (item.role === 'admin' ? '/admin/orders' : item.role === 'driver' ? '/driver/portal' : '/profile'),
        subscriptionId: item.subscriptionId,
        orderId: item.orderId
      }));
    }
  } catch (err) {
    console.warn('[NotificationService] Failed to fetch backend notifications:', err);
  }

  return [];
}

export async function markNotificationAsRead(id: string) {
  try {
    await fetch(`${API_BASE}/notifications/${encodeURIComponent(id)}/read`, {
      method: 'PATCH',
      credentials: 'include',
      headers: getAuthHeaders()
    });
    window.dispatchEvent(new Event('shift24-notifications-updated'));
  } catch (err) {
    console.warn('Failed to mark notification as read:', err);
  }
}

export async function markAllNotificationsAsRead(options?: { role?: string; email?: string }) {
  const ctx = getCurrentUserContext();
  const role = options?.role || ctx.role;
  const email = options?.email || ctx.email;

  try {
    await fetch(`${API_BASE}/notifications/read-all`, {
      method: 'PATCH',
      credentials: 'include',
      headers: getAuthHeaders(),
      body: JSON.stringify({ role, email })
    });
    window.dispatchEvent(new Event('shift24-notifications-updated'));
  } catch (err) {
    console.warn('Failed to mark all notifications as read:', err);
  }
}

export async function deleteNotification(id: string) {
  const res = await fetch(`${API_BASE}/notifications/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: getAuthHeaders()
  });
  const json = await res.json();
  window.dispatchEvent(new Event('shift24-notifications-updated'));
  return json;
}

export async function deleteNotificationsBulk(ids?: string[], all?: boolean, options?: { role?: string; email?: string }) {
  const ctx = getCurrentUserContext();
  const role = options?.role || ctx.role;
  const email = options?.email || ctx.email;

  const res = await fetch(`${API_BASE}/notifications`, {
    method: 'DELETE',
    credentials: 'include',
    headers: getAuthHeaders(),
    body: JSON.stringify({ ids: ids || [], all: !!all, role, email })
  });
  const json = await res.json();
  window.dispatchEvent(new Event('shift24-notifications-updated'));
  return json;
}
