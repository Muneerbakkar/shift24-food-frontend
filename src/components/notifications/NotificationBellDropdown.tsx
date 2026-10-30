import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, 
  BellRing, 
  Check, 
  Trash2, 
  X, 
  ExternalLink, 
  ChefHat, 
  Truck, 
  Package, 
  AlertTriangle,
  RefreshCw 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  UserNotification, 
  getUserNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  deleteNotification,
  deleteNotificationsBulk,
  getCurrentUserContext 
} from '../../services/notificationService';
import { 
  isPushSupported, 
  getNotificationPermission, 
  subscribeToPushNotifications,
  sendTestPushToPhone 
} from '../../services/pushNotificationService';

interface NotificationBellDropdownProps {
  role?: 'customer' | 'admin' | 'driver';
  theme?: 'light' | 'dark';
}

export function NotificationBellDropdown({ role, theme = 'light' }: NotificationBellDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeRole = role || getCurrentUserContext().role;

  const loadNotifs = async () => {
    try {
      setLoading(true);
      const data = await getUserNotifications({ role: activeRole });
      setNotifications(data);
    } catch (err) {
      console.warn('Failed to load notifications in dropdown:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifs();

    // Check push status
    if (isPushSupported()) {
      setIsPushEnabled(getNotificationPermission() === 'granted');
    }

    const handleUpdate = () => {
      loadNotifs();
      if (isPushSupported()) {
        setIsPushEnabled(getNotificationPermission() === 'granted');
      }
    };

    window.addEventListener('shift24-notifications-updated', handleUpdate);
    window.addEventListener('shift24-push-status-changed', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('shift24-notifications-updated', handleUpdate);
      window.removeEventListener('shift24-push-status-changed', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [activeRole]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const unreadCount = notifications.filter(n => n.unread).length;

  const handleMarkAllRead = async () => {
    await markAllNotificationsAsRead({ role: activeRole });
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
    toast.success('All marked as read');
  };

  const handleClearAll = async () => {
    await deleteNotificationsBulk([], true, { role: activeRole });
    setNotifications([]);
    toast.success('Cleared all notifications');
  };

  const handleNotificationClick = async (notif: UserNotification) => {
    if (notif.unread) {
      await markNotificationAsRead(notif.id);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, unread: false } : n));
    }
    setIsOpen(false);
  };

  const handleTogglePush = async () => {
    setPushLoading(true);
    try {
      if (isPushEnabled) {
        const res = await sendTestPushToPhone(activeRole);
        if (res.success) {
          toast.success('Test alert sent to your device!');
        } else {
          toast.success('Alerts are already active on this device.');
        }
      } else {
        if (!isPushSupported()) {
          toast.error('Push notifications are not supported on this browser.');
          return;
        }
        const ctx = getCurrentUserContext();
        const res = await subscribeToPushNotifications(activeRole, ctx.email, ctx.name);
        if (res.success) {
          setIsPushEnabled(true);
          toast.success(`${activeRole === 'admin' ? 'Admin' : activeRole === 'driver' ? 'Driver' : 'Live'} push alerts enabled!`);
        } else {
          toast.error(res.message || 'Could not enable alerts. Check browser permissions.');
        }
      }
    } catch {
      toast.error('Failed to enable push alerts');
    } finally {
      setPushLoading(false);
    }
  };

  const getStatusBadge = (status?: string, type?: string) => {
    const s = status || type;
    switch (s) {
      case 'Preparing':
      case 'kitchen':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Cooking</span>;
      case 'Out for Delivery':
      case 'delivery':
      case 'dispatch':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">Dispatch</span>;
      case 'Delivered':
      case 'success':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Delivered</span>;
      default:
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">Update</span>;
    }
  };

  const isDark = theme === 'dark';

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-xl transition-all cursor-pointer ${
          isDark 
            ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700' 
            : 'bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
        }`}
        title={`${activeRole === 'admin' ? 'Admin' : activeRole === 'driver' ? 'Driver' : 'Order'} Notifications`}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black px-1.5 min-w-[18px] h-[18px] rounded-full flex items-center justify-center border-2 border-white shadow-xs animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          
          {/* Header */}
          <div className="p-3.5 sm:p-4 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold capitalize text-white">
                  {activeRole === 'admin' ? 'Operations Alerts' : activeRole === 'driver' ? 'Driver Run Alerts' : 'Notifications'}
                </h4>
                <p className="text-[10px] text-slate-400 font-medium">
                  {unreadCount > 0 ? `${unreadCount} unread update(s)` : 'All caught up'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={loadNotifs}
                disabled={loading}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                title="Refresh"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Toolbar */}
          <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={handleTogglePush}
              disabled={pushLoading}
              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border transition cursor-pointer ${
                isPushEnabled
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
              }`}
              title={isPushEnabled ? 'Alerts active. Click to test.' : 'Enable phone alerts'}
            >
              <BellRing className={`w-3 h-3 ${isPushEnabled ? 'text-emerald-600' : 'text-amber-600 animate-pulse'}`} />
              <span>{pushLoading ? '...' : isPushEnabled ? 'Push Active' : 'Enable Push'}</span>
            </button>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
                >
                  Mark read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-[11px] font-semibold text-slate-400 hover:text-rose-600"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="py-12 text-center text-slate-400">
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-xs">Loading alerts...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 px-4 text-center">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                  <Bell className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-700">No Notifications Yet</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-[220px] mx-auto">
                  {activeRole === 'admin' 
                    ? 'Meal generation and live dispatch events will appear here.' 
                    : activeRole === 'driver' 
                    ? 'Assigned orders and route alerts will appear here.' 
                    : 'Your meal orders and delivery updates will appear here.'}
                </p>
              </div>
            ) : (
              notifications.slice(0, 15).map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3 sm:p-3.5 transition-colors cursor-pointer text-left hover:bg-slate-50 ${
                    notif.unread ? 'bg-emerald-50/20' : 'bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {getStatusBadge(notif.status, notif.type)}
                      <h5 className={`text-xs font-bold ${notif.unread ? 'text-slate-900' : 'text-slate-700'}`}>
                        {notif.title}
                      </h5>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0 font-medium">{notif.time}</span>
                  </div>

                  <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                    {notif.message}
                  </p>

                  <div className="mt-2 flex items-center justify-between text-[10px]">
                    {notif.link ? (
                      <Link 
                        to={notif.link}
                        onClick={() => setIsOpen(false)}
                        className="inline-flex items-center gap-1 font-bold text-emerald-600 hover:text-emerald-700"
                      >
                        <span>Open details</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </Link>
                    ) : <span />}

                    {notif.unread && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
            <Link
              to="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline block"
            >
              View All Notifications & History →
            </Link>
          </div>

        </div>
      )}
    </div>
  );
}
