/** Portrait photos for owner/user avatars. */
const PEOPLE_PHOTOS = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&facepad=2',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&facepad=2',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&auto=format&fit=crop&facepad=2',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&facepad=2',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&facepad=2',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&facepad=2',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&facepad=2',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&facepad=2',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&auto=format&fit=crop&facepad=2',
  'https://images.unsplash.com/photo-1489424731088-a5d8b219a5bb?w=400&auto=format&fit=crop&facepad=2',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400&auto=format&fit=crop&facepad=2',
  'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=400&auto=format&fit=crop&facepad=2',
];

/** Curated Unsplash pet photos for mock UI (stable URLs). */
const PET_PHOTOS = [
  'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1561037407-61d35dac958f?w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1592194996308-7f438b6b6ff9?w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1552053831-7154a086a6ef?w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1598134493179-51332ed55708?w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1611003228941-98852ba62227?w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1450778869180-41d060ede46e?w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1477884213360-49e9a12b5da9?w=800&auto=format&fit=crop',
];

const COMMUNITY_COVERS = [
  'https://images.unsplash.com/photo-1608098547890-d1544ac1228a?w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1455165815444-050fb7a036d7?w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1525253086316-d0c936c814f8?w=800&auto=format&fit=crop',
];

function hashKey(key: string): number {
  return key.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
}

export function getMockPhotoUri(key: string, index = 0): string {
  const pool = PET_PHOTOS;
  return pool[(hashKey(key) + index) % pool.length];
}

/** Picsum fallback when Unsplash fails to load (e.g. network/CORS). */
export function getMockPhotoFallbackUri(key: string, index = 0): string {
  const seed = Math.abs(hashKey(`${key}-${index}`));
  return `https://picsum.photos/seed/paw${seed}/800/600`;
}

export function getMockCommunityCoverUri(key: string): string {
  return COMMUNITY_COVERS[hashKey(key) % COMMUNITY_COVERS.length];
}

export function getMockUserAvatarUri(userId: string): string {
  return PEOPLE_PHOTOS[hashKey(userId) % PEOPLE_PHOTOS.length];
}

export function getMockUserAvatarFallbackUri(userId: string): string {
  const seed = Math.abs(hashKey(`user-${userId}`));
  return `https://picsum.photos/seed/user${seed}/400/400`;
}

export function getMockPetAvatarUri(petId: string, species?: string): string {
  const offset = species === 'cat' ? 2 : 0;
  return PET_PHOTOS[(hashKey(petId) + offset) % PET_PHOTOS.length];
}

export function getMockPetAvatarFallbackUri(petId: string): string {
  const seed = Math.abs(hashKey(`pet-${petId}`));
  return `https://picsum.photos/seed/pet${seed}/400/400`;
}
