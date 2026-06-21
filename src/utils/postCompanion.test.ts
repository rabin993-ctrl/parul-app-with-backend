/**
 * Run: npx tsx src/utils/postCompanion.test.ts
 */
import type { Post } from '../data/mockData';
import {
  filterCompanionAuthoredPosts,
  isCompanionAuthoredPost,
  isUserProfileFeedPost,
  postReferencesCompanion,
} from './postCompanion';

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
    circle: false,
    ...partial,
  };
}

assert(
  isUserProfileFeedPost(post({ id: '1', userId: 'u1', companions: ['c1'] }), 'u1'),
  'tagged companion post belongs on user profile',
);
assert(
  !isUserProfileFeedPost(post({ id: '2', userId: 'u1', companionAuthorId: 'c1' }), 'u1'),
  'companion-authored post excluded from user profile',
);
assert(
  !isUserProfileFeedPost(post({ id: '3', userId: 'u2' }), 'u1'),
  'other user posts excluded',
);

assert(
  isCompanionAuthoredPost(post({ id: '4', companionAuthorId: 'c1' }), 'c1'),
  'companion-authored post belongs on companion profile',
);
assert(
  !isCompanionAuthoredPost(post({ id: '5', companions: ['c1'] }), 'c1'),
  'tagged-only post excluded from companion profile',
);
assert(
  postReferencesCompanion(post({ id: '6', companions: ['c1'] }), 'c1'),
  'tagged post still references companion for other flows',
);

const filtered = filterCompanionAuthoredPosts([
  post({ id: '7', companionAuthorId: 'c1' }),
  post({ id: '8', companions: ['c1'] }),
], 'c1');
assert(filtered.length === 1 && filtered[0].id === '7', 'filter keeps authored-only posts');

console.log('postCompanion.test.ts: all passed');
