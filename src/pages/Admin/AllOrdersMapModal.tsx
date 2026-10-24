import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  MapPin, 
  Check, 
  X, 
  Loader2, 
  Share2, 
  Coffee, 
  Sun, 
  Moon,
  Crosshair,
  Truck,
  UserCheck,
  ChevronRight,
  ChevronLeft,
  Navigation,
  MessageCircle,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Phone,
  Zap,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Bike,
  Car,
  Route as RouteIcon,
  RotateCw,
  Save,
  Compass,
  Eye,
  Layers,
  ListOrdered
} from 'lucide-react';
import L from 'leaflet';
import toast from 'react-hot-toast';
import { 
  AdminOrder, 
  AdminDriver,
  formatDelivered12Hr,
  getAdminSubscriptions, 
  getAdminCustomers,
  getAdminDrivers,
  saveAdminDrivers,
  assignDriverToOrdersLocally,
  saveAdminOrders,
  getAdminOrders,
  getAdminKitchenSettings
} from './adminData';
import { geocodeWithGoogleOrOSM } from '../../utils/googleMaps';
import { 
  fetchSubscriptions, 
  fetchDrivers, 
  bulkAssignDriverToBackendOrders,
} from '../../services/api';
import {
  calculateDistanceKm,
  formatDistance,
  getRoadDistanceKm,
  DRIVER_ROUTE_COLORS
} from '../../utils/routeOptimizer';

export interface AllOrdersMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: AdminOrder[];
  initialSlotFilter?: 'All' | 'Breakfast' | 'Lunch' | 'Dinner';
  onOrdersUpdated?: () => void;
}

export interface PlottedCustomerLocation {
  customerKey: string;
  customerName: string;
  customerPhone: string;
  address: string;
  lat: number;
  lng: number;
  source: 'gps' | 'sub' | 'cust' | 'geocoded' | 'hub';
  markerIndex: number;
  orders: AdminOrder[];
  allSlotTypes: ('Breakfast' | 'Lunch' | 'Dinner')[];
  totalAmount: number;
  allergies: string[];
  assignedDriverId?: string;
  assignedDriverName?: string;
  assignedDriverPhone?: string;
  assignedDriverVehicle?: string;
  stopIndex?: number;
  distanceFromHub?: number;
  distanceFromPrevOrder?: number;
  durationFromPrev?: number;
}

export function AllOrdersMapModal({
  isOpen,
  onClose,
  orders,
  initialSlotFilter = 'All',
  onOrdersUpdated
}: AllOrdersMapModalProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const markerMapRef = useRef<Map<string, L.Marker>>(new Map());
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const activeCustomerKeyRef = useRef<string | null>(null);
  const hasInitialFittedRef = useRef<boolean>(false);

  const [slotFilter, setSlotFilter] = useState<'All' | 'Breakfast' | 'Lunch' | 'Dinner'>(initialSlotFilter);
  const [driverFilter, setDriverFilter] = useState<string>('All');
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);
  const [plottedCustomers, setPlottedCustomers] = useState<PlottedCustomerLocation[]>([]);
  const [copiedManifest, setCopiedManifest] = useState<boolean>(false);



  // Drivers fleet state
  const [drivers, setDrivers] = useState<AdminDriver[]>(() => getAdminDrivers());
  
  // Selected customer for the floating dispatch inspection sheet
  const [selectedCustomerKey, setSelectedCustomerKey] = useState<string | null>(null);
  const [selectedDriverForCustomer, setSelectedDriverForCustomer] = useState<string>('');

  // Bulk assign modal state
  const [bulkAssignModalOpen, setBulkAssignModalOpen] = useState(false);
  const [bulkAssignDriverId, setBulkAssignDriverId] = useState<string>('');
  const [bulkAssigning, setBulkAssigning] = useState(false);

  // Sync initial slot filter and load drivers
  useEffect(() => {
    if (isOpen) {
      setSlotFilter(initialSlotFilter);
      hasInitialFittedRef.current = false;
      activeCustomerKeyRef.current = null;
      setSelectedCustomerKey(null);

      // Load drivers from backend or fallback to local
      const loadFleetDrivers = async () => {
        try {
          const res = await fetchDrivers();
          if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
            setDrivers(res.data);
            saveAdminDrivers(res.data);
          } else {
            setDrivers(getAdminDrivers());
          }
        } catch {
          setDrivers(getAdminDrivers());
        }
      };
      loadFleetDrivers();
    }
  }, [isOpen, initialSlotFilter]);

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (selectedCustomerKey) {
          setSelectedCustomerKey(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, selectedCustomerKey]);

  // Group orders by customer and resolve accurate coordinates
  useEffect(() => {
    if (!isOpen || !orders || orders.length === 0) {
      setPlottedCustomers([]);
      return;
    }

    let isCancelled = false;

    // 1. Group orders by unique customer delivery location (Phone or Name+Address)
    const customerGroups = new Map<string, {
      customerKey: string;
      customerName: string;
      customerPhone: string;
      address: string;
      coordinates?: { lat: number; lng: number };
      orders: AdminOrder[];
      subscriptionId?: string;
    }>();

    for (const order of orders) {
      const cleanPhone = (order.customerPhone || '').replace(/\D/g, '');
      const cleanAddress = (order.address || '').trim().toLowerCase();
      const key = cleanPhone || `${order.customerName.toLowerCase().trim()}|${cleanAddress}`;

      const oLat = typeof order.latitude === 'number' && !isNaN(order.latitude) 
        ? order.latitude 
        : (order.coordinates?.lat && !isNaN(Number(order.coordinates.lat)) ? Number(order.coordinates.lat) : undefined);
      const oLng = typeof order.longitude === 'number' && !isNaN(order.longitude) 
        ? order.longitude 
        : (order.coordinates?.lng && !isNaN(Number(order.coordinates.lng)) ? Number(order.coordinates.lng) : undefined);

      const existing = customerGroups.get(key);
      if (existing) {
        existing.orders.push(order);
        if ((!existing.coordinates || !existing.coordinates.lat) && typeof oLat === 'number' && typeof oLng === 'number') {
          existing.coordinates = { lat: oLat, lng: oLng };
        }
        if (!existing.subscriptionId && order.subscriptionId) {
          existing.subscriptionId = order.subscriptionId;
        }
      } else {
        customerGroups.set(key, {
          customerKey: key,
          customerName: order.customerName || 'Customer',
          customerPhone: order.customerPhone || '',
          address: order.address || '',
          coordinates: (typeof oLat === 'number' && typeof oLng === 'number') ? { lat: oLat, lng: oLng } : undefined,
          orders: [order],
          subscriptionId: order.subscriptionId
        });
      }
    }

    // 2. Resolve accurate coordinates for each unique customer location
    const resolveUniqueCustomerLocations = async () => {
      setIsGeocoding(true);

      let subs = getAdminSubscriptions();
      let custs = getAdminCustomers();

      if (subs.length === 0) {
        try {
          const subRes = await fetchSubscriptions();
          if (subRes && subRes.success && Array.isArray(subRes.data)) {
            subs = subRes.data;
          }
        } catch {}
      }

      const uniqueList = Array.from(customerGroups.values());
      const resolvedLocations: PlottedCustomerLocation[] = [];

      for (let i = 0; i < uniqueList.length; i++) {
        if (isCancelled) break;
        const custGroup = uniqueList[i];

        let lat: number | null = null;
        let lng: number | null = null;
        let source: PlottedCustomerLocation['source'] = 'hub';

        // 1. Authoritative Source: Customer's saved subscription coordinates
        if (custGroup.subscriptionId) {
          const matchSub = subs.find(s => s.id === custGroup.subscriptionId || (s as any).subId === custGroup.subscriptionId);
          if (matchSub) {
            const sLat = typeof matchSub.latitude === 'number' && !isNaN(matchSub.latitude) ? matchSub.latitude : matchSub.coordinates?.lat;
            const sLng = typeof matchSub.longitude === 'number' && !isNaN(matchSub.longitude) ? matchSub.longitude : matchSub.coordinates?.lng;
            if (typeof sLat === 'number' && typeof sLng === 'number' && !isNaN(sLat) && !isNaN(sLng)) {
              lat = sLat;
              lng = sLng;
              source = 'sub';
            }
          }
        }

        // 2. Direct coordinates on any of the customer's orders
        if (!lat || !lng) {
          if (custGroup.coordinates?.lat && custGroup.coordinates?.lng) {
            lat = custGroup.coordinates.lat;
            lng = custGroup.coordinates.lng;
            source = 'gps';
          } else {
            for (const ord of custGroup.orders) {
              const ordLat = typeof ord.latitude === 'number' && !isNaN(ord.latitude) ? ord.latitude : ord.coordinates?.lat;
              const ordLng = typeof ord.longitude === 'number' && !isNaN(ord.longitude) ? ord.longitude : ord.coordinates?.lng;
              if (typeof ordLat === 'number' && typeof ordLng === 'number' && !isNaN(ordLat) && !isNaN(ordLng)) {
                lat = ordLat;
                lng = ordLng;
                source = 'gps';
                break;
              }
            }
          }
        }

        // 3. From matching customer profile
        if (!lat || !lng) {
          const matchCust = custs.find(c => 
            (custGroup.customerPhone && c.phone && c.phone.replace(/\D/g, '') === custGroup.customerPhone.replace(/\D/g, '')) ||
            (c.name && c.name.toLowerCase().trim() === custGroup.customerName.toLowerCase().trim())
          );
          if (matchCust) {
            const cLat = typeof matchCust.latitude === 'number' && !isNaN(matchCust.latitude) ? matchCust.latitude : matchCust.coordinates?.lat;
            const cLng = typeof matchCust.longitude === 'number' && !isNaN(matchCust.longitude) ? matchCust.longitude : matchCust.coordinates?.lng;
            if (typeof cLat === 'number' && typeof cLng === 'number' && !isNaN(cLat) && !isNaN(cLng)) {
              lat = cLat;
              lng = cLng;
              source = 'cust';
            }
          }
        }

        // 4. Geocode address via dedicated backend / Google Geocoder
        if (!lat || !lng) {
          const address = custGroup.address.trim();
          if (address && address !== 'Address on file' && address !== 'Address not provided') {
            const geo = await geocodeWithGoogleOrOSM(address);
            if (geo?.lat && geo?.lng) {
              lat = geo.lat;
              lng = geo.lng;
              source = 'geocoded';
            }
          }
        }

        // 5. Fallback center (Edachira / Kakkanad Hub in Kochi)
        if (!lat || !lng) {
          lat = 10.0167;
          lng = 76.3692;
          source = 'hub';
        }

        // Aggregate slots, amount, allergies, and assigned driver
        const allSlotTypes = Array.from(new Set(custGroup.orders.map(o => o.mealType))) as ('Breakfast' | 'Lunch' | 'Dinner')[];
        const totalAmount = custGroup.orders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
        const allAllergies = Array.from(new Set(custGroup.orders.flatMap(o => o.allergies || [])));

        // Extract assigned driver info from orders
        const assignedOrder = custGroup.orders.find(o => Boolean(o.driverId || o.driverName));
        const assignedDriverId = assignedOrder?.driverId;
        const assignedDriverName = assignedOrder?.driverName;
        const assignedDriverPhone = assignedOrder?.driverPhone;
        const assignedDriverVehicle = assignedOrder?.driverVehicle;

        // Extract any existing route sequencing saved on orders
        const existingStopIndex = custGroup.orders.find(o => typeof o.stopIndex === 'number')?.stopIndex;
        const existingDistFromHub = custGroup.orders.find(o => typeof o.distanceFromHub === 'number')?.distanceFromHub;
        const existingDistFromPrev = custGroup.orders.find(o => typeof o.distanceFromPrevOrder === 'number')?.distanceFromPrevOrder;

        resolvedLocations.push({
          customerKey: custGroup.customerKey,
          customerName: custGroup.customerName,
          customerPhone: custGroup.customerPhone,
          address: custGroup.address,
          lat,
          lng,
          source,
          markerIndex: i + 1,
          orders: custGroup.orders,
          allSlotTypes,
          totalAmount,
          allergies: allAllergies,
          assignedDriverId,
          assignedDriverName,
          assignedDriverPhone,
          assignedDriverVehicle,
          stopIndex: existingStopIndex,
          distanceFromHub: existingDistFromHub,
          distanceFromPrevOrder: existingDistFromPrev
        });
      }

      if (!isCancelled) {
        setPlottedCustomers(resolvedLocations);
        setIsGeocoding(false);
      }
    };

    resolveUniqueCustomerLocations();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, orders]);

  // Filter plotted customer locations based on selected slot AND driver filter
  const filteredCustomers = useMemo(() => {
    return plottedCustomers.filter(item => {
      // 1. Slot filter
      const matchesSlot = slotFilter === 'All' || item.allSlotTypes.includes(slotFilter);
      if (!matchesSlot) return false;

      // 2. Driver filter
      if (driverFilter === 'All') return true;
      if (driverFilter === 'Delivered') {
        const relevantOrders = slotFilter === 'All'
          ? item.orders
          : item.orders.filter(o => o.mealType === slotFilter);
        return relevantOrders.length > 0 && relevantOrders.some(o => o.status === 'Delivered');
      }
      if (driverFilter === 'Unassigned') {
        return !item.assignedDriverId && !item.assignedDriverName;
      }
      return item.assignedDriverId === driverFilter;
    });
  }, [plottedCustomers, slotFilter, driverFilter]);

  // Selected customer object currently inspected
  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerKey) return null;
    return plottedCustomers.find(c => c.customerKey === selectedCustomerKey) || null;
  }, [selectedCustomerKey, plottedCustomers]);

  // Update selectedDriverForCustomer when selectedCustomer changes
  useEffect(() => {
    if (selectedCustomer) {
      setSelectedDriverForCustomer(selectedCustomer.assignedDriverId || '');
    } else {
      setSelectedDriverForCustomer('');
    }
  }, [selectedCustomer]);



  // Counts
  const breakfastCustCount = plottedCustomers.filter(c => c.allSlotTypes.includes('Breakfast')).length;
  const lunchCustCount = plottedCustomers.filter(c => c.allSlotTypes.includes('Lunch')).length;
  const dinnerCustCount = plottedCustomers.filter(c => c.allSlotTypes.includes('Dinner')).length;
  const totalMealsCount = filteredCustomers.reduce((acc, c) => acc + c.orders.length, 0);
  const unassignedCount = filteredCustomers.filter(c => !c.assignedDriverId && !c.assignedDriverName).length;
  const deliveredStopsCount = useMemo(() => {
    return plottedCustomers.filter(c => {
      const relevant = slotFilter === 'All' ? c.orders : c.orders.filter(o => o.mealType === slotFilter);
      return relevant.some(o => o.status === 'Delivered');
    }).length;
  }, [plottedCustomers, slotFilter]);
  const deliveredMealsCount = useMemo(() => {
    return filteredCustomers.reduce((acc, c) => {
      const relevant = slotFilter === 'All' ? c.orders : c.orders.filter(o => o.mealType === slotFilter);
      return acc + relevant.filter(o => o.status === 'Delivered').length;
    }, 0);
  }, [filteredCustomers, slotFilter]);

  // Google Maps Tile URL
  const lyrs = mapType === 'satellite' ? 'y' : 'm';
  const googleTileUrl = `https://mt{s}.google.com/vt/lyrs=${lyrs}&x={x}&y={y}&z={z}`;

  // Assign Driver to a customer location (all active orders at this stop)
  const handleAssignDriverToStop = async (customerKey: string, driverId: string) => {
    const cust = plottedCustomers.find(c => c.customerKey === customerKey);
    if (!cust) return;

    const targetDriver = driverId === '__UNASSIGN__' || !driverId 
      ? null 
      : drivers.find(d => (d.driverId || d.id) === driverId) || null;

    // Filter relevant orders at this stop
    const relevantOrders = slotFilter === 'All'
      ? cust.orders
      : cust.orders.filter(o => o.mealType === slotFilter);
    const orderIds = relevantOrders.map(o => o.id);

    if (orderIds.length === 0) {
      toast.error('No orders at this stop to assign');
      return;
    }

    try {
      // 1. Update backend
      try {
        await bulkAssignDriverToBackendOrders(orderIds, {
          driverId: targetDriver ? (targetDriver.driverId || targetDriver.id) : '',
          driverName: targetDriver?.name || '',
          driverPhone: targetDriver?.phone || '',
          driverVehicle: targetDriver ? `${targetDriver.vehicleType} (${targetDriver.vehicleNumber})` : '',
          updateStatusToOutForDelivery: true
        });
      } catch (beErr) {
        console.warn('Backend bulk assign error:', beErr);
      }

      // 2. Update local storage orders
      assignDriverToOrdersLocally(orderIds, targetDriver, true);

      // 3. Update plottedCustomers state in place
      setPlottedCustomers(prev => prev.map(p => {
        if (p.customerKey === customerKey) {
          const updatedOrders = p.orders.map(o => {
            if (orderIds.includes(o.id)) {
              if (targetDriver) {
                return {
                  ...o,
                  driverId: targetDriver.driverId || targetDriver.id,
                  driverName: targetDriver.name,
                  driverPhone: targetDriver.phone,
                  driverVehicle: `${targetDriver.vehicleType} (${targetDriver.vehicleNumber})`,
                  status: (o.status === 'Preparing' || o.status === 'Pending') ? 'Out for Delivery' as const : o.status
                };
              } else {
                const copy: any = { ...o };
                delete copy.driverId;
                delete copy.driverName;
                delete copy.driverPhone;
                delete copy.driverVehicle;
                return copy;
              }
            }
            return o;
          });

          return {
            ...p,
            orders: updatedOrders,
            assignedDriverId: targetDriver ? (targetDriver.driverId || targetDriver.id) : undefined,
            assignedDriverName: targetDriver?.name,
            assignedDriverPhone: targetDriver?.phone,
            assignedDriverVehicle: targetDriver ? `${targetDriver.vehicleType} (${targetDriver.vehicleNumber})` : undefined
          };
        }
        return p;
      }));

      if (targetDriver) {
        toast.success(`Assigned ${cust.customerName} (${orderIds.length} meals) to ${targetDriver.name}!`);
      } else {
        toast.success(`Unassigned driver from ${cust.customerName}`);
      }

      // Notify parent AdminOrders
      onOrdersUpdated?.();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to assign driver');
    }
  };

  // Assign Driver to a SINGLE MEAL order
  const handleAssignSingleMeal = async (orderId: string, driverId: string, customerKey?: string) => {
    const targetDriver = driverId === '__UNASSIGN__' || !driverId 
      ? null 
      : drivers.find(d => (d.driverId || d.id) === driverId) || null;

    try {
      try {
        await bulkAssignDriverToBackendOrders([orderId], {
          driverId: targetDriver ? (targetDriver.driverId || targetDriver.id) : '',
          driverName: targetDriver?.name || '',
          driverPhone: targetDriver?.phone || '',
          driverVehicle: targetDriver ? `${targetDriver.vehicleType} (${targetDriver.vehicleNumber})` : '',
          updateStatusToOutForDelivery: true
        });
      } catch (beErr) {
        console.warn('Backend single meal assign error:', beErr);
      }

      assignDriverToOrdersLocally([orderId], targetDriver, true);

      // Update plottedCustomers state in place
      setPlottedCustomers(prev => prev.map(p => {
        const hasOrder = p.orders.some(o => o.id === orderId);
        if (hasOrder) {
          const updatedOrders = p.orders.map(o => {
            if (o.id === orderId) {
              if (targetDriver) {
                return {
                  ...o,
                  driverId: targetDriver.driverId || targetDriver.id,
                  driverName: targetDriver.name,
                  driverPhone: targetDriver.phone,
                  driverVehicle: `${targetDriver.vehicleType} (${targetDriver.vehicleNumber})`,
                  status: (o.status === 'Preparing' || o.status === 'Pending') ? 'Out for Delivery' as const : o.status
                };
              } else {
                const copy: any = { ...o };
                delete copy.driverId;
                delete copy.driverName;
                delete copy.driverPhone;
                delete copy.driverVehicle;
                return copy;
              }
            }
            return o;
          });

          // Check if any order at this stop has a driver assigned
          const anyAssigned = updatedOrders.find(o => Boolean(o.driverId || o.driverName));

          return {
            ...p,
            orders: updatedOrders,
            assignedDriverId: anyAssigned?.driverId,
            assignedDriverName: anyAssigned?.driverName,
            assignedDriverPhone: anyAssigned?.driverPhone,
            assignedDriverVehicle: anyAssigned?.driverVehicle
          };
        }
        return p;
      }));

      const matchingOrder = orders.find(o => o.id === orderId);
      const mealName = matchingOrder ? `${matchingOrder.mealType} (${matchingOrder.mealName})` : orderId;

      if (targetDriver) {
        toast.success(`Assigned single meal ${mealName} to ${targetDriver.name}!`);
      } else {
        toast.success(`Unassigned single meal ${mealName}`);
      }

      // Notify parent AdminOrders
      onOrdersUpdated?.();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to assign single meal');
    }
  };

  // Expose global callbacks for Leaflet popup inline HTML select
  useEffect(() => {
    (window as any).__shift24AssignStopDriver = (customerKey: string, driverId: string) => {
      handleAssignDriverToStop(customerKey, driverId);
    };

    (window as any).__shift24AssignSingleMeal = (orderId: string, driverId: string, customerKey?: string) => {
      handleAssignSingleMeal(orderId, driverId, customerKey);
    };

    return () => {
      delete (window as any).__shift24AssignStopDriver;
      delete (window as any).__shift24AssignSingleMeal;
    };
  });

  // Initialize Leaflet Map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [10.0167, 76.3692],
        zoom: 14,
        zoomControl: true,
        scrollWheelZoom: true
      });

      const tileLayer = L.tileLayer(googleTileUrl, {
        subdomains: ['0', '1', '2', '3'],
        maxZoom: 20,
        attribution: '&copy; Google Maps'
      }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      tileLayerRef.current = tileLayer;
      mapInstanceRef.current = map;

      // Click outside marker deselects customer panel
      map.on('click', () => {
        // keep open unless explicitly closed
      });

      setTimeout(() => {
        map.invalidateSize();
      }, 300);
    } else {
      if (tileLayerRef.current) {
        tileLayerRef.current.setUrl(googleTileUrl);
      }
    }
  }, [isOpen, googleTileUrl]);

  // Render ONE PIN per customer location & update tooltips simultaneously on changes
  useEffect(() => {
    if (!isOpen || !mapInstanceRef.current || !markersLayerRef.current) return;

    const markersGroup = markersLayerRef.current;
    const currentKeys = new Set(filteredCustomers.map(c => c.customerKey));

    // Remove obsolete markers
    markerMapRef.current.forEach((marker, key) => {
      if (!currentKeys.has(key)) {
        markersGroup.removeLayer(marker);
        markerMapRef.current.delete(key);
        if (activeCustomerKeyRef.current === key) {
          activeCustomerKeyRef.current = null;
        }
      }
    });

    const bounds = L.latLngBounds([]);
    const targetKey = activeCustomerKeyRef.current;

    // Plot Central Cloud Kitchen Hub Pin
    const kitchenConfig = getAdminKitchenSettings();
    if (kitchenConfig && !isNaN(kitchenConfig.latitude) && !isNaN(kitchenConfig.longitude)) {
      bounds.extend([kitchenConfig.latitude, kitchenConfig.longitude]);
      const kitchenIcon = L.divIcon({
        className: 'cloud-kitchen-marker',
        html: `
          <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            <div style="position: relative; width: 36px; height: 36px; border-radius: 50%; background: #0f172a; border: 2.5px solid #10b981; box-shadow: 0 4px 12px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: white;">
              <span style="font-size: 16px; line-height: 1;">👨‍🍳</span>
            </div>
            <div style="position: absolute; bottom: -3px; background: #059669; color: white; font-size: 8px; font-weight: 900; padding: 1px 4.5px; border-radius: 9999px; border: 1.5px solid white; white-space: nowrap;">
              HUB
            </div>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
        popupAnchor: [0, -22]
      });

      const kitchenMarker = L.marker([kitchenConfig.latitude, kitchenConfig.longitude], {
        icon: kitchenIcon,
        zIndexOffset: 1000
      }).bindPopup(`
        <div style="font-family: system-ui, sans-serif; font-size: 12px; min-width: 200px;">
          <div style="font-weight: 900; color: #0f172a; font-size: 13px;">${kitchenConfig.kitchenName}</div>
          <div style="color: #059669; font-weight: 800; font-size: 11px;">⭐ Central Dispatch Hub</div>
          <div style="color: #475569; font-size: 11px; margin-top: 3px;">📍 ${kitchenConfig.address}</div>
          <div style="color: #64748b; font-size: 10px; margin-top: 2px;">📞 ${kitchenConfig.phone} • ✉️ ${kitchenConfig.email}</div>
          <div style="font-family: monospace; font-size: 10px; color: #0284c7; margin-top: 4px; background: #e0f2fe; padding: 2px 6px; border-radius: 4px; display: inline-block;">
            Lat: ${kitchenConfig.latitude.toFixed(5)}, Lng: ${kitchenConfig.longitude.toFixed(5)}
          </div>
        </div>
      `);
      markersLayerRef.current.addLayer(kitchenMarker);
    }

    filteredCustomers.forEach((item, index) => {
      const { lat, lng } = item;
      bounds.extend([lat, lng]);

      const displayOrders = slotFilter === 'All'
        ? item.orders
        : item.orders.filter(o => o.mealType === slotFilter);

      const otherSlots = slotFilter === 'All'
        ? []
        : item.allSlotTypes.filter(s => s !== slotFilter);

      // Check delivery statuses
      const isDelivered = displayOrders.length > 0 && displayOrders.every(o => o.status === 'Delivered');
      const isPartiallyDelivered = !isDelivered && displayOrders.some(o => o.status === 'Delivered');
      const deliveredCount = displayOrders.filter(o => o.status === 'Delivered').length;

      // Pin Color: If delivered, rich emerald green; if driver assigned, match route color
      const driverIdx = item.assignedDriverId ? drivers.findIndex(d => (d.driverId || d.id) === item.assignedDriverId) : -1;
      let pinBg = '#00875a'; // Deep Green

      if (isDelivered) {
        pinBg = '#059669'; // Delivered Emerald Green
      } else if (driverIdx >= 0) {
        pinBg = DRIVER_ROUTE_COLORS[driverIdx % DRIVER_ROUTE_COLORS.length].stroke;
      } else if (slotFilter === 'Breakfast') pinBg = '#d97706';
      else if (slotFilter === 'Lunch') pinBg = '#ea580c';
      else if (slotFilter === 'Dinner') pinBg = '#4f46e5';

      const pinText = typeof item.stopIndex === 'number' ? `#${item.stopIndex}` : `#${index + 1}`;
      const mealCount = displayOrders.length;
      const isAssigned = Boolean(item.assignedDriverId || item.assignedDriverName);

      // Circular Google Maps Pin with Tick Mark for Delivered Orders
      const customIcon = L.divIcon({
        className: 'google-customer-pin',
        html: `
          <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            <!-- Ping Ripple Animation -->
            <div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: ${isDelivered ? 'rgba(5, 150, 105, 0.35)' : isAssigned ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.28)'}; animation: ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite; pointer-events: none;"></div>
            
            <!-- Central Round Marker Pin with Tick Mark -->
            <div style="position: relative; width: 36px; height: 36px; border-radius: 50%; background: ${pinBg}; border: ${isDelivered ? '2.5px solid #ffffff' : isAssigned ? '2.5px solid #ffffff' : '2.5px dashed #fef08a'}; box-shadow: ${isDelivered ? '0 4px 12px rgba(5, 150, 105, 0.5)' : '0 4px 12px rgba(0,0,0,0.35)'}; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; pointer-events: auto;">
              ${isDelivered ? `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1;">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span style="font-size: 8px; font-weight: 900; line-height: 1; color: #ecfdf5; margin-top: 1px; font-family: system-ui, sans-serif;">${pinText}</span>
                </div>
              ` : isPartiallyDelivered ? `
                <div style="display: flex; align-items: center; justify-content: center; gap: 1px; line-height: 1;">
                  <span style="font-size: 10px; font-weight: 900; font-family: system-ui, sans-serif;">${pinText}</span>
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#86efac" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <span style="font-size: 7px; font-weight: 800; line-height: 1; color: #86efac; margin-top: 1px;">${deliveredCount}/${mealCount}</span>
              ` : `
                <span style="font-size: 11px; font-weight: 900; line-height: 1; font-family: system-ui, sans-serif;">${pinText}</span>
              `}
            </div>

            <!-- Top-Right Meal Count Badge -->
            ${mealCount > 1 ? `
              <div style="position: absolute; top: -3px; right: -3px; background: #0f172a; color: #38bdf8; font-size: 9px; font-weight: 900; padding: 1px 4.5px; border-radius: 9999px; border: 1.5px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2); pointer-events: none;">
                ${mealCount}
              </div>
            ` : ''}

            <!-- Bottom-Right Status / Tick Mark Badge -->
            ${isDelivered ? `
              <div style="position: absolute; bottom: -3px; right: -3px; background: #059669; color: white; width: 17px; height: 17px; border-radius: 50%; border: 1.5px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; pointer-events: none;" title="Order Delivered">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
            ` : isAssigned ? `
              <div style="position: absolute; bottom: -3px; right: -3px; background: #059669; color: white; font-size: 8px; font-weight: 900; padding: 1.5px 3.5px; border-radius: 9999px; border: 1.5px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.25); pointer-events: none;" title="Driver Assigned: ${item.assignedDriverName}">
                🚚
              </div>
            ` : `
              <div style="position: absolute; bottom: -3px; right: -3px; background: #d97706; color: white; font-size: 8px; font-weight: 900; padding: 1.5px 3.5px; border-radius: 9999px; border: 1.5px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.25); pointer-events: none;" title="Unassigned Driver">
                ⚠️
              </div>
            `}
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
        popupAnchor: [0, -22]
      });

      // Build meals HTML with Single Meal Driver Assignment
      const mealsHtml = displayOrders.map(order => {
        let slotBadgeBg = '#f1f5f9';
        let slotColor = '#334155';
        let slotEmoji = '🍽️';

        if (order.mealType === 'Breakfast') {
          slotBadgeBg = '#fef3c7';
          slotColor = '#92400e';
          slotEmoji = '☕';
        } else if (order.mealType === 'Lunch') {
          slotBadgeBg = '#ffedd5';
          slotColor = '#9a3412';
          slotEmoji = '☀️';
        } else if (order.mealType === 'Dinner') {
          slotBadgeBg = '#e0e7ff';
          slotColor = '#3730a3';
          slotEmoji = '🌙';
        }

        let statusBg = '#f1f5f9';
        let statusColor = '#475569';
        if (order.status === 'Delivered') {
          statusBg = '#ecfdf5';
          statusColor = '#047857';
        } else if (order.status === 'Out for Delivery') {
          statusBg = '#f0f9ff';
          statusColor = '#0369a1';
        } else if (order.status === 'Preparing') {
          statusBg = '#fffbeb';
          statusColor = '#b45309';
        }

        const mealDriverAssigned = Boolean(order.driverId || order.driverName);
        const singleMealDriverOptionsHtml = drivers.map(d => {
          const dId = d.driverId || d.id;
          const selected = order.driverId === dId ? 'selected' : '';
          return `<option value="${dId}" ${selected}>🚚 ${d.name} (${d.vehicleNumber})</option>`;
        }).join('');

        return `
          <div style="margin-top: 6px; padding: 7px 8px; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 3px;">
              <span style="background: ${slotBadgeBg}; color: ${slotColor}; font-weight: 800; font-size: 10px; padding: 2px 6px; border-radius: 6px;">
                ${slotEmoji} ${order.mealType} (${order.deliveryTimeSlot})
              </span>
              <span style="font-size: 10px; font-weight: 700; color: ${statusColor}; background: ${statusBg}; padding: 1.5px 5px; border-radius: 5px; border: ${order.status === 'Delivered' ? '1px solid #a7f3d0' : 'none'};">
                ${order.status === 'Delivered' ? `✓ Delivered${formatDelivered12Hr(order.deliveredAt, order.deliveryTimeSlot, order.mealType) ? ` (${formatDelivered12Hr(order.deliveredAt, order.deliveryTimeSlot, order.mealType)})` : ''}` : order.status}
              </span>
            </div>
            <div style="font-weight: 700; color: #1e293b; font-size: 11px;">
              ${order.mealName}
            </div>
            <div style="font-size: 10px; color: #64748b; font-family: monospace;">
              ${order.id} • ${order.planTitle}
            </div>

            ${mealDriverAssigned ? `
              <div style="margin-top: 4px; font-size: 10px; color: #047857; font-weight: 700; background: #ecfdf5; padding: 3px 6px; border-radius: 5px; border: 1px solid #a7f3d0; display: flex; align-items: center; justify-content: space-between;">
                <span>🚚 Rider: <strong>${order.driverName}</strong> ${order.driverVehicle ? `(${order.driverVehicle})` : ''}</span>
                ${order.driverPhone ? `<a href="tel:${order.driverPhone}" style="color: #047857; text-decoration: none; font-weight: 800; margin-left: 6px;">📞</a>` : ''}
              </div>
            ` : ''}

            <!-- Assign Single Meal Dropdown -->
            <div style="margin-top: 5px; display: flex; align-items: center; gap: 4px; background: #f8fafc; padding: 3px 6px; border-radius: 6px; border: 1px solid #e2e8f0;">
              <span style="font-size: 9px; font-weight: 800; color: #475569; white-space: nowrap;">Assign Meal:</span>
              <select 
                onchange="window.__shift24AssignSingleMeal && window.__shift24AssignSingleMeal('${order.id}', this.value, '${item.customerKey}')" 
                style="flex: 1; min-width: 0; max-width: 100%; font-size: 10px; padding: 2px 4px; border-radius: 4px; border: 1px solid ${mealDriverAssigned ? '#10b981' : '#cbd5e1'}; background: #ffffff; color: #0f172a; font-weight: 700; cursor: pointer; outline: none;"
              >
                <option value="">${mealDriverAssigned ? `Assigned: ${order.driverName}` : '-- Assign this Meal --'}</option>
                ${singleMealDriverOptionsHtml}
                ${mealDriverAssigned ? '<option value="__UNASSIGN__">❌ Unassign</option>' : ''}
              </select>
            </div>
          </div>
        `;
      }).join('');

      const countBadgeText = slotFilter === 'All'
        ? `${item.orders.length} ${item.orders.length === 1 ? 'Meal' : 'Meals Scheduled'}`
        : `${displayOrders.length} ${slotFilter} ${displayOrders.length === 1 ? 'Meal' : 'Meals'}`;

      let countBadgeStyle = 'color: #0284c7; background: #e0f2fe;';
      if (slotFilter === 'Dinner') countBadgeStyle = 'color: #4338ca; background: #e0e7ff;';
      else if (slotFilter === 'Lunch') countBadgeStyle = 'color: #c2410c; background: #ffedd5;';
      else if (slotFilter === 'Breakfast') countBadgeStyle = 'color: #b45309; background: #fef3c7;';


      const popupHtml = `
        <div style="font-family: system-ui, -apple-system, sans-serif; font-size: 12px; line-height: 1.4; padding: 2px 0; min-width: 270px; max-width: 320px;">
          <!-- Customer Header -->
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px;">
            <span style="background: ${isDelivered ? '#059669' : pinBg}; color: white; font-weight: 800; font-size: 10px; padding: 2px 7px; border-radius: 6px;">
              ${isDelivered ? `✓ Delivered • Stop #${index + 1}` : `Stop #${index + 1}`}
            </span>
            <span style="font-size: 10px; font-weight: 800; ${countBadgeStyle} padding: 2px 6px; border-radius: 6px;">
              ${countBadgeText}
            </span>
          </div>

          <div style="font-weight: 900; color: #0f172a; font-size: 14px;">${item.customerName}</div>
          <div style="color: #00875a; font-weight: 700; font-size: 11px; margin-top: 2px;">
            <a href="tel:${item.customerPhone}" style="color: #00875a; text-decoration: none;">📞 ${item.customerPhone}</a>
          </div>

          <!-- Address -->
          <div style="color: #334155; font-size: 11px; margin-top: 5px; background: #f8fafc; padding: 5px 8px; border-radius: 6px; border: 1px solid #e2e8f0; line-height: 1.35;">
            📍 ${item.address}
            <div style="font-family: monospace; font-size: 10px; color: #047857; font-weight: 700; margin-top: 3px; background: #ecfdf5; padding: 2px 5px; border-radius: 4px; border: 1px solid #a7f3d0; display: inline-block;">
              🌐 Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}
            </div>
            ${typeof item.distanceFromPrevOrder === 'number' ? `
              <div style="margin-top: 4px; font-size: 10px; color: #065f46; font-weight: 800;">
                🛣️ Road Leg: ${formatDistance(item.distanceFromPrevOrder)} • Hub: ${formatDistance(item.distanceFromHub)}
              </div>
            ` : ''}
          </div>

          <!-- Meals List with Single Meal Assignment -->
          <div style="margin-top: 6px; border-top: 1px dashed #cbd5e1; padding-top: 4px;">
            <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; margin-bottom: 3px;">
              DELIVERY MEALS AT THIS STOP:
            </div>
            ${mealsHtml}
          </div>

          <!-- Quick Navigation Actions -->
          <div style="margin-top: 8px; display: flex; gap: 4px;">
            <a 
              href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}" 
              target="_blank" 
              rel="noopener noreferrer" 
              style="flex: 1; text-align: center; background: #00875a; color: white; padding: 6px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; text-decoration: none; display: inline-block;"
            >
              Directions
            </a>
            <a 
              href="https://www.google.com/maps/search/?api=1&query=${lat},${lng}" 
              target="_blank" 
              rel="noopener noreferrer" 
              style="text-align: center; background: #f1f5f9; color: #334155; padding: 6px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; text-decoration: none; display: inline-block; border: 1px solid #cbd5e1;"
            >
              Google Maps
            </a>
          </div>
        </div>
      `;

      let marker = markerMapRef.current.get(item.customerKey);
      if (marker) {
        marker.setLatLng([lat, lng]);
        marker.setIcon(customIcon);
        marker.setPopupContent(popupHtml);
      } else {
        marker = L.marker([lat, lng], { 
          icon: customIcon,
          title: `${item.customerName} (Click to assign driver or view order details)`
        });

        marker.bindPopup(popupHtml, {
          closeButton: true,
          autoClose: true,
          closeOnClick: false,
          maxWidth: 320
        });

        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          activeCustomerKeyRef.current = item.customerKey;
          setSelectedCustomerKey(item.customerKey);
          marker.openPopup();
        });

        marker.on('popupopen', () => {
          activeCustomerKeyRef.current = item.customerKey;
          setSelectedCustomerKey(item.customerKey);
        });

        markersGroup.addLayer(marker);
        markerMapRef.current.set(item.customerKey, marker);
      }

      if (targetKey === item.customerKey) {
        marker.openPopup();
      }
    });

    // Auto fit bounds once
    if (!hasInitialFittedRef.current && bounds.isValid() && filteredCustomers.length > 0) {
      hasInitialFittedRef.current = true;
      setTimeout(() => {
        mapInstanceRef.current?.fitBounds(bounds, {
          padding: [60, 60],
          maxZoom: 16
        });
      }, 100);
    }
  }, [isOpen, filteredCustomers, slotFilter, drivers]);

  // Clean up on unmount
  useEffect(() => {
    if (!isOpen && mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
      markersLayerRef.current = null;
      tileLayerRef.current = null;
      markerMapRef.current.clear();
      activeCustomerKeyRef.current = null;
      setSelectedCustomerKey(null);
    }
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersLayerRef.current = null;
          tileLayerRef.current = null;
        markerMapRef.current.clear();
        activeCustomerKeyRef.current = null;
      }
    };
  }, [isOpen]);

  // Fit all markers back in view
  const handleFitAll = () => {
    if (!mapInstanceRef.current || filteredCustomers.length === 0) return;
    const bounds = L.latLngBounds([]);
    filteredCustomers.forEach(item => bounds.extend([item.lat, item.lng]));
    if (bounds.isValid()) {
      mapInstanceRef.current.fitBounds(bounds, {
        padding: [60, 60],
        maxZoom: 16
      });
    }
  };

  // Center on a specific customer
  const handleFocusCustomer = (cust: PlottedCustomerLocation) => {
    setSelectedCustomerKey(cust.customerKey);
    activeCustomerKeyRef.current = cust.customerKey;
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([cust.lat, cust.lng], 16, { animate: true });
    }
    const marker = markerMapRef.current.get(cust.customerKey);
    if (marker) {
      marker.openPopup();
    }
  };

  // Previous / Next customer stop navigation
  const currentCustomerIndex = filteredCustomers.findIndex(c => c.customerKey === selectedCustomerKey);
  const handleNextStop = () => {
    if (filteredCustomers.length === 0) return;
    const nextIdx = (currentCustomerIndex + 1) % filteredCustomers.length;
    handleFocusCustomer(filteredCustomers[nextIdx]);
  };
  const handlePrevStop = () => {
    if (filteredCustomers.length === 0) return;
    const prevIdx = (currentCustomerIndex - 1 + filteredCustomers.length) % filteredCustomers.length;
    handleFocusCustomer(filteredCustomers[prevIdx]);
  };

  // Bulk assign all visible unassigned stops to a driver
  const handleBulkAssignConfirm = async () => {
    if (!bulkAssignDriverId) {
      toast.error('Please select a driver to assign');
      return;
    }

    const unassignedCustomers = filteredCustomers.filter(c => !c.assignedDriverId && !c.assignedDriverName);
    if (unassignedCustomers.length === 0) {
      toast.error('No unassigned stops found in current view');
      setBulkAssignModalOpen(false);
      return;
    }

    const targetDriver = drivers.find(d => (d.driverId || d.id) === bulkAssignDriverId);
    if (!targetDriver) return;

    setBulkAssigning(true);
    const allOrderIds: string[] = [];
    unassignedCustomers.forEach(c => {
      const ordersToAssign = slotFilter === 'All'
        ? c.orders
        : c.orders.filter(o => o.mealType === slotFilter);
      ordersToAssign.forEach(o => allOrderIds.push(o.id));
    });

    try {
      try {
        await bulkAssignDriverToBackendOrders(allOrderIds, {
          driverId: targetDriver.driverId || targetDriver.id,
          driverName: targetDriver.name,
          driverPhone: targetDriver.phone,
          driverVehicle: `${targetDriver.vehicleType} (${targetDriver.vehicleNumber})`,
          updateStatusToOutForDelivery: true
        });
      } catch {}

      assignDriverToOrdersLocally(allOrderIds, targetDriver, true);

      // Update plotted state
      setPlottedCustomers(prev => prev.map(p => {
        if (!p.assignedDriverId && !p.assignedDriverName) {
          return {
            ...p,
            assignedDriverId: targetDriver.driverId || targetDriver.id,
            assignedDriverName: targetDriver.name,
            assignedDriverPhone: targetDriver.phone,
            assignedDriverVehicle: `${targetDriver.vehicleType} (${targetDriver.vehicleNumber})`
          };
        }
        return p;
      }));

      toast.success(`Assigned ${unassignedCustomers.length} stops (${allOrderIds.length} orders) to ${targetDriver.name}!`);
      onOrdersUpdated?.();
      setBulkAssignModalOpen(false);
    } catch (err: any) {
      toast.error(err?.message || 'Bulk assignment failed');
    } finally {
      setBulkAssigning(false);
    }
  };

  // Copy manifest or WhatsApp route to driver
  const handleCopyManifest = () => {
    if (filteredCustomers.length === 0) {
      toast.error('No customer locations to export');
      return;
    }

    const lines = filteredCustomers.map((item, idx) => {
      const activeOrders = slotFilter === 'All'
        ? item.orders
        : item.orders.filter(o => o.mealType === slotFilter);

      const mealDetails = activeOrders
        .map(o => `   - [${o.mealType}] ${o.mealName} (${o.deliveryTimeSlot}) [${o.status}]`)
        .join('\n');

      const driverInfo = item.assignedDriverName 
        ? `Driver: ${item.assignedDriverName} (${item.assignedDriverVehicle || 'Fleet'})` 
        : 'Driver: Unassigned';

      return `Stop ${idx + 1}: ${item.customerName} - 📞 ${item.customerPhone}
Address: ${item.address}
${driverInfo}
${slotFilter === 'All' ? `Meals Scheduled (${activeOrders.length}):` : `${slotFilter} Meal Scheduled (${activeOrders.length}):`}
${mealDetails}
Google Maps Navigation: https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}`;
    });

    const manifestText = `SHIFT24 DELIVERY DISPATCH ROUTE (${slotFilter} Slot)
Total Stops: ${filteredCustomers.length}
Total Meals: ${filteredCustomers.reduce((acc, c) => acc + c.orders.length, 0)}
Driver: ${driverFilter === 'All' ? 'All Drivers' : driverFilter === 'Unassigned' ? 'Unassigned Orders' : drivers.find(d => (d.driverId || d.id) === driverFilter)?.name || driverFilter}
Generated: ${new Date().toLocaleString()}

${lines.join('\n\n')}`;

    navigator.clipboard.writeText(manifestText);
    setCopiedManifest(true);
    toast.success(`Copied ${filteredCustomers.length} customer stops route manifest!`);
    setTimeout(() => setCopiedManifest(false), 2000);
  };

  // WhatsApp full route to filtered driver
  const handleWhatsAppDriverRoute = () => {
    const targetDriver = drivers.find(d => (d.driverId || d.id) === driverFilter);
    if (!targetDriver) {
      toast.error('Please filter by a specific driver first to share their route on WhatsApp');
      return;
    }

    const cleanPhone = targetDriver.phone.replace(/\D/g, '');
    const stopsList = filteredCustomers.map((item, idx) => {
      const activeOrders = slotFilter === 'All' ? item.orders : item.orders.filter(o => o.mealType === slotFilter);
      return `📍 *Stop #${idx + 1}*: ${item.customerName}
📞 Customer: ${item.customerPhone}
🏠 Address: ${item.address}
🍱 Meals: ${activeOrders.map(o => o.mealName).join(', ')}
🗺️ Maps: https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}`;
    }).join('\n\n');

    const msg = `Hello ${targetDriver.name}! Here is your Shift24 dispatch route for ${slotFilter} slot (${filteredCustomers.length} stops):\n\n${stopsList}\n\nDrive safely! 🚚`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleTabClick = (slot: 'All' | 'Breakfast' | 'Lunch' | 'Dinner') => {
    setSlotFilter(slot);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-hidden"
      onClick={onClose}
    >
      <div 
        className="bg-white w-full max-w-7xl h-[95vh] rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="px-5 py-3 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500 text-white rounded-2xl shadow-xs">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
                  <span>Dispatch & Order Assignment Map</span>
                  <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded font-black uppercase tracking-wider">
                    Live Fleet
                  </span>
                </h2>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 border border-slate-700">
                  {filteredCustomers.length} Stops ({totalMealsCount} Meals)
                </span>
                {deliveredMealsCount > 0 && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    ✓ {deliveredMealsCount} Delivered
                  </span>
                )}
                {unassignedCount > 0 && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    ⚠️ {unassignedCount} Unassigned
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Assign meal orders directly to drivers on the map • Click any customer stop pin to assign
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Bulk Assign Button */}
            {unassignedCount > 0 && (
              <button
                type="button"
                onClick={() => setBulkAssignModalOpen(true)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                title="Bulk assign all unassigned visible stops to a driver"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Bulk Assign ({unassignedCount})</span>
              </button>
            )}

            {/* WhatsApp route to filtered driver */}
            {driverFilter !== 'All' && driverFilter !== 'Unassigned' && (
              <button
                type="button"
                onClick={handleWhatsAppDriverRoute}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                title="Send route manifest to driver via WhatsApp"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">WhatsApp Route</span>
              </button>
            )}

            {/* Roadmap / Satellite Toggle */}
            <div className="bg-slate-800 p-0.5 rounded-xl border border-slate-700 flex items-center text-xs font-bold">
              <button
                type="button"
                onClick={() => setMapType('roadmap')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  mapType === 'roadmap'
                    ? 'bg-emerald-600 text-white shadow-xs font-extrabold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Roadmap
              </button>
              <button
                type="button"
                onClick={() => setMapType('satellite')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  mapType === 'satellite'
                    ? 'bg-emerald-600 text-white shadow-xs font-extrabold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Satellite
              </button>
            </div>

            {/* Fit all button */}
            <button
              type="button"
              onClick={handleFitAll}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold border border-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
              title="Fit all customer locations in view"
            >
              <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Fit All</span>
            </button>

            {/* Copy route manifest */}
            <button
              type="button"
              onClick={handleCopyManifest}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold border border-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
              title="Copy dispatch route manifest to clipboard for riders"
            >
              {copiedManifest ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Manifest</span>
                </>
              )}
            </button>

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Sub-header */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Slot Tabs */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleTabClick('All')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                slotFilter === 'All'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              All Slots ({plottedCustomers.length})
            </button>

            <button
              type="button"
              onClick={() => handleTabClick('Breakfast')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                slotFilter === 'Breakfast'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              <Coffee className="w-3.5 h-3.5" />
              <span>Breakfast ({breakfastCustCount})</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabClick('Lunch')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                slotFilter === 'Lunch'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Lunch ({lunchCustCount})</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabClick('Dinner')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                slotFilter === 'Dinner'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>Dinner ({dinnerCustCount})</span>
            </button>
          </div>

          {/* Driver Filter & Route Controls Toolbar */}
          <div className="flex items-center gap-2">
            {/* Driver Filter Dropdown */}
            <div className="flex items-center gap-1 text-xs font-bold text-slate-700 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs">
              <Truck className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-slate-400">Driver:</span>
              <select
                value={driverFilter}
                onChange={(e) => {
                  setDriverFilter(e.target.value);
                }}
                className="bg-transparent font-extrabold text-slate-800 text-xs focus:outline-none cursor-pointer"
              >
                <option value="All">All Stops ({plottedCustomers.length})</option>
                {deliveredStopsCount > 0 && (
                  <option value="Delivered">✓ Delivered Stops ({deliveredStopsCount})</option>
                )}
                <option value="Unassigned">⚠️ Unassigned Stops ({unassignedCount})</option>
                <optgroup label="Assigned Drivers">
                  {drivers.map(d => {
                    const dId = d.driverId || d.id;
                    const stopCount = plottedCustomers.filter(c => c.assignedDriverId === dId).length;
                    return (
                      <option key={dId} value={dId}>
                        {d.name} ({stopCount} stops)
                      </option>
                    );
                  })}
                </optgroup>
              </select>
            </div>

            {/* Geocoding Notice */}
            {isGeocoding && (
              <div className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                <span>Geocoding customer locations...</span>
              </div>
            )}
          </div>
        </div>

        {/* Modal Main Content: Full-width Google Map with Google Maps Route Planner Drawer */}
        <div className="flex-1 relative w-full h-full overflow-hidden flex">
          {/* Map canvas */}
          <div ref={mapContainerRef} className="flex-1 h-full z-0" />

          {/* Floating Map Status Legend */}
          <div className="absolute bottom-5 left-4 z-10 bg-slate-900/90 backdrop-blur-md text-white px-3.5 py-2 rounded-2xl shadow-xl border border-slate-700/80 text-xs flex items-center gap-3.5 pointer-events-auto">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full bg-[#059669] border border-white flex items-center justify-center text-[10px] font-black text-white shadow-xs">✓</div>
              <span className="text-[11px] font-bold text-slate-200">Delivered</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full bg-[#00875a] border border-white flex items-center justify-center text-[8px] font-black text-white shadow-xs">#1</div>
              <span className="text-[11px] font-bold text-slate-200">Assigned</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full bg-amber-500 border border-dashed border-yellow-200 flex items-center justify-center text-[9px] font-black text-white shadow-xs">⚠️</div>
              <span className="text-[11px] font-bold text-slate-200">Unassigned</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Assign Modal */}
      {bulkAssignModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
              <Truck className="w-5 h-5" />
            </div>
            <h3 className="font-black text-slate-900 text-center text-base">Bulk Assign to Driver</h3>
            <p className="text-xs text-slate-500 text-center mt-1">
              Assign all <strong className="text-slate-800">{unassignedCount} unassigned delivery stops</strong> in current view to a driver in one click.
            </p>

            <div className="mt-4 space-y-2">
              <label className="block text-xs font-bold text-slate-700">Choose Fleet Driver:</label>
              <select
                value={bulkAssignDriverId}
                onChange={(e) => setBulkAssignDriverId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- Select Driver --</option>
                {drivers.map(d => (
                  <option key={d.driverId || d.id} value={d.driverId || d.id}>
                    {d.name} ({d.vehicleType} - {d.vehicleNumber}) - {d.status}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-6 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setBulkAssignModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkAssignConfirm}
                disabled={bulkAssigning || !bulkAssignDriverId}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-sm transition"
              >
                {bulkAssigning ? 'Assigning...' : 'Assign All Stops'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
