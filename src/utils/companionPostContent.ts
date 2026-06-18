import type { Post } from '../data/mockData';

export type CompanionContentStyle = 'update' | 'gallery';

export const GALLERY_CAPTION_MAX = 150;

/** Classify a companion-profile post as a text update or a gallery photo. */
export function classifyCompanionPost(post: Post): CompanionContentStyle {
  if (post.companionContentStyle) return post.companionContentStyle;

  const hasMedia = (post.mediaUrls?.length ?? 0) > 0 || post.images > 0;
  const text = post.text?.trim() ?? '';

  if (!hasMedia) return 'update';
  if (!text) return 'gallery';
  if (text.length <= GALLERY_CAPTION_MAX && !text.includes('\n')) return 'gallery';
  return 'update';
}

export function splitCompanionPosts(posts: Post[]) {
  const updates: Post[] = [];
  const gallery: Post[] = [];
  for (const post of posts) {
    if (classifyCompanionPost(post) === 'gallery') gallery.push(post);
    else updates.push(post);
  }
  return { updates, gallery };
}
