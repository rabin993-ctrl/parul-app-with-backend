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

function assetFromPicker(a: ImagePicker.ImagePickerAsset): PickedAsset {
  const mime = a.mimeType ?? 'image/jpeg';
  return {
    uri: a.uri,
    ext: extFromMime(mime),
    mime,
    width: a.width,
    height: a.height,
    bytes: a.fileSize ?? undefined,
  };
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
      allowsMultipleSelection: false,
      allowsEditing: squareCrop,
      aspect: squareCrop ? [1, 1] : undefined,
      exif: false,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = assetFromPicker(result.assets[0]);
      setSelectedAsset(asset);
      return asset;
    }
    return null;
  }, []);

  const pickImages = useCallback(async (opts?: { limit?: number }): Promise<PickedAsset[]> => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') return [];
    }
    const limit = opts?.limit ?? 0;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images' as ImagePicker.MediaTypeOptions,
      quality: 0.85,
      allowsMultipleSelection: true,
      selectionLimit: limit > 0 ? limit : 0,
      exif: false,
    });
    if (result.canceled || result.assets.length === 0) return [];
    const assets = result.assets.map(assetFromPicker);
    if (assets[0]) setSelectedAsset(assets[assets.length - 1]);
    return assets;
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
      const asset = assetFromPicker(result.assets[0]);
      setSelectedAsset(asset);
      return asset;
    }
    return null;
  }, []);

  const clear = useCallback(() => setSelectedAsset(null), []);

  return { selectedAsset, selectedUri: selectedAsset?.uri ?? null, pickImage, pickImages, takePhoto, clear };
}
