import { useCallback, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';

export function useMediaPicker() {
  const [selectedUri, setSelectedUri] = useState<string | null>(null);

  const pickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images' as ImagePicker.MediaTypeOptions,
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setSelectedUri(result.assets[0].uri);
    }
  }, []);

  const clear = useCallback(() => setSelectedUri(null), []);

  return { selectedUri, pickImage, clear };
}
