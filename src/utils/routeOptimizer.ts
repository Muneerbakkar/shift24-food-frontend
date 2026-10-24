import { loadGoogleMapsSDK } from './googleMaps';

// Haversine straight-line distance in km
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) return 0;
  if (lat1 === 0 && lon1 === 0) return 0;
  if (lat2 === 0 && lon2 === 0) return 0;
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.round(d * 10) / 10;
}

export function formatDistance(km: number | undefined | null): string {
  if (km === undefined || km === null || isNaN(km) || km === 0) return '0 km';
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}

// In-memory cache for road driving distances to eliminate redundant network hits
const roadDistanceCache = new Map<string, { distanceKm: number; durationMin: number }>();

// Fetch exact road driving distance from OSRM or Google with caching
export async function getRoadDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): Promise<{ distanceKm: number; durationMin: number }> {
  if (!lat1 || !lon1 || !lat2 || !lon2) return { distanceKm: 0, durationMin: 0 };
  if (Math.abs(lat1 - lat2) < 0.00001 && Math.abs(lon1 - lon2) < 0.00001) {
    return { distanceKm: 0, durationMin: 0 };
  }

  const cacheKey = `${lat1.toFixed(4)},${lon1.toFixed(4)}_${lat2.toFixed(4)},${lon2.toFixed(4)}`;
  if (roadDistanceCache.has(cacheKey)) {
    return roadDistanceCache.get(cacheKey)!;
  }

  try {
    const cached = sessionStorage.getItem(`shift24_road_${cacheKey}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      roadDistanceCache.set(cacheKey, parsed);
      return parsed;
    }
  } catch {}

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.code === 'Ok' && data.routes && data.routes[0]) {
        const meters = data.routes[0].distance;
        const seconds = data.routes[0].duration;
        const result = {
          distanceKm: Math.round((meters / 1000) * 10) / 10,
          durationMin: Math.max(1, Math.round(seconds / 60))
        };
        roadDistanceCache.set(cacheKey, result);
        try {
          sessionStorage.setItem(`shift24_road_${cacheKey}`, JSON.stringify(result));
        } catch {}
        return result;
      }
    }
  } catch {}

  // Fallback: Real road factor in Indian city areas is ~1.28x of straight-line haversine distance
  const straightKm = calculateDistanceKm(lat1, lon1, lat2, lon2);
  const roadEstKm = Math.round(straightKm * 1.28 * 10) / 10;
  const fallbackResult = {
    distanceKm: roadEstKm,
    durationMin: Math.max(1, Math.round(roadEstKm * 2.5))
  };
  roadDistanceCache.set(cacheKey, fallbackResult);
  return fallbackResult;
}

export interface RouteOption {
  id: string;
  isPrimary: boolean;
  name: string;
  summary: string;
  distanceKm: number;
  durationMin: number;
  legs: Array<{ distanceKm: number; durationMin: number }>;
  geometryCoordinates: Array<[number, number]>;
  midpoint: [number, number];
}

export interface MultiStopRoadRouteResult {
  totalDistanceKm: number;
  totalDurationMin: number;
  legs: Array<{ distanceKm: number; durationMin: number }>;
  geometryCoordinates: Array<[number, number]>;
  midpoint: [number, number];
  summary: string;
  alternative?: RouteOption;
}

// Calculate the midpoint along polyline coordinates for Google Maps floating badges
export function getPolylineMidpoint(coords: Array<[number, number]>): [number, number] {
  if (!coords || coords.length === 0) return [10.01586, 76.36306];
  if (coords.length <= 2) return coords[0];
  const midIdx = Math.floor(coords.length * 0.45);
  return coords[midIdx];
}

// Fetch multi-stop full road route geometry directly from Google Maps DirectionsService or OSRM
// NEVER generates fake artificial curves - only 100% real street routes!
export async function getMultiStopRoadRoute(
  points: Array<{ lat: number; lng: number }>,
  travelMode: 'bike' | 'car' = 'bike'
): Promise<MultiStopRoadRouteResult | null> {
  if (points.length < 2) return null;

  // 1. Primary: Try official Google Maps DirectionsService SDK
  try {
    const maps = await loadGoogleMapsSDK();
    if (maps && maps.DirectionsService) {
      const directionsService = new maps.DirectionsService();
      const origin = new maps.LatLng(points[0].lat, points[0].lng);
      const destination = new maps.LatLng(points[points.length - 1].lat, points[points.length - 1].lng);
      const waypoints = points.slice(1, -1).map(p => ({
        location: new maps.LatLng(p.lat, p.lng),
        stopover: true
      }));

      const googleResult: any = await new Promise((resolve) => {
        directionsService.route(
          {
            origin,
            destination,
            waypoints,
            travelMode: travelMode === 'bike'
              ? (maps.TravelMode.TWO_WHEELER || maps.TravelMode.BICYCLING || maps.TravelMode.DRIVING)
              : maps.TravelMode.DRIVING,
            provideRouteAlternatives: true
          },
          (result: any, status: string) => {
            if (status === 'OK' && result?.routes?.length > 0) {
              resolve(result);
            } else {
              resolve(null);
            }
          }
        );
      });

      if (googleResult && googleResult.routes && googleResult.routes.length > 0) {
        const primary = googleResult.routes[0];
        const geom: Array<[number, number]> = (primary.overview_path || []).map((pt: any) => [
          pt.lat(),
          pt.lng()
        ]);

        if (geom.length >= 2) {
          const legs = (primary.legs || []).map((l: any) => ({
            distanceKm: Math.round(((l.distance?.value || 0) / 1000) * 10) / 10,
            durationMin: Math.max(1, Math.round((l.duration?.value || 0) / 60))
          }));
          const totalDistMeters = (primary.legs || []).reduce((acc: number, l: any) => acc + (l.distance?.value || 0), 0);
          const totalDurSecs = (primary.legs || []).reduce((acc: number, l: any) => acc + (l.duration?.value || 0), 0);

          let alternative: RouteOption | undefined = undefined;
          if (googleResult.routes[1]) {
            const alt = googleResult.routes[1];
            const altGeom: Array<[number, number]> = (alt.overview_path || []).map((pt: any) => [
              pt.lat(),
              pt.lng()
            ]);
            if (altGeom.length >= 2) {
              const altDistMeters = (alt.legs || []).reduce((acc: number, l: any) => acc + (l.distance?.value || 0), 0);
              const altDurSecs = (alt.legs || []).reduce((acc: number, l: any) => acc + (l.duration?.value || 0), 0);
              alternative = {
                id: 'google-alt-route',
                isPrimary: false,
                name: 'Alternative Route',
                summary: alt.summary || 'Alternative Road',
                distanceKm: Math.round((altDistMeters / 1000) * 10) / 10,
                durationMin: Math.max(1, Math.round(altDurSecs / 60)),
                legs: (alt.legs || []).map((l: any) => ({
                  distanceKm: Math.round(((l.distance?.value || 0) / 1000) * 10) / 10,
                  durationMin: Math.max(1, Math.round((l.duration?.value || 0) / 60))
                })),
                geometryCoordinates: altGeom,
                midpoint: getPolylineMidpoint(altGeom)
              };
            }
          }

          return {
            totalDistanceKm: Math.round((totalDistMeters / 1000) * 10) / 10,
            totalDurationMin: Math.max(1, Math.round(totalDurSecs / 60)),
            legs,
            geometryCoordinates: geom,
            midpoint: getPolylineMidpoint(geom),
            summary: primary.summary ? `via ${primary.summary}` : 'Fastest Road Route',
            alternative
          };
        }
      }
    }
  } catch (gErr) {
    console.warn('[Routing] Google Maps DirectionsService fallback:', gErr);
  }

  // 2. Secondary: Fallback to OSRM real road routing
  try {
    const safePoints = points.slice(0, 25);
    const coordsStr = safePoints.map(p => `${p.lng},${p.lat}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson&alternatives=true&steps=true`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.code === 'Ok' && data.routes && data.routes[0]) {
        const route = data.routes[0];
        const legs = (route.legs || []).map((l: any) => ({
          distanceKm: Math.round((l.distance / 1000) * 10) / 10,
          durationMin: Math.max(1, Math.round(l.duration / 60))
        }));
        // OSRM coordinates are [lng, lat], Leaflet polyline expects [lat, lng]
        const geometryCoordinates: Array<[number, number]> = (route.geometry?.coordinates || []).map(
          (c: [number, number]) => [c[1], c[0]]
        );

        if (geometryCoordinates.length >= 2) {
          const totalDistKm = Math.round((route.distance / 1000) * 10) / 10;
          const totalDurMin = Math.max(1, Math.round(route.duration / 60));
          const midpoint = getPolylineMidpoint(geometryCoordinates);

          // Real alternative route ONLY if OSRM actually returned a real second road path
          let alternative: RouteOption | undefined = undefined;
          if (data.routes[1]) {
            const altRoute = data.routes[1];
            const altGeom: Array<[number, number]> = (altRoute.geometry?.coordinates || []).map(
              (c: [number, number]) => [c[1], c[0]]
            );
            if (altGeom.length >= 2) {
              const altDist = Math.round((altRoute.distance / 1000) * 10) / 10;
              const altDur = Math.max(1, Math.round(altRoute.duration / 60));
              alternative = {
                id: 'osrm-alt-route',
                isPrimary: false,
                name: 'Alternative Route',
                summary: altRoute.legs?.[0]?.summary ? `via ${altRoute.legs[0].summary}` : 'Alternative Road',
                distanceKm: altDist,
                durationMin: altDur,
                legs: (altRoute.legs || []).map((l: any) => ({
                  distanceKm: Math.round((l.distance / 1000) * 10) / 10,
                  durationMin: Math.max(1, Math.round(l.duration / 60))
                })),
                geometryCoordinates: altGeom,
                midpoint: getPolylineMidpoint(altGeom)
              };
            }
          }

          const realSummary = route.legs?.[0]?.summary 
            ? `via ${route.legs[0].summary}` 
            : 'Fastest Road Route';

          return {
            totalDistanceKm: totalDistKm,
            totalDurationMin: totalDurMin,
            legs,
            geometryCoordinates,
            midpoint,
            summary: realSummary,
            alternative
          };
        }
      }
    }
  } catch (e) {
    console.warn('OSRM multi-stop road route fallback:', e);
  }

  return null;
}

// Nearest-Neighbor Traveling Salesperson Algorithm starting from origin (Hub)
// Selects nearest customer A from Hub, then nearest customer B from A, and so on.
export function optimizeRouteNearestNeighbor<T extends { lat: number; lng: number }>(
  startPoint: { lat: number; lng: number },
  stops: T[]
): { optimizedStops: T[]; totalDistanceKm: number } {
  if (stops.length <= 1) {
    return { optimizedStops: [...stops], totalDistanceKm: 0 };
  }

  const unvisited = [...stops];
  const ordered: T[] = [];
  let current = startPoint;
  let totalKm = 0;

  while (unvisited.length > 0) {
    let nearestIdx = 0;
    let minDistance = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const dist = calculateDistanceKm(current.lat, current.lng, unvisited[i].lat, unvisited[i].lng);
      if (dist < minDistance) {
        minDistance = dist;
        nearestIdx = i;
      }
    }

    const nextStop = unvisited.splice(nearestIdx, 1)[0];
    ordered.push(nextStop);
    totalKm += minDistance;
    current = nextStop;
  }

  return { 
    optimizedStops: ordered, 
    totalDistanceKm: Math.round(totalKm * 10) / 10 
  };
}

// Generate Google Maps multi-destination turn-by-turn navigation URL
export function generateGoogleMapsMultiStopUrl(
  origin: { lat: number; lng: number },
  stops: Array<{ lat: number; lng: number }>,
  travelMode: 'bike' | 'car' = 'bike'
): string {
  if (stops.length === 0) {
    return `https://www.google.com/maps/search/?api=1&query=${origin.lat},${origin.lng}`;
  }
  const allPoints = [origin, ...stops];
  const path = allPoints.map(p => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join('/');
  const modeParam = travelMode === 'bike' ? '?entry=ttu&travelmode=two_wheeler' : '?entry=ttu&travelmode=driving';
  return `https://www.google.com/maps/dir/${path}${modeParam}`;
}

// Driver route colors palette
export const DRIVER_ROUTE_COLORS = [
  { stroke: '#2563eb', bg: '#dbeafe', text: '#1e40af', label: 'Royal Blue' },
  { stroke: '#059669', bg: '#d1fae5', text: '#065f46', label: 'Emerald' },
  { stroke: '#7c3aed', bg: '#ede9fe', text: '#5b21b6', label: 'Purple' },
  { stroke: '#ea580c', bg: '#ffedd5', text: '#9a3412', label: 'Orange' },
  { stroke: '#0891b2', bg: '#cffafe', text: '#155e75', label: 'Cyan' },
  { stroke: '#e11d48', bg: '#ffe4e6', text: '#9f1239', label: 'Rose' }
];
