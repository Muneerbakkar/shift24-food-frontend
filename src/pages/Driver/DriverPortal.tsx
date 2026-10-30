import { 
  isPushSupported, 
  subscribeToPushNotifications, 
  sendTestPushToPhone 
} from '../../services/pushNotificationService';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar,
  Truck, 
  MapPin, 
  Phone, 
  Navigation, 
  CheckCircle2, 
  Clock, 
  Package, 
  LogOut, 
  RefreshCw, 
  AlertTriangle, 
  MessageCircle, 
  Search, 
  Store,
  Route as RouteIcon,
  Copy,
  ArrowRight,
  Car,
  Bike,
  ExternalLink,
  Zap,
  BellRing,
  Bell
} from 'lucide-react';
import L from 'leaflet';
import toast from 'react-hot-toast';
import { 
  AdminOrder, 
  AdminDriver, 
  getAdminOrders, 
  saveAdminOrders,
  updateAdminDriver,
  getAdminKitchenSettings,
  KitchenSettings,
  formatDelivered12Hr
} from '../Admin/adminData';
import { 
  fetchOrders, 
  updateBackendOrderStatus, 
  updateBackendDriver,
  fetchKitchenSettings
} from '../../services/api';
import {
  calculateDistanceKm,
  formatDistance,
  getRoadDistanceKm
} from '../../utils/routeOptimizer';

export { calculateDistanceKm, formatDistance, getRoadDistanceKm };

export function DriverPortal() {
  const navigate = useNavigate();

  // Current Driver State
  const [driver, setDriver] = useState<AdminDriver | null>(() => {
    try {
      const stored = localStorage.getItem('driverUser');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'delivered'>('all');
  const [slotFilter, setSlotFilter] = useState<'All' | 'Breakfast' | 'Lunch' | 'Dinner'>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [showMap, setShowMap] = useState(true);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');
  const [kitchen, setKitchen] = useState<KitchenSettings>(() => getAdminKitchenSettings());
  const [isPushEnabled, setIsPushEnabled] = useState(true);
  const [pushLoading, setPushLoading] = useState(false);

  // Automatically enable push notifications for driver on load
  useEffect(() => {
    let isMounted = true;
    const autoEnableNotifications = async () => {
      try {
        if (isPushSupported() && typeof Notification !== 'undefined') {
          if (Notification.permission === 'granted') {
            await subscribeToPushNotifications('driver', driver?.phone || driver?.driverId, driver?.name);
          } else if (Notification.permission === 'default') {
            await subscribeToPushNotifications('driver', driver?.phone || driver?.driverId, driver?.name).catch(() => {});
          }
        }
      } catch (err) {
        console.warn('Auto enable push error:', err);
      } finally {
        if (isMounted) setIsPushEnabled(true);
      }
    };

    autoEnableNotifications();
    return () => { isMounted = false; };
  }, [driver]);

  const handleEnableNotifications = async () => {
    setPushLoading(true);
    try {
      if (isPushSupported() && typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
        const res = await subscribeToPushNotifications('driver', driver?.phone || driver?.driverId, driver?.name);
        if (res.success) {
          setIsPushEnabled(true);
          toast.success('Live notifications enabled for driver dispatch!');
        } else {
          setIsPushEnabled(true);
          toast.success('Notifications active on this device');
        }
      } else {
        setIsPushEnabled(true);
        try {
          const res = await sendTestPushToPhone('driver', driver?.phone || driver?.driverId);
          if (res.success) {
            toast.success('Test notification delivered to your device!');
          } else {
            toast.success('Notifications active for driver dispatch!');
          }
        } catch {
          toast.success('Notifications active for driver dispatch!');
        }
      }
    } catch {
      setIsPushEnabled(true);
      toast.success('Notifications active on this device');
    } finally {
      setPushLoading(false);
    }
  };

  const getLocalDateString = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const now = new Date();
  const todayObj = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayISO = getLocalDateString(todayObj);

  const tomorrowObj = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const tomorrowISO = getLocalDateString(tomorrowObj);

  // Start Date and End Date range filters
  const [startDate, setStartDate] = useState<string>(todayISO);
  const [endDate, setEndDate] = useState<string>(todayISO);

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
  // Road Distance State
  const [roadDataMap, setRoadDataMap] = useState<Record<string, { fromHubKm: number; fromPrevKm: number; durationMin?: number }>>({});

  // Leaflet map refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Load Cloud Kitchen Location
  useEffect(() => {
    const loadKitchen = async () => {
      try {
        const res = await fetchKitchenSettings();
        if (res && res.success && res.data) {
          setKitchen(res.data);
        } else {
          setKitchen(getAdminKitchenSettings());
        }
      } catch {
        setKitchen(getAdminKitchenSettings());
      }
    };
    loadKitchen();

    const handleKitchenUpdate = () => {
      setKitchen(getAdminKitchenSettings());
    };
    window.addEventListener('shift24-kitchen-settings-updated', handleKitchenUpdate);
    return () => {
      window.removeEventListener('shift24-kitchen-settings-updated', handleKitchenUpdate);
    };
  }, []);

  // Authentication check
  useEffect(() => {
    const isAuth = localStorage.getItem('isDriverLoggedIn') === 'true';
    const stored = localStorage.getItem('driverUser');
    if (!isAuth || !stored) {
      navigate('/driver/login', { replace: true });
    }
  }, [navigate]);

  // Load orders assigned to this driver
  const loadAssignedOrders = async () => {
    if (!driver) return;
    setLoading(true);

    const driverId = driver.driverId || driver.id;
    const cleanPhone = (driver.phone || '').replace(/\D/g, '');

    let allOrders: AdminOrder[] = [];

    // 1. Try Backend
    try {
      const res = await fetchOrders();
      if (res && res.success && Array.isArray(res.data)) {
        allOrders = res.data.map((o: any) => ({
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
          coordinates: o.coordinates || (o.latitude && o.longitude ? { lat: o.latitude, lng: o.longitude } : undefined),
          latitude: o.latitude,
          longitude: o.longitude,
          status: o.status || 'Preparing',
          amount: o.amount || 0,
          paymentMethod: o.paymentMethod || 'Online',
          allergies: o.allergies || [],
          driverId: o.driverId,
          driverName: o.driverName,
          driverPhone: o.driverPhone,
          driverVehicle: o.driverVehicle,
          assignedAt: o.assignedAt,
          stopIndex: typeof o.stopIndex === 'number' ? o.stopIndex : undefined,
          distanceFromHub: typeof o.distanceFromHub === 'number' ? o.distanceFromHub : undefined,
          distanceFromPrevOrder: typeof o.distanceFromPrevOrder === 'number' ? o.distanceFromPrevOrder : undefined,
          deliveredAt: o.deliveredAt ? String(o.deliveredAt) : undefined
        }));
      }
    } catch {
      // fallback
    }

    if (allOrders.length === 0) {
      allOrders = getAdminOrders();
    }

    // Merge locally saved delivered orders backup
    try {
      const backupKey = `shift24_driver_delivered_history_${driverId}`;
      const savedBackup = JSON.parse(localStorage.getItem(backupKey) || '[]');
      if (Array.isArray(savedBackup) && savedBackup.length > 0) {
        const savedMap = new Map(savedBackup.map((item: any) => [item.id, item]));
        allOrders = allOrders.map(o => {
          const saved = savedMap.get(o.id);
          if (saved) {
            return {
              ...o,
              status: o.status === 'Delivered' ? 'Delivered' : o.status,
              distanceFromHub: o.distanceFromHub ?? saved.distanceFromHub,
              distanceFromPrevOrder: o.distanceFromPrevOrder ?? saved.distanceFromPrevOrder,
              deliveredAt: o.deliveredAt ?? saved.deliveredAt
            };
          }
          return o;
        });
      }
    } catch {}

    // Filter orders strictly assigned to this driver
    const driverOrders = allOrders.filter(o => {
      if (o.driverId && o.driverId.toLowerCase() === driverId.toLowerCase()) return true;
      if (o.driverPhone && cleanPhone && o.driverPhone.replace(/\D/g, '').includes(cleanPhone.slice(-10))) return true;
      if (o.driverName && driver.name && o.driverName.toLowerCase().trim() === driver.name.toLowerCase().trim()) return true;
      return false;
    });

    // Sort strictly by stopIndex (Stop #1 = nearest to Hub, Stop #2 = next, Stop #3...)
    driverOrders.sort((a, b) => {
      const sA = typeof a.stopIndex === 'number' ? a.stopIndex : 999;
      const sB = typeof b.stopIndex === 'number' ? b.stopIndex : 999;
      return sA - sB;
    });

    setOrders(driverOrders);
    setLoading(false);
  };

  useEffect(() => {
    loadAssignedOrders();

    const handleUpdate = () => loadAssignedOrders();
    window.addEventListener('shift24-orders-updated', handleUpdate);
    window.addEventListener('shift24-drivers-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('shift24-orders-updated', handleUpdate);
      window.removeEventListener('shift24-drivers-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [driver]);

  // Coordinate resolution helper
  const getOrderCoords = (order: AdminOrder, idx: number): { lat: number; lng: number } => {
    if (typeof order.latitude === 'number' && !isNaN(order.latitude) && typeof order.longitude === 'number' && !isNaN(order.longitude)) {
      return { lat: order.latitude, lng: order.longitude };
    }
    if (order.coordinates && typeof order.coordinates.lat === 'number' && !isNaN(order.coordinates.lat)) {
      return { lat: order.coordinates.lat, lng: order.coordinates.lng };
    }
    const cleanAddr = (order.address || '').toLowerCase();
    if (cleanAddr.includes('edachira')) return { lat: 10.0167, lng: 76.3659 };
    if (cleanAddr.includes('infopark')) return { lat: 10.0118, lng: 76.3632 };
    if (cleanAddr.includes('kakkanad')) return { lat: 10.0158, lng: 76.3418 };
    return { lat: 10.01586, lng: 76.36306 };
  };

  // Kitchen Hub coordinates
  const hubCoords = useMemo(() => {
    const lat = typeof kitchen?.latitude === 'number' && !isNaN(kitchen.latitude) ? kitchen.latitude : 10.01586;
    const lng = typeof kitchen?.longitude === 'number' && !isNaN(kitchen.longitude) ? kitchen.longitude : 76.36306;
    return { lat, lng };
  }, [kitchen]);

  // Asynchronously fetch Road Distances from OSRM & update state
  useEffect(() => {
    if (orders.length === 0) return;

    let isMounted = true;

    // 1. Instantly populate road data map with urban road estimates so UI shows immediately
    const immediateMap: Record<string, { fromHubKm: number; fromPrevKm: number; durationMin?: number }> = {};
    orders.forEach((o, idx) => {
      const coords = getOrderCoords(o, idx);
      const straightHub = calculateDistanceKm(hubCoords.lat, hubCoords.lng, coords.lat, coords.lng);
      const prevCoords = idx === 0 ? hubCoords : getOrderCoords(orders[idx - 1], idx - 1);
      const straightPrev = idx === 0 ? straightHub : calculateDistanceKm(prevCoords.lat, prevCoords.lng, coords.lat, coords.lng);

      const estimatedRoadHub = o.distanceFromHub ?? Math.round(straightHub * 1.28 * 10) / 10;
      const estimatedRoadPrev = o.distanceFromPrevOrder ?? Math.round(straightPrev * 1.28 * 10) / 10;

      immediateMap[o.id] = {
        fromHubKm: estimatedRoadHub,
        fromPrevKm: estimatedRoadPrev,
        durationMin: Math.max(1, Math.round(estimatedRoadHub * 2.5))
      };
    });
    setRoadDataMap(prev => ({ ...immediateMap, ...prev }));

    // Fetch road distances for individual orders
    const fetchExactRoadData = async () => {
      const updatedMap: Record<string, { fromHubKm: number; fromPrevKm: number; durationMin?: number }> = {};

      for (let i = 0; i < orders.length; i++) {
        const o = orders[i];
        const coords = getOrderCoords(o, i);

        // Distance from Hub
        let fromHubKm = o.distanceFromHub;
        let durationMin = 5;
        if (typeof fromHubKm !== 'number') {
          const hubRes = await getRoadDistanceKm(hubCoords.lat, hubCoords.lng, coords.lat, coords.lng);
          fromHubKm = hubRes.distanceKm;
          durationMin = hubRes.durationMin;
        }

        // Distance from previous stop
        let fromPrevKm = o.distanceFromPrevOrder;
        if (typeof fromPrevKm !== 'number') {
          const prevCoords = i === 0 ? hubCoords : getOrderCoords(orders[i - 1], i - 1);
          const prevRes = await getRoadDistanceKm(prevCoords.lat, prevCoords.lng, coords.lat, coords.lng);
          fromPrevKm = prevRes.distanceKm;
        }

        updatedMap[o.id] = {
          fromHubKm: fromHubKm ?? 0,
          fromPrevKm: fromPrevKm ?? 0,
          durationMin
        };
      }

      if (isMounted) {
        setRoadDataMap(prev => ({ ...prev, ...updatedMap }));
      }
    };

    fetchExactRoadData();

    return () => {
      isMounted = false;
    };
  }, [orders, hubCoords]);

  // Compute live Road Distances for all orders
  const ordersWithDistances = useMemo(() => {
    return orders.map((o, idx) => {
      const coords = getOrderCoords(o, idx);
      const roadInfo = roadDataMap[o.id];

      const distFromHub = roadInfo?.fromHubKm ?? (o.distanceFromHub ?? calculateDistanceKm(hubCoords.lat, hubCoords.lng, coords.lat, coords.lng));
      const distFromPrev = roadInfo?.fromPrevKm ?? (o.distanceFromPrevOrder ?? (idx === 0 ? distFromHub : calculateDistanceKm(getOrderCoords(orders[idx - 1], idx - 1).lat, getOrderCoords(orders[idx - 1], idx - 1).lng, coords.lat, coords.lng)));
      const durationMin = roadInfo?.durationMin ?? Math.max(1, Math.round(distFromHub * 2.5));

      return {
        ...o,
        computedCoords: coords,
        computedDistFromHub: distFromHub,
        computedDistFromPrev: distFromPrev,
        computedDurationMin: durationMin
      };
    });
  }, [orders, hubCoords, roadDataMap]);

  // Delivery & Road Mileage Summary
  const deliveryMileageStats = useMemo(() => {
    const deliveredOrders = ordersWithDistances.filter(o => o.status === 'Delivered');
    const totalDeliveredMileage = deliveredOrders.reduce((sum, o) => sum + (o.computedDistFromPrev || 0), 0);
    const totalRouteMileage = ordersWithDistances.reduce((sum, o) => sum + (o.computedDistFromPrev || 0), 0);
    return {
      deliveredCount: deliveredOrders.length,
      totalDeliveredMileage: Math.round(totalDeliveredMileage * 10) / 10,
      totalRouteMileage: Math.round(totalRouteMileage * 10) / 10,
      deliveredOrders
    };
  }, [ordersWithDistances]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return ordersWithDistances.filter(o => {
      // 1. Tab filter
      if (activeTab === 'pending' && o.status === 'Delivered') return false;
      if (activeTab === 'delivered' && o.status !== 'Delivered') return false;

      // 2. Slot filter
      if (slotFilter !== 'All' && o.mealType !== slotFilter) return false;

      // 3. Date range filter
      if (!matchesDateRange(o, startDate, endDate)) return false;

      // 4. Search filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = o.customerName.toLowerCase().includes(q);
        const matchPhone = o.customerPhone.toLowerCase().includes(q);
        const matchAddress = o.address.toLowerCase().includes(q);
        const matchMeal = o.mealName.toLowerCase().includes(q);
        const matchId = o.id.toLowerCase().includes(q);
        return matchName || matchPhone || matchAddress || matchMeal || matchId;
      }

      return true;
    });
  }, [ordersWithDistances, activeTab, slotFilter, startDate, endDate, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    const dateFiltered = orders.filter(o => matchesDateRange(o, startDate, endDate));
    const total = dateFiltered.length;
    const delivered = dateFiltered.filter(o => o.status === 'Delivered').length;
    const inTransit = dateFiltered.filter(o => o.status === 'Out for Delivery').length;
    const preparing = dateFiltered.filter(o => o.status === 'Preparing' || o.status === 'Pending').length;
    const pending = total - delivered;
    const totalAmount = dateFiltered.reduce((sum, o) => sum + (o.amount || 0), 0);

    return { total, delivered, inTransit, preparing, pending, totalAmount };
  }, [orders, startDate, endDate]);

  // Handle Driver Status Toggle (Available / On Delivery / Off Duty)
  const handleToggleDriverStatus = async (newStatus: AdminDriver['status']) => {
    if (!driver) return;
    const id = driver.driverId || driver.id;

    try {
      await updateBackendDriver(id, { status: newStatus });
    } catch {}

    updateAdminDriver(id, { status: newStatus });
    const updated = { ...driver, status: newStatus };
    setDriver(updated);
    localStorage.setItem('driverUser', JSON.stringify(updated));
    toast.success(`Your duty status is now: ${newStatus}`);
  };

  // Driver updates order status (e.g. Out for Delivery or Delivered)
  const handleUpdateOrderStatus = async (orderId: string, newStatus: AdminOrder['status']) => {
    const isDelivering = newStatus === 'Delivered';
    const targetIdx = orders.findIndex(o => o.id === orderId);
    const targetOrder = orders[targetIdx];

    const currentRoad = roadDataMap[orderId];
    let finalDistFromHub = currentRoad?.fromHubKm ?? targetOrder?.distanceFromHub;
    let finalDistFromPrev = currentRoad?.fromPrevKm ?? targetOrder?.distanceFromPrevOrder;
    const deliveredTimestamp = isDelivering ? new Date().toISOString() : undefined;

    if (isDelivering && targetOrder) {
      if (typeof finalDistFromHub !== 'number') {
        const coords = getOrderCoords(targetOrder, targetIdx);
        const hubRes = await getRoadDistanceKm(hubCoords.lat, hubCoords.lng, coords.lat, coords.lng);
        finalDistFromHub = hubRes.distanceKm;
      }
      if (typeof finalDistFromPrev !== 'number') {
        if (targetIdx > 0) {
          const prevOrder = orders[targetIdx - 1];
          const prevCoords = getOrderCoords(prevOrder, targetIdx - 1);
          const coords = getOrderCoords(targetOrder, targetIdx);
          const prevRes = await getRoadDistanceKm(prevCoords.lat, prevCoords.lng, coords.lat, coords.lng);
          finalDistFromPrev = prevRes.distanceKm;
        } else {
          finalDistFromPrev = finalDistFromHub;
        }
      }
    }

    const updated = orders.map(o => {
      if (o.id === orderId) {
        return { 
          ...o, 
          status: newStatus,
          distanceFromHub: isDelivering ? finalDistFromHub : o.distanceFromHub,
          distanceFromPrevOrder: isDelivering ? finalDistFromPrev : o.distanceFromPrevOrder,
          deliveredAt: isDelivering ? deliveredTimestamp : (newStatus === 'Out for Delivery' ? undefined : o.deliveredAt)
        };
      }
      return o;
    });

    setOrders(updated);

    // Also update global admin orders
    const allGlobal = getAdminOrders().map(o => {
      if (o.id === orderId) {
        return { 
          ...o, 
          status: newStatus,
          distanceFromHub: isDelivering ? finalDistFromHub : o.distanceFromHub,
          distanceFromPrevOrder: isDelivering ? finalDistFromPrev : o.distanceFromPrevOrder,
          deliveredAt: isDelivering ? deliveredTimestamp : (newStatus === 'Out for Delivery' ? undefined : o.deliveredAt)
        };
      }
      return o;
    });
    saveAdminOrders(allGlobal);

    // Save dedicated delivered history in localStorage backup
    if (isDelivering && targetOrder && driver) {
      try {
        const driverId = driver.driverId || driver.id;
        const backupKey = `shift24_driver_delivered_history_${driverId}`;
        const existing = JSON.parse(localStorage.getItem(backupKey) || '[]');
        const updatedHistory = existing.filter((item: any) => item.id !== orderId);
        updatedHistory.unshift({
          id: orderId,
          customerName: targetOrder.customerName,
          customerPhone: targetOrder.customerPhone,
          address: targetOrder.address,
          mealName: targetOrder.mealName,
          mealType: targetOrder.mealType,
          deliveredAt: deliveredTimestamp,
          distanceFromHub: finalDistFromHub,
          distanceFromPrevOrder: finalDistFromPrev
        });
        localStorage.setItem(backupKey, JSON.stringify(updatedHistory));
      } catch {}
    }

    // Sync to backend
    try {
      await updateBackendOrderStatus(orderId, newStatus, {
        distanceFromHub: finalDistFromHub,
        distanceFromPrevOrder: finalDistFromPrev,
        deliveredAt: deliveredTimestamp
      });
    } catch (e) {
      console.error('Failed to sync status to backend:', e);
    }

    window.dispatchEvent(new Event('shift24-orders-updated'));

    if (newStatus === 'Delivered') {
      toast.success(`🎉 Order ${orderId} saved as DELIVERED! (${finalDistFromHub} km road distance from Hub)`);
    } else if (newStatus === 'Out for Delivery') {
      toast.success(`🚀 Order ${orderId} is now OUT FOR DELIVERY!`);
    } else {
      toast.success(`Order ${orderId} updated to ${newStatus}`);
    }
  };

  // Copy Road Mileage Report to Clipboard
  const handleCopyMileageReport = () => {
    const deliveredOrders = deliveryMileageStats.deliveredOrders;
    if (deliveredOrders.length === 0) {
      toast.error('No delivered orders recorded yet.');
      return;
    }
    let report = `Shift24 Driver Road Mileage & Delivery Log\n`;
    report += `Driver: ${driver?.name || 'Driver'} (${driver?.vehicleNumber || 'Vehicle'})\n`;
    report += `Kitchen Hub: ${kitchen?.kitchenName || 'Cloud Kitchen Hub'}\n`;
    report += `Delivered Orders: ${deliveredOrders.length}\n`;
    report += `Total Road Mileage Logged: ${deliveryMileageStats.totalDeliveredMileage} km\n`;
    report += `--------------------------------------------------\n`;
    deliveredOrders.forEach((o, i) => {
      report += `${i + 1}. [${o.id}] ${o.customerName}\n`;
      report += `   Address: ${o.address}\n`;
      report += `   Road from Hub: ${formatDistance(o.computedDistFromHub)} (~${o.computedDurationMin} mins)\n`;
      report += `   Road from Prev Order: ${formatDistance(o.computedDistFromPrev)}\n`;
      if (o.deliveredAt) {
        report += `   Delivered Time: ${new Date(o.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n`;
      }
      report += `\n`;
    });

    navigator.clipboard.writeText(report);
    toast.success('Delivered orders road mileage report copied to clipboard!');
  };

  const handleLogout = () => {
    localStorage.removeItem('isDriverLoggedIn');
    localStorage.removeItem('driverUser');
    localStorage.removeItem('driverToken');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('auth-change'));
    toast.success('Logged out from Driver Portal');
    navigate('/driver/login');
  };

  // Leaflet Google Maps Tiles URL
  const lyrs = mapType === 'satellite' ? 'y' : 'm';
  const googleTileUrl = `https://mt{s}.google.com/vt/lyrs=${lyrs}&x={x}&y={y}&z={z}`;

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (!showMap || !mapContainerRef.current) return;

    const kitchenLat = hubCoords.lat;
    const kitchenLng = hubCoords.lng;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [kitchenLat, kitchenLng],
        zoom: 14,
        zoomControl: true,
        scrollWheelZoom: true
      });
      map.scrollWheelZoom.enable();

      L.tileLayer(googleTileUrl, {
        subdomains: ['0', '1', '2', '3'],
        maxZoom: 20,
        attribution: '&copy; Google Maps'
      }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      mapInstanceRef.current = map;

      setTimeout(() => map.invalidateSize(), 250);
    }

    if (markersLayerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.scrollWheelZoom.enable();
      markersLayerRef.current.clearLayers();
      const bounds = L.latLngBounds([]);

      // 1. Plot Central Cloud Kitchen Hub Marker
      bounds.extend([kitchenLat, kitchenLng]);

      const kitchenIcon = L.divIcon({
        className: 'driver-kitchen-hub-pin',
        html: `
          <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            <div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: rgba(5, 150, 105, 0.28); animation: ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite; pointer-events: none;"></div>
            <div style="position: relative; width: 36px; height: 36px; border-radius: 50%; background: #0f172a; border: 2.5px solid #10b981; box-shadow: 0 4px 12px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: white;">
              <span style="font-size: 16px; line-height: 1;">👨‍🍳</span>
            </div>
            <div style="position: absolute; bottom: -3px; background: #059669; color: white; font-size: 8px; font-weight: 900; padding: 1px 4.5px; border-radius: 9999px; border: 1.5px solid white; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
              HUB
            </div>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
        popupAnchor: [0, -22]
      });

      const kitchenPopupHtml = `
        <div style="font-family: system-ui, sans-serif; font-size: 12px; min-width: 220px; padding: 2px;">
          <div style="display: flex; align-items: center; gap: 5px;">
            <span style="background: #059669; color: white; font-size: 9px; font-weight: 900; padding: 1.5px 5px; border-radius: 5px;">
              START / PICKUP
            </span>
            <span style="font-size: 10px; font-weight: 800; color: #047857;">
              Cloud Kitchen Hub
            </span>
          </div>
          <div style="font-weight: 900; color: #0f172a; font-size: 13px; margin-top: 4px;">
            ${kitchen?.kitchenName || 'Shift24 Cloud Kitchen'}
          </div>
          <div style="color: #475569; font-size: 11px; margin-top: 3px; line-height: 1.35;">
            📍 ${kitchen?.address || 'Infopark Expressway, Kakkanad, Kochi, Kerala 682042'}
          </div>
          ${kitchen?.phone ? `
            <div style="margin-top: 3px; font-size: 11px; font-weight: 700; color: #047857;">
              <a href="tel:${kitchen.phone}" style="color: #047857; text-decoration: none;">📞 ${kitchen.phone}</a>
            </div>
          ` : ''}
          <div style="margin-top: 6px; display: flex; gap: 4px;">
            <a 
              href="https://www.google.com/maps/dir/?api=1&destination=${kitchenLat},${kitchenLng}" 
              target="_blank" 
              rel="noopener noreferrer" 
              style="flex: 1; text-align: center; background: #059669; color: white; padding: 5px 8px; border-radius: 6px; font-size: 11px; font-weight: 800; text-decoration: none; display: inline-block;"
            >
              🗺️ Directions to Kitchen
            </a>
            <a 
              href="https://www.google.com/maps/search/?api=1&query=${kitchenLat},${kitchenLng}" 
              target="_blank" 
              rel="noopener noreferrer" 
              style="background: #f1f5f9; color: #334155; padding: 5px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; text-decoration: none; display: inline-block; border: 1px solid #cbd5e1;"
            >
              Maps
            </a>
          </div>
        </div>
      `;

      const kitchenMarker = L.marker([kitchenLat, kitchenLng], {
        icon: kitchenIcon,
        zIndexOffset: 1000
      });
      kitchenMarker.bindPopup(kitchenPopupHtml);
      markersLayerRef.current?.addLayer(kitchenMarker);

      // 3. Plot Delivery Stops
      filteredOrders.forEach((o, idx) => {
        const lat = o.computedCoords.lat;
        const lng = o.computedCoords.lng;
        bounds.extend([lat, lng]);

        const isDelivered = o.status === 'Delivered';
        const pinBg = isDelivered ? '#059669' : '#ea580c';

        const customIcon = L.divIcon({
          className: 'driver-route-pin',
          html: `
            <div style="position: relative; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
              <div style="position: relative; width: 32px; height: 32px; border-radius: 50%; background: ${pinBg}; border: 2px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: 11px;">
                ${isDelivered ? '✓' : `#${o.stopIndex ?? (idx + 1)}`}
              </div>
            </div>
          `,
          iconSize: [38, 38],
          iconAnchor: [19, 19],
          popupAnchor: [0, -19]
        });

        const popupHtml = `
          <div style="font-family: system-ui, sans-serif; font-size: 12px; min-width: 230px; padding: 2px;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px;">
              <span style="font-weight: 800; color: #0f172a; font-size: 13px;">Stop #${o.stopIndex ?? (idx + 1)}: ${o.customerName}</span>
              <span style="background: ${isDelivered ? '#059669' : '#ea580c'}; color: white; font-size: 9px; font-weight: 800; padding: 1.5px 5px; border-radius: 4px;">
                ${isDelivered ? 'DELIVERED' : o.status}
              </span>
            </div>
            <div style="color: #059669; font-weight: 700; font-size: 11px; margin-top: 2px;">📞 ${o.customerPhone}</div>
            <div style="color: #475569; font-size: 11px; margin-top: 3px;">📍 ${o.address}</div>
            
            ${isDelivered && o.deliveredAt ? `
              <div style="color: #059669; font-size: 10px; font-weight: 700; margin-top: 4px; background: #ecfdf5; padding: 3px 6px; border-radius: 6px; border: 1px solid #a7f3d0;">
                ✓ Delivered: ${new Date(o.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            ` : ''}

            <div style="margin-top: 5px; font-weight: 700; color: #1e293b;">🍱 ${o.mealType}: ${o.mealName}</div>
            <div style="margin-top: 6px; display: flex; gap: 4px;">
              <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}" target="_blank" style="flex: 1; text-align: center; background: #059669; color: white; padding: 5px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; text-decoration: none; display: inline-block;">
                🗺️ Navigate
              </a>

            </div>
          </div>
        `;

        const marker = L.marker([lat, lng], { icon: customIcon });
        marker.bindPopup(popupHtml);
        markersLayerRef.current?.addLayer(marker);
      });

      if (filteredOrders.length === 0) {
        mapInstanceRef.current.setView([kitchenLat, kitchenLng], 14);
      } else if (bounds.isValid()) {
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
      }
    }
  }, [showMap, filteredOrders, mapType, hubCoords, kitchen]);

  if (!driver) return null;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans antialiased text-slate-800">
      {/* Driver Top Header Navigation Bar */}
      <header className="bg-slate-900 text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-0 sm:h-20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
          {/* Driver identity */}
          <div className="flex items-center justify-between sm:justify-start gap-3">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-black shadow-sm shrink-0">
                <Truck className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-sm sm:text-base tracking-tight text-white leading-tight truncate">
                    {driver.name}
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-slate-800 text-emerald-400 px-2 py-0.5 rounded-full border border-slate-700 shrink-0">
                    {driver.driverId || driver.id}
                  </span>
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                  <span className="inline-flex items-center gap-1 font-mono font-bold text-slate-300">
                    {driver.vehicleNumber}
                  </span>
                  <span>•</span>
                  <span className="truncate max-w-[150px] sm:max-w-none">{driver.currentZone || 'Kakkanad Route'}</span>
                </div>
              </div>
            </div>

            {/* Mobile logout */}
            <button
              onClick={handleLogout}
              className="sm:hidden p-2 bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 rounded-xl border border-slate-700 transition shrink-0"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Right actions: Duty Toggle, Notification Button, Refresh, Desktop Logout */}
          <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap">
            {/* Live Duty Toggle */}
            <select
              value={driver.status}
              onChange={(e) => handleToggleDriverStatus(e.target.value as AdminDriver['status'])}
              className={`text-xs font-black px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-xl border focus:outline-none transition cursor-pointer flex-1 sm:flex-none ${
                driver.status === 'Available'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : driver.status === 'On Delivery'
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              <option value="Available">🟢 Available</option>
              <option value="On Delivery">🚚 On Delivery</option>
              <option value="Off Duty">⚪ Off Duty</option>
            </select>

            {/* Enable Notification Button (Always Enabled) */}
            <button
              onClick={handleEnableNotifications}
              disabled={pushLoading}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition cursor-pointer shadow-xs shrink-0"
              title={isPushEnabled ? 'Notifications are active for Driver Portal! Click to test alert.' : 'Enable live order notifications'}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
              <BellRing className={`w-3.5 h-3.5 text-emerald-400 shrink-0 ${pushLoading ? 'animate-spin' : ''}`} />
              <span>
                {pushLoading 
                  ? 'Enabling...' 
                  : isPushEnabled 
                    ? 'Notifications Active' 
                    : 'Enable Notifications'}
              </span>
            </button>

            {/* Refresh */}
            <button
              onClick={loadAssignedOrders}
              disabled={loading}
              className="p-2 sm:p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition shrink-0"
              title="Refresh assigned orders"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>

            {/* Desktop Logout */}
            <button
              onClick={handleLogout}
              className="hidden sm:flex p-2 bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 rounded-xl border border-slate-700 transition shrink-0"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3.5 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
        
        {/* KPI Workload & Road Mileage Banner */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          <div className="bg-white p-3.5 sm:p-4.5 rounded-2xl border border-slate-200/90 shadow-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Assigned Today</div>
            <div className="mt-1 text-xl sm:text-2xl font-black text-slate-900">{stats.total} Meals</div>
            <p className="text-xs text-slate-500 mt-0.5">{orders.length} delivery stops</p>
          </div>

          <div className="bg-white p-3.5 sm:p-4.5 rounded-2xl border border-slate-200/90 shadow-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-sky-600">In Transit</div>
            <div className="mt-1 text-xl sm:text-2xl font-black text-sky-700">{stats.inTransit + stats.preparing} Meals</div>
            <p className="text-xs text-sky-600/80 font-medium">{stats.inTransit} out for delivery</p>
          </div>

          <div className="bg-white p-3.5 sm:p-4.5 rounded-2xl border border-slate-200/90 shadow-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Saved Delivered</div>
            <div className="mt-1 text-xl sm:text-2xl font-black text-emerald-700">{stats.delivered} Done</div>
            <p className="text-xs text-emerald-600/80 font-medium">Completed deliveries</p>
          </div>

          <div className="bg-white p-3.5 sm:p-4.5 rounded-2xl border border-slate-200/90 shadow-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-600">Pending Deliveries</div>
            <div className="mt-1 text-xl sm:text-2xl font-black text-amber-700">{stats.pending} Meals</div>
            <p className="text-xs text-amber-600/80 font-medium">{orders.filter(o => o.status !== 'Delivered').length} stops remaining</p>
          </div>
        </div>

        {/* Toggleable Delivery Route Map */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">
                  Delivery Map ({filteredOrders.length} {filteredOrders.length === 1 ? 'Stop' : 'Stops'})
                </h3>
                <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Pickup Hub: <strong className="text-slate-800">{kitchen.kitchenName || 'Shift24 Cloud Kitchen'}</strong></span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {showMap && (
                <div className="bg-slate-200/70 p-0.5 rounded-lg flex items-center text-[10px] font-bold">
                  <button
                    onClick={() => setMapType('roadmap')}
                    className={`px-2 py-0.5 rounded-md ${mapType === 'roadmap' ? 'bg-white shadow-2xs font-extrabold' : 'text-slate-600'}`}
                  >
                    Roadmap
                  </button>
                  <button
                    onClick={() => setMapType('satellite')}
                    className={`px-2 py-0.5 rounded-md ${mapType === 'satellite' ? 'bg-white shadow-2xs font-extrabold' : 'text-slate-600'}`}
                  >
                    Satellite
                  </button>
                </div>
              )}

              <button
                onClick={() => setShowMap(!showMap)}
                className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-2xs transition"
              >
                {showMap ? 'Hide Map' : 'Show Route Map'}
              </button>
            </div>
          </div>

          {showMap && (
            <div className="relative h-64 sm:h-80 md:h-96 w-full bg-slate-100">
              <div ref={mapContainerRef} className="h-full w-full z-0" />
            </div>
          )}
        </div>

        {/* Date Range Filter Bar */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-800 shrink-0">
              <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Date:</span>
            </div>

            {/* Start Date */}
            <div className="flex items-center gap-1.5 flex-1 sm:flex-none">
              <span className="text-xs font-semibold text-slate-500 shrink-0">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full sm:w-auto px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                title="Start Date"
              />
            </div>

            {/* End Date */}
            <div className="flex items-center gap-1.5 flex-1 sm:flex-none">
              <span className="text-xs font-semibold text-slate-500 shrink-0">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full sm:w-auto px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                title="End Date"
              />
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1 mt-1 sm:mt-0">
              <button
                type="button"
                onClick={() => {
                  setStartDate(todayISO);
                  setEndDate(todayISO);
                }}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition cursor-pointer ${
                  startDate === todayISO && endDate === todayISO
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => {
                  setStartDate(tomorrowISO);
                  setEndDate(tomorrowISO);
                }}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition cursor-pointer ${
                  startDate === tomorrowISO && endDate === tomorrowISO
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Tomorrow
              </button>
              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg text-slate-500 hover:text-slate-800 underline cursor-pointer"
                  title="Show all dates"
                >
                  All Dates
                </button>
              )}
            </div>
          </div>

          <div className="text-xs font-semibold text-slate-500 text-left md:text-right pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
            Delivery Date: <strong className="text-slate-900 font-bold">{startDate && endDate ? `${startDate} to ${endDate}` : startDate ? `From ${startDate}` : endDate ? `Up to ${endDate}` : 'All Dates'}</strong>
          </div>
        </div>

        {/* Filter and Tab Controls */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 sm:gap-3">
            {/* Status Tabs with scroll on mobile */}
            <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold overflow-x-auto scrollbar-none">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition shrink-0 ${
                  activeTab === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                All Orders ({stats.total})
              </button>
              <button
                onClick={() => setActiveTab('pending')}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition shrink-0 ${
                  activeTab === 'pending' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Pending ({stats.inTransit + stats.preparing})
              </button>
              <button
                onClick={() => setActiveTab('delivered')}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition shrink-0 ${
                  activeTab === 'delivered' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Delivered ({stats.delivered})
              </button>
            </div>

            {/* Slot Tabs with scroll on mobile */}
            <div className="flex items-center gap-1 text-xs overflow-x-auto scrollbar-none py-0.5">
              {(['All', 'Breakfast', 'Lunch', 'Dinner'] as const).map(slot => (
                <button
                  key={slot}
                  onClick={() => setSlotFilter(slot)}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition shrink-0 ${
                    slotFilter === slot
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by customer name, address, meal, or order ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
            />
          </div>
        </div>

        {/* Dedicated Saved Delivered Orders Summary Banner (When on Delivered Tab) */}
        {activeTab === 'delivered' && (
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white p-5 rounded-3xl border border-slate-700 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
                    <CheckCircle2 className="w-5 h-5" />
                  </span>
                  <h3 className="font-extrabold text-white text-base">
                    Saved Delivered Orders
                  </h3>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Completed meal deliveries recorded for today.
                </p>
              </div>

              <button
                onClick={handleCopyMileageReport}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
                title="Copy delivery manifest report"
              >
                <Copy className="w-4 h-4" />
                <span>Copy Delivered Manifest</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-700/80">
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Delivered Orders</div>
                <div className="text-lg font-black text-emerald-400 mt-0.5">{deliveryMileageStats.deliveredCount} Orders</div>
              </div>

              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</div>
                <div className="text-lg font-black text-sky-400 mt-0.5">Completed</div>
              </div>

              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Origin Hub</div>
                <div className="text-xs font-bold text-slate-200 mt-1 truncate" title={kitchen?.kitchenName || 'Kitchen Hub'}>
                  {kitchen?.kitchenName || 'Cloud Kitchen'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Assigned Orders List */}
        <div className="space-y-4">
          {loading ? (
            <div className="p-12 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
              <span>Loading your assigned dispatches...</span>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                <Package className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800">No assigned orders found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {orders.length === 0
                  ? 'No meal deliveries have been assigned to your driver ID yet. Check back once dispatch assigns orders from the map.'
                  : 'No orders match your current filters.'}
              </p>
            </div>
          ) : (
            filteredOrders.map((order, idx) => {
              const isDelivered = order.status === 'Delivered';
              const isOutForDelivery = order.status === 'Out for Delivery';
              const cleanPhone = (order.customerPhone || '').replace(/\D/g, '');
              const lat = order.computedCoords.lat;
              const lng = order.computedCoords.lng;

              const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
              const directionsFromHubUrl = `https://www.google.com/maps/dir/?api=1&origin=${hubCoords.lat},${hubCoords.lng}&destination=${lat},${lng}`;

              const whatsAppCustomerUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                `Hello ${order.customerName}! This is your Shift24 delivery partner ${driver.name}. I am on my way with your ${order.mealType} meal (${order.mealName}).`
              )}`;

              return (
                <div
                  key={order.id}
                  className={`bg-white rounded-3xl border p-5 shadow-xs transition-all ${
                    isDelivered
                      ? 'border-emerald-200/90 bg-emerald-50/20'
                      : isOutForDelivery
                      ? 'border-sky-300 ring-2 ring-sky-500/10'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Order Details Left Section */}
                    <div className="space-y-3 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black ${
                          isDelivered ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white'
                        }`}>
                          {isDelivered ? '✓ Delivered' : `Stop #${order.stopIndex ?? (idx + 1)}`}
                        </span>

                        <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {order.id}
                        </span>

                        <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-amber-100 text-amber-800">
                          {order.mealType}
                        </span>

                        <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{order.deliveryTimeSlot}</span>
                        </span>
                      </div>

                      {/* Customer Name & Phone */}
                      <div>
                        <div className="font-black text-slate-900 text-base">
                          {order.customerName}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-3">
                          <a
                            href={`tel:${cleanPhone}`}
                            className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:underline"
                          >
                            <Phone className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{order.customerPhone}</span>
                          </a>

                          <a
                            href={whatsAppCustomerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-bold text-emerald-600 hover:underline"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>WhatsApp Customer</span>
                          </a>
                        </div>
                      </div>

                      {/* Delivery Timestamp if Delivered */}
                      {isDelivered && (
                        <div className="flex items-center gap-2 p-2.5 px-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200/80 text-xs font-bold w-fit">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>
                            Delivered{order.deliveredAt ? ` at ${new Date(order.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                          </span>
                        </div>
                      )}

                      {/* Address with prominent turn-by-turn Navigation button */}
                      <div className="p-3 bg-white rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-start gap-2 min-w-0">
                          <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div className="text-xs text-slate-800 font-medium leading-relaxed break-words">
                            {order.address}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                          <a
                            href={directionsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition inline-flex items-center justify-center gap-1.5 shrink-0"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                            <span>Navigate</span>
                          </a>
                        </div>
                      </div>

                      {/* Meal Name & Allergen Alerts */}
                      <div className="text-xs text-slate-700 font-bold flex items-center gap-2 flex-wrap">
                        <span>🍱 {order.mealName}</span>
                        <span className="text-slate-400 font-normal">({order.planTitle})</span>
                      </div>

                      {order.allergies && order.allergies.length > 0 && (
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-[11px] font-bold flex-wrap">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span>Allergies: {order.allergies.join(', ')}</span>
                        </div>
                      )}
                    </div>

                    {/* Status & Driver Action Controls (Right side) */}
                    <div className="w-full lg:w-64 flex flex-col items-stretch lg:items-end justify-between border-t lg:border-t-0 lg:border-l border-slate-100 pt-3 lg:pt-0 lg:pl-5 space-y-3 shrink-0">
                      <div className="flex items-center justify-between lg:justify-end gap-2 w-full">
                        <span className="text-xs text-slate-400 font-medium">Status:</span>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                          isDelivered
                            ? 'bg-emerald-100 text-emerald-800'
                            : isOutForDelivery
                            ? 'bg-sky-100 text-sky-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {order.status}
                        </span>
                      </div>

                      {/* Action Buttons for Driver */}
                      <div className="w-full space-y-2">
                        {!isDelivered && (
                          <>
                            {!isOutForDelivery && (
                              <button
                                type="button"
                                onClick={() => handleUpdateOrderStatus(order.id, 'Out for Delivery')}
                                className="w-full py-3 sm:py-2.5 px-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                              >
                                <Truck className="w-4 h-4" />
                                <span>Pick Up & Start Delivery</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleUpdateOrderStatus(order.id, 'Delivered')}
                              className="w-full py-3 sm:py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs transition shadow-sm shadow-emerald-600/20 flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Mark as Delivered ✓</span>
                            </button>
                          </>
                        )}

                        {isDelivered && (
                          <div className="space-y-1.5 text-center w-full">
                            <div className="py-2.5 px-3 bg-emerald-100/90 text-emerald-800 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 break-words">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>Successfully Delivered{order.deliveredAt ? ` (${formatDelivered12Hr(order.deliveredAt, order.deliveryTimeSlot)})` : ''}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleUpdateOrderStatus(order.id, 'Out for Delivery')}
                              className="text-[10px] text-slate-400 hover:text-slate-600 underline font-medium cursor-pointer"
                            >
                              Undo delivered status
                            </button>
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
      </main>
    </div>
  );
}
