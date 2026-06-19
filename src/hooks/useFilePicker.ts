import { useCallback } from 'react';
import * as DocumentPicker from 'expo-document-picker';

export type PickedFile = {
  uri: string;
  name: string;
  mime: string;
  bytes?: number;
};

export function useFilePicker() {
  const pickFile = useCallback(async (): Promise<PickedFile | null> => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets?.[0]) return null;
    const asset = result.assets[0];
    return {
      uri: asset.uri,
      name: asset.name,
      mime: asset.mimeType ?? 'application/octet-stream',
      bytes: asset.size ?? undefined,
    };
  }, []);

  return { pickFile };
}
