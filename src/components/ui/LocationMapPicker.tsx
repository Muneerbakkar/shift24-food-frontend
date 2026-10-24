import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  Loader2,
  MapPin,
  Check,
  Crosshair,
  Search,
  X,
  Layers,
  Compass,
  Navigation,
  Building2,
  Store,
  Train
} from 'lucide-react';
import toast from 'react-hot-toast';

export interface GeocodedAddress {
  lat: number;
  lng: number;
  displayName: string;
  street?: string;
  area?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

interface LocationMapPickerProps {
  initialLat?: number;
  initialLng?: number;
  onLocationSelect: (data: GeocodedAddress, isSilent?: boolean) => void;
  onClose?: () => void;
}

const GOOGLE_MAPS_API_KEY = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || '';

// Dynamically load the Google Maps JS SDK with the Places library (idempotent)
let gMapsLoadPromise: Promise<void> | null = null;
let googlePlacesFailed = false;
function loadGoogleMapsSDK(): Promise<void> {
  if (gMapsLoadPromise) return gMapsLoadPromise;
  if (typeof window !== 'undefined' && (window as any).google?.maps?.places) {
    gMapsLoadPromise = Promise.resolve();
    return gMapsLoadPromise;
  }
  gMapsLoadPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.getElementById('google-maps-sdk');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', reject);
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-maps-sdk';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&language=en`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google Maps SDK failed to load'));
    document.head.appendChild(script);
  });
  return gMapsLoadPromise;
}

interface SearchResult {
  id: string | number;
  placeId?: string;          // Google Places place_id for fetching geometry
  lat: number;
  lng: number;
  name: string;
  displayName: string;
  distanceKm?: number;
  distanceLabel?: string;
  street?: string;
  area?: string;
  city?: string;
  state?: string;
  pincode?: string;
  type?: string;
}

// Distance calculation in km using Haversine formula
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDistance(distKm: number): string {
  if (distKm < 1) {
    return `${Math.round(distKm * 1000)} m away`;
  }
  return `${distKm.toFixed(1)} km away`;
}

// Custom modern SVG delivery pin
const createCustomMarkerIcon = () => {
  return L.divIcon({
    className: 'custom-delivery-marker',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
        <div style="background-color: #059669; color: white; padding: 6px; border-radius: 9999px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3); border: 2px solid white;">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
        <div style="width: 10px; height: 4px; background: rgba(0,0,0,0.25); border-radius: 50%; margin-top: 2px; filter: blur(1px);"></div>
      </div>
    `,
    iconSize: [36, 42],
    iconAnchor: [0, 0]
  });
};

export const LocationMapPicker: React.FC<LocationMapPickerProps> = ({
  initialLat = 9.9312,
  initialLng = 76.2673,
  onLocationSelect,
  onClose
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>({
    lat: initialLat,
    lng: initialLng
  });
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'terrain'>('roadmap');
  const [isLocating, setIsLocating] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState<GeocodedAddress | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResultsDropdown, setShowResultsDropdown] = useState(false);
  const searchDebounceRef = useRef<any>(null);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowResultsDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Google Maps tile layer generator
  const getGoogleTileUrl = (type: 'roadmap' | 'satellite' | 'terrain') => {
    switch (type) {
      case 'satellite':
        return 'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
      case 'terrain':
        return 'https://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}';
      case 'roadmap':
      default:
        return 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
    }
  };

  // Switch map layer
  const setTileLayer = (type: 'roadmap' | 'satellite' | 'terrain') => {
    setMapType(type);
    if (!mapInstanceRef.current) return;

    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }

    const newLayer = L.tileLayer(getGoogleTileUrl(type), {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      attribution: '&copy; Google Maps'
    }).addTo(mapInstanceRef.current);

    tileLayerRef.current = newLayer;
  };

  // Reverse geocode coordinates
  const fetchAddressDetails = async (lat: number, lng: number, isSilent: boolean = false) => {
    setIsGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'en'
          }
        }
      );
      if (!res.ok) throw new Error('Geocoding request failed');
      const data = await res.json();
      const addr = data.address || {};

      const street = addr.road || addr.street || addr.pedestrian || addr.footway || '';
      const area = addr.suburb || addr.neighbourhood || addr.residential || addr.subdistrict || addr.quarter || '';
      const city = addr.city || addr.town || addr.village || addr.county || addr.state_district || '';
      const state = addr.state || '';
      const pincode = addr.postcode || '';

      const geoData: GeocodedAddress = {
        lat,
        lng,
        displayName: data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        street,
        area,
        city,
        state,
        pincode
      };

      setResolvedAddress(geoData);
      onLocationSelect(geoData, isSilent);
    } catch (err) {
      console.warn('Reverse geocoding error:', err);
      const fallback: GeocodedAddress = {
        lat,
        lng,
        displayName: `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`
      };
      setResolvedAddress(fallback);
      onLocationSelect(fallback, isSilent);
    } finally {
      setIsGeocoding(false);
    }
  };

  // Search input handler — only search when user types text
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    const trimmed = val.trim();

    if (!trimmed) {
      setSearchResults([]);
      setShowResultsDropdown(false);
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      return;
    }

    // Clear previous debounce
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    // Debounce Google Places call (200ms feels instant, saves quota)
    searchDebounceRef.current = setTimeout(() => {
      performNearestSearch(val);
    }, 200);
  };

  // Fast OpenStreetMap & Photon Fallback Search (works offline / with no Google billing)
  const searchPlacesOSM = async (trimmed: string) => {
    setIsSearching(true);
    setShowResultsDropdown(true);

    try {
      // 1. Try Photon (fast, proximity-aware geocoder built on OpenStreetMap)
      const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(trimmed)}&limit=7&lat=${currentCoords.lat}&lon=${currentCoords.lng}`;
      const res = await fetch(photonUrl);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.features) && data.features.length > 0) {
          const results: SearchResult[] = data.features.map((feat: any, idx: number) => {
            const p = feat.properties || {};
            const [lon, lat] = feat.geometry?.coordinates || [0, 0];
            const mainName = p.name || p.street || trimmed;
            const subtitleParts = [p.street, p.district || p.suburb || p.locality, p.city || p.county, p.state, p.postcode].filter(Boolean);
            const uniqueSubtitle = Array.from(new Set(subtitleParts)).filter(part => part !== mainName).join(', ');
            const dist = calculateDistanceKm(currentCoords.lat, currentCoords.lng, lat, lon);

            return {
              id: `photon-${p.osm_id || idx}`,
              lat,
              lng: lon,
              name: mainName,
              displayName: uniqueSubtitle || p.country || 'Kerala, India',
              distanceKm: dist,
              distanceLabel: formatDistance(dist),
              street: p.street || (p.osm_key === 'highway' ? mainName : undefined),
              area: p.district || p.suburb || p.locality,
              city: p.city || p.county || 'Kochi',
              state: p.state || 'Kerala',
              pincode: p.postcode,
              type: p.osm_value || p.type || 'place'
            };
          });

          setSearchResults(results);
          setShowResultsDropdown(true);
          setIsSearching(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Photon search error, trying Nominatim fallback:', err);
    }

    try {
      // 2. Fallback to Nominatim OpenStreetMap search
      const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trimmed)}&addressdetails=1&limit=6&countrycodes=in`;
      const res = await fetch(nomUrl, {
        headers: { 'Accept-Language': 'en' }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const results: SearchResult[] = data.map((item: any, idx: number) => {
            const lat = parseFloat(item.lat);
            const lon = parseFloat(item.lon);
            const addr = item.address || {};
            const mainName = item.name || item.display_name.split(',')[0];
            const dist = calculateDistanceKm(currentCoords.lat, currentCoords.lng, lat, lon);

            return {
              id: `nom-${item.place_id || idx}`,
              lat,
              lng: lon,
              name: mainName,
              displayName: item.display_name,
              distanceKm: dist,
              distanceLabel: formatDistance(dist),
              street: addr.road || addr.street,
              area: addr.suburb || addr.neighbourhood || addr.subdistrict,
              city: addr.city || addr.town || addr.village || addr.county || 'Kochi',
              state: addr.state || 'Kerala',
              pincode: addr.postcode,
              type: item.type || 'place'
            };
          });

          setSearchResults(results);
          setShowResultsDropdown(true);
          setIsSearching(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Nominatim fallback search error:', err);
    }

    setSearchResults([]);
    setIsSearching(false);
  };

  // Dual-Layer Search: Google Places Autocomplete with instant OpenStreetMap/Photon fallback
  const performNearestSearch = async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults([]);
      setShowResultsDropdown(false);
      return;
    }

    setIsSearching(true);
    setShowResultsDropdown(true);

    if (googlePlacesFailed) {
      searchPlacesOSM(trimmed);
      return;
    }

    try {
      await loadGoogleMapsSDK();
      const google = (window as any).google;
      if (!google?.maps?.places?.AutocompleteService) {
        googlePlacesFailed = true;
        searchPlacesOSM(trimmed);
        return;
      }

      const service = new google.maps.places.AutocompleteService();
      const sessionToken = new google.maps.places.AutocompleteSessionToken();

      const request = {
        input: trimmed,
        sessionToken,
        locationBias: {
          center: new google.maps.LatLng(currentCoords.lat, currentCoords.lng),
          radius: 50000  // 50 km proximity bias
        },
        componentRestrictions: { country: 'in' },
        language: 'en'
      };

      service.getPlacePredictions(request, (predictions: any[], status: string) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !predictions?.length) {
          if (status === google.maps.places.PlacesServiceStatus.REQUEST_DENIED || status === 'REQUEST_DENIED') {
            googlePlacesFailed = true;
          }
          searchPlacesOSM(trimmed);
          return;
        }

        const results: SearchResult[] = predictions.slice(0, 6).map((pred: any, idx: number) => {
          const main = pred.structured_formatting?.main_text || pred.description.split(',')[0];
          const secondary = pred.structured_formatting?.secondary_text || pred.description;
          return {
            id: pred.place_id || `gp-${idx}`,
            placeId: pred.place_id,
            lat: 0,   // resolved on selection via Geocoder
            lng: 0,
            name: main,
            displayName: secondary,
            type: pred.types?.[0] || ''
          };
        });

        setSearchResults(results);
        setShowResultsDropdown(true);
        setIsSearching(false);
      });
    } catch (err) {
      console.warn('Google Places search error, falling back to OSM:', err);
      googlePlacesFailed = true;
      searchPlacesOSM(trimmed);
    }
  };

  const handleSelectSearchResult = (result: SearchResult) => {
    setSearchQuery(result.name);
    setShowResultsDropdown(false);

    // If it's a Google Places result (has placeId but no lat/lng yet), resolve via Geocoder
    if (result.placeId && result.lat === 0) {
      setIsGeocoding(true);
      loadGoogleMapsSDK().then(() => {
        const google = (window as any).google;
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ placeId: result.placeId, language: 'en' }, (gResults: any[], status: string) => {
          if (status === 'OK' && gResults[0]) {
            const loc = gResults[0].geometry.location;
            const lat = loc.lat();
            const lng = loc.lng();
            setCurrentCoords({ lat, lng });

            if (mapInstanceRef.current && markerRef.current) {
              mapInstanceRef.current.flyTo([lat, lng], 16, { animate: true, duration: 1.2 });
              markerRef.current.setLatLng([lat, lng]);
            }

            // Parse address components from Geocoder result
            const comps = gResults[0].address_components || [];
            const get = (types: string[]) =>
              comps.find((c: any) => types.some((t: string) => c.types.includes(t)))?.long_name || '';

            const street = get(['route']);
            const area = get(['sublocality_level_1', 'sublocality', 'neighborhood']);
            const city = get(['locality', 'administrative_area_level_2']);
            const state = get(['administrative_area_level_1']);
            const pincode = get(['postal_code']);

            const geoData: GeocodedAddress = {
              lat, lng,
              displayName: gResults[0].formatted_address || result.displayName,
              street, area, city, state, pincode
            };
            setResolvedAddress(geoData);
            onLocationSelect(geoData);
          }
          setIsGeocoding(false);
        });
      }).catch(() => setIsGeocoding(false));
      return;
    }

    // Local DB result (already has lat/lng)
    const { lat, lng } = result;
    setCurrentCoords({ lat, lng });
    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.flyTo([lat, lng], 16, { animate: true, duration: 1.2 });
      markerRef.current.setLatLng([lat, lng]);
    }
    const geoData: GeocodedAddress = {
      lat, lng,
      displayName: result.displayName ? `${result.name}, ${result.displayName}` : result.name,
      street: result.street, area: result.area,
      city: result.city || 'Kochi', state: result.state || 'Kerala', pincode: result.pincode
    };
    setResolvedAddress(geoData);
    onLocationSelect(geoData);
    fetchAddressDetails(lat, lng, true);
  };

  // Initialize Map with Google Maps Tiles
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 15,
      zoomControl: false
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Initial Google Maps tile layer
    const googleTileLayer = L.tileLayer(getGoogleTileUrl('roadmap'), {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      attribution: '&copy; Google Maps'
    }).addTo(map);

    tileLayerRef.current = googleTileLayer;

    // Delivery Marker
    const marker = L.marker([initialLat, initialLng], {
      icon: createCustomMarkerIcon(),
      draggable: true
    }).addTo(map);

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      setCurrentCoords({ lat: pos.lat, lng: pos.lng });
      fetchAddressDetails(pos.lat, pos.lng);
    });

    map.on('click', (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      setCurrentCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
      fetchAddressDetails(e.latlng.lat, e.latlng.lng);
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;

    // Trigger initial lookup silently without triggering alert toast
    fetchAddressDetails(initialLat, initialLng, true);

    // Auto-detect and fly to user's real live GPS coordinates on mount silently
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setCurrentCoords({ lat: latitude, lng: longitude });
          if (mapInstanceRef.current && markerRef.current) {
            mapInstanceRef.current.flyTo([latitude, longitude], 16, { animate: true, duration: 1.0 });
            markerRef.current.setLatLng([latitude, longitude]);
          }
          fetchAddressDetails(latitude, longitude, true);
        },
        (err) => {
          console.log('LocationMapPicker auto-GPS lookup info:', err.message);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    }

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      clearTimeout(timer);
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
      tileLayerRef.current = null;
    };
  }, []);

  // Use Current Location (GPS)
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentCoords({ lat: latitude, lng: longitude });

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.flyTo([latitude, longitude], 16, { animate: true, duration: 1.2 });
          markerRef.current.setLatLng([latitude, longitude]);
        }

        fetchAddressDetails(latitude, longitude);
        setIsLocating(false);
        toast.success('Location set to your current GPS position!');
      },
      (error) => {
        setIsLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          toast.error('Location permission was denied. Please allow location access or select on map.');
        } else {
          toast.error('Could not retrieve your location. Please select on map.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Top Header & Google Branding Bar */}
      <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Delivery Location</h4>
            <p className="text-[11px] text-slate-500">Searches nearest places around your selected location</p>
          </div>
        </div>

        {/* Action Buttons: Current Location & Layer Switcher */}
        <div className="flex items-center gap-2">
          {/* Layer switcher */}
          <div className="flex rounded-xl bg-slate-200/80 p-0.5 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setTileLayer('roadmap')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                mapType === 'roadmap' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Default
            </button>
            <button
              type="button"
              onClick={() => setTileLayer('satellite')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                mapType === 'satellite' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Satellite
            </button>
            <button
              type="button"
              onClick={() => setTileLayer('terrain')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                mapType === 'terrain' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Terrain
            </button>
          </div>

          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isLocating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
          >
            {isLocating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                GPS...
              </>
            ) : (
              <>
                <Crosshair className="w-3.5 h-3.5" />
                Current Location
              </>
            )}
          </button>
        </div>
      </div>

      {/* Map Search Bar */}
      <div ref={searchContainerRef} className="p-3 bg-white border-b border-slate-100 relative z-[500]">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search area, landmark, street (e.g. Infopark, Edachira, SmartCity, Kakkanad)..."
            value={searchQuery}
            onFocus={() => {
              if (searchQuery.trim() && searchResults.length > 0) {
                setShowResultsDropdown(true);
              }
            }}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                performNearestSearch(searchQuery);
              }
            }}
            className="w-full pl-10 pr-20 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 focus:bg-white text-xs font-medium text-slate-800 placeholder-slate-400 transition-all shadow-xs"
          />

          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setShowResultsDropdown(false);
                }}
                className="p-1 hover:bg-slate-200 rounded-md text-slate-400 hover:text-slate-600 transition-colors"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={() => performNearestSearch(searchQuery)}
              disabled={isSearching}
              className="px-2.5 py-1 bg-slate-900 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
            >
              {isSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Search'}
            </button>
          </div>

          {/* Search Dropdown Results — only shown when searching */}
          {showResultsDropdown && searchQuery.trim() && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl max-h-72 overflow-y-auto z-[1000] divide-y divide-slate-100">
              <div className="px-3 py-2 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between border-b border-slate-100">
                <span>Search Suggestions</span>
              </div>

              {searchResults.length > 0 ? (
                searchResults.map((res) => {
                  const isGoogleResult = !!res.placeId && res.lat === 0;
                  const types = (res.type || '').toLowerCase();
                  let Icon = MapPin;
                  if (types.includes('transit') || types.includes('train') || types.includes('station')) Icon = Train;
                  else if (types.includes('store') || types.includes('shop') || types.includes('establishment') || types.includes('shopping')) Icon = Store;
                  else if (types.includes('premise') || types.includes('building') || types.includes('locality') || types.includes('sublocality')) Icon = Building2;

                  return (
                    <div
                      key={`${res.id}-${res.lat}-${res.lng}`}
                      onClick={() => handleSelectSearchResult(res)}
                      className="p-3 hover:bg-emerald-50/70 cursor-pointer transition-colors flex items-start gap-2.5 text-left"
                    >
                      <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {res.name}
                          </p>
                          {!isGoogleResult && res.distanceLabel && (
                            <span className="shrink-0 text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Navigation className="w-2.5 h-2.5 rotate-45" />
                              {res.distanceLabel}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-1 leading-relaxed">
                          {res.displayName}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : !isSearching ? (
                <div className="p-4 text-center text-slate-500 text-xs">
                  No results found for "{searchQuery}". Try a different search or drag the pin on the map.
                </div>
              ) : (
                <div className="p-4 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                  Searching...
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Map Canvas */}
      <div className="relative w-full h-[300px] sm:h-[350px] bg-slate-100 z-0">
        <div ref={mapContainerRef} className="w-full h-full" />

        {isGeocoding && (
          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm text-xs font-medium text-slate-700 flex items-center gap-2 z-[400]">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
            Resolving location details...
          </div>
        )}
      </div>

      {/* Selected Address Preview & Confirmation Footer */}
      <div className="p-3 sm:p-4 bg-white border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-xs text-slate-600 min-w-0 flex-1">
          <span className="font-bold text-slate-900 block mb-0.5">Selected Delivery Location:</span>
          <p className="truncate text-slate-500 text-[11px]">
            {resolvedAddress?.displayName || `${currentCoords.lat.toFixed(5)}, ${currentCoords.lng.toFixed(5)}`}
          </p>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white text-xs font-bold transition-colors whitespace-nowrap"
          >
            <Check className="w-3.5 h-3.5" />
            Confirm Location
          </button>
        )}
      </div>
    </div>
  );
};
