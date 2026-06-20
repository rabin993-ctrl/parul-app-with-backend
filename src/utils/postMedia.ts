import { getMockPhotoUri } from '../data/mockImages';
import type { Post } from '../data/mockData';

/** Resolved image URLs for a post — matches PhotoSlot mock fallback behavior. */
export function getPostImageUrls(
  post: Pick<Post, 'id' | 'images' | 'mediaUrls'>,
  imageKeyPrefix?: string,
): string[] {
  const key = imageKeyPrefix ?? post.id;
  const urls: string[] = [];
  for (let i = 0; i < post.images; i++) {
    urls.push(post.mediaUrls?.[i] ?? getMockPhotoUri(key, i));
  }
  return urls;
}
