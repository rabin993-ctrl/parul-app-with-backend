import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AdoptionPhotoPicker } from '../adoption/AdoptionPhotoPicker';
import type { PickedAsset } from '../../hooks/useMediaPicker';

const MAX_PHOTOS = 3;

export function RescueOpenCasePhotoPicker({
  photos,
  onChange,
}: {
  photos: PickedAsset[];
  onChange: (photos: PickedAsset[]) => void;
}) {
  return (
    <View style={styles.wrap}>
      <AdoptionPhotoPicker
        photos={photos}
        onChange={onChange}
        maxPhotos={MAX_PHOTOS}
        required
        label={`PHOTOS · REQUIRED · UP TO ${MAX_PHOTOS}`}
        addPromptTitle="Add photo"
        addPromptMessage="Choose a photo for this case"
        showRequiredHint={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 12 },
});
