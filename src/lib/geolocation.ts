import { Platform } from 'react-native';
import type { GeoPoint } from './geocode';
import { supabase } from './supabase';

export type DeviceCoords = GeoPoint & { accuracy?: number | null };

type GetCoordsOptions = {
  /** When false, never show the permission dialog — only read if already granted. */
  requestPermission?: boolean;
};

export async function getDeviceCoordinates(
  options: GetCoordsOptions = {},
): Promise<DeviceCoords | null> {
  const requestPermission = options.requestPermission ?? true;
  try {
    const Location = await import('expo-location');
    let { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') {
      if (!requestPermission) return null;
      ({ status } = await Location.requestForegroundPermissionsAsync());
      if (status !== 'granted') return null;
    }

    const pos = await Location.getCurrentPositionAsync({
      accuracy: Platform.OS === 'web' ? Location.Accuracy.Balanced : Location.Accuracy.High,
    });
    return {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
    };
  } catch {
    return null;
  }
}

export async function persistUserCoordinates(coords: GeoPoint): Promise<void> {
  await supabase.rpc('update_user_location', {
    p_lat: coords.lat,
    p_lng: coords.lng,
  });
}

export async function persistAlertCoordinates(
  postId: string,
  coords: GeoPoint,
  radiusKm = 10,
): Promise<void> {
  await supabase.rpc('set_post_alert_coordinates', {
    p_post_id: postId,
    p_lat: coords.lat,
    p_lng: coords.lng,
    p_radius_km: radiusKm,
  });
}

export async function invokeAlertFanOut(postId: string) {
  const rpc = await supabase.rpc('fan_out_my_post_alert', { p_post_id: postId });

  if (!rpc.error && rpc.data) {
    const result = rpc.data as { skipped?: boolean };
    if (!result.skipped) {
      return rpc;
    }
  } else if (rpc.error) {
    const missingFn = /function.*does not exist|Could not find the function/i.test(rpc.error.message);
    if (!missingFn) {
      console.warn('[invokeAlertFanOut] RPC failed:', rpc.error.message);
    }
  }

  return supabase.functions.invoke('fan-out-alert', {
    body: { post_id: postId },
  });
}
