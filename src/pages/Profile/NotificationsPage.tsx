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
  ExternalLink,
  Trash2,
  AlertTriangle,
  X,
  RefreshCw
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  getUserNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  deleteNotification,
  deleteNotificationsBulk,
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

  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await getUserNotifications();
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
  }, []);

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
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
    if (notification.link) {
      navigate(notification.link);
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
    if (selectedIds.size === notifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(notifications.map(n => n.id)));
    }
  };

  // Open modal for deleting a single notification
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

  // Open modal for deleting selected notifications
  const handleOpenDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    const isAll = selectedIds.size === notifications.length;
    setConfirmModal({
      isOpen: true,
      type: isAll ? 'all' : 'bulk',
      count: selectedIds.size
    });
  };

  // Confirm delete action
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
        toast.success('Notification deleted successfully');
      } else if (confirmModal.type === 'all') {
        await deleteNotificationsBulk([], true);
        setNotifications([]);
        setSelectedIds(new Set());
        toast.success('All notifications deleted successfully');
      } else {
        // Bulk selected
        const idsToDelete: string[] = Array.from(selectedIds);
        await deleteNotificationsBulk(idsToDelete, false);
        setNotifications(prev => prev.filter(n => !selectedIds.has(n.id)));
        setSelectedIds(new Set());
        toast.success(`${idsToDelete.length} notifications deleted`);
      }
    } catch {
      toast.error('Failed to delete notification(s)');
    } finally {
      setDeleting(false);
      setConfirmModal({ isOpen: false, type: 'single', count: 0 });
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'order': 
        return <Package className="w-5 h-5 text-blue-500" />;
      case 'delivery': 
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
      case 'delivery': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'kitchen': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'calendar': return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      case 'alert': return 'bg-rose-50 text-rose-700 border-rose-100';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const isAllSelected = notifications.length > 0 && selectedIds.size === notifications.length;

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
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Notifications
            </h1>
          </div>
          
          <div className="flex items-center gap-3 self-start sm:self-auto">
            {notifications.some(n => n.unread) && (
              <button 
                onClick={handleMarkAllAsRead}
                className="text-xs sm:text-sm font-semibold text-emerald-600 hover:text-emerald-700 hover:underline transition-all cursor-pointer"
              >
                Mark all as read
              </button>
            )}
          </div>
        </div>

        {/* Not Logged In Banner */}
        {!isLoggedIn && (
          <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-amber-50/80 border border-amber-200/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="font-bold text-amber-900 text-sm">Viewing notifications as a guest</p>
              <p className="text-xs text-amber-700 mt-0.5">Log in to track your personalized meal subscription deliveries in Kakkanad.</p>
            </div>
            <Link 
              to="/login"
              className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2 rounded-full transition-colors shrink-0 shadow-xs"
            >
              <span>Log In</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

                {/* Toolbar: Select All & Bulk Actions */}
        {notifications.length > 0 && (
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
                <span>Select All ({notifications.length})</span>
              </label>
              
              {selectedIds.size > 0 && (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  {selectedIds.size} selected
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <>
                  <button 
                    onClick={() => setSelectedIds(new Set())}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-700 px-2.5 py-1.5 transition-colors cursor-pointer"
                  >
                    Clear selection
                  </button>
                  <button 
                    onClick={handleOpenDeleteSelected}
                    className="inline-flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-full transition-all shadow-xs cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete {selectedIds.size === notifications.length ? 'All' : `(${selectedIds.size})`}</span>
                  </button>
                </>
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
          ) : notifications.length === 0 ? (
            <div className="bg-white rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center border border-slate-100 shadow-xs">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">No Subscription Notifications Yet</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
                When you subscribe to a meal plan or have live meal dispatch updates in Kakkanad, they will appear right here.
              </p>
              <Link 
                to="/subscribe"
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-6 py-3 rounded-full transition-all shadow-sm hover:scale-[1.02]"
              >
                <span>Browse Subscription Plans</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            notifications.map((notification) => {
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
                        <h4 className={`text-sm sm:text-base font-bold leading-tight ${notification.unread ? 'text-slate-900' : 'text-slate-700'}`}>
                          {notification.title}
                        </h4>
                        
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

                      {/* Action Links & Indicators */}
                      <div className="flex items-center justify-between gap-3 mt-1">
                        {notification.subscriptionId ? (
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 group-hover:text-emerald-700">
                            <span>View in Profile</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div></div>
                        )}

                        {notification.unread && (
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                            <span>Unread</span>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              );
            })
          )}
        </div>

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
                <>Are you sure you want to delete <strong className="text-slate-800">"{confirmModal.targetTitle || 'this notification'}"</strong>? It will be permanently removed from your account.</>
              ) : confirmModal.type === 'all' ? (
                <>Are you sure you want to delete <strong className="text-slate-800">all {notifications.length} notifications</strong>? This action cannot be undone.</>
              ) : (
                <>Are you sure you want to delete <strong className="text-slate-800">{confirmModal.count} selected notifications</strong>? They will be removed from your account.</>
              )}
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setConfirmModal({ isOpen: false, type: 'single', count: 0 })}
                className="px-5 py-2.5 rounded-full border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
              >
                {deleting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Yes, Delete</span>
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
