import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  Search, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  ShieldAlert, 
  ShoppingBag, 
  Eye, 
  X,
  UserCheck,
  Navigation,
  ExternalLink,
  Copy,
  Check,
  Loader2
} from 'lucide-react';
import L from 'leaflet';
import toast from 'react-hot-toast';
import { 
  getAdminCustomers, 
  saveAdminCustomers,
  getAdminSubscriptions,
  isDummyCustomer,
  AdminCustomer 
} from './adminData';
import { fetchCustomers } from '../../services/api';
import { geocodeWithGoogleOrOSM } from '../../utils/googleMaps';

interface CustomerLocationMapProps {
  address: string;
  coordinates?: { lat: number; lng: number };
  latitude?: number;
  longitude?: number;
  customerName: string;
}

const isValidCoords = (c: any): c is { lat: number; lng: number } => 
  Boolean(c && typeof c.lat === 'number' && typeof c.lng === 'number' && !isNaN(c.lat) && !isNaN(c.lng));

function CustomerLocationMap({ address, coordinates, latitude, longitude, customerName }: CustomerLocationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const directLat = typeof latitude === 'number' && !isNaN(latitude) ? latitude : coordinates?.lat;
  const directLng = typeof longitude === 'number' && !isNaN(longitude) ? longitude : coordinates?.lng;
  const directCoords = (typeof directLat === 'number' && typeof directLng === 'number' && !isNaN(directLat) && !isNaN(directLng))
    ? { lat: directLat, lng: directLng }
    : null;

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    directCoords || (isValidCoords(coordinates) ? coordinates : null)
  );
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    let isCancelled = false;

    if (directCoords) {
      setCoords(directCoords);
      return;
    }

    if (isValidCoords(coordinates)) {
      setCoords(coordinates);
      return;
    }

    if (!address || address === 'Address not provided') {
      setCoords({ lat: 10.0167, lng: 76.3692 });
      return;
    }

    const geocodeAddress = async () => {
      setIsGeocoding(true);
      try {
        const geo = await geocodeWithGoogleOrOSM(address);
        if (!isCancelled) {
          if (geo && isValidCoords(geo)) {
            setCoords(geo);
          } else {
            setCoords({ lat: 10.0167, lng: 76.3692 });
          }
          setIsGeocoding(false);
        }
      } catch (err) {
        console.warn('Geocoding notice:', err);
        if (!isCancelled) {
          setCoords({ lat: 10.0167, lng: 76.3692 });
          setIsGeocoding(false);
        }
      }
    };

    geocodeAddress();

    return () => {
      isCancelled = true;
    };
  }, [address, coordinates]);

  useEffect(() => {
    if (!mapContainerRef.current || !isValidCoords(coords)) return;

    // Google Maps pin matching user's screenshot
    const customPin = L.divIcon({
      className: 'google-customer-pin',
      html: `
        <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 40px; height: 40px; border-radius: 50%; background: rgba(0, 135, 90, 0.25); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: relative; width: 32px; height: 32px; border-radius: 50%; background: #00875a; border: 2.5px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white;">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -20]
    });

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [coords.lat, coords.lng],
        zoom: 15,
        zoomControl: true,
        scrollWheelZoom: false
      });

      // Google Maps Vector Tiles
      L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        subdomains: ['0', '1', '2', '3'],
        maxZoom: 20,
        attribution: '&copy; Google Maps'
      }).addTo(map);

      const marker = L.marker([coords.lat, coords.lng], { icon: customPin }).addTo(map);
      marker.bindPopup(`
        <div style="font-family: system-ui, sans-serif; font-size: 12px; line-height: 1.4;">
          <b style="color: #0f172a; font-size: 13px;">${customerName}</b><br/>
          <span style="color: #64748b;">${address}</span>
        </div>
      `);

      mapInstanceRef.current = map;
      markerRef.current = marker;

      setTimeout(() => {
        map.invalidateSize();
      }, 200);
    } else {
      mapInstanceRef.current.setView([coords.lat, coords.lng], 15);
      if (markerRef.current) {
        markerRef.current.setLatLng([coords.lat, coords.lng]);
        markerRef.current.setPopupContent(`
          <div style="font-family: system-ui, sans-serif; font-size: 12px; line-height: 1.4;">
            <b style="color: #0f172a; font-size: 13px;">${customerName}</b><br/>
            <span style="color: #64748b;">${address}</span>
          </div>
        `);
      }
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 150);
    }
  }, [coords, customerName, address]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    toast.success('Address copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const mapsQuery = isValidCoords(coords)
    ? `${coords.lat},${coords.lng}`
    : encodeURIComponent(address || '');

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${mapsQuery}`;

  return (
    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <MapPin className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <span>Delivery Location & Google Map</span>
          </span>
        </div>
        {isValidCoords(coords) && (
          <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md font-bold">
            {coords.lat.toFixed(4)}°N, {coords.lng.toFixed(4)}°E
          </span>
        )}
      </div>

      <div className="flex items-start justify-between gap-3 text-slate-700 bg-white p-3 rounded-xl border border-slate-200/70">
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span className="font-medium leading-relaxed">{address || 'No address provided'}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Copy address"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Map View */}
      <div className="relative h-48 w-full rounded-xl overflow-hidden border border-slate-200 shadow-inner bg-slate-100">
        {isGeocoding && (
          <div className="absolute inset-0 z-10 bg-white/70 backdrop-blur-xs flex items-center justify-center gap-2 text-xs font-semibold text-slate-700">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
            Pinpointing location on Google Maps...
          </div>
        )}
        <div ref={mapContainerRef} className="h-full w-full z-0" />
      </div>

      {/* Navigation Shortcuts */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200 transition-colors shadow-2xs"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Google Maps
        </a>
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-2xs"
        >
          <Navigation className="w-3.5 h-3.5" />
          Directions
        </a>
      </div>
    </div>
  );
}

export function AdminCustomers() {
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCust, setSelectedCust] = useState<AdminCustomer | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCustomers = async () => {
    // 1. Populate customers strictly from subscriptions
    const localSubs = getAdminSubscriptions().filter(s => !isDummyCustomer(s));
    const custMap = new Map<string, AdminCustomer>();

    localSubs.forEach(sub => {
      if (!sub.customerEmail || isDummyCustomer(sub)) return;
      const email = sub.customerEmail.toLowerCase().trim();
      const existing = custMap.get(email);
      const deliveryCount = (sub.durationDays || 7) * (parseInt(sub.mealsPerDay as any) || 1);
      const price = Number(sub.totalPrice) || 0;

      if (existing) {
        existing.activePlan = sub.planTitle ? `${sub.planTitle} Plan` : existing.activePlan;
        existing.status = sub.status === 'Cancelled' ? 'Inactive' : 'Active';
        if (sub.address) existing.address = sub.address;
        if (Array.isArray(sub.allergies) && sub.allergies.length > 0) {
          existing.allergies = Array.from(new Set([...(existing.allergies || []), ...sub.allergies]));
        }
        existing.totalSpent += price;
        existing.totalOrders += deliveryCount;
        custMap.set(email, existing);
      } else {
        custMap.set(email, {
          id: `CUST-${(sub.id || '').replace(/^SUB-/, '') || Math.floor(100 + Math.random() * 900)}`,
          name: sub.customerName || 'Customer',
          email,
          phone: sub.customerPhone || 'N/A',
          totalOrders: deliveryCount,
          totalSpent: price,
          joinedDate: sub.startDate || 'Recent',
          activePlan: sub.planTitle ? `${sub.planTitle} Plan` : 'Active Plan',
          allergies: sub.allergies || [],
          address: sub.address || 'Address not provided',
          coordinates: sub.coordinates,
          status: sub.status === 'Cancelled' ? 'Inactive' : 'Active'
        });
      }
    });

    const initialList = Array.from(custMap.values()).filter(c => !isDummyCustomer(c));
    setCustomers(initialList);

    // 2. Fetch directly from backend API (derived strictly from MongoDB Subscription collection)
    try {
      setLoading(true);
      const res = await fetchCustomers();
      if (res && res.success && Array.isArray(res.data)) {
        const backendCustomers: AdminCustomer[] = res.data
          .filter((c: any) => !isDummyCustomer(c))
          .map((c: any) => ({
            id: c.id || c._id || `CUST-${Math.floor(100 + Math.random() * 900)}`,
            name: c.name || 'Customer',
            email: (c.email || '').toLowerCase().trim(),
            phone: c.phone || 'N/A',
            totalOrders: Number(c.totalOrders) || 0,
            totalSpent: Number(c.totalSpent) || 0,
            joinedDate: c.joinedDate || 'Recent',
            activePlan: c.activePlan || 'Standard Plan',
            allergies: Array.isArray(c.allergies) ? c.allergies : [],
            address: c.address || 'Address not provided',
            coordinates: c.coordinates,
            status: c.status || 'Active'
          }));

        setCustomers(backendCustomers);
        saveAdminCustomers(backendCustomers);
      }
    } catch (e) {
      console.warn('Backend customers fetch failed, using local store:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();

    const handleUpdate = () => loadCustomers();
    window.addEventListener('shift24-customers-updated', handleUpdate);
    window.addEventListener('shift24-subscriptions-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('shift24-customers-updated', handleUpdate);
      window.removeEventListener('shift24-subscriptions-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm) ||
    c.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Customer Accounts Directory</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Profiles, lifetime spend, active recurring meal plans, and reported dietary allergies.
          </p>
        </div>
        <div className="text-xs font-bold text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
          {filtered.length} Total Customers
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by customer name, email, phone, location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-4">Customer</th>
                <th className="px-5 py-4">Contact</th>
                <th className="px-5 py-4">Active Plan</th>
                <th className="px-5 py-4">Reported Allergies</th>
                <th className="px-5 py-4">Lifetime Spend</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    Loading customer accounts...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    No customer accounts found.
                  </td>
                </tr>
              ) : (
                filtered.map(cust => (
                  <tr key={cust.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4 font-semibold text-slate-900">
                      <div>{cust.name}</div>
                      <div className="text-[11px] text-slate-400 font-normal">{cust.id}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div>{cust.email}</div>
                      <div className="text-[11px] text-slate-400">{cust.phone}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-bold text-slate-800">{cust.activePlan || 'No Active Plan'}</span>
                    </td>
                    <td className="px-5 py-4">
                      {cust.allergies.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {cust.allergies.map(a => (
                            <span key={a} className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-bold text-[10px] border border-rose-200">
                              {a}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">None</span>
                      )}
                    </td>
                    <td className="px-5 py-4 font-black text-slate-900">
                      ₹{cust.totalSpent.toLocaleString()}
                      <div className="text-[10px] text-slate-400 font-medium">{cust.totalOrders} deliveries</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        cust.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {cust.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedCust(cust)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 transition-colors"
                        title="View Profile Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Details Modal */}
      {selectedCust && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setSelectedCust(null)}
              className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 font-extrabold flex items-center justify-center text-lg">
                {selectedCust.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-slate-900">{selectedCust.name}</h3>
                <span className="text-xs text-slate-400 font-semibold">{selectedCust.id} &bull; Member since {selectedCust.joinedDate}</span>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              {/* Contact Info Card */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-slate-700">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-semibold truncate">{selectedCust.email}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{selectedCust.phone}</span>
                </div>
              </div>

              {/* Dedicated Location & Map Section */}
              <CustomerLocationMap 
                address={selectedCust.address}
                coordinates={selectedCust.coordinates}
                latitude={selectedCust.latitude}
                longitude={selectedCust.longitude}
                customerName={selectedCust.name}
              />

              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80">
                <span className="font-bold text-emerald-900 uppercase tracking-wider text-[11px] block mb-1">
                  Active Subscription Routine
                </span>
                <div className="text-sm font-bold text-slate-800">{selectedCust.activePlan || 'None'}</div>
              </div>

              <div>
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block mb-1.5">
                  Reported Dietary Restrictions
                </span>
                {selectedCust.allergies.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedCust.allergies.map(a => (
                      <span key={a} className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold border border-rose-200">
                        {a}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-400">No allergies specified</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Lifetime Deliveries</span>
                  <span className="font-extrabold text-slate-800 text-sm">{selectedCust.totalOrders} Meals</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Spend</span>
                  <span className="font-extrabold text-emerald-600 text-sm">₹{selectedCust.totalSpent.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedCust(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs"
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
