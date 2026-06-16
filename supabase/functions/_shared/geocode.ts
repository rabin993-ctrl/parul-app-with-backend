export type GeoPoint = { lat: number; lng: number };

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

/** Forward geocode a free-text place name to coordinates (Nominatim). */
export async function geocodePlace(query: string): Promise<GeoPoint | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const url = new URL(NOMINATIM_URL);
  url.searchParams.set('q', trimmed);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');

  try {
    const res = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'ParulApp/1.0 (lost-found-alerts)',
        Accept: 'application/json',
      },
    });
    if (!res.ok) return null;
    const rows = await res.json() as { lat?: string; lon?: string }[];
    const hit = rows?.[0];
    if (!hit?.lat || !hit?.lon) return null;
    const lat = Number(hit.lat);
    const lng = Number(hit.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

export function buildAlertGeocodeQuery(area: string | null, postLocation: string | null): string {
  const parts = [area, postLocation, 'Bangladesh'].filter(Boolean);
  return parts.join(', ');
}
