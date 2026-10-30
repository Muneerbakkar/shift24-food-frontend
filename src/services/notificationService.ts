export interface UserNotification {
  id: string;
  _id?: string;
  notificationId?: string;
  title: string;
  message: string;
  time: string;
  timestamp: number;
  type: 'order' | 'delivery' | 'kitchen' | 'success' | 'alert' | 'calendar' | 'promo';
  unread: boolean;
  link?: string;
  subscriptionId?: string;
  orderId?: string;
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

function getAuthHeaders(customHeaders: Record<string, string> = {}) {
  const token = localStorage.getItem('token');
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

export async function getUserNotifications(userEmailOverride?: string): Promise<UserNotification[]> {
  const email = getResolvedUserEmail(userEmailOverride);
  if (!email) {
    return [];
  }

  try {
    const res = await fetch(`${API_BASE}/notifications?email=${encodeURIComponent(email)}`, {
      credentials: 'include',
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      return json.data.map((item: any) => ({
        id: item.notificationId || item._id,
        _id: item._id,
        notificationId: item.notificationId,
        title: item.title,
        message: item.message,
        time: formatRelativeTime(item.createdAt),
        timestamp: new Date(item.createdAt).getTime(),
        type: item.type || 'order',
        unread: !!item.unread,
        link: item.link || '/profile',
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

export async function markAllNotificationsAsRead(emailOverride?: string) {
  const email = getResolvedUserEmail(emailOverride);
  try {
    await fetch(`${API_BASE}/notifications/read-all`, {
      method: 'PATCH',
      credentials: 'include',
      headers: getAuthHeaders(),
      body: JSON.stringify({ email })
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

export async function deleteNotificationsBulk(ids?: string[], all?: boolean, emailOverride?: string) {
  const email = getResolvedUserEmail(emailOverride);
  const res = await fetch(`${API_BASE}/notifications`, {
    method: 'DELETE',
    credentials: 'include',
    headers: getAuthHeaders(),
    body: JSON.stringify({ ids: ids || [], all: !!all, email })
  });
  const json = await res.json();
  window.dispatchEvent(new Event('shift24-notifications-updated'));
  return json;
}
