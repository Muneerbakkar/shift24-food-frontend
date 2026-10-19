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
  Loader2
} from 'lucide-react';
import { 
  getAdminSubscriptions, 
  saveAdminSubscriptions, 
  AdminSubscription 
} from './adminData';
import { 
  fetchSubscriptions, 
  updateBackendSubscriptionStatus, 
  updateBackendSubscriptionSlot 
} from '../../services/api';
import toast from 'react-hot-toast';

export function AdminSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<AdminSubscription[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedSub, setSelectedSub] = useState<AdminSubscription | null>(null);
  const [isEditingSlot, setIsEditingSlot] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
            allergies: sub.allergies || [],
          }));

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
        return { ...sub, status: nextStatus, nextDelivery };
      }
      return sub;
    });

    setSubscriptions(updated);
    saveAdminSubscriptions(updated);
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

  const handleCancelSub = async (subId: string) => {
    if (!window.confirm('Are you sure you want to cancel this subscription?')) return;
    const updated = subscriptions.map(sub => {
      if (sub.id === subId) {
        return { ...sub, status: 'Cancelled' as const, nextDelivery: 'Cancelled' };
      }
      return sub;
    });

    setSubscriptions(updated);
    saveAdminSubscriptions(updated);
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
            <option value="weight-loss">Weight Loss</option>
            <option value="balance">Balance Weight</option>
            <option value="weight-gain">Weight Gain</option>
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
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-slate-400">
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

              {/* Schedule Dates */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Start Date</span>
                  <span className="font-bold text-slate-800">{selectedSub.startDate}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">End Date</span>
                  <span className="font-bold text-slate-800">{selectedSub.endDate}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 flex justify-end gap-2">
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
      )}
    </div>
  );
}
