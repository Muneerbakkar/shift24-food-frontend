import React, { useState, useEffect, useId } from 'react';
import { 
  Bell, 
  Package, 
  CheckCircle2, 
  Truck, 
  ChefHat, 
  Calendar, 
  AlertCircle, 
  ArrowRight,
  Trash2,
  AlertTriangle,
  X,
  RefreshCw,
  ShieldCheck,
  Lock
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  getUserNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  deleteNotification,
  deleteNotificationsBulk,
  getCurrentUserContext,
  UserNotification 
} from '../../services/notificationService';

interface ConfirmDeleteModalState {
  isOpen: boolean;
  type: 'single' | 'bulk' | 'all';
  targetId?: string;
  targetTitle?: string;
  count: number;
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const selectAllCheckboxId = useId();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [confirmModal, setConfirmModal] = useState<ConfirmDeleteModalState>({
    isOpen: false,
    type: 'single',
    count: 0
  });

  const ctx = getCurrentUserContext();
  const isLoggedIn = 
    localStorage.getItem('isLoggedIn') === 'true' || 
    localStorage.getItem('isAdminLoggedIn') === 'true' || 
    localStorage.getItem('isDriverLoggedIn') === 'true';

  const loadNotifications = async () => {
    if (!isLoggedIn) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await getUserNotifications({ role: ctx.role });
      setNotifications(data);
      // Prune selected IDs that no longer exist
      const existingIds = new Set(data.map(n => n.id));
      setSelectedIds(prev => new Set([...prev].filter(id => existingIds.has(id))));
    } catch (err) {
      console.warn('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login', { replace: true });
      return;
    }
    loadNotifications();

    const handleUpdate = () => {
      loadNotifications();
    };

    window.addEventListener('shift24-notifications-updated', handleUpdate);
    window.addEventListener('shift24-subscriptions-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('shift24-notifications-updated', handleUpdate);
      window.removeEventListener('shift24-subscriptions-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [ctx.role, ctx.email]);

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead({ role: ctx.role });
      setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to mark notifications as read');
    }
  };

  const handleNotificationClick = async (notification: UserNotification, e?: React.MouseEvent) => {
    // If clicking on checkbox or delete button, don't navigate
    if (e && (e.target as HTMLElement).closest('.interactive-action')) {
      return;
    }

    if (notification.unread) {
      await markNotificationAsRead(notification.id);
      setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, unread: false } : n));
    }
  };

  // Selection handlers
  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredNotifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredNotifications.map(n => n.id)));
    }
  };

  // Delete handlers
  const handleOpenDeleteSingle = (notification: UserNotification, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmModal({
      isOpen: true,
      type: 'single',
      targetId: notification.id,
      targetTitle: notification.title,
      count: 1
    });
  };

  const handleOpenDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    setConfirmModal({
      isOpen: true,
      type: 'bulk',
      count: selectedIds.size
    });
  };

  const handleOpenDeleteAll = () => {
    if (notifications.length === 0) return;
    setConfirmModal({
      isOpen: true,
      type: 'all',
      count: notifications.length
    });
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      if (confirmModal.type === 'single' && confirmModal.targetId) {
        await deleteNotification(confirmModal.targetId);
        setNotifications(prev => prev.filter(n => n.id !== confirmModal.targetId));
        setSelectedIds(prev => {
          const next = new Set(prev);
          next.delete(confirmModal.targetId!);
          return next;
        });
        toast.success('Notification deleted');
      } else if (confirmModal.type === 'bulk') {
        const idsToDelete: string[] = Array.from(selectedIds);
        await deleteNotificationsBulk(idsToDelete, false, { role: ctx.role });
        const setDeleted = new Set(idsToDelete);
        setNotifications(prev => prev.filter(n => !setDeleted.has(n.id)));
        setSelectedIds(new Set());
        toast.success(`${idsToDelete.length} notifications deleted`);
      } else if (confirmModal.type === 'all') {
        await deleteNotificationsBulk([], true, { role: ctx.role });
        setNotifications([]);
        setSelectedIds(new Set());
        toast.success('All notifications cleared');
      }
    } catch {
      toast.error('Failed to delete notifications');
    } finally {
      setDeleting(false);
      setConfirmModal({ isOpen: false, type: 'single', count: 0 });
    }
  };

  const filteredNotifications = notifications;

  const getIcon = (type: string) => {
    switch (type) {
      case 'order': 
        return <Package className="w-5 h-5 text-blue-500" />;
      case 'delivery': 
      case 'dispatch':
      case 'driver':
        return <Truck className="w-5 h-5 text-emerald-500" />;
      case 'kitchen': 
        return <ChefHat className="w-5 h-5 text-amber-500" />;
      case 'calendar': 
        return <Calendar className="w-5 h-5 text-indigo-500" />;
      case 'alert': 
        return <AlertCircle className="w-5 h-5 text-rose-500" />;
      case 'success': 
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      default: 
        return <Bell className="w-5 h-5 text-slate-500" />;
    }
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'order': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'delivery': 
      case 'dispatch':
      case 'driver':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'kitchen': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'calendar': return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      case 'alert': return 'bg-rose-50 text-rose-700 border-rose-100';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
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
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">Out for Delivery</span>;
      case 'Delivered':
      case 'success':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Delivered</span>;
      case 'Pending':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">Scheduled</span>;
      default:
        return null;
    }
  };

  const isAllSelected = filteredNotifications.length > 0 && selectedIds.size === filteredNotifications.length;

  if (!isLoggedIn) {
    return null;
  }

  return (
    <div className="pt-8 md:pt-16 lg:pt-20 pb-16 lg:pb-24 bg-slate-50 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Breadcrumb & Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-slate-500 text-sm font-medium mb-1.5 flex items-center gap-2">
              <Link to="/" className="hover:text-emerald-600 transition-colors">Home</Link> 
              <span className="text-slate-300">/</span> 
              <span className="text-slate-900 font-semibold">Notifications</span>
            </p>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Notifications
              </h1>
              {ctx.role !== 'customer' && isLoggedIn && (
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-900 text-white">
                  {ctx.role === 'admin' ? 'Admin Operations' : 'Driver Portal'}
                </span>
              )}
            </div>
          </div>
          
          {isLoggedIn && (
            <div className="flex items-center gap-3 self-start sm:self-auto">
              <button
                onClick={loadNotifications}
                disabled={loading}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-full transition shadow-2xs cursor-pointer"
                title="Refresh notifications"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-500' : ''}`} />
                <span>Refresh</span>
              </button>

              {notifications.some(n => n.unread) && (
                <button 
                  onClick={handleMarkAllAsRead}
                  className="text-xs sm:text-sm font-semibold text-emerald-600 hover:text-emerald-700 hover:underline transition-all cursor-pointer"
                >
                  Mark all as read
                </button>
              )}
            </div>
          )}
        </div>

        {!isLoggedIn ? (
          <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-slate-200/80 shadow-xs max-w-lg mx-auto my-6">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-100 shadow-2xs">
              <Lock className="w-7 h-7" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-2">
              Sign in to view your notifications
            </h2>
            <p className="text-slate-500 text-sm max-w-sm mx-auto mb-6 leading-relaxed">
              Notifications contain your personalized meal schedules, chef cooking updates, and delivery tracking in Kakkanad. Please sign in to access your updates.
            </p>
            <Link 
              to="/login"
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl transition shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              <span>Log In to Shift24</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <>
            {/* Toolbar: Select All & Bulk Actions */}
        {filteredNotifications.length > 0 && (
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <label 
                htmlFor={selectAllCheckboxId}
                className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-slate-700 cursor-pointer select-none"
              >
                <input 
                  type="checkbox"
                  id={selectAllCheckboxId}
                  checked={isAllSelected}
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                />
                <span>Select All ({filteredNotifications.length})</span>
              </label>
              
              {selectedIds.size > 0 && (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  {selectedIds.size} selected
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {selectedIds.size > 0 ? (
                <button
                  type="button"
                  onClick={handleOpenDeleteSelected}
                  className="inline-flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-full transition-all shadow-xs cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete {selectedIds.size === filteredNotifications.length ? 'All' : `(${selectedIds.size})`}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleOpenDeleteAll}
                  className="text-xs font-semibold text-slate-400 hover:text-rose-600 transition cursor-pointer"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>
        )}

        {/* Notifications List */}
        <div className="space-y-3">
          {loading ? (
            <div className="bg-white rounded-2xl p-10 text-center border border-slate-100 shadow-xs">
              <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-sm text-slate-500 font-medium">Loading notifications...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="bg-white rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center border border-slate-100 shadow-xs">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                {ctx.role === 'admin' 
                  ? 'No Operations Alerts Yet' 
                  : ctx.role === 'driver' 
                  ? 'No Driver Delivery Alerts Yet' 
                  : 'No Notifications Yet'}
              </h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mb-6 leading-relaxed">
                {ctx.role === 'admin'
                  ? 'When meals are generated from the admin panel, orders are dispatched, or drivers are assigned, live alerts will appear here.'
                  : ctx.role === 'driver'
                  ? 'When delivery runs are assigned to you in Kakkanad or order statuses update, live dispatch alerts will appear here.'
                  : 'When your meal plan is active or live cooking and delivery updates occur in Kakkanad, they will appear right here.'}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={loadNotifications}
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-6 py-2.5 rounded-full transition-all shadow-sm hover:scale-[1.02] cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Check for Updates</span>
                </button>
                {ctx.role === 'admin' ? (
                  <Link
                    to="/admin/orders"
                    className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold px-6 py-2.5 rounded-full transition-all shadow-sm"
                  >
                    <span>Go to Admin Orders</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <Link 
                    to="/subscribe"
                    className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-bold px-6 py-2.5 rounded-full transition-all shadow-2xs"
                  >
                    <span>Browse Subscription Plans</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </div>
          ) : (
            filteredNotifications.map((notification) => {
              const isSelected = selectedIds.has(notification.id);
              return (
                <div 
                  key={notification.id} 
                  onClick={(e) => handleNotificationClick(notification, e)}
                  className={`bg-white p-4 sm:p-5 rounded-2xl shadow-xs border transition-all cursor-pointer relative group ${
                    isSelected 
                      ? 'border-emerald-500 bg-emerald-50/20 ring-1 ring-emerald-500/30' 
                      : notification.unread 
                        ? 'border-emerald-200/90 bg-emerald-50/10 hover:bg-emerald-50/25 ring-1 ring-emerald-500/10' 
                        : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex gap-3 sm:gap-4 items-start">
                    
                    {/* Checkbox for Bulk Delete Selection */}
                    <div className="pt-1 interactive-action" onClick={(e) => handleToggleSelect(notification.id, e)}>
                      <input 
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        aria-label={`Select notification: ${notification.title}`}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                      />
                    </div>

                    {/* Icon Avatar */}
                    <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center shrink-0 border ${getBadgeColor(notification.type)}`}>
                      {getIcon(notification.type)}
                    </div>

                    {/* Body */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getStatusBadge(notification.status, notification.type)}
                          <h4 className={`text-sm sm:text-base font-bold leading-tight ${notification.unread ? 'text-slate-900' : 'text-slate-700'}`}>
                            {notification.title}
                          </h4>
                        </div>
                        
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] sm:text-xs font-semibold text-slate-400">
                            {notification.time}
                          </span>

                          {/* Individual Delete Button */}
                          <button
                            type="button"
                            onClick={(e) => handleOpenDeleteSingle(notification, e)}
                            title="Delete this notification"
                            className="interactive-action p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <p className={`text-xs sm:text-sm leading-relaxed mb-2 ${notification.unread ? 'text-slate-600 font-medium' : 'text-slate-500'}`}>
                        {notification.message}
                      </p>

                      {/* Unread Indicator */}
                      {notification.unread && (
                        <div className="flex items-center justify-end gap-1.5 mt-1 text-[11px] font-semibold text-emerald-600">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                          <span>Unread</span>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              );
            })
          )}
        </div>
        </>
        )}

      </div>

      {/* Confirmation Modal for Delete (Single, Bulk, or Select All) */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 text-left">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <button 
                onClick={() => !deleting && setConfirmModal({ isOpen: false, type: 'single', count: 0 })}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h3 className="text-xl font-extrabold text-slate-900 mb-2">
              {confirmModal.type === 'single'
                ? 'Delete Notification?'
                : confirmModal.type === 'all'
                ? 'Delete All Notifications?'
                : `Delete ${confirmModal.count} Selected Notifications?`}
            </h3>

            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              {confirmModal.type === 'single' ? (
                <>Are you sure you want to delete <strong className="text-slate-800">"{confirmModal.targetTitle}"</strong>?</>
              ) : confirmModal.type === 'all' ? (
                'Are you sure you want to permanently clear all notifications? This action cannot be undone.'
              ) : (
                `Are you sure you want to delete ${confirmModal.count} selected notifications?`
              )}
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setConfirmModal({ isOpen: false, type: 'single', count: 0 })}
                className="px-5 py-2.5 rounded-full text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-sm cursor-pointer"
              >
                {deleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
