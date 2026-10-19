import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Search, 
  Filter, 
  Printer, 
  CheckCircle2, 
  Clock, 
  Truck, 
  AlertCircle,
  Phone,
  MapPin,
  Coffee,
  Sun,
  Moon,
  Calendar,
  RefreshCw,
  Tag,
  Receipt
} from 'lucide-react';
import { 
  getAdminOrders, 
  saveAdminOrders, 
  AdminOrder 
} from './adminData';
import { fetchOrders, updateBackendOrderStatus } from '../../services/api';
import toast from 'react-hot-toast';
import { MealLabelModal } from './MealLabelModal';

export function AdminOrders() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [slotFilter, setSlotFilter] = useState<'All' | 'Breakfast' | 'Lunch' | 'Dinner'>('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [labelModalOpen, setLabelModalOpen] = useState(false);
  const [selectedOrderIdForLabel, setSelectedOrderIdForLabel] = useState<string | null>(null);

  // Date Filter - default is that day (today)
  const todayISO = new Date().toISOString().split('T')[0];
  const tomorrowObj = new Date();
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrowISO = tomorrowObj.toISOString().split('T')[0];

  const [dateFilter, setDateFilter] = useState<string>(todayISO);
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await fetchOrders();
      if (res && res.success && Array.isArray(res.data)) {
        const dummyOrderIds = new Set(['ORD-901', 'ORD-902', 'ORD-903', 'ORD-904', 'ORD-905', 'ORD-906']);
        const dummyCustomerNames = new Set(['Rahul Sharma', 'Ananya Roy', 'Vikram Menon', 'Pooja Iyer', 'Karthik Nair']);
        const backendOrders: AdminOrder[] = res.data
          .filter((o: any) => !dummyOrderIds.has(o.orderId || o.id) && !dummyCustomerNames.has(o.customerName))
          .map((o: any) => {
            const id = o.orderId || o.id || o._id;
            return {
              id,
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
            };
          });

        setOrders(backendOrders);
        saveAdminOrders(backendOrders);
        return;
      }
    } catch (e) {
      console.warn('Backend orders fetch failed, using local orders:', e);
    } finally {
      setLoading(false);
    }

    const localOrders = getAdminOrders().filter(o => o.id !== 'ORD-130');
    setOrders(localOrders);
  };

  useEffect(() => {
    loadOrders();

    const handleUpdate = () => loadOrders();
    window.addEventListener('shift24-subscriptions-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('shift24-subscriptions-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const handleUpdateStatus = async (orderId: string, newStatus: AdminOrder['status']) => {
    const updated = orders.map(o => {
      if (o.id === orderId) {
        return { ...o, status: newStatus };
      }
      return o;
    });

    setOrders(updated);
    saveAdminOrders(updated);
    try {
      await updateBackendOrderStatus(orderId, newStatus);
    } catch (e) {}
    toast.success(`Order status updated to ${newStatus}`);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleOpenLabelModal = (orderId?: string) => {
    setSelectedOrderIdForLabel(orderId || null);
    setLabelModalOpen(true);
  };

  const matchesOrderDate = (order: AdminOrder, filter: string) => {
    if (filter === 'all') return true;

    const delDate = (order.deliveryDate || '').toLowerCase();
    
    // Check if filtering for Today
    if (filter === todayISO) {
      if (order.id.includes('-M-')) return false;
      if (delDate.includes('today')) return true;
      if (delDate.includes(todayISO)) return true;
      const todayFormatted = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toLowerCase();
      if (delDate.includes(todayFormatted)) return true;
      return false;
    }

    // Check if filtering for Tomorrow
    if (filter === tomorrowISO) {
      if (delDate.includes('today') && !order.id.includes('-M-')) return false;
      if (delDate.includes('tomorrow') || order.id.includes('-M-')) return true;
      if (delDate.includes(tomorrowISO)) return true;
      const tomorrowFormatted = tomorrowObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toLowerCase();
      if (delDate.includes(tomorrowFormatted)) return true;
      return false;
    }

    // Custom date chosen from calendar picker
    if (delDate.includes(filter)) return true;
    try {
      const customDate = new Date(filter + 'T00:00:00');
      const customFormatted = customDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toLowerCase();
      if (delDate.includes(customFormatted)) return true;
    } catch (e) {}

    return false;
  };

  const todayOrdersCount = orders.filter(o => matchesOrderDate(o, todayISO)).length;
  const tomorrowOrdersCount = orders.filter(o => matchesOrderDate(o, tomorrowISO)).length;

  const filtered = orders.filter(o => {
    const matchesSearch = 
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.mealName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSlot = slotFilter === 'All' || o.mealType === slotFilter;
    const matchesStatus = statusFilter === 'All' || o.status === statusFilter;
    const matchesDate = matchesOrderDate(o, dateFilter);

    return matchesSearch && matchesSlot && matchesStatus && matchesDate;
  });

  const getSlotIcon = (type: AdminOrder['mealType']) => {
    switch (type) {
      case 'Breakfast': return <Coffee className="w-3.5 h-3.5 text-amber-500" />;
      case 'Lunch': return <Sun className="w-3.5 h-3.5 text-orange-500" />;
      case 'Dinner': return <Moon className="w-3.5 h-3.5 text-indigo-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Orders & Dispatch Run Sheet</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time daily meal dispatching, slot deliveries, and courier tracking.
          </p>
        </div>
        <div className="flex items-center gap-2.5 no-print">
          <button
            type="button"
            onClick={() => handleOpenLabelModal()}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            title="Print receipts for filtered orders"
          >
            <Receipt className="w-4 h-4" />
            <span>Print Multiple Receipts</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-700 text-white">
              {filtered.length}
            </span>
          </button>
        </div>
      </div>

      {/* Date Filter & Quick Switcher */}
      <div className="no-print bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 mr-1">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span>Delivery Date:</span>
          </div>

          <button
            type="button"
            onClick={() => setDateFilter(todayISO)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              dateFilter === todayISO
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <span>Today</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
              dateFilter === todayISO ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {todayOrdersCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setDateFilter(tomorrowISO)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              dateFilter === tomorrowISO
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <span>Tomorrow</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
              dateFilter === tomorrowISO ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {tomorrowOrdersCount}
            </span>
          </button>

        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Custom Date Input */}
          <div className="relative flex-1 md:w-auto">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value || todayISO)}
              className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              title="Pick a custom delivery date"
            />
          </div>

          {/* Refresh / Reset Filters */}
          <button
            type="button"
            onClick={() => {
              setDateFilter(todayISO);
              setSlotFilter('All');
              setStatusFilter('All');
              setSearchTerm('');
              loadOrders();
              toast.success('Orders refreshed for Today');
            }}
            className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 rounded-xl border border-slate-200 transition-colors shadow-xs"
            title="Reset Filters to Today"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter and Slot Tabs */}
      <div className="no-print bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Slot Selector Buttons */}
        <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
          {(['All', 'Breakfast', 'Lunch', 'Dinner'] as const).map(slot => (
            <button
              key={slot}
              type="button"
              onClick={() => setSlotFilter(slot)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                slotFilter === slot
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {slot !== 'All' && getSlotIcon(slot as AdminOrder['mealType'])}
              <span>{slot}</span>
            </button>
          ))}
        </div>

        {/* Search & Status Filter */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search customer, address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-700"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Preparing">Preparing</option>
            <option value="Out for Delivery">Out for Delivery</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Printable Delivery Run Sheet Header (Visible Only When Printing Run Sheet) */}
      <div className="hidden print:block mb-4 p-4 border-b-2 border-slate-900">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-xl tracking-tight text-slate-900 uppercase">SHIFT24 FOOD CO.</span>
              <span className="text-xs bg-slate-900 text-white px-2 py-0.5 rounded font-bold uppercase">Dispatch Run Sheet</span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Delivery Date: <strong className="text-slate-900">{dateFilter === 'all' ? 'All Dates' : dateFilter === todayISO ? `Today (${todayISO})` : dateFilter === tomorrowISO ? `Tomorrow (${tomorrowISO})` : dateFilter}</strong> • Slot: <strong className="text-slate-900">{slotFilter}</strong> • Total Orders: <strong className="text-slate-900">{filtered.length}</strong>
            </p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <div>Courier / Rider Manifest</div>
            <div>Printed: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
          </div>
        </div>
      </div>

      {/* Orders Grid/Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-4">Order & Slot</th>
                <th className="px-5 py-4">Customer & Address</th>
                <th className="px-5 py-4">Meal Item & Plan</th>
                <th className="px-5 py-4">Allergies / Special</th>
                <th className="px-5 py-4">Payment</th>
                <th className="px-5 py-4">Dispatch Status</th>
                <th className="px-5 py-4 text-right no-print">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    Loading live orders and dispatch queue...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center">
                    <p className="font-extrabold text-sm text-slate-700">
                      No orders found for {dateFilter === todayISO ? 'Today' : dateFilter === tomorrowISO ? 'Tomorrow' : dateFilter === 'all' ? 'the selected criteria' : dateFilter}
                    </p>
                    {dateFilter === todayISO && tomorrowOrdersCount > 0 && (
                      <div className="mt-3">
                        <p className="text-xs text-slate-500">
                          You have <span className="font-bold text-slate-800">{tomorrowOrdersCount} order{tomorrowOrdersCount > 1 ? 's' : ''}</span> scheduled for Tomorrow.
                        </p>
                        <button
                          type="button"
                          onClick={() => setDateFilter(tomorrowISO)}
                          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 transition-colors"
                        >
                          <span>Switch to Tomorrow ({tomorrowOrdersCount}) &rarr;</span>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map(order => (
                  <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4 font-semibold">
                      <div className="flex items-center gap-1.5">
                        {getSlotIcon(order.mealType)}
                        <span className="font-extrabold text-slate-900">{order.mealType}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{order.id}</div>
                      <div className="text-[11px] font-bold text-slate-600 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{order.deliveryTimeSlot}</span>
                      </div>
                    </td>

                    <td className="px-5 py-4 max-w-xs">
                      <div className="font-bold text-slate-900">{order.customerName}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{order.customerPhone}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-start gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                        <span className="truncate">{order.address}</span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-900">{order.mealName}</div>
                      <div className="text-[11px] font-medium text-emerald-700 mt-0.5">
                        {order.planTitle}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      {order.allergies.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {order.allergies.map(a => (
                            <span key={a} className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold text-[10px] border border-rose-200">
                              {a}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Standard Prep</span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-900">₹{order.amount}</div>
                      <div className="text-[11px] text-slate-400">{order.paymentMethod}</div>
                    </td>

                    <td className="px-5 py-4">
                      <select
                        value={order.status}
                        onChange={(e) => handleUpdateStatus(order.id, e.target.value as AdminOrder['status'])}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                          order.status === 'Delivered'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : order.status === 'Out for Delivery'
                            ? 'bg-sky-50 text-sky-800 border-sky-300'
                            : order.status === 'Preparing'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : 'bg-slate-50 text-slate-800 border-slate-300'
                        }`}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Preparing">Preparing</option>
                        <option value="Out for Delivery">Out for Delivery</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </td>

                    <td className="px-5 py-4 text-right no-print">
                      <button
                        type="button"
                        onClick={() => handleOpenLabelModal(order.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 hover:border-emerald-300 rounded-xl text-xs font-bold border border-slate-200 transition-all shadow-2xs group cursor-pointer"
                        title="Print order receipt slip or packaging label"
                      >
                        <Receipt className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-600 transition-colors" />
                        <span>Print Receipt</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Meal Container Label Print Modal */}
      <MealLabelModal
        isOpen={labelModalOpen}
        onClose={() => setLabelModalOpen(false)}
        orders={filtered}
        initialSelectedOrderId={selectedOrderIdForLabel}
      />
    </div>
  );
}
