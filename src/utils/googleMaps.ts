// Google Maps JavaScript SDK Loader and Geocoding Utility

const GOOGLE_MAPS_API_KEY = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || '';
const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000/api';

let gMapsLoadPromise: Promise<any> | null = null;

export function loadGoogleMapsSDK(): Promise<any> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Window not available'));
  }

  if ((window as any).google?.maps) {
    return Promise.resolve((window as any).google.maps);
  }

  if (gMapsLoadPromise) {
    return gMapsLoadPromise;
  }

  gMapsLoadPromise = new Promise<any>((resolve, reject) => {
    // Check if script already exists
    const existing = document.getElementById('shift24-google-maps-sdk');
    if (existing) {
      if ((window as any).google?.maps) {
        resolve((window as any).google.maps);
        return;
      }
      existing.addEventListener('load', () => resolve((window as any).google?.maps));
      existing.addEventListener('error', (e) => reject(e));
      return;
    }

    const script = document.createElement('script');
    script.id = 'shift24-google-maps-sdk';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry&loading=async`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if ((window as any).google?.maps) {
        resolve((window as any).google.maps);
      } else {
        reject(new Error('Google Maps SDK loaded but google.maps not found'));
      }
    };

    script.onerror = (err) => {
      gMapsLoadPromise = null;
      reject(err);
    };

    document.head.appendChild(script);
  });

  return gMapsLoadPromise;
}

// In-memory cache for geocoded addresses
const geocodeCache = new Map<string, { lat: number; lng: number }>();

export async function geocodeWithGoogleOrOSM(address: string): Promise<{ lat: number; lng: number } | null> {
  const clean = (address || '').trim();
  if (!clean || clean === 'Address not provided' || clean === 'Address on file') {
    return null;
  }

  const cacheKey = clean.toLowerCase();
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!;
  }

  // 1. Primary: Use dedicated backend geocoder (has full Kochi locality dictionary & server-side lookup)
  try {
    const res = await fetch(`${API_BASE}/geocode?q=${encodeURIComponent(clean)}`);
    if (res.ok) {
      const json = await res.json();
      if (json && json.success && json.data?.lat && json.data?.lng) {
        const result = {
          lat: Number(json.data.lat),
          lng: Number(json.data.lng)
        };
        geocodeCache.set(cacheKey, result);
        return result;
      }
    }
  } catch (err) {
    console.warn('[Geocode] Backend lookup notice:', err);
  }

  // 2. Client-side fallback: Try Google Maps Geocoder if key has quota
  try {
    const maps = await loadGoogleMapsSDK();
    if (maps && maps.Geocoder) {
      const geocoder = new maps.Geocoder();
      const result = await new Promise<{ lat: number; lng: number } | null>((resolve) => {
        geocoder.geocode({ address: clean }, (results: any[], status: string) => {
          if (status === 'OK' && results && results[0] && results[0].geometry?.location) {
            const loc = results[0].geometry.location;
            const lat = typeof loc.lat === 'function' ? loc.lat() : loc.lat;
            const lng = typeof loc.lng === 'function' ? loc.lng() : loc.lng;
            resolve({ lat, lng });
          } else {
            resolve(null);
          }
        });
      });

      if (result) {
        geocodeCache.set(cacheKey, result);
        return result;
      }
    }
  } catch (err) {
    console.warn('[Geocode] Google client geocoder notice:', err);
  }

  // 3. Fallback to direct client Nominatim
  try {
    const query = encodeURIComponent(clean);
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`, {
      headers: { 'Accept-Language': 'en' }
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const result = {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };
        geocodeCache.set(cacheKey, result);
        return result;
      }
    }
  } catch (err) {
    console.warn('[Geocode] Client OSM geocoding notice:', err);
  }

  return null;
}
