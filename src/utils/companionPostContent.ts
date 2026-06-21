import type { Post } from '../data/mockData';

export type CompanionContentStyle = 'update' | 'gallery';

export const GALLERY_CAPTION_MAX = 150;

type ClassifyInput = Pick<Post, 'companionContentStyle' | 'mediaUrls' | 'images' | 'text'> & {
  _pendingMedia?: Post['_pendingMedia'];
  _pendingMedias?: Post['_pendingMedias'];
};

function postHasMedia(post: ClassifyInput): boolean {
  return (post.mediaUrls?.length ?? 0) > 0 || post.images > 0 || !!post._pendingMedia
    || (post._pendingMedias?.length ?? 0) > 0;
}

function inferCompanionContentStyle(post: ClassifyInput): CompanionContentStyle {
  const hasMedia = postHasMedia(post);
  const text = post.text?.trim() ?? '';

  if (!hasMedia) return 'update';
  if (!text) return 'gallery';
  if (text.length <= GALLERY_CAPTION_MAX && !text.includes('\n')) return 'gallery';
  return 'update';
}

/** Classify a companion-profile post as a text update or a gallery photo. */
export function classifyCompanionPost(post: Post): CompanionContentStyle {
  if (post.companionContentStyle) return post.companionContentStyle;
  return inferCompanionContentStyle(post);
}

/** Default style when inserting a companion-authored post without an explicit style. */
export function resolveCompanionContentStyleForInsert(
  post: Pick<Post, 'companionAuthorId' | 'companionContentStyle' | 'mediaUrls' | 'images' | 'text' | '_pendingMedia' | '_pendingMedias'>,
): CompanionContentStyle | null {
  if (!post.companionAuthorId) return null;
  if (post.companionContentStyle) return post.companionContentStyle;
  return inferCompanionContentStyle(post);
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
