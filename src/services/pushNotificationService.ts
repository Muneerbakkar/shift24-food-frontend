import { getResolvedUserEmail } from './notificationService';

const rawBase = ((import.meta as any).env?.VITE_API_BASE_URL || (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api').trim().replace(/\/+$/, '');
const API_BASE = rawBase.endsWith('/api') ? rawBase : `${rawBase}/api`;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
}

export function getNotificationPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
  return Notification.permission;
}

export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    return await reg.pushManager.getSubscription();
  } catch (err) {
    console.warn('[Push] Error getting push subscription:', err);
    return null;
  }
}

export async function subscribeToPushNotifications(
  role: 'customer' | 'admin' | 'driver' = 'customer',
  userEmail?: string,
  userName?: string
): Promise<{ success: boolean; message?: string }> {
  if (!isPushSupported()) {
    return { success: false, message: 'Push notifications are not supported on this browser.' };
  }

  try {
    // 1. Request Browser Permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, message: 'Notification permission was denied.' };
    }

    // 2. Fetch VAPID public key
    const vapidRes = await fetch(`${API_BASE}/push/vapid-public-key`);
    const vapidData = await vapidRes.json();
    if (!vapidData.success || !vapidData.publicKey) {
      throw new Error('Could not retrieve VAPID public key from backend');
    }

    const applicationServerKey = urlBase64ToUint8Array(vapidData.publicKey);

    // 3. Register or get Service Worker
    const reg = await navigator.serviceWorker.ready;
    let subscription = await reg.pushManager.getSubscription();

    // If subscription exists with different key or expired, unsubscribe first
    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as any
      });
    }

    // 4. Send subscription to Backend
    const email = getResolvedUserEmail(userEmail);
    const name = userName || localStorage.getItem('userName') || 'User';

    const subRes = await fetch(`${API_BASE}/push/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        role,
        email,
        name,
        device: isIOS() ? 'Apple iOS' : 'Android / Web'
      })
    });

    const subData = await subRes.json();
    if (subData.success) {
      localStorage.setItem(`shift24_push_enabled_${role}`, 'true');
      window.dispatchEvent(new Event('shift24-push-status-changed'));
      return { success: true, message: 'Phone push notifications successfully enabled!' };
    } else {
      throw new Error(subData.message || 'Failed to register subscription on server');
    }
  } catch (err: any) {
    console.warn('[Push] Failed to enable push notifications:', err);
    return { success: false, message: err.message || 'Error subscribing to notifications' };
  }
}

export async function unsubscribeFromPushNotifications(role: string = 'customer'): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.getSubscription();
    if (subscription) {
      await fetch(`${API_BASE}/push/unsubscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint })
      });
      await subscription.unsubscribe();
    }
    localStorage.removeItem(`shift24_push_enabled_${role}`);
    window.dispatchEvent(new Event('shift24-push-status-changed'));
    return true;
  } catch (err) {
    console.warn('[Push] Error unsubscribing:', err);
    return false;
  }
}

export async function sendTestPushToPhone(
  role: 'customer' | 'admin' | 'driver' = 'customer',
  userEmail?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const email = getResolvedUserEmail(userEmail);
    const res = await fetch(`${API_BASE}/push/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, email })
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to send test push' };
  }
}
