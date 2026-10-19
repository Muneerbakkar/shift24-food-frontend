import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, 
  Users, 
  Repeat, 
  ShoppingBag, 
  ChefHat, 
  ArrowUpRight, 
  CheckCircle2, 
  Clock, 
  Truck, 
  AlertTriangle,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { 
  getAdminSubscriptions, 
  getAdminOrders, 
  getAdminCustomers, 
  saveAdminSubscriptions,
  saveAdminOrders,
  AdminSubscription, 
  AdminOrder 
} from './adminData';
import { fetchSubscriptions, fetchOrders, updateBackendOrderStatus } from '../../services/api';
import toast from 'react-hot-toast';

export function AdminDashboard() {
  const [subscriptions, setSubscriptions] = useState<AdminSubscription[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [customersCount, setCustomersCount] = useState(0);

  useEffect(() => {
    const subs = getAdminSubscriptions();
    const ords = getAdminOrders();
    const custs = getAdminCustomers();

    setSubscriptions(subs);
    setOrders(ords);
    setCustomersCount(custs.length);

    // Sync subscriptions from backend
    fetchSubscriptions()
      .then(res => {
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
          setCustomersCount(new Set(backendSubs.map(s => s.customerEmail.toLowerCase().trim())).size);
        }
      })
      .catch(() => {});

    // Sync orders from backend
    fetchOrders()
      .then(res => {
        if (res && res.success && Array.isArray(res.data)) {
          const dummyOrderIds = new Set(['ORD-901', 'ORD-902', 'ORD-903', 'ORD-904', 'ORD-905', 'ORD-906']);
          const dummyCustomerNames = new Set(['Rahul Sharma', 'Ananya Roy', 'Vikram Menon', 'Pooja Iyer', 'Karthik Nair']);
          const backendOrders: AdminOrder[] = res.data
            .filter((o: any) => !dummyOrderIds.has(o.orderId || o.id) && !dummyCustomerNames.has(o.customerName))
            .map((o: any) => ({
              id: o.orderId || o.id || o._id,
              subscriptionId: o.subscriptionId || '',
              customerName: o.customerName || 'Customer',
              customerPhone: o.customerPhone || '',
              planTitle: o.planTitle || 'Meal Plan',
              mealName: o.mealName || 'Scheduled Meal',
              mealType: o.mealType || 'Breakfast',
              deliveryDate: o.deliveryDate || 'Today',
              deliveryTimeSlot: o.deliveryTimeSlot || '07:30 AM - 08:30 AM',
              address: o.address || '',
              status: o.status || 'Preparing',
              amount: o.amount || 0,
              paymentMethod: o.paymentMethod || 'Online / Paid',
              allergies: o.allergies || []
            }));

          setOrders(backendOrders);
          saveAdminOrders(backendOrders);
        }
      })
      .catch(() => {});
  }, []);

  const totalRevenue = subscriptions.reduce((sum, s) => sum + s.totalPrice, 0);
  const activeSubs = subscriptions.filter(s => s.status === 'Active');

  const isTodayOrder = (o: AdminOrder) => {
    if (o.id.includes('-M-')) return false;
    const d = (o.deliveryDate || '').toLowerCase();
    const todayFormatted = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toLowerCase();
    const todayISO = new Date().toISOString().split('T')[0];
    return d.includes('today') || d.includes(todayISO) || d.includes(todayFormatted);
  };

  const todayOrders = orders.filter(isTodayOrder);
  const activeTodayOrders = todayOrders.length > 0 ? todayOrders : orders;

  const breakfastOrders = activeTodayOrders.filter(o => o.mealType === 'Breakfast');
  const lunchOrders = activeTodayOrders.filter(o => o.mealType === 'Lunch');
  const dinnerOrders = activeTodayOrders.filter(o => o.mealType === 'Dinner');

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
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Today's Meal Pipeline</h2>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
            Managing {activeSubs.length} active recurring meal plans with {activeTodayOrders.length} scheduled meal drop-offs today across Kochi.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            to="/admin/kitchen"
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2"
          >
            <ChefHat className="w-4 h-4" />
            <span>Kitchen Prep Board</span>
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

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Revenue */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-4">
            <span className="text-xs font-bold uppercase tracking-wider">Subscription Revenue</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              ₹
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900">₹{totalRevenue.toLocaleString()}</div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 mt-2">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+18.4% from last month</span>
            </div>
          </div>
        </div>

        {/* Card 2: Active Subscribers */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-4">
            <span className="text-xs font-bold uppercase tracking-wider">Active Subscribers</span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Repeat className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900">{activeSubs.length}</div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mt-2">
              <span>{subscriptions.length} total signups on file</span>
            </div>
          </div>
        </div>

        {/* Card 3: Today's Deliveries */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-4">
            <span className="text-xs font-bold uppercase tracking-wider">Today's Meals</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900">{activeTodayOrders.length}</div>
            <div className="text-xs text-slate-500 font-medium mt-2">
              <span className="text-amber-600 font-bold">{breakfastOrders.length} B</span> &bull;{' '}
              <span className="text-orange-600 font-bold">{lunchOrders.length} L</span> &bull;{' '}
              <span className="text-indigo-600 font-bold">{dinnerOrders.length} D</span>
            </div>
          </div>
        </div>

        {/* Card 4: Total Customers */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-4">
            <span className="text-xs font-bold uppercase tracking-wider">Customer Roster</span>
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900">{customersCount}</div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 mt-2">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>100% Verified Profiles</span>
            </div>
          </div>
        </div>
      </div>

      {/* Live Dispatch Breakdown by Slot */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">Today's Dispatch by Meal Slot</h3>
            <p className="text-xs text-slate-500">Track delivery status across Morning, Afternoon, and Evening shifts.</p>
          </div>
          <Link 
            to="/admin/orders" 
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            <span>View All Runs</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Breakfast Box */}
          <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold text-xs">
                Breakfast (07:30 - 08:30 AM)
              </span>
              <span className="text-lg font-black text-amber-900">{breakfastOrders.length}</span>
            </div>
            <div className="space-y-2 mt-4">
              {breakfastOrders.map(o => (
                <div key={o.id} className="bg-white p-3 rounded-xl border border-amber-100 flex items-center justify-between text-xs shadow-2xs">
                  <div>
                    <div className="font-bold text-slate-900">{o.customerName}</div>
                    <div className="text-slate-500 text-[11px] truncate max-w-[170px]">{o.mealName}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${getStatusBadge(o.status)}`}>
                    {o.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Lunch Box */}
          <div className="bg-orange-50/60 border border-orange-200/80 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="px-2.5 py-0.5 rounded-full bg-orange-200 text-orange-900 font-bold text-xs">
                Lunch (12:00 - 01:30 PM)
              </span>
              <span className="text-lg font-black text-orange-900">{lunchOrders.length}</span>
            </div>
            <div className="space-y-2 mt-4">
              {lunchOrders.map(o => (
                <div key={o.id} className="bg-white p-3 rounded-xl border border-orange-100 flex items-center justify-between text-xs shadow-2xs">
                  <div>
                    <div className="font-bold text-slate-900">{o.customerName}</div>
                    <div className="text-slate-500 text-[11px] truncate max-w-[170px]">{o.mealName}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${getStatusBadge(o.status)}`}>
                    {o.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Dinner Box */}
          <div className="bg-indigo-50/60 border border-indigo-200/80 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-200 text-indigo-900 font-bold text-xs">
                Dinner (07:00 - 08:00 PM)
              </span>
              <span className="text-lg font-black text-indigo-900">{dinnerOrders.length}</span>
            </div>
            <div className="space-y-2 mt-4">
              {dinnerOrders.map(o => (
                <div key={o.id} className="bg-white p-3 rounded-xl border border-indigo-100 flex items-center justify-between text-xs shadow-2xs">
                  <div>
                    <div className="font-bold text-slate-900">{o.customerName}</div>
                    <div className="text-slate-500 text-[11px] truncate max-w-[170px]">{o.mealName}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${getStatusBadge(o.status)}`}>
                    {o.status}
                  </span>
                </div>
              ))}
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
              {subscriptions.slice(0, 4).map(sub => (
                <div key={sub.id} className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100/80 transition-colors border border-slate-200/80 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{sub.customerName}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold">
                        {sub.planTitle}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                      <span>{sub.duration}</span>
                      <span>&bull;</span>
                      <span className="font-semibold text-emerald-700">{sub.slotLabel}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-black text-sm text-slate-900">₹{sub.totalPrice}</div>
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
              ))}
            </div>
          </div>
        </div>

        {/* Quick Dispatch Status Updater */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Live Delivery Tracker</h3>
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
            {activeTodayOrders.map(order => (
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
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
