import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, 
  Users, 
  Repeat, 
  ShoppingBag, 
  ChefHat, 
  CheckCircle2, 
  Truck, 
  ArrowRight,
  Sparkles,
  Calendar,
  Coins
} from 'lucide-react';
import { 
  getAdminSubscriptions, 
  getAdminOrders, 
  getAdminCustomers, 
  getAdminCommissionRate,
  getAdminPlans,
  saveAdminSubscriptions,
  saveAdminOrders,
  isDummyCustomer,
  syncLocalOrdersFromSubscriptions,
  AdminSubscription, 
  AdminOrder 
} from './adminData';
import { 
  fetchSubscriptions, 
  fetchOrders, 
  fetchCustomers, 
  fetchSales,
  updateBackendOrderStatus,
  generateBackendOrders
} from '../../services/api';
import toast from 'react-hot-toast';

export function AdminDashboard() {
  const [subscriptions, setSubscriptions] = useState<AdminSubscription[]>(() => getAdminSubscriptions());
  const [orders, setOrders] = useState<AdminOrder[]>(() => getAdminOrders());
  const [customersCount, setCustomersCount] = useState<number>(() => getAdminCustomers().length);
  const [pipelineView, setPipelineView] = useState<'today' | 'tomorrow'>('today');
  const [commissionRate, setCommissionRate] = useState<number>(() => getAdminCommissionRate());
  const [plans, setPlans] = useState<any[]>(() => getAdminPlans());
  const [backendMetrics, setBackendMetrics] = useState<{ totalRevenue?: number; totalCommission?: number } | null>(null);

  const getLocalDateISO = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const now = new Date();
  const todayObj = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayISO = getLocalDateISO(todayObj);

  const tomorrowObj = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const tomorrowISO = getLocalDateISO(tomorrowObj);

  const getOrderDateISO = (order: AdminOrder): string | null => {
    if (order.deliveryDate) {
      const match = order.deliveryDate.match(/\b(\d{4}-\d{2}-\d{2})\b/);
      if (match) return match[1];
    }
    if (order.id) {
      const idMatch = order.id.match(/\b(\d{4})(\d{2})(\d{2})\b/);
      if (idMatch) return `${idMatch[1]}-${idMatch[2]}-${idMatch[3]}`;
    }
    if (order.deliveryDate) {
      const lower = order.deliveryDate.toLowerCase().trim();
      if (lower.startsWith('today')) return todayISO;
      if (lower.startsWith('tomorrow')) return tomorrowISO;
    }
    return null;
  };

  const loadData = async () => {
    // 1. Load local cache first
    const localSubs = getAdminSubscriptions();
    const localOrds = getAdminOrders();
    const localCusts = getAdminCustomers();

    setSubscriptions(localSubs);
    setOrders(localOrds);
    setCustomersCount(localCusts.length);

    // 2. Fetch Customers
    try {
      const custRes = await fetchCustomers();
      if (custRes && custRes.success && Array.isArray(custRes.data)) {
        const valid = custRes.data.filter((c: any) => !isDummyCustomer(c));
        const total = Math.max(valid.length, localCusts.length);
        setCustomersCount(total);
      }
    } catch {}

    // 3. Fetch Subscriptions
    let activeSubsList = localSubs;
    try {
      const subRes = await fetchSubscriptions();
      if (subRes && subRes.success && Array.isArray(subRes.data)) {
        const dummyIds = new Set(['SUB-801', 'SUB-802', 'SUB-803', 'SUB-804', 'SUB-805']);
        const dummyEmails = new Set(['rahul.s@example.com', 'ananya.roy@example.com', 'vikram.m@example.com', 'pooja.i@example.com', 'karthik.n@example.com']);

        const backendSubs: AdminSubscription[] = subRes.data
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
            skippedDates: sub.skippedDates || [],
            skippedMeals: sub.skippedMeals || [],
            preferences: sub.preferences || [],
            pauseStartDate: sub.pauseStartDate || null,
            pauseEndDate: sub.pauseEndDate || null
          }));

        if (backendSubs.length > 0) {
          activeSubsList = backendSubs;
          setSubscriptions(backendSubs);
          saveAdminSubscriptions(backendSubs);

          // Keep activeSubscription in localStorage in sync with backend status
          try {
            const activeRaw = localStorage.getItem('activeSubscription');
            if (activeRaw) {
              const activeParsed = JSON.parse(activeRaw);
              const matched = backendSubs.find(s => s.id === activeParsed.id || s.id === activeParsed.subId);
              if (matched && matched.status !== activeParsed.status) {
                activeParsed.status = matched.status;
                localStorage.setItem('activeSubscription', JSON.stringify(activeParsed));
              }
            }
          } catch {}
        }
      }
    } catch (e) {
      console.warn('Subscriptions sync warning:', e);
    }

    // 4. Fetch Orders
    try {
      const ordRes = await fetchOrders();
      if (ordRes && ordRes.success && Array.isArray(ordRes.data)) {
        const dummyOrderIds = new Set(['ORD-901', 'ORD-902', 'ORD-903', 'ORD-904', 'ORD-905', 'ORD-906']);
        const dummyCustomerNames = new Set(['Rahul Sharma', 'Ananya Roy', 'Vikram Menon', 'Pooja Iyer', 'Karthik Nair']);
        const validSubIds = new Set(activeSubsList.map(s => s.id));

        const backendOrders: AdminOrder[] = ordRes.data
          .filter((o: any) => 
            !dummyOrderIds.has(o.orderId || o.id) && 
            !dummyCustomerNames.has(o.customerName) &&
            (validSubIds.size === 0 || validSubIds.has(o.subscriptionId))
          )
          .map((o: any) => ({
            id: o.orderId || o.id || o._id,
            subscriptionId: o.subscriptionId || '',
            customerName: o.customerName || 'Customer',
            customerPhone: o.customerPhone || '',
            planTitle: o.planTitle || 'Meal Plan',
            mealName: o.mealName || 'Scheduled Meal',
            mealType: o.mealType || 'Breakfast',
            deliveryDate: o.deliveryDate || 'Tomorrow',
            deliveryTimeSlot: o.deliveryTimeSlot || '07:30 AM - 08:30 AM',
            address: o.address || '',
            status: o.status || 'Preparing',
            amount: o.amount || 0,
            paymentMethod: o.paymentMethod || 'Online / Paid',
            allergies: o.allergies || []
          }));

        setOrders(backendOrders);
        saveAdminOrders(backendOrders);
      } else {
        // Sync local orders if backend has none
        const local = syncLocalOrdersFromSubscriptions(activeSubsList, { targetDateISO: tomorrowISO });
        setOrders(local);
      }
    } catch (e) {
      console.warn('Orders sync warning:', e);
    }

    // 5. Fetch Sales & Revenue Metrics from backend
    try {
      const salesRes = await fetchSales();
      if (salesRes && salesRes.success && salesRes.metrics) {
        setBackendMetrics({
          totalRevenue: Number(salesRes.metrics.totalRevenue) || 0,
          totalCommission: Number(salesRes.metrics.totalCommission) || 0
        });
      }
    } catch (e) {
      console.warn('Sales metrics sync warning:', e);
    }
  };

  useEffect(() => {
    loadData();

    const refresh = () => loadData();
    const handleCommission = () => setCommissionRate(getAdminCommissionRate());
    const handlePlans = () => setPlans(getAdminPlans());

    window.addEventListener('shift24-orders-updated', refresh);
    window.addEventListener('shift24-subscriptions-updated', refresh);
    window.addEventListener('shift24-customers-updated', refresh);
    window.addEventListener('shift24-commission-updated', handleCommission);
    window.addEventListener('shift24-plans-updated', handlePlans);
    window.addEventListener('shift24-sales-updated', refresh);
    window.addEventListener('storage', refresh);

    return () => {
      window.removeEventListener('shift24-orders-updated', refresh);
      window.removeEventListener('shift24-subscriptions-updated', refresh);
      window.removeEventListener('shift24-customers-updated', refresh);
      window.removeEventListener('shift24-commission-updated', handleCommission);
      window.removeEventListener('shift24-plans-updated', handlePlans);
      window.removeEventListener('shift24-sales-updated', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const activeSubs = useMemo(() => {
    return subscriptions.filter(s => s.status === 'Active' && !isDummyCustomer(s));
  }, [subscriptions]);

  // Safe Total Sales (Gross booking collections)
  const totalSales = useMemo(() => {
    if (backendMetrics && typeof backendMetrics.totalRevenue === 'number' && backendMetrics.totalRevenue > 0) {
      return backendMetrics.totalRevenue;
    }
    return activeSubs.reduce((sum, s) => {
      const p = typeof s.totalPrice === 'number' 
        ? s.totalPrice 
        : Number(String(s.totalPrice || '').replace(/[^0-9.]/g, '')) || 0;
      return sum + p;
    }, 0);
  }, [activeSubs, backendMetrics]);

  // Safe Subscription Commission (Platform take-rate earnings)
  const totalCommission = useMemo(() => {
    if (backendMetrics && typeof backendMetrics.totalCommission === 'number' && backendMetrics.totalCommission > 0) {
      return backendMetrics.totalCommission;
    }
    return activeSubs.reduce((sum, s) => {
      const subPrice = typeof s.totalPrice === 'number' 
        ? s.totalPrice 
        : Number(String(s.totalPrice || '').replace(/[^0-9.]/g, '')) || 0;

      let days = s.durationDays;
      if (!days) {
        const match = (s.duration || '').match(/\d+/);
        days = match ? parseInt(match[0], 10) : 30;
      }
      if (days <= 0) days = 30;

      const plan = plans.find((p: any) => p.id === s.planId || p.planId === s.planId);
      const rate = typeof plan?.dailyCommission === 'number' && plan.dailyCommission >= 0 
        ? plan.dailyCommission 
        : commissionRate;

      const comm = Math.min(subPrice, days * rate);
      return sum + comm;
    }, 0);
  }, [activeSubs, plans, commissionRate, backendMetrics]);

  // Accurate Date-Filtered Orders
  const todayOrders = useMemo(() => {
    return orders.filter(o => getOrderDateISO(o) === todayISO);
  }, [orders, todayISO]);

  const tomorrowOrders = useMemo(() => {
    return orders.filter(o => getOrderDateISO(o) === tomorrowISO);
  }, [orders, tomorrowISO]);

  // Auto-switch to tomorrow if today has 0 orders but tomorrow has scheduled runs
  useEffect(() => {
    if (todayOrders.length === 0 && tomorrowOrders.length > 0) {
      setPipelineView('tomorrow');
    }
  }, [todayOrders.length, tomorrowOrders.length]);

  const activePipelineOrders = pipelineView === 'today' ? todayOrders : tomorrowOrders;

  const breakfastOrders = activePipelineOrders.filter(o => o.mealType === 'Breakfast');
  const lunchOrders = activePipelineOrders.filter(o => o.mealType === 'Lunch');
  const dinnerOrders = activePipelineOrders.filter(o => o.mealType === 'Dinner');

  const handleAdvanceStatus = async (orderId: string) => {
    const updated = orders.map(o => {
      if (o.id === orderId) {
        let nextStatus: AdminOrder['status'] = 'Delivered';
        if (o.status === 'Pending') nextStatus = 'Preparing';
        else if (o.status === 'Preparing') nextStatus = 'Out for Delivery';
        else if (o.status === 'Out for Delivery') nextStatus = 'Delivered';
        return { ...o, status: nextStatus };
      }
      return o;
    });

    setOrders(updated);
    saveAdminOrders(updated);
    const target = updated.find(o => o.id === orderId);
    if (target) {
      try {
        await updateBackendOrderStatus(orderId, target.status);
      } catch (e) {}
    }
    toast.success('Order status updated');
  };

  const getStatusBadge = (status: AdminOrder['status']) => {
    switch (status) {
      case 'Delivered':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Out for Delivery':
        return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'Preparing':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Pending':
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Welcome & Summary Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-2 border border-emerald-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Shift24 Live Kitchen & Logistics</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            {pipelineView === 'today' ? "Today's Meal Pipeline" : "Tomorrow's Meal Pipeline"}
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
            {activeSubs.length > 0 ? (
              <>
                Managing {activeSubs.length} active recurring meal plan{activeSubs.length === 1 ? '' : 's'} with {activePipelineOrders.length} scheduled meal drop-off{activePipelineOrders.length === 1 ? '' : 's'} {pipelineView === 'today' ? 'today' : 'tomorrow'} across Kakkanad.
                {pipelineView === 'today' && todayOrders.length === 0 && tomorrowOrders.length > 0 && (
                  <span className="block mt-1 text-emerald-300 font-semibold">
                    Next scheduled delivery batch begins Tomorrow ({tomorrowOrders.length} meals).
                  </span>
                )}
              </>
            ) : (
              <>
                No active recurring meal plans currently scheduled ({activePipelineOrders.length} meal drop-offs {pipelineView === 'today' ? 'today' : 'tomorrow'}).
                {subscriptions.length > 0 && (
                  <span className="block mt-1 text-slate-400">
                    All {subscriptions.length} customer subscription signups on file are currently cancelled or inactive.
                  </span>
                )}
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Date Toggle */}
          <div className="flex items-center bg-slate-800/90 p-1 rounded-xl border border-slate-700 shadow-inner">
            <button
              type="button"
              onClick={() => setPipelineView('today')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                pipelineView === 'today'
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Today ({todayOrders.length})
            </button>
            <button
              type="button"
              onClick={() => setPipelineView('tomorrow')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                pipelineView === 'tomorrow'
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Tomorrow ({tomorrowOrders.length})
            </button>
          </div>

          <Link
            to="/admin/kitchen"
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2"
          >
            <ChefHat className="w-4 h-4" />
            <span>Kitchen Board</span>
          </Link>
          <Link
            to="/admin/orders"
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all border border-slate-700 flex items-center gap-2"
          >
            <Truck className="w-4 h-4" />
            <span>Dispatch Sheets</span>
          </Link>
        </div>
      </div>

      {/* 5 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
        {/* Card 1: Subscription Commission */}
        <Link
          to="/admin/sales"
          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-amber-300 hover:shadow-md transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 group-hover:text-amber-700 transition-colors">
              Subscription Commission
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900 group-hover:text-amber-600 transition-colors">
              ₹{totalCommission.toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold mt-2 text-amber-700">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>₹{commissionRate}/day take-rate</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-medium">
              Net Platform Take-Rate
            </div>
          </div>
        </Link>

        {/* Card 2: Total Sales */}
        <Link
          to="/admin/sales"
          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-emerald-300 hover:shadow-md transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 group-hover:text-emerald-700 transition-colors">
              Total Sales
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
              ₹
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900 group-hover:text-emerald-700 transition-colors">
              ₹{totalSales.toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold mt-2">
              {activeSubs.length > 0 ? (
                <>
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600">
                    {activeSubs.length} Active Paying Plan{activeSubs.length === 1 ? '' : 's'}
                  </span>
                </>
              ) : (
                <span className="text-slate-400">0 Active Paying Plans</span>
              )}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-medium">
              Gross Subscription Revenue
            </div>
          </div>
        </Link>

        {/* Card 3: Active Subscribers */}
        <Link
          to="/admin/subscriptions"
          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-teal-300 hover:shadow-md transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 group-hover:text-teal-700 transition-colors">
              Active Subscribers
            </span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Repeat className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900 group-hover:text-teal-700 transition-colors">
              {activeSubs.length}
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mt-2">
              <span>{subscriptions.length} total signups on file</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-medium">
              Active Meal Programs
            </div>
          </div>
        </Link>

        {/* Card 4: Today's Deliveries */}
        <Link
          to="/admin/orders"
          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-indigo-300 hover:shadow-md transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 group-hover:text-indigo-700 transition-colors">
              {pipelineView === 'today' ? "Today's Meals" : "Tomorrow's Meals"}
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900 group-hover:text-indigo-700 transition-colors">
              {activePipelineOrders.length}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-2">
              <span className="text-amber-600 font-bold">{breakfastOrders.length} B</span> &bull;{' '}
              <span className="text-orange-600 font-bold">{lunchOrders.length} L</span> &bull;{' '}
              <span className="text-indigo-600 font-bold">{dinnerOrders.length} D</span>
              {pipelineView === 'today' && todayOrders.length === 0 && tomorrowOrders.length > 0 && (
                <span className="ml-1 text-emerald-600 font-bold">({tomorrowOrders.length} queued)</span>
              )}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-medium">
              Daily Kitchen Output
            </div>
          </div>
        </Link>

        {/* Card 5: Total Customers */}
        <Link
          to="/admin/customers"
          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-sky-300 hover:shadow-md transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 group-hover:text-sky-700 transition-colors">
              Customer Roster
            </span>
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900 group-hover:text-sky-700 transition-colors">
              {customersCount}
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 mt-2">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>100% Verified Profiles</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-medium">
              Registered Accounts
            </div>
          </div>
        </Link>
      </div>

      {/* Live Dispatch Breakdown by Slot */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-extrabold text-slate-900">
                {pipelineView === 'today' ? "Today's Dispatch by Meal Slot" : "Tomorrow's Dispatch by Meal Slot"}
              </h3>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {pipelineView === 'today' ? todayISO : tomorrowISO}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Track delivery status across Morning, Afternoon, and Evening shifts.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPipelineView(prev => prev === 'today' ? 'tomorrow' : 'today')}
              className="text-xs font-semibold text-slate-600 hover:text-emerald-600 flex items-center gap-1 transition-colors"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Switch to {pipelineView === 'today' ? 'Tomorrow' : 'Today'}</span>
            </button>
            <Link 
              to="/admin/orders" 
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              <span>View All Runs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Breakfast Box */}
          <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold text-xs">
                  Breakfast (07:30 - 08:30 AM)
                </span>
                <span className="text-lg font-black text-amber-900">{breakfastOrders.length}</span>
              </div>
              <div className="space-y-2 mt-4">
                {breakfastOrders.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400 font-medium italic">
                    No breakfast drop-offs for this date.
                  </div>
                ) : (
                  breakfastOrders.map(o => (
                    <div key={o.id} className="bg-white p-3 rounded-xl border border-amber-100 flex items-center justify-between text-xs shadow-2xs">
                      <div className="min-w-0 pr-2">
                        <div className="font-bold text-slate-900 truncate">{o.customerName}</div>
                        <div className="text-slate-500 text-[11px] truncate max-w-[170px]">{o.mealName}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] border shrink-0 ${getStatusBadge(o.status)}`}>
                        {o.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Lunch Box */}
          <div className="bg-orange-50/60 border border-orange-200/80 rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-0.5 rounded-full bg-orange-200 text-orange-900 font-bold text-xs">
                  Lunch (12:00 - 01:30 PM)
                </span>
                <span className="text-lg font-black text-orange-900">{lunchOrders.length}</span>
              </div>
              <div className="space-y-2 mt-4">
                {lunchOrders.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400 font-medium italic">
                    No lunch drop-offs for this date.
                  </div>
                ) : (
                  lunchOrders.map(o => (
                    <div key={o.id} className="bg-white p-3 rounded-xl border border-orange-100 flex items-center justify-between text-xs shadow-2xs">
                      <div className="min-w-0 pr-2">
                        <div className="font-bold text-slate-900 truncate">{o.customerName}</div>
                        <div className="text-slate-500 text-[11px] truncate max-w-[170px]">{o.mealName}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] border shrink-0 ${getStatusBadge(o.status)}`}>
                        {o.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Dinner Box */}
          <div className="bg-indigo-50/60 border border-indigo-200/80 rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-200 text-indigo-900 font-bold text-xs">
                  Dinner (07:00 - 08:00 PM)
                </span>
                <span className="text-lg font-black text-indigo-900">{dinnerOrders.length}</span>
              </div>
              <div className="space-y-2 mt-4">
                {dinnerOrders.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400 font-medium italic">
                    No dinner drop-offs for this date.
                  </div>
                ) : (
                  dinnerOrders.map(o => (
                    <div key={o.id} className="bg-white p-3 rounded-xl border border-indigo-100 flex items-center justify-between text-xs shadow-2xs">
                      <div className="min-w-0 pr-2">
                        <div className="font-bold text-slate-900 truncate">{o.customerName}</div>
                        <div className="text-slate-500 text-[11px] truncate max-w-[170px]">{o.mealName}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] border shrink-0 ${getStatusBadge(o.status)}`}>
                        {o.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Active Subscriptions & Live Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Subscriptions Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Recent Subscribers</h3>
                <p className="text-xs text-slate-500">Configured meal counts and daily slots</p>
              </div>
              <Link 
                to="/admin/subscriptions" 
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                <span>Manage</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {subscriptions.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 font-medium italic">
                  No subscriptions on file.
                </div>
              ) : (
                subscriptions.slice(0, 5).map(sub => {
                  const price = typeof sub.totalPrice === 'number'
                    ? sub.totalPrice
                    : Number(String(sub.totalPrice || '').replace(/[^0-9.]/g, '')) || 0;

                  return (
                    <div key={sub.id} className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100/80 transition-colors border border-slate-200/80 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">{sub.customerName}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold">
                            {sub.planTitle}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                          <span>{sub.duration || `${sub.durationDays || 7} Days`}</span>
                          <span>&bull;</span>
                          <span className="font-semibold text-emerald-700">
                            {sub.slotLabel || sub.meals || `${sub.mealsPerDay || 3} Meals/Day`}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-black text-sm text-slate-900">₹{price.toLocaleString()}</div>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          sub.status === 'Active' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : sub.status === 'Paused' 
                            ? 'bg-amber-100 text-amber-800' 
                            : 'bg-slate-200 text-slate-700'
                        }`}>
                          {sub.status}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Quick Dispatch Status Updater */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  Live Delivery Tracker ({pipelineView === 'today' ? 'Today' : 'Tomorrow'})
                </h3>
                <p className="text-xs text-slate-500">Tap status to advance to next stage</p>
              </div>
              <Link 
                to="/admin/orders" 
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                <span>Dispatch List</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {activePipelineOrders.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 font-medium italic">
                  No orders scheduled for {pipelineView === 'today' ? 'today' : 'tomorrow'}.
                </div>
              ) : (
                activePipelineOrders.map(order => (
                  <div key={order.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 truncate">{order.customerName}</span>
                        <span className="text-[10px] font-extrabold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                          {order.mealType}
                        </span>
                      </div>
                      <p className="text-slate-500 text-xs truncate mt-0.5">{order.mealName}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAdvanceStatus(order.id)}
                      title="Click to advance status"
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-all hover:scale-105 ${getStatusBadge(order.status)}`}
                    >
                      {order.status} &rarr;
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
