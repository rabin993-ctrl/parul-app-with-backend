import { Platform } from 'react-native';
import type { GeoPoint } from './geocode';
import { supabase } from './supabase';

export type DeviceCoords = GeoPoint & { accuracy?: number | null };

export async function getDeviceCoordinates(): Promise<DeviceCoords | null> {
  try {
    const Location = await import('expo-location');
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;

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

export async function invokeAlertFanOut(postId: string): Promise<void> {
  await supabase.functions.invoke('fan-out-alert', {
    body: { post_id: postId },
  });
}
