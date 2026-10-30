import React, { useState, useEffect } from 'react';
import { 
  Repeat, 
  Search, 
  Filter, 
  Pause, 
  Play, 
  XCircle, 
  Eye, 
  CheckCircle2, 
  X, 
  AlertCircle,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Edit2,
  RefreshCw,
  Loader2,
  RotateCcw,
  Trash2
} from 'lucide-react';
import { 
  getAdminSubscriptions, 
  saveAdminSubscriptions, 
  deleteAdminSubscriptionLocally,
  AdminSubscription,
  getAdminOrders,
  saveAdminOrders
} from './adminData';
import { 
  fetchSubscriptions, 
  updateBackendSubscriptionStatus, 
  updateBackendSubscriptionSlot,
  deleteBackendSubscription
} from '../../services/api';
import toast from 'react-hot-toast';
import { showConfirmToast } from '../../utils/confirmToast';

const formatDateStr = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  }
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return dateStr;
};

export function AdminSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<AdminSubscription[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedSub, setSelectedSub] = useState<AdminSubscription | null>(null);
  const [isEditingSlot, setIsEditingSlot] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const planOptions = React.useMemo(() => {
    const defaultOptions = [
      { id: 'weight-loss', title: 'Weight Loss' },
      { id: 'balance', title: 'Balance Weight' },
      { id: 'weight-gain', title: 'Weight Gain' }
    ];
    const map = new Map<string, string>();
    defaultOptions.forEach(opt => map.set(opt.id, opt.title));
    subscriptions.forEach(sub => {
      if (sub.planId && !map.has(sub.planId)) {
        map.set(sub.planId, sub.planTitle || sub.planId);
      }
    });
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [subscriptions]);

  const loadSubscriptions = async () => {
    // 1. Load sanitized local subscriptions first
    const localSubs = getAdminSubscriptions();
    setSubscriptions(localSubs);

    // 2. Fetch from backend API if available
    try {
      setIsLoading(true);
      const res = await fetchSubscriptions();
      if (res && res.success && Array.isArray(res.data)) {
        const dummyIds = new Set(['SUB-801', 'SUB-802', 'SUB-803', 'SUB-804', 'SUB-805']);
        const dummyEmails = new Set(['rahul.s@example.com', 'ananya.roy@example.com', 'vikram.m@example.com', 'pooja.i@example.com', 'karthik.n@example.com']);

        const backendSubs: AdminSubscription[] = res.data
          .filter((sub: any) => 
            !dummyIds.has(sub.subId) && 
            !dummyIds.has(sub.id) && 
            !dummyEmails.has(sub.customerEmail)
          )
          .map((sub: any) => ({
            id: sub.subId || sub.id || sub._id,
            customerName: sub.customerName,
            customerEmail: sub.customerEmail,
            customerPhone: sub.customerPhone,
            planId: sub.planId,
            planTitle: sub.planTitle,
            duration: sub.duration,
            durationDays: sub.durationDays,
            mealsPerDay: sub.mealsPerDay,
            slot: sub.slot,
            slotLabel: sub.slotLabel,
            totalPrice: sub.totalPrice,
            status: sub.status,
            startDate: sub.startDate,
            endDate: sub.endDate,
            nextDelivery: sub.nextDelivery,
            address: sub.address,
            coordinates: sub.coordinates || (sub.latitude && sub.longitude ? { lat: sub.latitude, lng: sub.longitude } : undefined),
            latitude: sub.latitude || sub.coordinates?.lat,
            longitude: sub.longitude || sub.coordinates?.lng,
            allergies: sub.allergies || [],
            skippedDates: Array.isArray(sub.skippedDates) ? sub.skippedDates : [],
            preferences: Array.isArray(sub.preferences) ? sub.preferences : [],
            pauseStartDate: sub.pauseStartDate,
            pauseEndDate: sub.pauseEndDate,
          }));

        // Merge activeSubscription skipped dates if available
        try {
          const activeSubRaw = localStorage.getItem('activeSubscription');
          if (activeSubRaw) {
            const activeSub = JSON.parse(activeSubRaw);
            if (activeSub.skippedDates && Array.isArray(activeSub.skippedDates) && activeSub.skippedDates.length > 0) {
              backendSubs.forEach(s => {
                if ((!s.skippedDates || s.skippedDates.length === 0) && (s.id === activeSub.id || s.id === activeSub.subId || backendSubs.length === 1)) {
                  s.skippedDates = activeSub.skippedDates;
                }
              });
            }
          }
        } catch {}

        setSubscriptions(backendSubs);
        saveAdminSubscriptions(backendSubs);
      }
    } catch {
      // Backend offline or unreachable; local data already loaded
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptions();

    const handleUpdate = () => loadSubscriptions();
    window.addEventListener('shift24-subscriptions-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('shift24-subscriptions-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const handleTogglePause = async (subId: string) => {
    const subToUpdate = subscriptions.find(s => s.id === subId);
    if (!subToUpdate) return;
    const nextStatus: AdminSubscription['status'] = subToUpdate.status === 'Active' ? 'Paused' : 'Active';
    const nextDelivery = nextStatus === 'Paused' ? 'Paused by Admin' : 'Tomorrow, 07:30 AM (Breakfast)';

    const updated = subscriptions.map(sub => {
      if (sub.id === subId) {
        return { 
          ...sub, 
          status: nextStatus, 
          nextDelivery,
          pauseStartDate: nextStatus === 'Active' ? null : sub.pauseStartDate,
          pauseEndDate: nextStatus === 'Active' ? null : sub.pauseEndDate
        };
      }
      return sub;
    });

    setSubscriptions(updated);
    saveAdminSubscriptions(updated);
    try {
      const activeRaw = localStorage.getItem('activeSubscription');
      if (activeRaw) {
        const activeParsed = JSON.parse(activeRaw);
        if (activeParsed.id === subId || activeParsed.subId === subId) {
          activeParsed.status = nextStatus;
          localStorage.setItem('activeSubscription', JSON.stringify(activeParsed));
        }
      }
    } catch {}

    if (nextStatus === 'Paused') {
      try {
        const cleanId = subId.replace(/^SUB-/, '');
        const currentOrders = getAdminOrders();
        const cleanedOrders = currentOrders.filter(o => {
          if (o.status === 'Delivered') return true;
          if (o.subscriptionId === subId || (o.id && o.id.startsWith(`ORD-${cleanId}-`))) return false;
          return true;
        });
        saveAdminOrders(cleanedOrders);
        window.dispatchEvent(new Event('shift24-orders-updated'));
      } catch {}
    }

    window.dispatchEvent(new Event('shift24-customers-updated'));
    window.dispatchEvent(new Event('shift24-subscriptions-updated'));
    toast.success(`Subscription ${nextStatus === 'Paused' ? 'paused' : 'resumed'}`);
    if (selectedSub && selectedSub.id === subId) {
      setSelectedSub(updated.find(s => s.id === subId) || null);
    }

    try {
      await updateBackendSubscriptionStatus(subId, nextStatus);
    } catch (e) {
      console.warn('Backend status update error:', e);
    }
  };

  const handleReactivateSub = (subId: string) => {
    showConfirmToast({
      title: 'Reactivate this subscription?',
      description: 'Scheduled daily meal preparation and deliveries will resume starting tomorrow morning.',
      confirmText: 'Reactivate',
      cancelText: 'Keep Cancelled',
      confirmButtonClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      iconBgClass: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
      onConfirm: async () => {
        const updated = subscriptions.map(sub => {
          if (sub.id === subId) {
            return {
              ...sub,
              status: 'Active' as const,
              nextDelivery: 'Tomorrow, 07:30 AM (Breakfast)',
              pauseStartDate: null,
              pauseEndDate: null
            };
          }
          return sub;
        });

        setSubscriptions(updated);
        saveAdminSubscriptions(updated);
        try {
          const activeRaw = localStorage.getItem('activeSubscription');
          if (activeRaw) {
            const activeParsed = JSON.parse(activeRaw);
            if (activeParsed.id === subId || activeParsed.subId === subId) {
              activeParsed.status = 'Active';
              localStorage.setItem('activeSubscription', JSON.stringify(activeParsed));
            }
          }
        } catch {}
        window.dispatchEvent(new Event('shift24-customers-updated'));
        window.dispatchEvent(new Event('shift24-subscriptions-updated'));
        toast.success('Subscription reactivated to Active!');
        if (selectedSub && selectedSub.id === subId) {
          setSelectedSub(updated.find(s => s.id === subId) || null);
        }

        try {
          await updateBackendSubscriptionStatus(subId, 'Active');
        } catch (e) {
          console.warn('Backend status update error:', e);
        }
      }
    });
  };

  const handleCancelSub = (subId: string) => {
    showConfirmToast({
      title: 'Cancel this subscription?',
      description: 'Are you sure you want to cancel this subscription? Scheduled meal preparation will be stopped.',
      confirmText: 'Cancel Subscription',
      cancelText: 'Keep Active',
      confirmButtonClass: 'bg-red-600 hover:bg-red-700 text-white',
      onConfirm: async () => {
        const updated = subscriptions.map(sub => {
          if (sub.id === subId) {
            return { ...sub, status: 'Cancelled' as const, nextDelivery: 'Cancelled' };
          }
          return sub;
        });

        setSubscriptions(updated);
        saveAdminSubscriptions(updated);
        try {
          const activeRaw = localStorage.getItem('activeSubscription');
          if (activeRaw) {
            const activeParsed = JSON.parse(activeRaw);
            if (activeParsed.id === subId || activeParsed.subId === subId) {
              activeParsed.status = 'Cancelled';
              localStorage.setItem('activeSubscription', JSON.stringify(activeParsed));
            }
          }
        } catch {}
        window.dispatchEvent(new Event('shift24-customers-updated'));
        window.dispatchEvent(new Event('shift24-subscriptions-updated'));
        toast.error('Subscription marked as Cancelled');
        if (selectedSub && selectedSub.id === subId) {
          setSelectedSub(updated.find(s => s.id === subId) || null);
        }

        try {
          await updateBackendSubscriptionStatus(subId, 'Cancelled');
        } catch (e) {
          console.warn('Backend cancel update error:', e);
        }
      }
    });
  };

  const handleDeleteSub = (subId: string) => {
    showConfirmToast({
      title: 'Permanently delete this subscription?',
      description: 'Are you sure you want to delete this subscription? This will permanently remove the subscription record and any unscheduled meal batches.',
      confirmText: 'Delete Permanently',
      cancelText: 'Keep Subscription',
      confirmButtonClass: 'bg-rose-600 hover:bg-rose-700 text-white',
      iconBgClass: 'bg-rose-50 text-rose-600 border border-rose-100',
      onConfirm: async () => {
        try {
          const updated = deleteAdminSubscriptionLocally(subId);
          setSubscriptions(updated);

          // Clear activeSubscription from localStorage if it matches
          try {
            const activeRaw = localStorage.getItem('activeSubscription');
            if (activeRaw) {
              const activeParsed = JSON.parse(activeRaw);
              if (activeParsed.id === subId || activeParsed.subId === subId) {
                localStorage.removeItem('activeSubscription');
              }
            }
          } catch {}

          // Also remove pending/preparing orders associated with this subscription locally
          try {
            const currentOrders = getAdminOrders();
            const filteredOrders = currentOrders.filter(o => 
              !(o.subscriptionId === subId && (o.status === 'Pending' || o.status === 'Preparing'))
            );
            if (filteredOrders.length !== currentOrders.length) {
              saveAdminOrders(filteredOrders);
              window.dispatchEvent(new Event('shift24-orders-updated'));
            }
          } catch {}

          window.dispatchEvent(new Event('shift24-subscriptions-updated'));
          window.dispatchEvent(new Event('shift24-customers-updated'));
          window.dispatchEvent(new Event('storage'));
          toast.success('Subscription deleted permanently');

          if (selectedSub && selectedSub.id === subId) {
            setSelectedSub(null);
          }

          // Call backend API
          await deleteBackendSubscription(subId);
        } catch (err: any) {
          console.warn('Backend delete subscription error:', err);
        }
      }
    });
  };

  const handleChangeSlot = async (newSlot: string, newLabel: string) => {
    if (!selectedSub) return;
    const subId = selectedSub.id;
    const updated = subscriptions.map(sub => {
      if (sub.id === subId) {
        return { ...sub, slot: newSlot, slotLabel: newLabel };
      }
      return sub;
    });

    setSubscriptions(updated);
    saveAdminSubscriptions(updated);
    setSelectedSub(prev => prev ? { ...prev, slot: newSlot, slotLabel: newLabel } : null);
    setIsEditingSlot(false);
    toast.success(`Meal slot updated to ${newLabel}`);

    try {
      await updateBackendSubscriptionSlot(subId, newSlot, newLabel);
    } catch (e) {
      console.warn('Backend slot update error:', e);
    }
  };

  const filtered = subscriptions.filter(sub => {
    const matchesSearch = 
      sub.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.customerPhone.includes(searchTerm) ||
      sub.customerEmail.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPlan = planFilter === 'all' || sub.planId === planFilter;
    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;

    return matchesSearch && matchesPlan && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Active Subscriptions</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage customer recurring meal schedules, slot selections, and deliveries.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadSubscriptions}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 shadow-2xs"
            title="Refresh subscriptions"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
            <span>{isLoading ? 'Syncing...' : 'Refresh'}</span>
          </button>
          <span className="text-xs font-bold text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
            {filtered.length} Subscriptions Found
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by name, ID, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-700"
          >
            <option value="all">All Plans</option>
            {planOptions.map(p => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}


          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-700"
          >
            <option value="all">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Paused">Paused</option>
            <option value="Cancelled">Cancelled</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-4">Subscriber</th>
                <th className="px-5 py-4">Plan & Duration</th>
                <th className="px-5 py-4">Daily Meals & Slot</th>
                <th className="px-5 py-4">Total Amount</th>
                <th className="px-5 py-4">Next Delivery</th>
                <th className="px-5 py-4">Skipped Dates</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.map(sub => (
                <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-5 py-4 font-semibold text-slate-900">
                    <div>{sub.customerName}</div>
                    <div className="text-[11px] text-slate-400 font-normal">{sub.id} &bull; {sub.customerPhone}</div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-bold text-slate-800">{sub.planTitle}</span>
                    <div className="text-[11px] text-slate-500">{sub.duration}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg w-fit border border-emerald-200">
                      {sub.mealsPerDay === '1' ? '1 Meal' : sub.mealsPerDay === '2' ? '2 Meals' : '3 Meals'} &bull; {sub.slotLabel}
                    </div>
                  </td>
                  <td className="px-5 py-4 font-black text-slate-900">
                    ₹{sub.totalPrice}
                  </td>
                  <td className="px-5 py-4 text-slate-500 text-[11px]">
                    {sub.nextDelivery}
                  </td>
                  <td className="px-5 py-4">
                    {sub.skippedDates && sub.skippedDates.length > 0 ? (
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold">
                          <Calendar className="w-3 h-3 text-rose-500" />
                          {sub.skippedDates.length} {sub.skippedDates.length === 1 ? 'day skipped' : 'days skipped'}
                        </span>
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {sub.skippedDates.slice(0, 3).map((d) => (
                            <span key={d} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold border border-slate-200">
                              {formatDateStr(d)}
                            </span>
                          ))}
                          {sub.skippedDates.length > 3 && (
                            <span className="text-[10px] text-slate-400 font-bold self-center">
                              +{sub.skippedDates.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-[11px] font-normal">None</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      sub.status === 'Active'
                        ? 'bg-emerald-100 text-emerald-800'
                        : sub.status === 'Paused'
                        ? 'bg-amber-100 text-amber-800'
                        : sub.status === 'Cancelled'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}>
                      {sub.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedSub(sub)}
                        title="View & Edit Details"
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {sub.status === 'Cancelled' && (
                        <button
                          type="button"
                          onClick={() => handleReactivateSub(sub.id)}
                          title="Reactivate Subscription"
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 transition-colors"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}

                      {sub.status !== 'Cancelled' && sub.status !== 'Completed' && (
                        <button
                          type="button"
                          onClick={() => handleTogglePause(sub.id)}
                          title={sub.status === 'Active' ? 'Pause Subscription' : 'Resume Subscription'}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-amber-50 text-slate-600 hover:text-amber-700 transition-colors"
                        >
                          {sub.status === 'Active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                      )}

                      {sub.status !== 'Cancelled' && sub.status !== 'Completed' && (
                        <button
                          type="button"
                          onClick={() => handleCancelSub(sub.id)}
                          title="Cancel Subscription"
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 transition-colors"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteSub(sub.id)}
                        title="Delete Subscription Permanently"
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                        <Repeat className="w-6 h-6" />
                      </div>
                      <p className="font-bold text-slate-700 text-sm">No subscriptions found</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {searchTerm || planFilter !== 'all' || statusFilter !== 'all'
                          ? 'No subscriptions match your search or filter criteria.'
                          : 'No active subscriptions yet. New customer subscriptions will appear here automatically.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Subscription Details Modal */}
      {selectedSub && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => { setSelectedSub(null); setIsEditingSlot(false); }}
              className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl">
                <Repeat className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-slate-900">{selectedSub.customerName}</h3>
                <span className="text-xs text-slate-400 font-semibold">{selectedSub.id} &bull; {selectedSub.planTitle}</span>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                <div className="flex items-center gap-2 text-slate-700">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span>{selectedSub.customerEmail}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>{selectedSub.customerPhone}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span>{selectedSub.address}</span>
                </div>
              </div>

              {/* Slot and Meals Config */}
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-emerald-900 uppercase tracking-wider text-[11px]">Meal Configuration</span>
                  <button
                    type="button"
                    onClick={() => setIsEditingSlot(!isEditingSlot)}
                    className="text-emerald-700 hover:text-emerald-800 font-bold text-[11px] flex items-center gap-1"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>{isEditingSlot ? 'Cancel' : 'Change Slot'}</span>
                  </button>
                </div>
                <div className="text-sm font-bold text-slate-800">
                  {selectedSub.mealsPerDay} Meals Daily &bull; {selectedSub.slotLabel}
                </div>

                {isEditingSlot && (
                  <div className="mt-3 pt-3 border-t border-emerald-200 space-y-2">
                    <p className="text-[11px] text-emerald-800 font-semibold">Select New Slot for this Plan:</p>
                    {selectedSub.mealsPerDay === '1' ? (
                      <div className="flex gap-2">
                        {[
                          { id: 'breakfast', label: 'Breakfast' },
                          { id: 'lunch', label: 'Lunch' },
                          { id: 'dinner', label: 'Dinner' },
                        ].map(s => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => handleChangeSlot(s.id, s.label)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                              selectedSub.slot === s.id 
                                ? 'bg-emerald-600 text-white border-emerald-600' 
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    ) : selectedSub.mealsPerDay === '2' ? (
                      <div className="flex flex-wrap gap-2">
                        {[
                          { id: 'breakfast-lunch', label: 'Breakfast & Lunch' },
                          { id: 'lunch-dinner', label: 'Lunch & Dinner' },
                          { id: 'breakfast-dinner', label: 'Breakfast & Dinner' },
                        ].map(s => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => handleChangeSlot(s.id, s.label)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                              selectedSub.slot === s.id 
                                ? 'bg-emerald-600 text-white border-emerald-600' 
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 font-medium">All 3 meals included daily.</div>
                    )}
                  </div>
                )}
              </div>

              {/* Allergies tag */}
              <div>
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block mb-1">Reported Food Allergies:</span>
                {selectedSub.allergies.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedSub.allergies.map(a => (
                      <span key={a} className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold border border-rose-200">
                        {a}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-400">None reported</span>
                )}
              </div>

              {/* Skipped Delivery Dates */}
              <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-rose-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-rose-600" />
                    Skipped Delivery Dates ({selectedSub.skippedDates?.length || 0})
                  </span>
                  {selectedSub.skippedDates && selectedSub.skippedDates.length > 0 && (
                    <span className="text-[10px] font-bold text-rose-700 bg-white px-2 py-0.5 rounded-full border border-rose-200">
                      Schedule Extended
                    </span>
                  )}
                </div>

                {selectedSub.skippedDates && selectedSub.skippedDates.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-[11px] text-rose-800 font-medium">
                      Customer skipped deliveries on these dates (subscription schedule is extended):
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {selectedSub.skippedDates.map((dateStr) => (
                        <div
                          key={dateStr}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white text-rose-800 font-bold text-xs border border-rose-200 shadow-2xs"
                        >
                          <Calendar className="w-3.5 h-3.5 text-rose-500" />
                          <span>{formatDateStr(dateStr)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 font-medium">
                    No delivery dates skipped by customer.
                  </div>
                )}
              </div>

              {/* Schedule Dates */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Start Date</span>
                  <span className="font-bold text-slate-800">{selectedSub.startDate}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">End Date</span>
                  <span className="font-bold text-slate-800">{selectedSub.endDate}</span>
                  {selectedSub.skippedDates && selectedSub.skippedDates.length > 0 && (
                    <span className="text-[10px] text-rose-600 font-bold block mt-0.5">
                      +{selectedSub.skippedDates.length} skipped {selectedSub.skippedDates.length === 1 ? 'day' : 'days'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 flex justify-between items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const idToDelete = selectedSub.id;
                  handleDeleteSub(idToDelete);
                }}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5"
                title="Permanently delete subscription"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Delete Subscription</span>
              </button>

              <div className="flex items-center gap-2">
                {selectedSub.status === 'Cancelled' && (
                  <button
                    type="button"
                    onClick={() => handleReactivateSub(selectedSub.id)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reactivate Subscription</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedSub(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
