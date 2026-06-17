import React, { useEffect, useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { avatarUrlChain, type ResolvedAvatarUrls } from '../../lib/avatarMedia';

type CachedAvatarImageProps = {
  avatarUrl?: string;
  avatarFallbackUrl?: string;
  avatarOriginalUrl?: string;
  width: number;
  height: number;
  borderRadius?: number;
  label: string;
  onFailed?: () => void;
};

export function CachedAvatarImage({
  avatarUrl,
  avatarFallbackUrl,
  avatarOriginalUrl,
  width,
  height,
  borderRadius = 0,
  label,
  onFailed,
}: CachedAvatarImageProps) {
  const urls = useMemo<ResolvedAvatarUrls>(
    () => ({ avatarUrl, avatarFallbackUrl, avatarOriginalUrl }),
    [avatarUrl, avatarFallbackUrl, avatarOriginalUrl],
  );
  const chain = useMemo(() => avatarUrlChain(urls), [urls]);
  const chainKey = chain.join('|');
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [chainKey]);

  const uri = chain[index];
  if (!uri) {
    return null;
  }

  return (
    <Image
      source={{ uri }}
      style={{ width, height, borderRadius }}
      contentFit="cover"
      cachePolicy="memory-disk"
      recyclingKey={uri}
      accessibilityLabel={label}
      pointerEvents="none"
      onError={() => {
        if (index + 1 < chain.length) {
          setIndex(i => i + 1);
        } else {
          onFailed?.();
        }
      }}
    />
  );
}
