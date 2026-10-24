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
  CalendarX,
  Pause,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
  Tag,
  Receipt,
  Sparkles,
  Trash2,
  CheckSquare,
  Square,
  Edit2,
  X
} from 'lucide-react';
import { 
  getAdminOrders, 
  saveAdminOrders, 
  saveAdminSubscriptions,
  deleteAdminOrder,
  deleteAdminOrdersBulk,
  syncLocalOrdersFromSubscriptions,
  AdminOrder,
  AdminDriver,
  getAdminDrivers,
  assignDriverToOrdersLocally,
  getAdminSubscriptions,
  isDateSkipped,
  isMealSkipped,
  getSubscriptionDispatchSummary,
  SubscriptionStatusSummary,
  formatDelivered12Hr
} from './adminData';
import { GenerationSummaryModal } from './GenerationSummaryModal';
import { 
  fetchOrders, 
  fetchSubscriptions,
  updateBackendOrderStatus,
  generateBackendOrders,
  deleteBackendOrder,
  deleteBackendOrdersBulk,
  assignDriverToBackendOrder,
  bulkAssignDriverToBackendOrders,
  fetchDrivers
} from '../../services/api';
import toast from 'react-hot-toast';
import { MealLabelModal } from './MealLabelModal';
import { OrderLocationModal } from './OrderLocationModal';
import { AllOrdersMapModal } from './AllOrdersMapModal';

export function AdminOrders() {
  const [orders, setOrders] = useState<AdminOrder[]>(() => {
    try {
      return getAdminOrders().filter(o => o.id !== 'ORD-130');
    } catch {
      return [];
    }
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [slotFilter, setSlotFilter] = useState<'All' | 'Breakfast' | 'Lunch' | 'Dinner'>('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [driverFilter, setDriverFilter] = useState('All');
  const [drivers, setDrivers] = useState<AdminDriver[]>(() => getAdminDrivers());
  const [labelModalOpen, setLabelModalOpen] = useState(false);
  const [selectedOrderIdForLabel, setSelectedOrderIdForLabel] = useState<string | null>(null);
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [selectedOrderForMap, setSelectedOrderForMap] = useState<AdminOrder | null>(null);
  const [allMapModalOpen, setAllMapModalOpen] = useState(false);
  const [generatingSlot, setGeneratingSlot] = useState<'Breakfast' | 'Lunch' | 'Dinner' | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [editingDeliveredOrder, setEditingDeliveredOrder] = useState<AdminOrder | null>(null);
  const [customDeliveredInput, setCustomDeliveredInput] = useState<string>('');
  const [generationSummary, setGenerationSummary] = useState<{
    slot?: string | null;
    targetDate: string;
    generatedOrdersCount?: number;
    skippedSubscriptions: any[];
    pausedSubscriptions: any[];
  } | null>(null);

  // Date Filter - default is that day (today) in local time
  const getLocalDateString = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const now = new Date();
  const todayObj = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayISO = getLocalDateString(todayObj);

  const tomorrowObj = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const tomorrowISO = getLocalDateString(tomorrowObj);

  // Start Date and End Date range filters
  const [startDate, setStartDate] = useState<string>(todayISO);
  const [endDate, setEndDate] = useState<string>(todayISO);
  const [loading, setLoading] = useState(false);

  const loadOrders = async () => {
    try {
      setLoading(true);

      // 1. Fetch latest subscriptions from backend so we have 100% up-to-date subscription status
      let adminSubs = getAdminSubscriptions();
      try {
        const subRes = await fetchSubscriptions();
        if (subRes && subRes.success && Array.isArray(subRes.data)) {
          saveAdminSubscriptions(subRes.data);
          adminSubs = subRes.data;
        }
      } catch (subErr) {
        console.warn('Failed to fetch subscriptions in AdminOrders:', subErr);
      }

      // 2. Fetch orders from backend
      const res = await fetchOrders();
      if (res && res.success && Array.isArray(res.data)) {
        const dummyOrderIds = new Set(['ORD-901', 'ORD-902', 'ORD-903', 'ORD-904', 'ORD-905', 'ORD-906']);
        const dummyCustomerNames = new Set(['Rahul Sharma', 'Ananya Roy', 'Vikram Menon', 'Pooja Iyer', 'Karthik Nair']);
        const backendOrders: AdminOrder[] = res.data
          .filter((o: any) => !dummyOrderIds.has(o.orderId || o.id) && !dummyCustomerNames.has(o.customerName))
          .map((o: any) => {
            const id = o.orderId || o.id || o._id;
            const lat = typeof o.latitude === 'number' && !isNaN(o.latitude) ? o.latitude : (o.coordinates?.lat ? Number(o.coordinates.lat) : undefined);
            const lng = typeof o.longitude === 'number' && !isNaN(o.longitude) ? o.longitude : (o.coordinates?.lng ? Number(o.coordinates.lng) : undefined);
            const coords = (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) 
              ? { lat, lng } 
              : o.coordinates;

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
              coordinates: coords,
              latitude: lat,
              longitude: lng,
              status: o.status || 'Preparing',
              amount: o.amount || 0,
              paymentMethod: o.paymentMethod || 'Online / Paid',
              allergies: o.allergies || [],
              driverId: o.driverId,
              driverName: o.driverName,
              driverPhone: o.driverPhone,
              driverVehicle: o.driverVehicle,
              assignedAt: o.assignedAt,
              deliveredAt: o.deliveredAt ? String(o.deliveredAt) : undefined
            };
          });

        const activeSubOrders = backendOrders.filter(o => {
          if (o.status === 'Delivered') return true;
          const sub = adminSubs.find(s => s.id === o.subscriptionId || (s as any).subId === o.subscriptionId || (o.customerPhone && s.customerPhone === o.customerPhone));
          if (sub) {
            if (sub.status === 'Paused' || sub.status === 'Cancelled') return false;
            const orderISO = getOrderDateISO(o);
            if (orderISO && sub.pauseStartDate) {
              const pStartISO = String(sub.pauseStartDate).trim().split('T')[0];
              const pEndISO = sub.pauseEndDate ? String(sub.pauseEndDate).trim().split('T')[0] : null;
              const isPaused = pEndISO ? (orderISO >= pStartISO && orderISO <= pEndISO) : (orderISO >= pStartISO);
              if (isPaused) return false;
            }
            if (orderISO && o.mealType) {
              if (isMealSkipped(sub.skippedDates, (sub as any).skippedMeals, orderISO, o.mealType as any)) return false;
            }
          }
          return true;
        });

        setOrders(activeSubOrders);
        saveAdminOrders(activeSubOrders);

        try {
          const dRes = await fetchDrivers();
          if (dRes && dRes.success && Array.isArray(dRes.data) && dRes.data.length > 0) {
            setDrivers(dRes.data);
          }
        } catch {}
        return;
      }
    } catch (e) {
      console.warn('Backend orders fetch failed, using local orders:', e);
    } finally {
      setLoading(false);
    }

    const adminSubs = getAdminSubscriptions();
    const localOrders = getAdminOrders().filter(o => {
      if (o.id === 'ORD-130') return false;
      if (o.status === 'Delivered') return true;
      const sub = adminSubs.find(s => s.id === o.subscriptionId || (s as any).subId === o.subscriptionId || (o.customerPhone && s.customerPhone === o.customerPhone));
      if (sub && (sub.status === 'Paused' || sub.status === 'Cancelled')) return false;
      return true;
    });
    setOrders(localOrders);
    setDrivers(getAdminDrivers());
  };

  useEffect(() => {
    loadOrders();

    const handleUpdate = () => {
      loadOrders();
      setDrivers(getAdminDrivers());
    };
    window.addEventListener('shift24-subscriptions-updated', handleUpdate);
    window.addEventListener('shift24-orders-updated', handleUpdate);
    window.addEventListener('shift24-drivers-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('shift24-subscriptions-updated', handleUpdate);
      window.removeEventListener('shift24-orders-updated', handleUpdate);
      window.removeEventListener('shift24-drivers-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const handleGenerateSlot = async (slot: 'Breakfast' | 'Lunch' | 'Dinner') => {
    try {
      setGeneratingSlot(slot);
      let newlyGenerated: AdminOrder[] = [];
      let backendSummary: any = null;

      // 1. Fetch latest subscriptions from backend so local state is 100% current
      let adminSubs = getAdminSubscriptions();
      try {
        const subRes = await fetchSubscriptions();
        if (subRes && subRes.success && Array.isArray(subRes.data)) {
          saveAdminSubscriptions(subRes.data);
          adminSubs = subRes.data;
        }
      } catch {}

      try {
        const res = await generateBackendOrders(slot);
        if (res && res.summary) {
          backendSummary = res.summary;
        }
        if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
          const dummyOrderIds = new Set(['ORD-901', 'ORD-902', 'ORD-903', 'ORD-904', 'ORD-905', 'ORD-906']);
          const dummyCustomerNames = new Set(['Rahul Sharma', 'Ananya Roy', 'Vikram Menon', 'Pooja Iyer', 'Karthik Nair']);
          newlyGenerated = res.data
            .filter((o: any) => !dummyOrderIds.has(o.orderId || o.id) && !dummyCustomerNames.has(o.customerName))
            .map((o: any) => {
              const lat = typeof o.latitude === 'number' && !isNaN(o.latitude) ? o.latitude : (o.coordinates?.lat ? Number(o.coordinates.lat) : undefined);
              const lng = typeof o.longitude === 'number' && !isNaN(o.longitude) ? o.longitude : (o.coordinates?.lng ? Number(o.coordinates.lng) : undefined);
              const coords = (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) 
                ? { lat, lng } 
                : o.coordinates;

              return {
                id: o.orderId || o.id || o._id,
                subscriptionId: o.subscriptionId || '',
                customerName: o.customerName || 'Customer',
                customerPhone: o.customerPhone || '',
                planTitle: o.planTitle || 'Meal Plan',
                mealName: o.mealName || 'Scheduled Meal',
                mealType: o.mealType || slot,
                deliveryDate: o.deliveryDate || `Today (${todayISO})`,
                deliveryTimeSlot: o.deliveryTimeSlot || (slot === 'Breakfast' ? '07:30 AM - 08:30 AM' : slot === 'Lunch' ? '12:00 PM - 01:00 PM' : '07:30 PM - 08:30 PM'),
                address: o.address || '',
                coordinates: coords,
                latitude: lat,
                longitude: lng,
                status: o.status || 'Preparing',
                amount: o.amount || 0,
                paymentMethod: o.paymentMethod || 'Online / Paid',
                allergies: o.allergies || [],
                deliveredAt: o.deliveredAt ? String(o.deliveredAt) : undefined
              };
            });
        }
      } catch (err) {
        console.warn('Backend generate failed, generating locally:', err);
      }

      // Sync and merge locally using fresh subscriptions
      const updatedOrders = syncLocalOrdersFromSubscriptions(adminSubs, { slot, todayOnly: true });

      // Merge backend returned orders if any
      const orderMap = new Map<string, AdminOrder>();
      for (const ord of updatedOrders) {
        orderMap.set(ord.id, ord);
      }
      for (const ord of newlyGenerated) {
        orderMap.set(ord.id, ord);
      }

      const finalOrders = Array.from(orderMap.values()).filter(o => {
        if (o.status === 'Delivered') return true;
        const sub = adminSubs.find(s => s.id === o.subscriptionId || (s as any).subId === o.subscriptionId || (o.customerPhone && s.customerPhone === o.customerPhone));
        if (sub) {
          // If subscription is paused or inactive, exclude non-delivered orders
          if (sub.status === 'Paused' || sub.status === 'Cancelled') {
            return false;
          }
          const orderISO = getOrderDateISO(o);
          if (orderISO && sub.pauseStartDate) {
            const pStartISO = String(sub.pauseStartDate).trim().split('T')[0];
            const pEndISO = sub.pauseEndDate ? String(sub.pauseEndDate).trim().split('T')[0] : null;
            const isPaused = pEndISO
              ? (orderISO >= pStartISO && orderISO <= pEndISO)
              : (orderISO >= pStartISO);
            if (isPaused) {
              return false;
            }
          }
          if (orderISO && o.mealType) {
            if (isMealSkipped(sub.skippedDates, (sub as any).skippedMeals, orderISO, o.mealType as any)) {
              return false;
            }
          }
        }
        return true;
      });
      setOrders(finalOrders);
      saveAdminOrders(finalOrders);
      window.dispatchEvent(new Event('shift24-orders-updated'));

      const slotOrdersCount = finalOrders.filter(o => o.mealType === slot && matchesDateRange(o, todayISO, todayISO)).length;
      toast.success(`Generated ${slot} orders for Today (${slotOrdersCount} scheduled)`);

      // Provide detailed feedback about skipped and paused subscriptions
      const summaryInfo = backendSummary || getSubscriptionDispatchSummary(todayISO, adminSubs);
      setGenerationSummary({
        slot,
        targetDate: todayISO,
        generatedOrdersCount: slotOrdersCount,
        skippedSubscriptions: summaryInfo.skippedSubscriptions || [],
        pausedSubscriptions: summaryInfo.pausedSubscriptions || []
      });
      setSummaryModalOpen(true);
    } catch (err: any) {
      toast.error(err?.message || `Failed to generate ${slot} orders`);
    } finally {
      setGeneratingSlot(null);
    }
  };

  const handleDeleteSingleOrder = async (orderId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete order ${orderId}?`)) {
      return;
    }

    try {
      try {
        await deleteBackendOrder(orderId);
      } catch (err) {
        console.warn('Backend delete failed, removing locally:', err);
      }

      deleteAdminOrder(orderId);
      setOrders(prev => prev.filter(o => o.id !== orderId));
      setSelectedOrderIds(prev => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
      toast.success(`Order ${orderId} deleted successfully`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete order');
    }
  };

  const handleDeleteSelectedOrders = async () => {
    const ids: string[] = Array.from(selectedOrderIds);
    if (ids.length === 0) return;

    if (!window.confirm(`Are you sure you want to delete ${ids.length} selected orders?`)) {
      return;
    }

    try {
      try {
        await deleteBackendOrdersBulk(ids);
      } catch (err) {
        console.warn('Backend bulk delete failed, removing locally:', err);
      }

      deleteAdminOrdersBulk(ids);
      const idSet = new Set(ids);
      setOrders(prev => prev.filter(o => !idSet.has(o.id)));
      setSelectedOrderIds(new Set());
      toast.success(`${ids.length} orders deleted successfully`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete selected orders');
    }
  };

  const handleSaveCustomDeliveredTime = async (orderId: string, customTime12h: string) => {
    const targetOrder = orders.find(o => o.id === orderId);
    if (!targetOrder) return;

    const dateISO = getOrderDateISO(targetOrder) || new Date().toISOString().split('T')[0];
    const [y, m, d] = dateISO.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);

    const match = customTime12h.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const ampm = (match[3] || '').toUpperCase();
      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
      dateObj.setHours(hours, minutes, 0, 0);
    }

    const isoString = dateObj.toISOString();

    const updated = orders.map(o => {
      if (o.id === orderId) {
        return { ...o, status: 'Delivered' as const, deliveredAt: isoString };
      }
      return o;
    });

    setOrders(updated);
    saveAdminOrders(updated);

    try {
      await updateBackendOrderStatus(orderId, 'Delivered', { deliveredAt: isoString });
    } catch {}

    toast.success(`Delivery time updated to ${customTime12h.trim()}`);
    setEditingDeliveredOrder(null);
  };

  const handleUpdateStatus = async (orderId: string, newStatus: AdminOrder['status']) => {
    const isDelivering = newStatus === 'Delivered';
    const targetOrder = orders.find(o => o.id === orderId);
    const deliveredTs = isDelivering ? new Date().toISOString() : undefined;

    const updated = orders.map(o => {
      if (o.id === orderId) {
        return { 
          ...o, 
          status: newStatus,
          deliveredAt: deliveredTs
        };
      }
      return o;
    });

    setOrders(updated);
    saveAdminOrders(updated);
    try {
      await updateBackendOrderStatus(orderId, newStatus, {
        deliveredAt: deliveredTs
      });
    } catch (e) {}
    toast.success(`Order status updated to ${newStatus}`);
  };

  const handleTableAssignDriver = async (orderId: string, driverId: string) => {
    const targetDriver = driverId === '__UNASSIGN__' || !driverId
      ? null
      : drivers.find(d => (d.driverId || d.id) === driverId) || null;

    try {
      try {
        await assignDriverToBackendOrder(orderId, {
          driverId: targetDriver ? (targetDriver.driverId || targetDriver.id) : '',
          driverName: targetDriver?.name || '',
          driverPhone: targetDriver?.phone || '',
          driverVehicle: targetDriver ? `${targetDriver.vehicleType} (${targetDriver.vehicleNumber})` : '',
          updateStatusToOutForDelivery: true
        });
      } catch {}

      const updated = assignDriverToOrdersLocally([orderId], targetDriver, true);
      setOrders(updated);
      if (targetDriver) {
        toast.success(`Assigned to ${targetDriver.name}`);
      } else {
        toast.success('Driver unassigned');
      }
    } catch {
      toast.error('Failed to assign driver');
    }
  };

  const handleBulkAssignDriver = async (driverId: string) => {
    if (!driverId || selectedOrderIds.size === 0) return;
    const targetDriver = driverId === '__UNASSIGN__'
      ? null
      : drivers.find(d => (d.driverId || d.id) === driverId) || null;

    const ids: string[] = Array.from(selectedOrderIds);
    try {
      try {
        await bulkAssignDriverToBackendOrders(ids, {
          driverId: targetDriver ? (targetDriver.driverId || targetDriver.id) : '',
          driverName: targetDriver?.name || '',
          driverPhone: targetDriver?.phone || '',
          driverVehicle: targetDriver ? `${targetDriver.vehicleType} (${targetDriver.vehicleNumber})` : '',
          updateStatusToOutForDelivery: true
        });
      } catch {}

      const updated = assignDriverToOrdersLocally(ids, targetDriver, true);
      setOrders(updated);
      setSelectedOrderIds(new Set());
      if (targetDriver) {
        toast.success(`Assigned ${ids.length} orders to ${targetDriver.name}`);
      } else {
        toast.success(`Unassigned ${ids.length} orders`);
      }
    } catch {
      toast.error('Failed to bulk assign driver');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleOpenLabelModal = (orderId?: string) => {
    setSelectedOrderIdForLabel(orderId || null);
    setLabelModalOpen(true);
  };

  const handleOpenMap = (order: AdminOrder, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedOrderForMap(order);
    setMapModalOpen(true);
  };

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
      const lower = order.deliveryDate.toLowerCase();
      if (lower.includes('today')) return todayISO;
      if (lower.includes('tomorrow')) return tomorrowISO;
    }
    return null;
  };

  const matchesDateRange = (order: AdminOrder, start: string, end: string) => {
    if (!start && !end) return true;

    const orderISO = getOrderDateISO(order);
    if (!orderISO) return true;

    if (start && end) {
      return orderISO >= start && orderISO <= end;
    }
    if (start) {
      return orderISO >= start;
    }
    if (end) {
      return orderISO <= end;
    }
    return true;
  };

  const filtered = orders.filter(o => {
    const matchesSearch = 
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.mealName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      Boolean(o.driverName && o.driverName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesSlot = slotFilter === 'All' || o.mealType === slotFilter;
    const matchesStatus = statusFilter === 'All' || o.status === statusFilter;
    const matchesDriver = driverFilter === 'All'
      ? true
      : driverFilter === 'Unassigned'
      ? !o.driverId && !o.driverName
      : o.driverId === driverFilter;
    const matchesDate = matchesDateRange(o, startDate, endDate);

    return matchesSearch && matchesSlot && matchesStatus && matchesDriver && matchesDate;
  });

  const isAllSelected = filtered.length > 0 && filtered.every(o => selectedOrderIds.has(o.id));
  const isSomeSelected = filtered.some(o => selectedOrderIds.has(o.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedOrderIds(prev => {
        const next = new Set(prev);
        for (const o of filtered) {
          next.delete(o.id);
        }
        return next;
      });
    } else {
      setSelectedOrderIds(prev => {
        const next = new Set(prev);
        for (const o of filtered) {
          next.add(o.id);
        }
        return next;
      });
    }
  };

  const handleToggleSelectOne = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

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
        <div className="flex flex-wrap items-center gap-2.5 no-print">
          {/* Generate Breakfast Button */}
          <button
            type="button"
            onClick={() => handleGenerateSlot('Breakfast')}
            disabled={generatingSlot !== null}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Generate Breakfast dispatch orders for Today"
          >
            <Coffee className={`w-4 h-4 ${generatingSlot === 'Breakfast' ? 'animate-spin' : ''}`} />
            <span>{generatingSlot === 'Breakfast' ? 'Generating...' : 'Generate Breakfast'}</span>
          </button>

          {/* Generate Lunch Button */}
          <button
            type="button"
            onClick={() => handleGenerateSlot('Lunch')}
            disabled={generatingSlot !== null}
            className="px-3.5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Generate Lunch dispatch orders for Today"
          >
            <Sun className={`w-4 h-4 ${generatingSlot === 'Lunch' ? 'animate-spin' : ''}`} />
            <span>{generatingSlot === 'Lunch' ? 'Generating...' : 'Generate Lunch'}</span>
          </button>

          {/* Generate Dinner Button */}
          <button
            type="button"
            onClick={() => handleGenerateSlot('Dinner')}
            disabled={generatingSlot !== null}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Generate Dinner dispatch orders for Today"
          >
            <Moon className={`w-4 h-4 ${generatingSlot === 'Dinner' ? 'animate-spin' : ''}`} />
            <span>{generatingSlot === 'Dinner' ? 'Generating...' : 'Generate Dinner'}</span>
          </button>

          {/* View All Customers on Map Button */}
          {filtered.length > 0 && (
            <button
              type="button"
              onClick={() => setAllMapModalOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
              title="View all customer delivery locations together on an interactive dispatch map"
            >
              <MapPin className="w-4 h-4" />
              <span>All Customers Map</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-800 text-white">
                {filtered.length}
              </span>
            </button>
          )}

          {/* Print Multiple Receipts */}
          {filtered.length > 0 && (
            <button
              type="button"
              onClick={() => handleOpenLabelModal()}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
              title="Print receipts for filtered orders"
            >
              <Receipt className="w-4 h-4" />
              <span>Print Receipts</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-slate-700 text-white">
                {filtered.length}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Date Range Filter Bar */}
      <div className="no-print bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span>Date Range:</span>
          </div>

          {/* Start Date */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              title="Start Date"
            />
          </div>

          {/* End Date */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              title="End Date"
            />
          </div>

          {/* Clear Dates Quick Link */}
          {(startDate || endDate) && (
            <button
              type="button"
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="text-xs font-semibold text-slate-400 hover:text-slate-700 underline cursor-pointer"
              title="Clear date range to show all orders"
            >
              Clear dates
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          {/* Refresh / Reset Filters */}
          <button
            type="button"
            onClick={() => {
              setStartDate(todayISO);
              setEndDate(todayISO);
              setSlotFilter('All');
              setStatusFilter('All');
              setSearchTerm('');
              loadOrders();
              toast.success('Filters reset to Today');
            }}
            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 rounded-xl border border-slate-200 transition-colors shadow-xs cursor-pointer flex items-center gap-1.5 text-xs font-bold"
            title="Reset Filters to Today"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            <span>Reset</span>
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

        {/* Search, Status Filter & Select All */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Select All / Deselect All Button */}
          {filtered.length > 0 && (
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
              title={isAllSelected ? "Deselect All" : "Select All"}
            >
              {isAllSelected ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4 text-slate-400" />}
              <span>{isAllSelected ? 'Deselect All' : 'Select All'}</span>
              <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full font-bold">
                {filtered.length}
              </span>
            </button>
          )}

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
            className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-700 cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Preparing">Preparing</option>
            <option value="Out for Delivery">Out for Delivery</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          <select
            value={driverFilter}
            onChange={(e) => setDriverFilter(e.target.value)}
            className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-700 cursor-pointer"
          >
            <option value="All">All Drivers</option>
            <option value="Unassigned">⚠️ Unassigned Driver</option>
            {drivers.map(d => (
              <option key={d.driverId || d.id} value={d.driverId || d.id}>
                {d.name} ({d.vehicleType})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Selection Action Bar (Shown when 1 or more orders are selected) */}
      {selectedOrderIds.size > 0 && (
        <div className="no-print bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-black text-emerald-950">
              {selectedOrderIds.size} of {filtered.length} order{selectedOrderIds.size > 1 ? 's' : ''} selected
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Bulk Assign to Driver */}
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-emerald-300 shadow-2xs">
              <Truck className="w-3.5 h-3.5 text-emerald-600" />
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleBulkAssignDriver(e.target.value);
                    e.target.value = '';
                  }
                }}
                defaultValue=""
                className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="" disabled>Assign Selected to Driver...</option>
                {drivers.map(d => (
                  <option key={d.driverId || d.id} value={d.driverId || d.id}>
                    {d.name} ({d.vehicleType} - {d.vehicleNumber})
                  </option>
                ))}
                <option value="__UNASSIGN__">❌ Unassign</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => setSelectedOrderIds(new Set())}
              className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors cursor-pointer"
            >
              Clear Selection
            </button>
            <button
              type="button"
              onClick={handleDeleteSelectedOrders}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              title="Delete all selected orders"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Selected ({selectedOrderIds.size})</span>
            </button>
          </div>
        </div>
      )}

      {/* Printable Delivery Run Sheet Header (Visible Only When Printing Run Sheet) */}
      <div className="hidden print:block mb-4 p-4 border-b-2 border-slate-900">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-xl tracking-tight text-slate-900 uppercase">SHIFT24 FOOD CO.</span>
              <span className="text-xs bg-slate-900 text-white px-2 py-0.5 rounded font-bold uppercase">Dispatch Run Sheet</span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Delivery Date Range: <strong className="text-slate-900">{startDate && endDate ? `${startDate} to ${endDate}` : startDate ? `From ${startDate}` : endDate ? `Up to ${endDate}` : 'All Dates'}</strong> • Slot: <strong className="text-slate-900">{slotFilter}</strong> • Total Orders: <strong className="text-slate-900">{filtered.length}</strong>
            </p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <div>Courier / Rider Manifest</div>
            <div>Printed: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
          </div>
        </div>
      </div>

      {/* Live Dispatch Notice Banner for Paused & Skipped Subscriptions */}
      {(() => {
        const liveSummary = getSubscriptionDispatchSummary(startDate || todayISO, getAdminSubscriptions());
        if (liveSummary.pausedSubscriptions.length === 0 && liveSummary.skippedSubscriptions.length === 0) {
          return null;
        }

        return (
          <div className="no-print bg-amber-50/80 border border-amber-200/90 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-slate-800">Dispatch Status for {startDate ? startDate : 'Selected Date'}:</span>
                  {liveSummary.pausedSubscriptions.length > 0 && (
                    <span className="inline-flex items-center gap-1 font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full text-[11px]">
                      <Pause className="w-3 h-3 text-indigo-600" />
                      {liveSummary.pausedSubscriptions.length} Paused Subscriptions
                    </span>
                  )}
                  {liveSummary.skippedSubscriptions.length > 0 && (
                    <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full text-[11px]">
                      <CalendarX className="w-3 h-3 text-amber-700" />
                      {liveSummary.skippedSubscriptions.length} Skipped Dates
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Orders will not be generated for these subscriptions in accordance with member schedule preferences.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setGenerationSummary({
                  slot: slotFilter !== 'All' ? slotFilter : null,
                  targetDate: startDate || todayISO,
                  generatedOrdersCount: filtered.length,
                  skippedSubscriptions: liveSummary.skippedSubscriptions,
                  pausedSubscriptions: liveSummary.pausedSubscriptions
                });
                setSummaryModalOpen(true);
              }}
              className="px-3.5 py-1.5 bg-white hover:bg-amber-100 text-amber-900 font-bold rounded-xl border border-amber-300 transition-colors cursor-pointer flex items-center gap-1.5 flex-shrink-0 self-start sm:self-auto shadow-2xs"
            >
              <span>View Excluded Details</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })()}

      {/* Orders Grid/Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-3 py-3 w-10 text-center no-print">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={el => {
                      if (el) el.indeterminate = !isAllSelected && isSomeSelected;
                    }}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                    title={isAllSelected ? "Deselect All" : "Select All"}
                  />
                </th>
                <th className="px-3 py-3 w-36 whitespace-nowrap">Order & Slot</th>
                <th className="px-3 py-3 min-w-[170px] max-w-[220px]">Customer & Address</th>
                <th className="px-3 py-3 min-w-[160px] max-w-[210px]">Meal Item & Plan</th>
                <th className="px-2.5 py-3 w-28 whitespace-nowrap">Allergies</th>
                <th className="px-2.5 py-3 w-24 whitespace-nowrap">Payment</th>
                <th className="px-2.5 py-3 w-36 whitespace-nowrap">Assigned Driver</th>
                <th className="px-2.5 py-3 w-32 whitespace-nowrap">Dispatch Status</th>
                <th className="px-2.5 py-3 text-right no-print w-28 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-slate-400">
                    Loading live orders and dispatch queue...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-14 text-center">
                    {orders.length === 0 ? (
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto py-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 border border-emerald-100">
                          <Sparkles className="w-6 h-6" />
                        </div>
                        <p className="font-extrabold text-sm text-slate-800">
                          No dispatch orders generated yet
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Click a button below to generate today's meal dispatch orders for active subscriptions.
                        </p>
                        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleGenerateSlot('Breakfast')}
                            disabled={generatingSlot !== null}
                            className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <Coffee className={`w-4 h-4 ${generatingSlot === 'Breakfast' ? 'animate-spin' : ''}`} />
                            <span>{generatingSlot === 'Breakfast' ? 'Generating...' : 'Generate Breakfast'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleGenerateSlot('Lunch')}
                            disabled={generatingSlot !== null}
                            className="px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <Sun className={`w-4 h-4 ${generatingSlot === 'Lunch' ? 'animate-spin' : ''}`} />
                            <span>{generatingSlot === 'Lunch' ? 'Generating...' : 'Generate Lunch'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleGenerateSlot('Dinner')}
                            disabled={generatingSlot !== null}
                            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <Moon className={`w-4 h-4 ${generatingSlot === 'Dinner' ? 'animate-spin' : ''}`} />
                            <span>{generatingSlot === 'Dinner' ? 'Generating...' : 'Generate Dinner'}</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="font-extrabold text-sm text-slate-700">
                          No orders found for {startDate && endDate ? `${startDate} to ${endDate}` : startDate ? `from ${startDate}` : endDate ? `up to ${endDate}` : 'the selected criteria'}
                        </p>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map(order => (
                  <tr key={order.id} className={`hover:bg-slate-50/80 transition-colors ${selectedOrderIds.has(order.id) ? 'bg-emerald-50/40' : ''}`}>
                    <td className="px-3 py-3 w-10 text-center no-print">
                      <input
                        type="checkbox"
                        checked={selectedOrderIds.has(order.id)}
                        onChange={() => handleToggleSelectOne(order.id)}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                        title="Select this order"
                      />
                    </td>

                    <td className="px-3 py-3 font-semibold w-36 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {getSlotIcon(order.mealType)}
                        <span className="font-extrabold text-slate-900">{order.mealType}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{order.id}</div>
                      <div className="text-[11px] font-bold text-slate-600 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{order.deliveryTimeSlot}</span>
                      </div>
                      {order.deliveryDate && (
                        <div className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md inline-flex items-center gap-1 mt-1 border border-emerald-100">
                          <Calendar className="w-2.5 h-2.5 shrink-0" />
                          <span>{order.deliveryDate}</span>
                        </div>
                      )}
                    </td>

                    <td className="px-3 py-3 min-w-[170px] max-w-[220px]">
                      <div className="font-bold text-slate-900 truncate" title={order.customerName}>
                        {order.customerName}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{order.customerPhone}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 max-w-full">
                        <button
                          type="button"
                          onClick={(e) => handleOpenMap(order, e)}
                          className="flex items-start gap-1 text-slate-500 hover:text-emerald-700 transition-colors text-left cursor-pointer group w-full min-w-0"
                          title={`${order.address}\n(Click to view customer delivery location on map)`}
                        >
                          <MapPin className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                          <span className="line-clamp-2 break-words leading-snug group-hover:underline text-slate-600 text-[11px]">
                            {order.address}
                          </span>
                        </button>
                      </div>
                    </td>

                    <td className="px-3 py-3 min-w-[160px] max-w-[210px]">
                      <div className="font-bold text-slate-900 leading-snug break-words line-clamp-2" title={order.mealName}>
                        {order.mealName}
                      </div>
                      <div className="text-[11px] font-medium text-emerald-700 mt-0.5 truncate">
                        {order.planTitle}
                      </div>
                    </td>

                    <td className="px-2.5 py-3 w-28">
                      {order.allergies.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-[110px]">
                          {order.allergies.map(a => (
                            <span key={a} className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 font-bold text-[9px] border border-rose-200">
                              {a}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[10px]">Standard</span>
                      )}
                    </td>

                    <td className="px-2.5 py-3 w-24 whitespace-nowrap">
                      <div className="font-extrabold text-slate-900 text-xs">₹{order.amount}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[90px]" title={order.paymentMethod}>{order.paymentMethod}</div>
                    </td>

                    <td className="px-2.5 py-3 w-36 whitespace-nowrap">
                      <select
                        value={order.driverId || ''}
                        onChange={(e) => handleTableAssignDriver(order.id, e.target.value)}
                        className={`text-[11px] font-bold px-2 py-1 rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full max-w-[135px] cursor-pointer ${
                          order.driverName
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-300 font-extrabold'
                            : 'bg-amber-50/70 text-amber-900 border-amber-300'
                        }`}
                      >
                        <option value="">{order.driverName ? `🚚 ${order.driverName}` : '+ Assign Driver'}</option>
                        {drivers.map(d => {
                          const dId = d.driverId || d.id;
                          return (
                            <option key={dId} value={dId}>
                              {d.name} ({d.vehicleType})
                            </option>
                          );
                        })}
                        {order.driverId && <option value="__UNASSIGN__">❌ Unassign</option>}
                      </select>
                      {order.driverPhone && (
                        <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                          📞 {order.driverPhone}
                        </div>
                      )}
                    </td>

                    <td className="px-2.5 py-3 w-36 whitespace-nowrap">
                      <select
                        value={order.status}
                        onChange={(e) => handleUpdateStatus(order.id, e.target.value as AdminOrder['status'])}
                        className={`text-[11px] font-bold px-2 py-1 rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full max-w-[125px] ${
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

                      {order.status === 'Delivered' && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDeliveredOrder(order);
                            setCustomDeliveredInput(formatDelivered12Hr(order.deliveredAt, order.deliveryTimeSlot, order.mealType));
                          }}
                          className="flex items-center gap-1.5 text-[10px] font-black text-emerald-800 bg-emerald-100/90 hover:bg-emerald-200 border border-emerald-300 rounded-md px-2 py-0.5 mt-1.5 w-fit shadow-2xs transition-all cursor-pointer group"
                          title="Click to edit delivery time"
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>Delivered: {formatDelivered12Hr(order.deliveredAt, order.deliveryTimeSlot, order.mealType)}</span>
                          <Edit2 className="w-2.5 h-2.5 text-emerald-600 opacity-60 group-hover:opacity-100 shrink-0 ml-0.5" />
                        </button>
                      )}
                    </td>

                    <td className="px-2.5 py-3 text-right no-print w-28 whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={(e) => handleOpenMap(order, e)}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 rounded-lg text-[11px] font-bold border border-emerald-200 transition-all shadow-2xs group cursor-pointer"
                          title="View customer delivery location on map"
                        >
                          <MapPin className="w-3 h-3 text-emerald-600 group-hover:scale-110 transition-transform" />
                          <span>Map</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenLabelModal(order.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 hover:border-emerald-300 rounded-lg text-[11px] font-bold border border-slate-200 transition-all shadow-2xs group cursor-pointer"
                          title="Print order receipt slip or packaging label"
                        >
                          <Receipt className="w-3 h-3 text-slate-500 group-hover:text-emerald-600 transition-colors" />
                          <span>Print</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSingleOrder(order.id, e)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                          title="Delete this order"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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

      {/* Customer Delivery Location Map Modal */}
      <OrderLocationModal
        isOpen={mapModalOpen}
        onClose={() => {
          setMapModalOpen(false);
          setSelectedOrderForMap(null);
        }}
        order={selectedOrderForMap}
        onOrdersUpdated={loadOrders}
        allCustomerOrders={
          selectedOrderForMap
            ? orders.filter(o => {
                const sameCustomer =
                  (selectedOrderForMap.customerPhone && o.customerPhone === selectedOrderForMap.customerPhone) ||
                  (selectedOrderForMap.customerName && o.customerName.toLowerCase() === selectedOrderForMap.customerName.toLowerCase());
                if (!sameCustomer) return false;

                const targetDate = getOrderDateISO(selectedOrderForMap);
                const orderDate = getOrderDateISO(o);
                if (targetDate && orderDate) {
                  return targetDate === orderDate;
                }
                return o.deliveryDate === selectedOrderForMap.deliveryDate;
              })
            : []
        }
      />

      {/* All Customers Delivery Map Modal */}
      <AllOrdersMapModal
        isOpen={allMapModalOpen}
        onClose={() => setAllMapModalOpen(false)}
        orders={filtered}
        initialSlotFilter={slotFilter}
        onOrdersUpdated={loadOrders}
      />

      {/* Quick Edit Delivered Time Modal */}
      {editingDeliveredOrder && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setEditingDeliveredOrder(null)}
        >
          <div 
            className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">Delivery Completion Time</h3>
                  <p className="text-[10px] text-slate-500 font-medium">{editingDeliveredOrder.id} • {editingDeliveredOrder.mealType}</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setEditingDeliveredOrder(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Delivered Time (12-hour format):</label>
                <input 
                  type="text" 
                  value={customDeliveredInput} 
                  onChange={(e) => setCustomDeliveredInput(e.target.value)}
                  placeholder="e.g. 08:15 PM"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quick Presets:</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      const t = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                      setCustomDeliveredInput(t);
                    }}
                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    Current Clock Time
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const mType = (editingDeliveredOrder.mealType || '').toLowerCase();
                      const time = mType.includes('breakfast') ? '08:30 AM' : mType.includes('lunch') ? '01:30 PM' : '08:30 PM';
                      setCustomDeliveredInput(time);
                    }}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    Slot Standard ({editingDeliveredOrder.mealType === 'Breakfast' ? '08:30 AM' : editingDeliveredOrder.mealType === 'Lunch' ? '01:30 PM' : '08:30 PM'})
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={() => setEditingDeliveredOrder(null)}
                  className="flex-1 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveCustomDeliveredTime(editingDeliveredOrder.id, customDeliveredInput)}
                  className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-xs cursor-pointer"
                >
                  Save Time
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Order Generation & Dispatch Summary Modal */}
      <GenerationSummaryModal
        isOpen={summaryModalOpen}
        onClose={() => setSummaryModalOpen(false)}
        slot={generationSummary?.slot}
        targetDate={generationSummary?.targetDate || todayISO}
        generatedOrdersCount={generationSummary?.generatedOrdersCount}
        skippedSubscriptions={generationSummary?.skippedSubscriptions || []}
        pausedSubscriptions={generationSummary?.pausedSubscriptions || []}
      />
    </div>
  );
}
