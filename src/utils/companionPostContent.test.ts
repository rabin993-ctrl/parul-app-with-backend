/**
 * Run: npx tsx src/utils/companionPostContent.test.ts
 */
import type { Post } from '../data/mockData';
import {
  classifyCompanionPost,
  GALLERY_CAPTION_MAX,
  splitCompanionPosts,
  resolveCompanionContentStyleForInsert,
} from './companionPostContent';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function post(partial: Partial<Post> & Pick<Post, 'id'>): Post {
  return {
    author: 'test',
    authorName: 'Test',
    authorTint: '#000',
    text: '',
    tag: 'discussion',
    label: null,
    images: 0,
    loc: 'Dhaka',
    time: 'Just now',
    paws: 0,
    comments: 0,
    saved: false,
    userId: 'u1',
    companions: [],
    threads: [],
    ...partial,
    id: partial.id,
  };
}

function runTests() {
  assert(
    classifyCompanionPost(post({ id: '1', companionContentStyle: 'gallery', text: 'long text here' }))
      === 'gallery',
    'explicit gallery style wins',
  );

  assert(
    classifyCompanionPost(post({ id: '2', text: 'Hello world' })) === 'update',
    'text-only is update',
  );

  assert(
    classifyCompanionPost(post({ id: '3', text: '', mediaUrls: ['https://x/y.jpg'], images: 1 }))
      === 'gallery',
    'photo-only is gallery',
  );

  const shortCaption = 'a'.repeat(GALLERY_CAPTION_MAX);
  assert(
    classifyCompanionPost(post({
      id: '4',
      text: shortCaption,
      mediaUrls: ['https://x/y.jpg'],
      images: 1,
    })) === 'gallery',
    'photo + short caption is gallery',
  );

  assert(
    classifyCompanionPost(post({
      id: '5',
      text: 'a'.repeat(GALLERY_CAPTION_MAX + 1),
      mediaUrls: ['https://x/y.jpg'],
      images: 1,
    })) === 'update',
    'photo + long caption is update',
  );

  assert(
    classifyCompanionPost(post({
      id: '6',
      text: 'line one\nline two',
      mediaUrls: ['https://x/y.jpg'],
      images: 1,
    })) === 'update',
    'photo + multiline text is update',
  );

  const items = [
    post({ id: 'u1', text: 'update' }),
    post({ id: 'g1', text: '', mediaUrls: ['https://x/y.jpg'], images: 1 }),
  ];
  const split = splitCompanionPosts(items);
  assert(split.updates.length === 1 && split.gallery.length === 1, 'split partitions all posts');
  assert(
    split.updates.every(p => !split.gallery.some(g => g.id === p.id)),
    'no duplicate ids across tabs',
  );

  assert(
    resolveCompanionContentStyleForInsert(post({ id: 'n1', text: 'hi' })) === null,
    'non-companion post returns null',
  );

  assert(
    resolveCompanionContentStyleForInsert(post({
      id: 'n2',
      companionAuthorId: 'c1',
      text: '',
      mediaUrls: ['https://x/y.jpg'],
      images: 1,
    })) === 'gallery',
    'insert default for companion photo',
  );

  console.log('companionPostContent: all tests passed');
}

runTests();
