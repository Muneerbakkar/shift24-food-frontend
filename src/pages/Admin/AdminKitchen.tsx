import React, { useState, useEffect } from 'react';
import { 
  ChefHat, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Coffee, 
  Sun, 
  Moon, 
  Flame, 
  ShieldAlert,
  Printer,
  Calendar
} from 'lucide-react';
import { getAdminOrders, AdminOrder } from './adminData';
import { fetchOrders } from '../../services/api';

export function AdminKitchen() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [dateFilter, setDateFilter] = useState<'today' | 'tomorrow'>('today');
  const [activeSlot, setActiveSlot] = useState<'All' | 'Breakfast' | 'Lunch' | 'Dinner'>('All');
  const [loading, setLoading] = useState(true);

  const loadKitchenBoard = async () => {
    setLoading(true);
    try {
      const res = await fetchOrders();
      if (res && res.success && Array.isArray(res.data)) {
        const dummyOrderIds = new Set(['ORD-901', 'ORD-902', 'ORD-903', 'ORD-904', 'ORD-905', 'ORD-906']);
        const dummyCustomerNames = new Set(['Rahul Sharma', 'Ananya Roy', 'Vikram Menon', 'Pooja Iyer', 'Karthik Nair']);
        const mapped: AdminOrder[] = res.data
          .filter((o: any) => !dummyOrderIds.has(o.orderId || o.id) && !dummyCustomerNames.has(o.customerName))
          .map((o: any) => ({
            id: o.orderId || o.id || o._id,
            subscriptionId: o.subscriptionId || '',
            customerName: o.customerName || 'Customer',
            customerPhone: o.customerPhone || '',
            planTitle: o.planTitle || 'Meal Plan',
            mealName: o.mealName || 'Scheduled Meal',
            mealType: o.mealType || 'Lunch',
            deliveryDate: o.deliveryDate || 'Today',
            deliveryTimeSlot: o.deliveryTimeSlot || 'Standard Slot',
            address: o.address || '',
            status: o.status || 'Preparing',
            amount: o.amount || 0,
            paymentMethod: o.paymentMethod || 'Online',
            allergies: o.allergies || []
          }));
        setOrders(mapped);
        setLoading(false);
        return;
      }
    } catch (e) {
      console.warn('Orders fetch failed, using local orders:', e);
    }
    setOrders(getAdminOrders());
    setLoading(false);
  };

  useEffect(() => {
    loadKitchenBoard();

    const handleUpdate = () => loadKitchenBoard();
    window.addEventListener('shift24-subscriptions-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('shift24-subscriptions-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const todayISO = new Date().toISOString().split('T')[0];
  const tomorrowObj = new Date();
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrowISO = tomorrowObj.toISOString().split('T')[0];

  const isTodayOrder = (o: AdminOrder) => {
    if (o.id.includes('-M-')) return false;
    const d = (o.deliveryDate || '').toLowerCase();
    const todayFormatted = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toLowerCase();
    return d.includes('today') || d.includes(todayISO) || d.includes(todayFormatted);
  };

  const isTomorrowOrder = (o: AdminOrder) => {
    const d = (o.deliveryDate || '').toLowerCase();
    if (d.includes('today') && !o.id.includes('-M-')) return false;
    if (d.includes('tomorrow')) return true;
    if (d.includes(tomorrowISO)) return true;
    if (o.id.includes('-M-')) return true;
    const tomorrowFormatted = new Date(Date.now() + 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toLowerCase();
    return d.includes(tomorrowFormatted);
  };

  const todayOrders = orders.filter(isTodayOrder);
  const tomorrowOrders = orders.filter(isTomorrowOrder);

  const activeOrders = dateFilter === 'today' ? todayOrders : tomorrowOrders;

  const filteredOrders = activeSlot === 'All' 
    ? activeOrders 
    : activeOrders.filter(o => o.mealType === activeSlot);

  // Group meals by dish name
  const dishCounts = filteredOrders.reduce((acc, order) => {
    acc[order.mealName] = (acc[order.mealName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Orders with allergies for the selected day
  const allergyAlerts = activeOrders.filter(o => o.allergies && o.allergies.length > 0);

  const dayLabel = dateFilter === 'today' ? "Today's" : "Tomorrow's";
  const dayName = dateFilter === 'today' ? 'Today' : 'Tomorrow';

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-1 border border-emerald-200">
            <ChefHat className="w-3.5 h-3.5" />
            <span>Kitchen Prep Station</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            {dayLabel} Meal Preparation Board
          </h2>
          <p className="text-xs text-slate-500">
            Batch production list, portion counts, and allergen precautions for kitchen crew.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Day Switcher: Today / Tomorrow */}
          <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setDateFilter('today')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                dateFilter === 'today'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Today</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                dateFilter === 'today' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {todayOrders.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setDateFilter('tomorrow')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                dateFilter === 'tomorrow'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Tomorrow</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                dateFilter === 'tomorrow' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {tomorrowOrders.length}
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Printer className="w-4 h-4" />
            <span>Print Kitchen Ticket</span>
          </button>
        </div>
      </div>

      {/* Critical Allergy Warning Banner */}
      {allergyAlerts.length > 0 && (
        <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-3xl p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-amber-500 text-white rounded-xl shadow-xs">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-amber-950 uppercase tracking-wider">
                Critical Allergen Notices ({allergyAlerts.length} Orders {dayName})
              </h3>
              <p className="text-xs text-amber-900 font-medium">
                Ensure separate cooking surfaces and sanitized utensils for these boxes:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-3">
            {allergyAlerts.map(alert => (
              <div key={alert.id} className="bg-white p-3.5 rounded-2xl border border-amber-200 shadow-2xs text-xs">
                <div className="flex items-center justify-between font-bold text-slate-900 mb-1">
                  <span>{alert.customerName}</span>
                  <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md">
                    {alert.mealType}
                  </span>
                </div>
                <div className="text-slate-500 text-[11px] mb-2">{alert.mealName}</div>
                <div className="flex flex-wrap gap-1">
                  {alert.allergies.map(a => (
                    <span key={a} className="px-2 py-0.5 rounded-md bg-rose-600 text-white font-black text-[10px]">
                      ⚠️ {a}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Slot Selection Tabs & Meal Prep Counts */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">Batch Quantity Breakdown</h3>
            <p className="text-xs text-slate-500">Total individual portions to cook and box</p>
          </div>

          <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-2xl">
            {(['All', 'Breakfast', 'Lunch', 'Dinner'] as const).map(slot => (
              <button
                key={slot}
                type="button"
                onClick={() => setActiveSlot(slot)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeSlot === slot
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {slot}
              </button>
            ))}
          </div>
        </div>

        {/* Dish Portions Grid */}
        {Object.keys(dishCounts).length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-xs">
            {loading ? 'Loading kitchen prep items...' : `No meal batches scheduled for preparation ${dayName.toLowerCase()}.`}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(dishCounts).map(([dishName, count]) => (
              <div key={dishName} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <div className="font-extrabold text-slate-900 text-sm">{dishName}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Chef-standard recipe</div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
                    {count}x
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Individual Order Checklist */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs">
        <h3 className="text-lg font-extrabold text-slate-900 mb-4">Packaged Boxes Checklist</h3>
        {filteredOrders.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-xs">
            {loading ? 'Checking orders checklist...' : `No orders in the packaging queue for this slot on ${dayName.toLowerCase()}.`}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map(order => (
              <div 
                key={order.id} 
                className="p-4 rounded-2xl border border-slate-200/80 hover:border-emerald-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50"
              >
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 font-bold text-slate-700 text-xs">
                    #{order.id.slice(-3)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{order.mealName}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-200 font-extrabold text-slate-700">
                        {order.mealType}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      For <span className="font-semibold text-slate-700">{order.customerName}</span> &bull; {order.deliveryTimeSlot}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  {order.allergies.length > 0 && (
                    <span className="px-2.5 py-1 bg-rose-50 text-rose-700 font-bold text-[10px] rounded-lg border border-rose-200">
                      {order.allergies.join(', ')}
                    </span>
                  )}
                  <span className={`px-3 py-1 rounded-xl text-xs font-bold border ${
                    order.status === 'Delivered'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : order.status === 'Preparing'
                      ? 'bg-amber-100 text-amber-800 border-amber-200'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}>
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
