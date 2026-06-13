import { getMockPhotoUri } from './mockImages';
import { PawCircle } from './pawCircles';

export type CircleMemberRole = 'admin' | 'member';

export type CircleMember = {
  userId: string;
  role: CircleMemberRole;
  joinedAt: string;
};

export type CircleJoinRequest = {
  userId: string;
  note?: string;
  time: string;
};

export type CircleMessage =
  | { id: string; type: 'text'; userId: string; text: string; time: string }
  | { id: string; type: 'system'; text: string; time: string }
  | { id: string; type: 'shared_post'; userId: string; postId: string; time: string };

export type CirclePreview = {
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
};

const DEFAULT_MEMBERS: CircleMember[] = [
  { userId: 'you', role: 'admin', joinedAt: 'Jan 2024' },
  { userId: 'omar', role: 'member', joinedAt: 'Feb 2024' },
  { userId: 'lena', role: 'member', joinedAt: 'Mar 2024' },
  { userId: 'dev', role: 'member', joinedAt: 'Apr 2024' },
  { userId: 'sam', role: 'member', joinedAt: 'May 2024' },
];

const MESSAGES_BY_CIRCLE: Record<string, CircleMessage[]> = {
  dhanmondi: [
    { id: 'm1', type: 'system', text: 'Priya joined the circle', time: 'Yesterday' },
    { id: 'm2', type: 'text', userId: 'omar', text: 'Anyone up for a morning walk at Dhanmondi Lake?', time: '10:42 AM' },
    { id: 'm3', type: 'shared_post', userId: 'you', postId: 'p5', time: '11:05 AM' },
    { id: 'm4', type: 'text', userId: 'lena', text: 'The sunny spot dispute is real 😂', time: '11:18 AM' },
    { id: 'm5', type: 'text', userId: 'dev', text: 'I can bring treats for the park meetup Saturday.', time: '2:30 PM' },
  ],
  'paw-circle': [
    { id: 'c1', type: 'system', text: 'You created this circle', time: '3 days ago' },
    { id: 'c2', type: 'text', userId: 'omar', text: 'Welcome everyone! Post your weekend plans here.', time: 'Yesterday' },
    { id: 'c3', type: 'shared_post', userId: 'omar', postId: 'p1', time: '9:15 AM' },
    { id: 'c4', type: 'text', userId: 'sam', text: 'Rocky would love that lake path.', time: '9:22 AM' },
  ],
  'cat-parents': [
    { id: 't1', type: 'text', userId: 'lena', text: 'Circle-only: anyone free for a cat-sit next weekend?', time: '3h ago' },
    { id: 't2', type: 'text', userId: 'you', text: 'I can cover Saturday! Luna sends solidarity.', time: '2h ago' },
  ],
  'pet-rescue': [
    { id: 'r1', type: 'shared_post', userId: 'dev', postId: 'p2', time: '1h ago' },
    { id: 'r2', type: 'text', userId: 'sam', text: 'Sharing with our foster network right now.', time: '52m ago' },
  ],
};

const PREVIEWS: Record<string, CirclePreview> = {
  dhanmondi: { lastMessage: 'Dev: I can bring treats for the park meetup…', lastMessageTime: '2:30 PM', unread: 2 },
  'paw-circle': { lastMessage: 'Sam: Rocky would love that lake path.', lastMessageTime: '9:22 AM', unread: 0 },
  'cat-parents': { lastMessage: 'You: I can cover Saturday! Luna sends…', lastMessageTime: '2h ago', unread: 1 },
  'pet-rescue': { lastMessage: 'Sam: Sharing with our foster network…', lastMessageTime: '52m ago', unread: 3 },
};

const DHANMONDI_MEMBERS: CircleMember[] = [
  { userId: 'you', role: 'admin', joinedAt: 'Jan 2024' },
  { userId: 'omar', role: 'member', joinedAt: 'Feb 2024' },
  { userId: 'lena', role: 'member', joinedAt: 'Mar 2024' },
  { userId: 'dev', role: 'member', joinedAt: 'Apr 2024' },
  { userId: 'sam', role: 'member', joinedAt: 'May 2024' },
  { userId: 'priya', role: 'member', joinedAt: 'Jun 2024' },
  { userId: 'riya', role: 'member', joinedAt: 'Jul 2024' },
  { userId: 'kabir', role: 'member', joinedAt: 'Aug 2024' },
  { userId: 'noor', role: 'member', joinedAt: 'Sep 2024' },
  { userId: 'arjun', role: 'member', joinedAt: 'Oct 2024' },
  { userId: 'tasnim', role: 'member', joinedAt: 'Nov 2024' },
  { userId: 'farhan', role: 'member', joinedAt: 'Dec 2024' },
  { userId: 'meher', role: 'member', joinedAt: 'Feb 2025' },
  { userId: 'anika', role: 'member', joinedAt: 'Mar 2025' },
  { userId: 'sohail', role: 'member', joinedAt: 'Apr 2025' },
  { userId: 'lamia', role: 'member', joinedAt: 'May 2025' },
  { userId: 'rubina', role: 'member', joinedAt: 'Yesterday' },
  { userId: 'tareq', role: 'member', joinedAt: 'Today' },
  { userId: 'nadia', role: 'member', joinedAt: '2h ago' },
  { userId: 'karim', role: 'member', joinedAt: '6h ago' },
  { userId: 'zara', role: 'member', joinedAt: 'This week' },
  { userId: 'imran', role: 'member', joinedAt: '2d' },
  { userId: 'salma', role: 'member', joinedAt: '3d' },
  { userId: 'huda', role: 'member', joinedAt: '5d' },
  { userId: 'rafiq', role: 'member', joinedAt: '1w' },
];

const MEMBERS_BY_CIRCLE: Record<string, CircleMember[]> = {
  dhanmondi: DHANMONDI_MEMBERS,
  'paw-circle': [
    { userId: 'you', role: 'admin', joinedAt: 'This week' },
    { userId: 'omar', role: 'member', joinedAt: 'This week' },
    { userId: 'priya', role: 'member', joinedAt: 'Yesterday' },
  ],
  'cat-parents': [
    { userId: 'lena', role: 'admin', joinedAt: 'Jun 2022' },
    { userId: 'you', role: 'member', joinedAt: 'Aug 2023' },
    { userId: 'omar', role: 'member', joinedAt: 'Sep 2023' },
  ],
  'pet-rescue': [
    { userId: 'dev', role: 'admin', joinedAt: 'Nov 2021' },
    { userId: 'sam', role: 'member', joinedAt: 'Feb 2022' },
    { userId: 'you', role: 'member', joinedAt: 'Jan 2024' },
  ],
};

const DEMO_JOIN_REQUESTS: CircleJoinRequest[] = [
  { userId: 'riya', note: 'Neighbour — would love to join!', time: '2h ago' },
  { userId: 'sam', note: 'Met at the Uttara adoption camp 🐾', time: '1d ago' },
  { userId: 'priya', note: 'New pup parent nearby, happy to help with meetups', time: '2d ago' },
  { userId: 'lena', note: 'Cat person — saw your circle on Explore', time: '3d ago' },
  { userId: 'dev', note: 'Vet tech in the area, can share adoption tips', time: '4d ago' },
  { userId: 'omar', note: 'Weekend trail walks — would love to join', time: '5d ago' },
  { userId: 'kabir', note: 'Morning lake walks, live close by', time: '1w ago' },
  { userId: 'arjun', note: 'Organise park meetups — keen to collaborate', time: '1w ago' },
  { userId: 'noor', note: 'Fosters seniors nearby — happy to volunteer', time: '1w ago' },
  { userId: 'tasnim', note: 'Indie dog advocate in the neighbourhood', time: '2w ago' },
  { userId: 'farhan', note: 'Vet student — can help with health tips', time: '2w ago' },
  { userId: 'nadia', note: 'New to the area, looking for pet friends', time: '2w ago' },
  { userId: 'karim', note: 'Rescue transport volunteer — count me in', time: '3w ago' },
  { userId: 'zara', note: 'Puppy parent learning the ropes', time: '3w ago' },
  { userId: 'imran', note: 'Beagle dad — weekend park walks', time: '3w ago' },
  { userId: 'salma', note: 'Cat-sits for the block — would love to join', time: '1mo ago' },
  { userId: 'huda', note: 'Birds, bunnies, and one loud parrot 🐾', time: '1mo ago' },
  { userId: 'rafiq', note: 'Sunday park cleanup crew', time: '1mo ago' },
  { userId: 'meher', note: 'Photographs street dogs for adoption posts', time: '1mo ago' },
  { userId: 'anika', note: 'Golden retriever mum — keen to connect', time: '5w ago' },
  { userId: 'sohail', note: 'Runs the weekend adoption stall', time: '5w ago' },
  { userId: 'lamia', note: 'Two indies, one couch — hi everyone!', time: '6w ago' },
  { userId: 'rubina', note: 'Senior pet care tips & meetups', time: '6w ago' },
];

const JOIN_REQUESTS: Record<string, CircleJoinRequest[]> = {
  'paw-circle': DEMO_JOIN_REQUESTS,
  'circle-101': DEMO_JOIN_REQUESTS,
};

export type PinnedMessage = {
  id: string;
  userId: string;
  text: string;
  time: string;
};

export type SharedMediaItem = {
  id: string;
  type: 'photo' | 'file';
  uri?: string;
  name: string;
  size?: string;
  time?: string;
};

const SHARED_MEDIA: SharedMediaItem[] = [
  { id: 'ph1', type: 'photo', uri: getMockPhotoUri('circle-ph1'), name: 'Park meetup.jpg', time: 'Yesterday' },
  { id: 'ph2', type: 'photo', uri: getMockPhotoUri('circle-ph2'), name: 'Morning walk.jpg', time: '3d ago' },
  { id: 'ph3', type: 'photo', uri: getMockPhotoUri('circle-ph3'), name: 'Lake sunset.jpg', time: '1w ago' },
  { id: 'ph4', type: 'photo', uri: getMockPhotoUri('circle-ph4'), name: 'Treat day.jpg', time: '2w ago' },
  { id: 'ph5', type: 'photo', uri: getMockPhotoUri('circle-ph5'), name: 'Group photo.jpg', time: '3w ago' },
  { id: 'ph6', type: 'photo', uri: getMockPhotoUri('circle-ph6'), name: 'Playdate.jpg', time: '1mo ago' },
  { id: 'f1', type: 'file', name: 'Vaccination schedule.pdf', size: '240 KB', time: '2d ago' },
  { id: 'f2', type: 'file', name: 'Park rules.docx', size: '88 KB', time: '1w ago' },
];

const PINNED_MEDIA = SHARED_MEDIA
  .filter(m => m.type === 'photo' && m.uri)
  .slice(0, 4)
  .map(m => m.uri!);

const PINNED_BY_CIRCLE: Record<string, PinnedMessage[]> = {
  dhanmondi: [
    { id: 'pin1', userId: 'dev', text: 'Saturday park meetup at Dhanmondi Lake — bring treats!', time: 'Yesterday' },
    { id: 'pin2', userId: 'omar', text: 'Morning walk group meets at 7 AM by the lake gate.', time: '3d ago' },
    { id: 'pin3', userId: 'you', text: 'Vaccination drive next Sunday — share with neighbours.', time: '1w ago' },
  ],
  'paw-circle': [
    { id: 'pin4', userId: 'omar', text: 'Welcome everyone! Post your weekend plans here.', time: '3d ago' },
  ],
};

export function getCirclePreview(circleId: string): CirclePreview {
  return PREVIEWS[circleId] ?? {
    lastMessage: 'Say hello to your circle!',
    lastMessageTime: '',
    unread: 0,
  };
}

export function getCircleMessages(circleId: string): CircleMessage[] {
  return MESSAGES_BY_CIRCLE[circleId] ?? [
    { id: 'empty1', type: 'system', text: 'This is the start of your circle chat', time: 'Now' },
  ];
}

export function getCircleMembers(circleId: string, circle?: PawCircle | null): CircleMember[] {
  const base = MEMBERS_BY_CIRCLE[circleId] ?? DEFAULT_MEMBERS;
  if (circle && !base.some(m => m.userId === 'you')) {
    return [{ userId: 'you', role: 'member', joinedAt: 'Recently' }, ...base];
  }
  return base;
}

export function getJoinRequests(circleId: string): CircleJoinRequest[] {
  return JOIN_REQUESTS[circleId] ?? [];
}

export function countJoinRequests(circleId: string): number {
  return getJoinRequests(circleId).length;
}

export function countJoinRequestsForCircles(circleIds: Iterable<string>): number {
  let total = 0;
  for (const id of circleIds) {
    total += countJoinRequests(id);
  }
  return total;
}

export function getPinnedMedia(_circleId?: string) {
  return PINNED_MEDIA;
}

export function getSharedMedia(_circleId?: string): SharedMediaItem[] {
  return SHARED_MEDIA;
}

export function getPinnedMessages(circleId: string): PinnedMessage[] {
  return PINNED_BY_CIRCLE[circleId] ?? [];
}

export function getMentionableCircles(created: PawCircle[], joined: PawCircle[]) {
  const seen = new Set<string>();
  const all: PawCircle[] = [];
  for (const c of [...created, ...joined]) {
    if (!seen.has(c.id)) {
      seen.add(c.id);
      all.push(c);
    }
  }
  return all;
}

export function getMentionableMembers(_created: PawCircle[], _joined: PawCircle[]) {
  return [];
}

export function resolvePost(_postId: string) {
  return null;
}
