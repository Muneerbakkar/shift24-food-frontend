import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  MapPin, 
  Navigation, 
  ExternalLink, 
  Copy, 
  Check, 
  Phone, 
  Clock, 
  AlertTriangle, 
  X, 
  Loader2, 
  Share2, 
  Coffee, 
  Sun, 
  Moon,
  Compass,
  CheckCircle2,
  Utensils,
  Truck,
  MessageCircle
} from 'lucide-react';
import L from 'leaflet';
import toast from 'react-hot-toast';
import { 
  AdminOrder, 
  AdminDriver, 
  getAdminSubscriptions, 
  getAdminCustomers,
  getAdminDrivers,
  assignDriverToOrdersLocally
} from './adminData';
import { geocodeWithGoogleOrOSM } from '../../utils/googleMaps';
import { assignDriverToBackendOrder, fetchDrivers } from '../../services/api';

export interface OrderLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: AdminOrder | null;
  allCustomerOrders?: AdminOrder[];
  onOrdersUpdated?: () => void;
}

export function OrderLocationModal({ 
  isOpen, 
  onClose, 
  order, 
  allCustomerOrders = [],
  onOrdersUpdated
}: OrderLocationModalProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [coordSource, setCoordSource] = useState<'gps' | 'geocoded' | 'fallback'>('gps');
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');
  const [viewMode, setViewMode] = useState<'interactive' | 'embed'>('interactive');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [copiedAddress, setCopiedAddress] = useState<boolean>(false);
  const [copiedRiderNote, setCopiedRiderNote] = useState<boolean>(false);

  // Driver Assignment State
  const [drivers, setDrivers] = useState<AdminDriver[]>(() => getAdminDrivers());
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [currentOrder, setCurrentOrder] = useState<AdminOrder | null>(order);
  const [meals, setMeals] = useState<AdminOrder[]>([]);

  useEffect(() => {
    setCurrentOrder(order);
    setSelectedDriverId(order?.driverId || '');
  }, [order]);

  useEffect(() => {
    if (allCustomerOrders && allCustomerOrders.length > 0) {
      if (order) {
        const orderDateMatch = order.deliveryDate?.match(/\b(\d{4}-\d{2}-\d{2})\b/)?.[1];
        const sameDayOrders = allCustomerOrders.filter(o => {
          if (orderDateMatch) {
            const oMatch = o.deliveryDate?.match(/\b(\d{4}-\d{2}-\d{2})\b/)?.[1];
            if (oMatch) return oMatch === orderDateMatch;
          }
          if (order.deliveryDate && o.deliveryDate) {
            return o.deliveryDate === order.deliveryDate;
          }
          return true;
        });
        setMeals(sameDayOrders.length > 0 ? sameDayOrders : [order]);
      } else {
        setMeals(allCustomerOrders);
      }
    } else if (order) {
      setMeals([order]);
    } else {
      setMeals([]);
    }
  }, [order, allCustomerOrders]);

  useEffect(() => {
    if (isOpen) {
      const loadDrivers = async () => {
        try {
          const res = await fetchDrivers();
          if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
            setDrivers(res.data);
          } else {
            setDrivers(getAdminDrivers());
          }
        } catch {
          setDrivers(getAdminDrivers());
        }
      };
      loadDrivers();
    }
  }, [isOpen]);

  // Assign driver to an individual single meal order
  const handleAssignDriverToSingleMeal = async (orderId: string, driverId: string) => {
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
      } catch (beErr) {
        console.warn('Backend assign error:', beErr);
      }

      assignDriverToOrdersLocally([orderId], targetDriver, true);

      // Update currentOrder if it matches
      if (currentOrder && currentOrder.id === orderId) {
        if (targetDriver) {
          setCurrentOrder(prev => prev ? {
            ...prev,
            driverId: targetDriver.driverId || targetDriver.id,
            driverName: targetDriver.name,
            driverPhone: targetDriver.phone,
            driverVehicle: `${targetDriver.vehicleType} (${targetDriver.vehicleNumber})`,
            status: (prev.status === 'Preparing' || prev.status === 'Pending') ? 'Out for Delivery' : prev.status
          } : null);
          setSelectedDriverId(targetDriver.driverId || targetDriver.id);
        } else {
          setCurrentOrder(prev => {
            if (!prev) return null;
            const copy: any = { ...prev };
            delete copy.driverId;
            delete copy.driverName;
            delete copy.driverPhone;
            delete copy.driverVehicle;
            return copy;
          });
          setSelectedDriverId('');
        }
      }

      // Update meals state
      setMeals(prev => prev.map(m => {
        if (m.id === orderId) {
          if (targetDriver) {
            return {
              ...m,
              driverId: targetDriver.driverId || targetDriver.id,
              driverName: targetDriver.name,
              driverPhone: targetDriver.phone,
              driverVehicle: `${targetDriver.vehicleType} (${targetDriver.vehicleNumber})`,
              status: (m.status === 'Preparing' || m.status === 'Pending') ? 'Out for Delivery' as const : m.status
            };
          } else {
            const copy: any = { ...m };
            delete copy.driverId;
            delete copy.driverName;
            delete copy.driverPhone;
            delete copy.driverVehicle;
            return copy;
          }
        }
        return m;
      }));

      const targetMeal = meals.find(m => m.id === orderId);
      const mealName = targetMeal ? `${targetMeal.mealType} (${targetMeal.mealName})` : orderId;

      if (targetDriver) {
        toast.success(`Assigned ${mealName} to driver ${targetDriver.name}!`);
      } else {
        toast.success(`Unassigned driver from ${mealName}`);
      }

      onOrdersUpdated?.();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update driver assignment');
    }
  };

  const handleAssignDriverToThisOrder = (driverId: string) => {
    if (!currentOrder) return;
    return handleAssignDriverToSingleMeal(currentOrder.id, driverId);
  };

  // Expose global callback for Leaflet popup inline select
  useEffect(() => {
    (window as any).__shift24AssignLocationModalMeal = (orderId: string, driverId: string) => {
      handleAssignDriverToSingleMeal(orderId, driverId);
    };

    return () => {
      delete (window as any).__shift24AssignLocationModalMeal;
    };
  });

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Determine accurate coordinates when modal opens or order changes
  useEffect(() => {
    if (!isOpen || !order) {
      setCoords(null);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);

    const resolveCoords = async () => {
      // 1. Authoritative: Lookup coordinates from matching customer subscription
      let subs = getAdminSubscriptions();
      if (subs.length === 0) {
        try {
          const { fetchSubscriptions } = await import('../../services/api');
          const subRes = await fetchSubscriptions();
          if (subRes && subRes.success && Array.isArray(subRes.data)) {
            subs = subRes.data;
          }
        } catch {}
      }

      if (order.subscriptionId) {
        const matchSub = subs.find(s => s.id === order.subscriptionId || (s as any).subId === order.subscriptionId);
        if (matchSub) {
          const sLat = typeof matchSub.latitude === 'number' && !isNaN(matchSub.latitude) 
            ? matchSub.latitude 
            : (matchSub.coordinates?.lat && !isNaN(Number(matchSub.coordinates.lat)) ? Number(matchSub.coordinates.lat) : undefined);
          const sLng = typeof matchSub.longitude === 'number' && !isNaN(matchSub.longitude) 
            ? matchSub.longitude 
            : (matchSub.coordinates?.lng && !isNaN(Number(matchSub.coordinates.lng)) ? Number(matchSub.coordinates.lng) : undefined);

          if (typeof sLat === 'number' && typeof sLng === 'number') {
            setCoords({ lat: sLat, lng: sLng });
            setCoordSource('gps');
            setIsLoading(false);
            return;
          }
        }
      }

      // 2. Direct coordinates on order
      const ordLat = typeof order.latitude === 'number' && !isNaN(order.latitude) 
        ? order.latitude 
        : (order.coordinates?.lat && !isNaN(Number(order.coordinates.lat)) ? Number(order.coordinates.lat) : undefined);
      const ordLng = typeof order.longitude === 'number' && !isNaN(order.longitude) 
        ? order.longitude 
        : (order.coordinates?.lng && !isNaN(Number(order.coordinates.lng)) ? Number(order.coordinates.lng) : undefined);

      if (typeof ordLat === 'number' && typeof ordLng === 'number') {
        setCoords({ lat: ordLat, lng: ordLng });
        setCoordSource('gps');
        setIsLoading(false);
        return;
      }

      // 3. Lookup coordinates from matching customer profile
      const custs = getAdminCustomers();
      const matchCust = custs.find(c => 
        (order.customerPhone && c.phone && c.phone.replace(/\D/g, '') === order.customerPhone.replace(/\D/g, '')) ||
        (order.customerName && c.name.toLowerCase().trim() === order.customerName.toLowerCase().trim())
      );
      if (matchCust) {
        const cLat = typeof matchCust.latitude === 'number' && !isNaN(matchCust.latitude) 
          ? matchCust.latitude 
          : (matchCust.coordinates?.lat && !isNaN(Number(matchCust.coordinates.lat)) ? Number(matchCust.coordinates.lat) : undefined);
        const cLng = typeof matchCust.longitude === 'number' && !isNaN(matchCust.longitude) 
          ? matchCust.longitude 
          : (matchCust.coordinates?.lng && !isNaN(Number(matchCust.coordinates.lng)) ? Number(matchCust.coordinates.lng) : undefined);

        if (typeof cLat === 'number' && typeof cLng === 'number') {
          setCoords({ lat: cLat, lng: cLng });
          setCoordSource('gps');
          setIsLoading(false);
          return;
        }
      }

      // 4. Geocode using address via backend geocoder (has full Kochi locality dictionary & OSM)
      const addressToQuery = (order.address || '').trim();
      if (!addressToQuery || addressToQuery === 'Address not provided' || addressToQuery === 'Address on file') {
        setCoords({ lat: 10.0167, lng: 76.3692 });
        setCoordSource('fallback');
        setIsLoading(false);
        return;
      }

      const geo = await geocodeWithGoogleOrOSM(addressToQuery);
      if (!isCancelled) {
        if (geo) {
          setCoords(geo);
          setCoordSource('geocoded');
        } else {
          setCoords({ lat: 10.0167, lng: 76.3692 });
          setCoordSource('fallback');
        }
        setIsLoading(false);
      }
    };

    resolveCoords();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, order]);

  // Combine current order with any sister orders for this customer
  const relatedMeals = meals;

  // Initialize and update Google Maps tiles via Leaflet
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current || !coords || viewMode !== 'interactive') return;

    const isOrderDelivered = order?.status === 'Delivered';

    // Google Maps pin with tick mark for delivered order
    const googlePin = L.divIcon({
      className: 'google-maps-pin',
      html: `
        <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
          <div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: ${isOrderDelivered ? 'rgba(5, 150, 105, 0.35)' : 'rgba(0, 135, 90, 0.25)'}; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite; pointer-events: none;"></div>
          <div style="position: relative; width: 36px; height: 36px; border-radius: 50%; background: ${isOrderDelivered ? '#059669' : '#00875a'}; border: 2.5px solid white; box-shadow: ${isOrderDelivered ? '0 4px 12px rgba(5, 150, 105, 0.45)' : '0 4px 10px rgba(0,0,0,0.35)'}; display: flex; align-items: center; justify-content: center; color: white;">
            ${isOrderDelivered ? `
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            ` : `
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            `}
          </div>
          ${relatedMeals.length > 1 ? `
            <div style="position: absolute; top: -2px; right: -2px; background: #0f172a; color: #38bdf8; font-size: 9px; font-weight: 900; padding: 1px 4.5px; border-radius: 9999px; border: 1.5px solid white; pointer-events: none;">
              ${relatedMeals.length}
            </div>
          ` : ''}
          ${isOrderDelivered ? `
            <div style="position: absolute; bottom: -3px; right: -3px; background: #059669; color: white; width: 17px; height: 17px; border-radius: 50%; border: 1.5px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; pointer-events: none;" title="Order Delivered">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
          ` : ''}
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
      popupAnchor: [0, -22]
    });
// Google Maps Tile URL (lyrs=m for Roadmap, lyrs=y for Hybrid Satellite)
    const lyrs = mapType === 'satellite' ? 'y' : 'm';
    const googleTileUrl = `https://mt{s}.google.com/vt/lyrs=${lyrs}&x={x}&y={y}&z={z}`;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [coords.lat, coords.lng],
        zoom: 16,
        zoomControl: true,
        scrollWheelZoom: true
      });

      const tileLayer = L.tileLayer(googleTileUrl, {
        subdomains: ['0', '1', '2', '3'],
        maxZoom: 20,
        attribution: '&copy; Google Maps'
      }).addTo(map);

      const marker = L.marker([coords.lat, coords.lng], { 
        icon: googlePin,
        title: `${order?.customerName || 'Customer'} Location`
      }).addTo(map);

      mapInstanceRef.current = map;
      markerRef.current = marker;
      tileLayerRef.current = tileLayer;

      setTimeout(() => {
        map.invalidateSize();
      }, 250);
    } else {
      const map = mapInstanceRef.current;
      map.setView([coords.lat, coords.lng], 16);

      if (tileLayerRef.current) {
        tileLayerRef.current.setUrl(googleTileUrl);
      }

      if (markerRef.current) {
        markerRef.current.setLatLng([coords.lat, coords.lng]);
        markerRef.current.setIcon(googlePin);
      }

      setTimeout(() => {
        map.invalidateSize();
      }, 150);
    }
  }, [isOpen, coords, order, mapType, viewMode, relatedMeals]);

  // Clean up Leaflet on modal close
  useEffect(() => {
    if (!isOpen && mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
      tileLayerRef.current = null;
    }
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
        tileLayerRef.current = null;
      }
    };
  }, [isOpen]);

  if (!isOpen || !order) return null;

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(order.address || '');
    setCopiedAddress(true);
    toast.success('Customer address copied to clipboard');
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const mapsQuery = coords 
    ? `${coords.lat},${coords.lng}`
    : encodeURIComponent(order.address || '');

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${mapsQuery}`;
  const embedIframeUrl = `https://maps.google.com/maps?q=${coords ? `${coords.lat},${coords.lng}` : encodeURIComponent(order.address || '')}&t=&z=16&ie=UTF8&iwloc=&output=embed`;

  const handleCopyRiderNote = () => {
    const mealLines = relatedMeals
      .map(m => ` - [${m.mealType}] ${m.mealName} (${m.deliveryTimeSlot}) [${m.status}]`)
      .join('\n');

    const note = `SHIFT24 DELIVERY DISPATCH (GOOGLE MAPS)
Customer: ${order.customerName}
Phone: ${order.customerPhone}
Address: ${order.address}
Meals Scheduled (${relatedMeals.length}):
${mealLines}
Google Maps Pin: ${googleMapsUrl}
Google Directions: ${directionsUrl}`;

    navigator.clipboard.writeText(note);
    setCopiedRiderNote(true);
    toast.success('Courier dispatch details copied!');
    setTimeout(() => setCopiedRiderNote(false), 2000);
  };

  const handleRecenter = () => {
    if (mapInstanceRef.current && coords) {
      mapInstanceRef.current.setView([coords.lat, coords.lng], 16, { animate: true });
    }
  };

  const getSlotIcon = (type: AdminOrder['mealType']) => {
    switch (type) {
      case 'Breakfast': return <Coffee className="w-3.5 h-3.5 text-amber-500" />;
      case 'Lunch': return <Sun className="w-3.5 h-3.5 text-orange-500" />;
      case 'Dinner': return <Moon className="w-3.5 h-3.5 text-indigo-500" />;
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500 text-white rounded-2xl shadow-xs">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
                  <span>Customer Delivery Location</span>
                  <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded font-black uppercase tracking-wider">
                    Google Maps
                  </span>
                </h2>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 border border-slate-700">
                  {relatedMeals.length} {relatedMeals.length === 1 ? 'Meal' : 'Meals'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Accurate Google Maps pinpoint with all scheduled meal deliveries
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          
          {/* Customer & Order Summary Card */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/70 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 font-black text-sm flex items-center justify-center shrink-0">
                  {order.customerName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{order.customerName}</h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                    <a 
                      href={`tel:${order.customerPhone}`}
                      className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:underline"
                      title="Call customer"
                    >
                      <Phone className="w-3 h-3 text-emerald-600" />
                      <span>{order.customerPhone}</span>
                    </a>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold text-slate-800 bg-white px-3 py-1 rounded-xl border border-slate-200 inline-flex items-center gap-1.5 shadow-2xs">
                  <Utensils className="w-3 h-3 text-emerald-600" />
                  <span>{relatedMeals.length} {relatedMeals.length === 1 ? 'Meal Scheduled' : 'Meals Scheduled'}</span>
                </span>
              </div>
            </div>

            {/* Address Display with Copy Button */}
            <div className="flex items-start justify-between gap-3 text-slate-700 bg-white p-3.5 rounded-xl border border-slate-200">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-xs leading-relaxed text-slate-800">
                    {order.address || 'No address provided'}
                  </span>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Delivery Date: <strong>{order.deliveryDate}</strong>
                  </div>
                  {coords && (
                    <div className="mt-1.5 flex items-center gap-1.5 font-mono text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80 w-fit">
                      <Compass className="w-3 h-3 text-emerald-600" />
                      <span>Lat: {coords.lat.toFixed(5)}, Lng: {coords.lng.toFixed(5)}</span>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopyAddress}
                className="shrink-0 p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Copy address"
              >
                {copiedAddress ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {/* Driver Assignment Section */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Assigned Driver</span>
                </span>
                {currentOrder?.driverName ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px]">
                    Assigned: {currentOrder.driverName}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-extrabold text-[10px]">
                    Unassigned
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <select
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Choose Driver --</option>
                  {drivers.map(d => {
                    const dId = d.driverId || d.id;
                    return (
                      <option key={dId} value={dId}>
                        {d.name} ({d.vehicleType} - {d.vehicleNumber}) - {d.status}
                      </option>
                    );
                  })}
                </select>

                <button
                  type="button"
                  onClick={() => handleAssignDriverToThisOrder(selectedDriverId)}
                  disabled={!selectedDriverId || selectedDriverId === currentOrder?.driverId}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs rounded-lg transition shadow-2xs cursor-pointer shrink-0"
                >
                  {currentOrder?.driverName ? 'Reassign' : 'Assign Driver'}
                </button>

                {currentOrder?.driverName && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDriverId('');
                      handleAssignDriverToThisOrder('__UNASSIGN__');
                    }}
                    className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-lg transition border border-rose-200 cursor-pointer shrink-0"
                  >
                    Unassign
                  </button>
                )}
              </div>

              {currentOrder?.driverPhone && (
                <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                  <span>Contact: {currentOrder.driverPhone} ({currentOrder.driverVehicle})</span>
                  <a
                    href={`https://wa.me/${currentOrder.driverPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                      `Shift24 Order ${currentOrder.id}: ${currentOrder.customerName}\nAddress: ${currentOrder.address}\nGoogle Maps: https://www.google.com/maps/dir/?api=1&destination=${coords?.lat || ''},${coords?.lng || ''}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 hover:underline inline-flex items-center gap-1 font-bold"
                  >
                    <MessageCircle className="w-3 h-3" />
                    <span>WhatsApp Order to Driver</span>
                  </a>
                </div>
              )}
            </div>

            {/* Scheduled Meals for this Customer Breakdown */}
            <div className="space-y-1.5 pt-1">
              <span className="text-slate-400 uppercase tracking-wider text-[10px] font-bold block">
                Scheduled Meals at this Location ({relatedMeals.length})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {relatedMeals.map(m => (
                  <div 
                    key={m.id}
                    className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1.5 overflow-hidden"
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 font-bold text-xs text-slate-800">
                        {getSlotIcon(m.mealType)}
                        <span>{m.mealType}</span>
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        m.status === 'Delivered'
                          ? 'bg-emerald-50 text-emerald-700'
                          : m.status === 'Out for Delivery'
                          ? 'bg-sky-50 text-sky-700'
                          : m.status === 'Preparing'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {m.status}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-slate-700 truncate">
                      {m.mealName}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>{m.deliveryTimeSlot}</span>
                      <span className="font-bold text-slate-700 font-mono">₹{m.amount}</span>
                    </div>

                    {/* Single Meal Driver Info if assigned */}
                    {m.driverName && (
                      <div className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-1 rounded-lg font-bold flex items-center justify-between border border-emerald-200/80">
                        <span className="truncate mr-1">🚚 Rider: <strong>{m.driverName}</strong></span>
                        {m.driverPhone && (
                          <a href={`tel:${m.driverPhone}`} className="text-emerald-700 hover:underline">
                            📞
                          </a>
                        )}
                      </div>
                    )}

                    {/* Single Meal Driver Assignment Selector */}
                    <div className="pt-1.5 border-t border-slate-100 flex items-center gap-1.5 min-w-0">
                      <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap shrink-0">
                        Assign Meal:
                      </span>
                      <select
                        value={m.driverId || ''}
                        onChange={(e) => handleAssignDriverToSingleMeal(m.id, e.target.value)}
                        className={`flex-1 min-w-0 w-full truncate px-2 py-1 rounded-lg text-xs font-bold border focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer ${
                          m.driverName
                            ? 'bg-emerald-50/80 text-emerald-900 border-emerald-300'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        <option value="">{m.driverName ? `Assigned: ${m.driverName}` : '-- Assign Driver --'}</option>
                        {drivers.map(d => {
                          const dId = d.driverId || d.id;
                          return (
                            <option key={dId} value={dId}>
                              🚚 {d.name} ({d.vehicleType})
                            </option>
                          );
                        })}
                        {m.driverId && <option value="__UNASSIGN__">❌ Unassign</option>}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Allergies if any */}
            {order.allergies && order.allergies.length > 0 && (
              <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span className="text-[11px] font-bold text-rose-800">
                  Reported Restrictions: {order.allergies.join(', ')}
                </span>
              </div>
            )}
          </div>

          {/* Interactive Google Map Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Google Maps View
                </span>
                {coordSource === 'gps' && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Exact GPS Pin
                  </span>
                )}
                {coordSource === 'geocoded' && (
                  <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-md">
                    Accurate Pinpoint
                  </span>
                )}
                {coordSource === 'fallback' && (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                    Kochi Hub
                  </span>
                )}
              </div>

              {/* Map Layer Switcher & Controls */}
              <div className="flex items-center gap-1.5">
                <div className="bg-slate-100 p-0.5 rounded-lg border border-slate-200 flex items-center text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('interactive');
                      setMapType('roadmap');
                    }}
                    className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                      viewMode === 'interactive' && mapType === 'roadmap'
                        ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Roadmap
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('interactive');
                      setMapType('satellite');
                    }}
                    className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                      viewMode === 'interactive' && mapType === 'satellite'
                        ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Satellite
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('embed')}
                    className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                      viewMode === 'embed'
                        ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Switch to Google Maps Embed frame"
                  >
                    Embed
                  </button>
                </div>

                {viewMode === 'interactive' && (
                  <button
                    type="button"
                    onClick={handleRecenter}
                    className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Re-center Google Map"
                  >
                    <Compass className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Google Maps Container */}
            <div className="relative h-64 sm:h-72 w-full rounded-2xl overflow-hidden border border-slate-200 shadow-inner bg-slate-100">
              {isLoading && (
                <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-xs flex items-center justify-center gap-2 text-xs font-bold text-slate-800">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                  Pinpointing customer location on Google Maps...
                </div>
              )}

              {viewMode === 'interactive' ? (
                <div ref={mapContainerRef} className="h-full w-full z-0" />
              ) : (
                <iframe
                  title="Google Maps Embed"
                  src={embedIframeUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen={false}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-300 transition-colors shadow-2xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in Google Maps</span>
            </a>

            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-2xs"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Get Directions</span>
            </a>

            <button
              type="button"
              onClick={handleCopyRiderNote}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-200 transition-colors shadow-2xs cursor-pointer"
              title="Copy formatted note for courier or WhatsApp"
            >
              {copiedRiderNote ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Copied Note!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-slate-600" />
                  <span>Copy Courier Note</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500 font-medium">
            Customer: <strong className="text-slate-800">{order.customerName}</strong> • {relatedMeals.length} Scheduled Deliveries
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
