import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings, 
  MapPin, 
  Phone, 
  Mail, 
  Store, 
  Navigation, 
  Compass, 
  Check, 
  Save, 
  RefreshCw, 
  LocateFixed, 
  Search, 
  ExternalLink, 
  Clock, 
  Layers, 
  ChefHat, 
  AlertCircle,
  CheckCircle2,
  Sparkles,
  MessageCircle
} from 'lucide-react';
import L from 'leaflet';
import toast from 'react-hot-toast';
import { 
  KitchenSettings, 
  getAdminKitchenSettings, 
  saveAdminKitchenSettings, 
  DEFAULT_KITCHEN_SETTINGS 
} from './adminData';
import { fetchKitchenSettings, apiUpdateKitchenSettings } from '../../services/api';
import { geocodeWithGoogleOrOSM } from '../../utils/googleMaps';

export function AdminSettings() {
  const [settings, setSettings] = useState<KitchenSettings>(() => getAdminKitchenSettings());
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [geocoding, setGeocoding] = useState<boolean>(false);
  const [detectingGps, setDetectingGps] = useState<boolean>(false);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');

  // Form inputs state
  const [kitchenName, setKitchenName] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [latitude, setLatitude] = useState<number>(() => {
    const init = getAdminKitchenSettings();
    return typeof init.latitude === 'number' && !isNaN(init.latitude) ? init.latitude : 10.01586;
  });
  const [longitude, setLongitude] = useState<number>(() => {
    const init = getAdminKitchenSettings();
    return typeof init.longitude === 'number' && !isNaN(init.longitude) ? init.longitude : 76.36306;
  });
  const [latStr, setLatStr] = useState<string>(() => {
    const init = getAdminKitchenSettings();
    return (typeof init.latitude === 'number' && !isNaN(init.latitude) ? init.latitude : 10.01586).toString();
  });
  const [lngStr, setLngStr] = useState<string>(() => {
    const init = getAdminKitchenSettings();
    return (typeof init.longitude === 'number' && !isNaN(init.longitude) ? init.longitude : 76.36306).toString();
  });
  const [operatingHours, setOperatingHours] = useState<string>('06:00 AM - 10:30 PM');
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState<number>(25);

  // Safely update both number and string state
  const updateCoordinates = (lat: number, lng: number) => {
    if (typeof lat === 'number' && !isNaN(lat) && typeof lng === 'number' && !isNaN(lng)) {
      setLatitude(lat);
      setLongitude(lng);
      setLatStr(lat.toString());
      setLngStr(lng.toString());
    }
  };

  const handleLatInputChange = (val: string) => {
    setLatStr(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed >= -90 && parsed <= 90) {
      setLatitude(parsed);
    }
  };

  const handleLngInputChange = (val: string) => {
    setLngStr(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed >= -180 && parsed <= 180) {
      setLongitude(parsed);
    }
  };

  // Map references
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Load Settings from Backend & LocalStorage
  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await fetchKitchenSettings();
      if (res && res.success && res.data) {
        const loaded: KitchenSettings = {
          kitchenName: res.data.kitchenName || DEFAULT_KITCHEN_SETTINGS.kitchenName,
          address: res.data.address || DEFAULT_KITCHEN_SETTINGS.address,
          email: res.data.email || DEFAULT_KITCHEN_SETTINGS.email,
          phone: res.data.phone || DEFAULT_KITCHEN_SETTINGS.phone,
          latitude: typeof res.data.latitude === 'number' && !isNaN(res.data.latitude) ? res.data.latitude : DEFAULT_KITCHEN_SETTINGS.latitude,
          longitude: typeof res.data.longitude === 'number' && !isNaN(res.data.longitude) ? res.data.longitude : DEFAULT_KITCHEN_SETTINGS.longitude,
          operatingHours: res.data.operatingHours || DEFAULT_KITCHEN_SETTINGS.operatingHours,
          deliveryRadiusKm: res.data.deliveryRadiusKm || DEFAULT_KITCHEN_SETTINGS.deliveryRadiusKm
        };
        setSettings(loaded);
        populateForm(loaded);
        saveAdminKitchenSettings(loaded);
      } else {
        const local = getAdminKitchenSettings();
        setSettings(local);
        populateForm(local);
      }
    } catch {
      const local = getAdminKitchenSettings();
      setSettings(local);
      populateForm(local);
    } finally {
      setLoading(false);
    }
  };

  const populateForm = (data: KitchenSettings) => {
    setKitchenName(data.kitchenName || '');
    setAddress(data.address || '');
    setEmail(data.email || '');
    setPhone(data.phone || '');
    const validLat = typeof data.latitude === 'number' && !isNaN(data.latitude) ? data.latitude : 10.01586;
    const validLng = typeof data.longitude === 'number' && !isNaN(data.longitude) ? data.longitude : 76.36306;
    setLatitude(validLat);
    setLongitude(validLng);
    setLatStr(validLat.toString());
    setLngStr(validLng.toString());
    setOperatingHours(data.operatingHours || '06:00 AM - 10:30 PM');
    setDeliveryRadiusKm(data.deliveryRadiusKm || 25);
  };

  useEffect(() => {
    loadSettings();
  }, []);

  // Save Settings
  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!kitchenName.trim()) {
      toast.error('Kitchen name is required');
      return;
    }
    if (!address.trim()) {
      toast.error('Physical address is required');
      return;
    }

    const finalLat = parseFloat(latStr);
    const finalLng = parseFloat(lngStr);
    if (isNaN(finalLat) || isNaN(finalLng) || finalLat < -90 || finalLat > 90 || finalLng < -180 || finalLng > 180) {
      toast.error('Please enter valid GPS coordinates (Latitude: -90 to 90, Longitude: -180 to 180)');
      return;
    }

    setSaving(true);
    const updated: KitchenSettings = {
      kitchenName: kitchenName.trim(),
      address: address.trim(),
      email: email.trim(),
      phone: phone.trim(),
      latitude: finalLat,
      longitude: finalLng,
      operatingHours: operatingHours.trim(),
      deliveryRadiusKm: Number(deliveryRadiusKm) || 25
    };

    try {
      // 1. Backend update
      try {
        await apiUpdateKitchenSettings(updated);
      } catch (beErr) {
        console.warn('Backend update failed, saving locally:', beErr);
      }

      // 2. Local storage sync
      saveAdminKitchenSettings(updated);
      setSettings(updated);

      toast.success('Cloud Kitchen location & settings saved successfully!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Auto-detect browser GPS coordinates
  const handleDetectCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        updateCoordinates(lat, lng);
        setDetectingGps(false);
        toast.success(`Detected GPS Location: ${lat}, ${lng}`);
      },
      (err) => {
        setDetectingGps(false);
        toast.error(`GPS Error: ${err.message || 'Permission denied or timed out'}`);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // Geocode address using backend geocoder
  const handleGeocodeAddress = async () => {
    if (!address.trim()) {
      toast.error('Please enter an address to geocode');
      return;
    }

    setGeocoding(true);
    try {
      const geo = await geocodeWithGoogleOrOSM(address.trim());
      if (geo && typeof geo.lat === 'number' && typeof geo.lng === 'number') {
        const gLat = Number(geo.lat.toFixed(6));
        const gLng = Number(geo.lng.toFixed(6));
        updateCoordinates(gLat, gLng);
        toast.success(`Resolved Coordinates: ${gLat}, ${gLng}`);
      } else {
        toast.error('Could not resolve GPS coordinates from this address. Try typing a landmark or click the map directly.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Geocoding failed');
    } finally {
      setGeocoding(false);
    }
  };

  // Google Maps Tile URL
  const lyrs = mapType === 'satellite' ? 'y' : 'm';
  const googleTileUrl = `https://mt{s}.google.com/vt/lyrs=${lyrs}&x={x}&y={y}&z={z}`;

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Guard against NaN coordinates
    if (
      typeof latitude !== 'number' || 
      isNaN(latitude) || 
      typeof longitude !== 'number' || 
      isNaN(longitude)
    ) {
      return;
    }

    const safeLat = latitude;
    const safeLng = longitude;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [safeLat, safeLng],
        zoom: 15,
        zoomControl: true,
        scrollWheelZoom: true
      });

      const tileLayer = L.tileLayer(googleTileUrl, {
        subdomains: ['0', '1', '2', '3'],
        maxZoom: 20,
        attribution: '&copy; Google Maps'
      }).addTo(map);

      tileLayerRef.current = tileLayer;

      // Allow clicking on map to reposition Kitchen Pin
      map.on('click', (e: L.LeafletMouseEvent) => {
        const clickedLat = Number(e.latlng.lat.toFixed(6));
        const clickedLng = Number(e.latlng.lng.toFixed(6));
        updateCoordinates(clickedLat, clickedLng);
        toast.success(`Kitchen pin updated to: ${clickedLat}, ${clickedLng}`);
      });

      mapInstanceRef.current = map;
    } else {
      mapInstanceRef.current.setView([safeLat, safeLng], mapInstanceRef.current.getZoom());
    }

    // Custom Cloud Kitchen Hub Icon (Chef Hat with Pulse)
    const kitchenIcon = L.divIcon({
      className: 'kitchen-hub-pin',
      html: `
        <div style="position: relative; width: 52px; height: 52px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
          <div style="position: absolute; width: 52px; height: 52px; border-radius: 50%; background: rgba(5, 150, 105, 0.28); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite; pointer-events: none;"></div>
          <div style="position: relative; width: 42px; height: 42px; border-radius: 50%; background: #0f172a; border: 3px solid #10b981; box-shadow: 0 4px 14px rgba(0,0,0,0.4); display: flex; flex-direction: column; align-items: center; justify-content: center; color: white;">
            <span style="font-size: 18px; line-height: 1;">👨‍🍳</span>
          </div>
          <div style="position: absolute; -bottom: 2px; background: #059669; color: white; font-size: 8px; font-weight: 900; padding: 1.5px 5px; border-radius: 9999px; border: 1.5px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); white-space: nowrap;">
            KITCHEN HUB
          </div>
        </div>
      `,
      iconSize: [52, 52],
      iconAnchor: [26, 26],
      popupAnchor: [0, -26]
    });

    // Update marker
    if (markerRef.current) {
      markerRef.current.setLatLng([safeLat, safeLng]);
    } else if (mapInstanceRef.current) {
      const marker = L.marker([safeLat, safeLng], { 
        icon: kitchenIcon,
        draggable: true 
      }).addTo(mapInstanceRef.current);

      marker.on('dragend', (e) => {
        const markerPos = e.target.getLatLng();
        const newLat = Number(markerPos.lat.toFixed(6));
        const newLng = Number(markerPos.lng.toFixed(6));
        updateCoordinates(newLat, newLng);
        toast.success(`Marker dragged to: ${newLat}, ${newLng}`);
      });

      markerRef.current = marker;
    }

    // Update delivery radius circle
    const radiusMeters = (deliveryRadiusKm || 25) * 1000;
    if (circleRef.current) {
      circleRef.current.setLatLng([safeLat, safeLng]);
      circleRef.current.setRadius(radiusMeters);
    } else if (mapInstanceRef.current) {
      const circle = L.circle([safeLat, safeLng], {
        radius: radiusMeters,
        color: '#10b981',
        fillColor: '#10b981',
        fillOpacity: 0.08,
        weight: 1.5,
        dashArray: '5, 5'
      }).addTo(mapInstanceRef.current);
      circleRef.current = circle;
    }

    // Update popup
    if (markerRef.current) {
      markerRef.current.bindPopup(`
        <div style="font-family: system-ui, sans-serif; font-size: 12px; min-width: 200px; padding: 2px;">
          <div style="font-weight: 900; color: #0f172a; font-size: 13px;">${kitchenName || 'Shift24 Cloud Kitchen'}</div>
          <div style="color: #047857; font-weight: 700; font-size: 11px; margin-top: 2px;">⭐ Central Dispatch Hub</div>
          <div style="color: #475569; font-size: 11px; margin-top: 4px;">📍 ${address}</div>
          <div style="font-family: monospace; font-size: 10px; color: #0284c7; margin-top: 4px; background: #e0f2fe; padding: 2px 6px; border-radius: 4px; display: inline-block;">
            Lat: ${safeLat.toFixed(5)}, Lng: ${safeLng.toFixed(5)}
          </div>
          <div style="margin-top: 8px;">
            <a href="https://www.google.com/maps/dir/?api=1&destination=${safeLat},${safeLng}" target="_blank" style="background: #059669; color: white; padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: 800; text-decoration: none; display: inline-block;">
              Open in Google Maps ↗
            </a>
          </div>
        </div>
      `);
    }
  }, [latitude, longitude, deliveryRadiusKm, kitchenName, address]);

  // Update map layer on style toggle
  useEffect(() => {
    if (tileLayerRef.current) {
      tileLayerRef.current.setUrl(googleTileUrl);
    }
  }, [mapType, googleTileUrl]);

  // Quick preset locations in Kochi
  const PRESET_HUBS = [
    { label: 'Kakkanad (Infopark)', lat: 10.01586, lng: 76.36306, addr: 'Infopark Expressway, Kakkanad, Kochi, Kerala 682042' },
    { label: 'Palarivattom Hub', lat: 10.0076, lng: 76.3117, addr: 'Palarivattom Junction, Ernakulam, Kochi 682025' },
    { label: 'Edappally (Lulu)', lat: 10.0274, lng: 76.3079, addr: 'NH 544, Edappally, Kochi, Kerala 682024' },
    { label: 'Kaloor Stadium Hub', lat: 9.9984, lng: 76.2996, addr: 'JLN Stadium Road, Kaloor, Kochi 682017' },
    { label: 'MG Road (South)', lat: 9.9678, lng: 76.2865, addr: 'Mahatma Gandhi Rd, Ravipuram, Kochi 682016' }
  ];

  const handleApplyPreset = (preset: typeof PRESET_HUBS[0]) => {
    updateCoordinates(preset.lat, preset.lng);
    setAddress(preset.addr);
    toast.success(`Applied ${preset.label} location preset`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Kitchen & Dispatch Settings
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">
                Central Hub
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Configure your cloud kitchen physical address, contact details, and GPS coordinates for route navigation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadSettings}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-300 text-slate-600 bg-white hover:bg-slate-50 shadow-xs transition disabled:opacity-50 cursor-pointer"
            title="Reload settings from backend"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Settings</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Grid: Form Left, Interactive Leaflet Map Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Details (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <form onSubmit={handleSave} className="space-y-6">
            {/* 1. Facility & Contact Details Card */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <ChefHat className="w-4 h-4 text-emerald-600" />
                <h3 className="font-extrabold text-slate-900 text-sm">
                  Facility & Contact Information
                </h3>
              </div>

              {/* Kitchen Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Cloud Kitchen Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Store className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Shift24 Central Cloud Kitchen"
                    value={kitchenName}
                    onChange={(e) => setKitchenName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Contact Phone & WhatsApp */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kitchen Phone / Dispatch Helpline <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="+91 98470 12345"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition font-mono"
                    />
                  </div>
                  {phone && (
                    <a
                      href={`https://wa.me/${phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl transition"
                      title="Test WhatsApp Link"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>

              {/* Official Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Official Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="kitchen@shift24.food"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Operating Hours */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Operating Hours
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="text"
                      placeholder="06:00 AM - 10:30 PM"
                      value={operatingHours}
                      onChange={(e) => setOperatingHours(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Coverage Radius (km)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Compass className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={deliveryRadiusKm}
                      onChange={(e) => setDeliveryRadiusKm(Number(e.target.value))}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Physical Address & GPS Coordinates Card */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    Location & GPS Coordinates
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Exact Hub
                </span>
              </div>

              {/* Physical Address */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Full Physical Address <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGeocodeAddress}
                    disabled={geocoding || !address.trim()}
                    className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer disabled:opacity-40"
                    title="Find Latitude and Longitude from address"
                  >
                    {geocoding ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                    <span>{geocoding ? 'Locating...' : 'Geocode Coordinates'}</span>
                  </button>
                </div>
                <textarea
                  rows={3}
                  required
                  placeholder="Infopark Expressway, Kakkanad, Kochi, Kerala 682042"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs leading-relaxed font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                />
              </div>

              {/* Coordinates Inputs */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Latitude <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="10.01586"
                    value={latStr}
                    onChange={(e) => handleLatInputChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Longitude <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="76.36306"
                    value={lngStr}
                    onChange={(e) => handleLngInputChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Detection & Coordinate Tools */}
              <div className="pt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleDetectCurrentLocation}
                  disabled={detectingGps}
                  className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Detect GPS coordinates using your current device"
                >
                  <LocateFixed className={`w-3.5 h-3.5 ${detectingGps ? 'animate-spin text-emerald-600' : ''}`} />
                  <span>{detectingGps ? 'Detecting GPS...' : 'Detect Device GPS'}</span>
                </button>
                <a
                  href={!isNaN(latitude) && !isNaN(longitude) ? `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}` : '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center gap-1"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Directions</span>
                </a>
              </div>

              {/* Preset Hubs */}
              <div className="pt-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Quick Kochi Hub Presets:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_HUBS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 transition cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Save Action Button */}
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl text-sm transition-all shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving Kitchen Settings...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save Kitchen Location & Profile</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Live Interactive Google Map (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col h-full min-h-[580px]">
            {/* Map Header Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Interactive Dispatch Map Preview
                </span>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  Click on map to relocate hub
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Tile Selector */}
                <div className="flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200 text-xs">
                  <button
                    type="button"
                    onClick={() => setMapType('roadmap')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition ${
                      mapType === 'roadmap' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Roadmap
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapType('satellite')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition ${
                      mapType === 'satellite' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Satellite
                  </button>
                </div>

                <a
                  href={!isNaN(latitude) && !isNaN(longitude) ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}` : '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition"
                  title="Open in full Google Maps"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Map Container */}
            <div className="flex-1 w-full min-h-[460px] relative rounded-2xl overflow-hidden border border-slate-200 z-0">
              <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

              {/* Floating Pin Coordinates Pill */}
              <div className="absolute top-3 left-3 z-10 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 shadow-md flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-mono font-bold text-slate-800">
                  {!isNaN(latitude) && !isNaN(longitude) ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}` : 'Set Coordinates'}
                </span>
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded">
                  {deliveryRadiusKm} km radius
                </span>
              </div>

              {/* Map Interaction Hint */}
              <div className="absolute bottom-3 right-3 z-10 bg-slate-900/90 text-white backdrop-blur-md px-3 py-1.5 rounded-xl text-[11px] font-bold shadow-lg flex items-center gap-1.5 pointer-events-none">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Drag pin or click map to move hub</span>
              </div>
            </div>

            {/* Footer Summary */}
            <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  Active Hub: <strong>{kitchenName || 'Shift24 Cloud Kitchen'}</strong>
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                All order delivery distance and route directions originate from this hub.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default AdminSettings;
