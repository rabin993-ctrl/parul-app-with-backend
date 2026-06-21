import React from 'react';
import { AdoptionPhotoPicker } from '../adoption/AdoptionPhotoPicker';
import type { PickedAsset } from '../../hooks/useMediaPicker';

const MAX_PHOTOS = 3;

export function RescueUpdatePhotoPicker({
  photos,
  onChange,
  showRequiredHint = false,
}: {
  photos: PickedAsset[];
  onChange: (photos: PickedAsset[]) => void;
  showRequiredHint?: boolean;
}) {
  return (
    <AdoptionPhotoPicker
      photos={photos}
      onChange={onChange}
      maxPhotos={MAX_PHOTOS}
      required
      label={`PHOTOS · REQUIRED · UP TO ${MAX_PHOTOS}`}
      addPromptTitle="Add photo"
      addPromptMessage="Choose a photo for this update"
      showRequiredHint={showRequiredHint}
    />
  );
}
