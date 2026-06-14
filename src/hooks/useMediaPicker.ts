import { useCallback, useState } from 'react';
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

  const pickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images' as ImagePicker.MediaTypeOptions,
      quality: 0.85,
      allowsEditing: false,
      exif: false,
    });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      const mime = a.mimeType ?? 'image/jpeg';
      setSelectedAsset({ uri: a.uri, ext: extFromMime(mime), mime, width: a.width, height: a.height, bytes: a.fileSize ?? undefined });
    }
  }, []);

  const takePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images' as ImagePicker.MediaTypeOptions,
      quality: 0.85,
      allowsEditing: false,
      exif: false,
    });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      const mime = a.mimeType ?? 'image/jpeg';
      setSelectedAsset({ uri: a.uri, ext: extFromMime(mime), mime, width: a.width, height: a.height, bytes: a.fileSize ?? undefined });
    }
  }, []);

  const clear = useCallback(() => setSelectedAsset(null), []);

  return { selectedAsset, selectedUri: selectedAsset?.uri ?? null, pickImage, takePhoto, clear };
}
