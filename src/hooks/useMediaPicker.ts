import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export type PickedAsset = {
  uri: string;
  ext: string;
  mime: string;
  width?: number;
  height?: number;
  bytes?: number;
};

function extFromMime(mime: string): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/gif') return 'gif';
  return 'jpg';
}

export function useMediaPicker() {
  const [selectedAsset, setSelectedAsset] = useState<PickedAsset | null>(null);

  const pickImage = useCallback(async (opts?: { squareCrop?: boolean }): Promise<PickedAsset | null> => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') return null;
    }
    const squareCrop = opts?.squareCrop ?? false;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images' as ImagePicker.MediaTypeOptions,
      quality: 0.85,
      allowsEditing: squareCrop,
      aspect: squareCrop ? [1, 1] : undefined,
      exif: false,
    });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      const mime = a.mimeType ?? 'image/jpeg';
      const asset: PickedAsset = {
        uri: a.uri,
        ext: extFromMime(mime),
        mime,
        width: a.width,
        height: a.height,
        bytes: a.fileSize ?? undefined,
      };
      setSelectedAsset(asset);
      return asset;
    }
    return null;
  }, []);

  const takePhoto = useCallback(async (opts?: { squareCrop?: boolean }): Promise<PickedAsset | null> => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') return null;
    }
    const squareCrop = opts?.squareCrop ?? false;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images' as ImagePicker.MediaTypeOptions,
      quality: 0.85,
      allowsEditing: squareCrop,
      aspect: squareCrop ? [1, 1] : undefined,
      exif: false,
    });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      const mime = a.mimeType ?? 'image/jpeg';
      const asset: PickedAsset = {
        uri: a.uri,
        ext: extFromMime(mime),
        mime,
        width: a.width,
        height: a.height,
        bytes: a.fileSize ?? undefined,
      };
      setSelectedAsset(asset);
      return asset;
    }
    return null;
  }, []);

  const clear = useCallback(() => setSelectedAsset(null), []);

  return { selectedAsset, selectedUri: selectedAsset?.uri ?? null, pickImage, takePhoto, clear };
}
