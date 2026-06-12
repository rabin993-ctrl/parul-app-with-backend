export type ConsultMode = 'urgent' | 'choose';
export type ConsultStatus =
  | 'finding_vet'
  | 'vet_assigned'
  | 'payment_pending'
  | 'payment_completed'
  | 'session_ready'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'payment_failed';

export type PaymentMethod = 'card' | 'wallet' | 'upi';

export type VetProfile = {
  id: string;
  name: string;
  title: string;
  specialization: string;
  experience: string;
  rating: number;
  reviews: number;
  available: boolean;
  responseMins: number;
  fee: number;
  bio: string;
  languages: string[];
  tint: string;
  verified: boolean;
};

export type IssueCategory = {
  id: string;
  label: string;
  icon: string;
  tint: string;
  bg: string;
  urgent?: boolean;
};

export const ISSUE_CATEGORIES: IssueCategory[] = [
  { id: 'emergency', label: 'Emergency', icon: 'alert', tint: '#D94452', bg: '#FDF0F1', urgent: true },
  { id: 'injury', label: 'Injury', icon: 'medical', tint: '#E0503F', bg: '#FFE8E8', urgent: true },
  { id: 'digestive', label: 'Digestive', icon: 'bone', tint: '#F2972E', bg: '#FDF4E4' },
  { id: 'skin', label: 'Skin & allergies', icon: 'sparkle', tint: '#7A5AE0', bg: '#EDE8FC' },
  { id: 'vaccine', label: 'Vaccination', icon: 'vaccine', tint: '#14A697', bg: '#D6F5EE' },
  { id: 'behaviour', label: 'Behaviour', icon: 'paw', tint: '#7C5CBF', bg: '#F0EBFA' },
  { id: 'general', label: 'General checkup', icon: 'comment', tint: '#3B82C4', bg: '#E8F0FA' },
];

export const DEMO_VETS: VetProfile[] = [
  {
    id: 'v1',
    name: 'Dr. Ananya Rahman',
    title: 'Small Animal Veterinarian',
    specialization: 'Dogs & cats · Emergency care',
    experience: '12 years',
    rating: 4.9,
    reviews: 312,
    available: true,
    responseMins: 3,
    fee: 499,
    bio: 'Compassionate care for companions at home. Former head vet at PawsCare Dhaka.',
    languages: ['English', 'Bengali'],
    tint: '#14A697',
    verified: true,
  },
  {
    id: 'v2',
    name: 'Dr. Rohit Desai',
    title: 'Veterinary Surgeon',
    specialization: 'Surgery · Orthopedics',
    experience: '9 years',
    rating: 4.8,
    reviews: 198,
    available: true,
    responseMins: 5,
    fee: 649,
    bio: 'Specialises in injury assessment and post-operative guidance for pets.',
    languages: ['English', 'Bengali'],
    tint: '#3B82C4',
    verified: true,
  },
  {
    id: 'v3',
    name: 'Dr. Nadia Islam',
    title: 'Feline Specialist',
    specialization: 'Cats · Behaviour',
    experience: '7 years',
    rating: 4.9,
    reviews: 156,
    available: false,
    responseMins: 8,
    fee: 549,
    bio: 'Calm, cat-focused consultations — ideal for anxious kitties and new parents.',
    languages: ['English', 'Bengali'],
    tint: '#7A5AE0',
    verified: true,
  },
  {
    id: 'v4',
    name: 'Dr. Fahim Ahmed',
    title: 'General Veterinarian',
    specialization: 'Puppies & kittens',
    experience: '4 years',
    rating: 4.7,
    reviews: 89,
    available: true,
    responseMins: 4,
    fee: 399,
    bio: 'Friendly guidance for first-time pet parents, vaccines, and nutrition.',
    languages: ['English', 'Bengali'],
    tint: '#2FA46A',
    verified: true,
  },
  {
    id: 'v5',
    name: 'Dr. Meera Shah',
    title: 'Senior Pet Care',
    specialization: 'Geriatric wellness',
    experience: '15 years',
    rating: 5.0,
    reviews: 421,
    available: true,
    responseMins: 6,
    fee: 699,
    bio: 'Gentle support for senior dogs and cats — mobility, diet, and comfort care.',
    languages: ['English', 'Bengali'],
    tint: '#F2972E',
    verified: true,
  },
];

export const PLATFORM_FEE = 49;

export const STATUS_STEPS: { id: ConsultStatus; label: string }[] = [
  { id: 'finding_vet', label: 'Finding vet' },
  { id: 'vet_assigned', label: 'Vet assigned' },
  { id: 'payment_pending', label: 'Payment' },
  { id: 'payment_completed', label: 'Paid' },
  { id: 'session_ready', label: 'Ready' },
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Done' },
];

export function getVetById(id: string) {
  return DEMO_VETS.find(v => v.id === id) ?? null;
}

export function getIssueById(id: string) {
  return ISSUE_CATEGORIES.find(c => c.id === id) ?? null;
}

export function pickAvailableVet(issueId?: string): VetProfile {
  const available = DEMO_VETS.filter(v => v.available);
  if (issueId === 'emergency' || issueId === 'injury') {
    const emergency = available.find(v => v.id === 'v1' || v.id === 'v2');
    if (emergency) return emergency;
  }
  return available[Math.floor(Math.random() * available.length)] ?? DEMO_VETS[0];
}

export function filterVets(
  vets: VetProfile[],
  opts: { query?: string; availableOnly?: boolean; specialization?: string },
) {
  let out = vets;
  if (opts.availableOnly) out = out.filter(v => v.available);
  const q = opts.query?.trim().toLowerCase();
  if (q) {
    out = out.filter(v =>
      v.name.toLowerCase().includes(q)
      || v.specialization.toLowerCase().includes(q)
      || v.bio.toLowerCase().includes(q),
    );
  }
  return out;
}

export function statusTone(status: ConsultStatus): 'success' | 'warning' | 'danger' | 'primary' | 'neutral' {
  if (status === 'completed' || status === 'payment_completed' || status === 'active') return 'success';
  if (status === 'payment_pending' || status === 'finding_vet') return 'warning';
  if (status === 'payment_failed' || status === 'cancelled') return 'danger';
  if (status === 'vet_assigned' || status === 'session_ready') return 'primary';
  return 'neutral';
}

export function statusLabel(status: ConsultStatus): string {
  const map: Record<ConsultStatus, string> = {
    finding_vet: 'Finding available vet…',
    vet_assigned: 'Vet assigned',
    payment_pending: 'Payment pending',
    payment_completed: 'Payment completed',
    session_ready: 'Session ready',
    active: 'Consultation active',
    completed: 'Completed',
    cancelled: 'Cancelled',
    payment_failed: 'Payment failed',
  };
  return map[status];
}

export function feeBreakdown(consultFee: number) {
  return {
    consultFee,
    platformFee: PLATFORM_FEE,
    total: consultFee + PLATFORM_FEE,
  };
}
