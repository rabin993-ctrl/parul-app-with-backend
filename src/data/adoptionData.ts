import { adoptions as baseAdoptions } from './mockData';

export type AdoptionStatus = 'Available' | 'Urgent' | 'Adopted';
export type AdoptionSpecies = 'dog' | 'cat' | 'other';
export type VaccinationStatus = 'Done' | 'Partial' | 'Not yet';

export type AdoptionListing = {
  id: string;
  pet: string | null;
  name: string;
  species: AdoptionSpecies;
  icon: string;
  breed: string;
  age: string;
  ageGroup: 'puppy-kitten' | 'young' | 'adult' | 'senior';
  gender: 'Male' | 'Female';
  loc: string;
  location: string;
  vacc: VaccinationStatus;
  tint: string;
  owner: string;
  userId: string;
  urgent: boolean;
  status: AdoptionStatus;
  rating?: number;
  reviews?: number;
  about?: string;
  personality: string;
  story: string;
  requirements: string[];
  neutered: boolean;
  microchipped: boolean;
  healthNotes: string;
  gallery: string[];
  /** Signed or local URLs for listing photos (when uploaded). */
  mediaUrls?: string[];
  postedAt: string;
  adoptedDate?: string;
  adoptedNote?: string;
  posterName?: string;
  posterHandle?: string;
  posterTint?: string;
};

export type AdoptionFilters = {
  species: AdoptionSpecies | 'all';
  location: string | 'all';
  ageGroup: AdoptionListing['ageGroup'] | 'all';
  gender: 'Male' | 'Female' | 'all';
  urgency: 'all' | 'urgent' | 'not-urgent';
  vaccinated: 'all' | 'yes' | 'no';
  status: AdoptionStatus | 'all' | 'available-only';
};

export const DEFAULT_ADOPTION_FILTERS: AdoptionFilters = {
  species: 'all',
  location: 'all',
  ageGroup: 'all',
  gender: 'all',
  urgency: 'all',
  vaccinated: 'all',
  status: 'available-only',
};

export const ADOPTION_LOCATIONS = ['Dhanmondi', 'Gulshan', 'Banani', 'Uttara', 'Mirpur', 'Mohammadpur', 'Old Dhaka', 'Bashundhara'];

export const ADOPTION_SPECIES_OPTIONS = [
  { id: 'all', label: 'All pets', icon: 'paw' },
  { id: 'dog', label: 'Dogs', icon: 'dog' },
  { id: 'cat', label: 'Cats', icon: 'cat' },
] as const;

function enrich(base: (typeof baseAdoptions)[0], extra: Partial<AdoptionListing>): AdoptionListing {
  return {
    id: base.id,
    pet: base.pet,
    name: base.name,
    species: base.species as AdoptionSpecies,
    icon: base.icon,
    breed: base.breed,
    age: base.age,
    ageGroup: base.age.includes('week') || base.age.includes('month') && parseInt(base.age) < 12
      ? 'puppy-kitten'
      : base.age.includes('yr') && parseInt(base.age) >= 7
        ? 'senior'
        : base.age.includes('yr')
          ? 'adult'
          : 'young',
    gender: base.gender as 'Male' | 'Female',
    loc: base.loc,
    location: base.location,
    vacc: base.vacc as VaccinationStatus,
    tint: base.tint,
    owner: base.owner,
    userId: base.userId,
    urgent: base.urgent,
    status: base.status as AdoptionStatus,
    rating: base.rating,
    reviews: base.reviews,
    about: base.about,
    personality: extra.personality ?? 'Loving and ready for a calm home.',
    story: extra.story ?? base.about ?? '',
    requirements: extra.requirements ?? [
      'Stable home with daily walks or play time',
      'Commitment to vaccinations and vet care',
      'Meet-and-greet with all household members',
    ],
    neutered: extra.neutered ?? base.vacc === 'Done',
    microchipped: extra.microchipped ?? true,
    healthNotes: extra.healthNotes ?? `Vaccination: ${base.vacc}. Regular vet check advised.`,
    gallery: extra.gallery ?? [base.tint, base.tint + '99', base.tint + '66'],
    postedAt: extra.postedAt ?? '3 days ago',
    adoptedDate: extra.adoptedDate,
    adoptedNote: extra.adoptedNote,
  };
}

export const DEMO_ADOPTION_LISTINGS: AdoptionListing[] = [
  enrich(baseAdoptions[0], {
    personality: 'Tiny storm-drain survivor with a brave heart.',
    story: 'Pepper was rescued during monsoon flooding. She is dewormed, microchipped, and learning to trust humans fast.',
    requirements: ['Puppy-experienced home', 'No stairs-only apartments', 'Adoption fee covers first vaccines'],
    healthNotes: 'Partial vaccines · dewormed · microchipped',
    postedAt: '2 days ago',
  }),
  enrich(baseAdoptions[1], {
    personality: 'Playful purr machine who loves window sunbeams.',
    story: 'Mochi was found as a solo kitten near Mirpur metro. Neutered and fully vaccinated.',
    requirements: ['Indoor-only preferred', 'Another playful cat is a plus', 'No dogs in home'],
    neutered: true,
    postedAt: '5 days ago',
  }),
  enrich(baseAdoptions[2], {
    personality: 'Gentle indie soul — walks and cuddles in equal measure.',
    story: 'Biscuit lived on a friendly street corner before volunteers brought him in. Great with adults and teens.',
    requirements: ['Daily walks', 'Secure balcony or yard', 'Patient introduction to other pets'],
    postedAt: '1 week ago',
  }),
  enrich(baseAdoptions[3], {
    personality: 'Communicates entirely through slow blinks.',
    story: 'Olive prefers quiet evenings and soft blankets. Currently in a foster home pending adoption.',
    requirements: ['Calm household', 'No young children', 'Litter box in quiet corner'],
    postedAt: '4 days ago',
  }),
  {
    id: 'a5',
    pet: null,
    name: 'Bruno',
    species: 'dog',
    icon: 'dog',
    breed: 'Indie mix',
    age: '4 yrs',
    ageGroup: 'adult',
    gender: 'Male',
    loc: 'Dhanmondi',
    location: 'Dhanmondi',
    vacc: 'Done',
    tint: '#F2972E',
    owner: 'you',
    userId: 'you',
    urgent: false,
    status: 'Adopted',
    rating: 4.9,
    reviews: 24,
    personality: 'Forever grateful cuddle bug.',
    story: 'Bruno spent two years on the streets before finding his family through Parul.',
    requirements: [],
    neutered: true,
    microchipped: true,
    healthNotes: 'Fully vaccinated · neutered',
    gallery: ['#F2972E', '#F2972E99'],
    postedAt: '2 months ago',
    adoptedDate: 'Jan 2025',
    adoptedNote: 'Successfully adopted by the Rahman family',
  },
  {
    id: 'a6',
    pet: null,
    name: 'Luna',
    species: 'cat',
    icon: 'cat',
    breed: 'Persian mix',
    age: '3 yrs',
    ageGroup: 'adult',
    gender: 'Female',
    loc: 'Mirpur',
    location: 'Mirpur',
    vacc: 'Done',
    tint: '#D9489A',
    owner: 'riya',
    userId: 'riya',
    urgent: true,
    status: 'Urgent',
    rating: 4.5,
    reviews: 2,
    personality: 'Shy at first, deeply loyal once she trusts you.',
    story: 'Owner relocated abroad. Luna needs a quiet home within two weeks.',
    requirements: ['Adult-only home', 'No other cats initially', 'Grooming experience helpful'],
    neutered: true,
    microchipped: true,
    healthNotes: 'Vaccinated · regular grooming needed',
    gallery: ['#D9489A', '#D9489A88'],
    postedAt: '1 day ago',
  },
  {
    id: 'a7',
    pet: null,
    name: 'Coco',
    species: 'dog',
    icon: 'dog',
    breed: 'Beagle mix',
    age: '10 yrs',
    ageGroup: 'senior',
    gender: 'Female',
    loc: 'Banani',
    location: 'Banani',
    vacc: 'Done',
    tint: '#3B82C4',
    owner: 'dev',
    userId: 'dev',
    urgent: false,
    status: 'Available',
    rating: 5.0,
    reviews: 41,
    personality: 'Senior sweetheart who still enjoys short park walks.',
    story: 'Coco was surrendered when her owner moved overseas. She loves gentle routines.',
    requirements: ['Senior-pet experience', 'Ground-floor access', 'Vet budget for arthritis care'],
    neutered: true,
    microchipped: true,
    healthNotes: 'Senior wellness plan · arthritis managed',
    gallery: ['#3B82C4'],
    postedAt: '6 days ago',
  },
];

export function getAdoptionListing(id: string, listings: AdoptionListing[]) {
  return listings.find(l => l.id === id) ?? null;
}

export function filterAdoptionListings(
  listings: AdoptionListing[],
  opts: { query?: string; filters?: Partial<AdoptionFilters> },
): AdoptionListing[] {
  const f = { ...DEFAULT_ADOPTION_FILTERS, ...opts.filters };
  let out = listings;

  if (f.status === 'available-only') {
    out = out.filter(l => l.status !== 'Adopted');
  } else if (f.status !== 'all') {
    out = out.filter(l => l.status === f.status);
  }

  if (f.species !== 'all') out = out.filter(l => l.species === f.species);
  if (f.location !== 'all') out = out.filter(l => l.location === f.location);
  if (f.ageGroup !== 'all') out = out.filter(l => l.ageGroup === f.ageGroup);
  if (f.gender !== 'all') out = out.filter(l => l.gender === f.gender);
  if (f.urgency === 'urgent') out = out.filter(l => l.urgent);
  if (f.urgency === 'not-urgent') out = out.filter(l => !l.urgent);
  if (f.vaccinated === 'yes') out = out.filter(l => l.vacc === 'Done');
  if (f.vaccinated === 'no') out = out.filter(l => l.vacc !== 'Done');

  const q = opts.query?.trim().toLowerCase();
  if (q) {
    out = out.filter(l =>
      l.name.toLowerCase().includes(q)
      || l.breed.toLowerCase().includes(q)
      || l.location.toLowerCase().includes(q)
      || l.personality.toLowerCase().includes(q)
    );
  }

  return out;
}

export function statusBadgeTone(status: AdoptionStatus): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'Available') return 'success';
  if (status === 'Urgent') return 'danger';
  return 'neutral';
}
