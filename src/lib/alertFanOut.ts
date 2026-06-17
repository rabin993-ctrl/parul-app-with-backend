import { buildAlertGeocodeQuery, geocodePlace, type GeoPoint } from './geocode';
import {
  getDeviceCoordinates,
  invokeAlertFanOut,
  persistAlertCoordinates,
} from './geolocation';

/** Resolve coordinates for a lost/found alert (device GPS → geocode fallback). */
export async function resolveAlertCoordinates(
  area: string,
  postLoc: string | null | undefined,
  existing?: { lat?: number | null; lng?: number | null } | null,
): Promise<{ lat: number | null; lng: number | null }> {
  if (existing?.lat != null && existing?.lng != null) {
    return { lat: existing.lat, lng: existing.lng };
  }

  const device = await getDeviceCoordinates({ requestPermission: true });
  if (device) return { lat: device.lat, lng: device.lng };

  const geocoded = await geocodePlace(buildAlertGeocodeQuery(area, postLoc));
  if (geocoded) return { lat: geocoded.lat, lng: geocoded.lng };

  return { lat: null, lng: null };
}

/** Persist alert coords when available, then fan out nearby notifications. */
export async function fanOutPostAlert(
  postId: string,
  coords?: GeoPoint | null,
): Promise<void> {
  try {
    if (coords?.lat != null && coords?.lng != null) {
      await persistAlertCoordinates(postId, coords);
    }
    const { error } = await invokeAlertFanOut(postId);
    if (error) {
      console.warn('[alertFanOut] fan-out-alert failed:', error.message);
    }
  } catch (err) {
    console.warn('[alertFanOut] fan-out failed:', err);
  }
}

/** Geocode profile location text into user coordinates for radius matching. */
export async function geocodeProfileLocation(location: string): Promise<GeoPoint | null> {
  const trimmed = location.trim();
  if (!trimmed) return null;
  return geocodePlace(`${trimmed}, Bangladesh`);
}
