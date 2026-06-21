import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, StyleSheet, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { radius, spacing, typography } from '../theme/tokens';
import { Button } from '../components/ui/Button';
import { Sheet } from '../components/ui/Sheet';
import { Segmented } from '../components/ui/Segmented';
import { Toast, ToastData } from '../components/ui/Toast';
import { Icon } from '../components/icons/Icon';
import {
  CircleSlugStatus,
  CIRCLE_USERNAME_UNAVAILABLE,
  circleSlugIndicator,
  fetchCircleSlugAvailability,
  slugStatusFromDraft,
  toSlugDraft,
} from '../lib/circleSlug';
import { usePawCircles } from '../context/PawCircleContext';
import { CirclePrivacy, PawCircle } from '../data/pawCircles';
import type { CirclesStackParamList } from '../navigation/CirclesNavigator';
import { HubCircleJoinRequestsSheet } from '../components/JoinRequestsSheet';
import { useTabBarScrollPadding } from '../navigation/tabBarInsets';
import { useTabBarScrollProps } from '../context/TabBarScrollContext';
import { useMediaPicker, type PickedAsset } from '../hooks/useMediaPicker';
import { PawCircleInbox } from './pawCircles/PawCircleInbox';
import { AdoptionPosterInbox } from '../components/adoption/AdoptionPosterInbox';
import type { AdoptionListing } from '../data/adoptionData';
import type { AdoptionRequest } from '../context/AdoptionFeedContext';
import { openAdoptionRequestChat } from '../utils/openAdoptionRequestChat';
import type { ChatThread } from '../context/AdoptionContext';
import { useAdoptionFeed } from '../context/AdoptionFeedContext';
import { useAdoption } from '../context/AdoptionContext';
import { getRescueHelpContext, resolveRescueHelpContext } from '../utils/rescueHelpChat';
import type { PawCircleHubParams } from '../navigation/pawCircleInboxRouting';
import type { PawCircleInboxFilter } from './pawCircles/PawCircleInbox';
import { navigateToChatThread } from '../navigation/chatThreadRouting';
import {
  PawCircleHubHeader,
  pawCircleStyles,
} from './pawCircles/PawCircleChrome';

type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<CirclesStackParamList, 'Hub'>,
  BottomTabNavigationProp<{ Feed: undefined; Circles: undefined }>
>;

/** Default circle avatar before a custom photo is uploaded. */
const CIRCLE_DEFAULT_ICON_BG = '#F0EBFA';

export function CirclesScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute();
  const hubParams = (route.params ?? {}) as PawCircleHubParams;
  const { listings, listingsLoaded, requests, approveRequest, rejectRequest, getRequestsForListing, clearPendingAdoptionReviewPopup, markListingRequestNotificationsRead } = useAdoptionFeed();
  const { threads, records, messages, dismissAdoptionThread, reloadThreads } = useAdoption();
  const {
    ready,
    createdCircles,
    joinedCircles,
    createCircle,
    pendingIncomingRequestCount,
    adminCircles,
    getDbId,
  } = usePawCircles();

  const [toast, setToast] = useState<ToastData | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinRequestsOpen, setJoinRequestsOpen] = useState(false);
  const [reviewListing, setReviewListing] = useState<AdoptionListing | null>(null);
  const [inboxFilter, setInboxFilter] = useState<PawCircleInboxFilter>(hubParams.filter ?? 'all');
  const pendingReviewDeepLinkRef = useRef<string | null>(null);
  const openingReviewFromDeepLinkRef = useRef(false);
  const tabBarPad = useTabBarScrollPadding();
  const tabBarScrollProps = useTabBarScrollProps();

  useEffect(() => {
    if (hubParams.filter) {
      setInboxFilter(hubParams.filter);
    }
  }, [hubParams.filter]);

  // Normal tab visits — show inbox only; dismiss any stale review sheet.
  useFocusEffect(
    useCallback(() => {
      if (openingReviewFromDeepLinkRef.current || pendingReviewDeepLinkRef.current) return;
      setReviewListing(null);
      clearPendingAdoptionReviewPopup();
    }, [clearPendingAdoptionReviewPopup]),
  );

  // Open review popup only from an explicit deep link (e.g. notification tap).
  useEffect(() => {
    const listingId = hubParams.reviewListingId;
    if (!listingId) return;
    openingReviewFromDeepLinkRef.current = true;
    pendingReviewDeepLinkRef.current = listingId;
    navigation.setParams({ reviewListingId: undefined });
    clearPendingAdoptionReviewPopup();
  }, [hubParams.reviewListingId, navigation, clearPendingAdoptionReviewPopup]);

  useEffect(() => {
    const listingId = pendingReviewDeepLinkRef.current;
    if (!listingId) {
      openingReviewFromDeepLinkRef.current = false;
      return;
    }
    const listing = listings.find(l => l.id === listingId);
    if (listing) {
      setReviewListing(listing);
      setInboxFilter('adoption');
      pendingReviewDeepLinkRef.current = null;
      openingReviewFromDeepLinkRef.current = false;
      return;
    }
    if (listingsLoaded) {
      pendingReviewDeepLinkRef.current = null;
      openingReviewFromDeepLinkRef.current = false;
    }
  }, [listings, listingsLoaded]);

  useEffect(() => {
    if (hubParams.threadId) {
      const match = threads.find(t => t.id === hubParams.threadId);
      if (match) {
        const threadMessages = messages[match.id] ?? [];
        const rescueContext = match.rescueContext
          ?? getRescueHelpContext(match.id)
          ?? resolveRescueHelpContext(match, threadMessages);
        const enriched = rescueContext ? { ...match, rescueContext } : match;
        navigateToChatThread(navigation, enriched);
        navigation.setParams({ threadId: undefined });
      }
      return;
    }
    if (hubParams.recordId) {
      const record = records.find(r => r.id === hubParams.recordId);
      const threadId = record?.chatThreadId;
      if (threadId) {
        const match = threads.find(t => t.id === threadId);
        if (match) {
          const threadMessages = messages[match.id] ?? [];
          const rescueContext = match.rescueContext
            ?? getRescueHelpContext(match.id)
            ?? resolveRescueHelpContext(match, threadMessages);
          const enriched = rescueContext ? { ...match, rescueContext } : match;
          navigateToChatThread(navigation, enriched);
          navigation.setParams({ recordId: undefined });
        }
      }
    }
  }, [hubParams.threadId, hubParams.recordId, threads, records, messages, navigation]);

  const allCircles = useMemo(() => {
    const seenIds = new Set<string>();
    const seenDbIds = new Set<string>();
    const out: PawCircle[] = [];
    for (const c of [...createdCircles, ...joinedCircles]) {
      if (seenIds.has(c.id)) continue;
      const dbId = getDbId(c.id);
      if (dbId && seenDbIds.has(dbId)) continue;
      seenIds.add(c.id);
      if (dbId) seenDbIds.add(dbId);
      out.push(c);
    }
    return out;
  }, [createdCircles, joinedCircles, getDbId]);

  const createdIds = useMemo(
    () => new Set(createdCircles.map(c => c.id)),
    [createdCircles],
  );

  const goFeed = () => navigation.getParent()?.navigate('Feed', { screen: 'FeedHome' });

  const reviewRequests = useMemo(
    () => (reviewListing ? getRequestsForListing(reviewListing.id) : []),
    [reviewListing, getRequestsForListing],
  );

  const openRequestChat = async (req: AdoptionRequest) => {
    const opened = await openAdoptionRequestChat({
      request: req,
      approveRequest,
      reloadThreads,
      onOpen: thread => {
        setReviewListing(null);
        navigateToChatThread(navigation, thread);
      },
    });
    if (opened) setReviewListing(null);
  };

  const handleOpenThread = useCallback((thread: ChatThread) => {
    const threadMessages = messages[thread.id] ?? [];
    const rescueContext = resolveRescueHelpContext(thread, threadMessages);
    navigateToChatThread(navigation, rescueContext ? { ...thread, rescueContext } : thread);
  }, [messages, navigation]);

  const adminCirclesKey = useMemo(
    () => adminCircles.map(c => c.dbId).join(','),
    [adminCircles],
  );
  const adminCirclesForRequests = useMemo(
    () => adminCircles.map(c => ({ id: c.id, dbId: c.dbId, name: c.name })),
    [adminCirclesKey],
  );

  if (!ready) {
    return <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']} />;
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <PawCircleHubHeader
        showBack
        onBack={goFeed}
        pendingRequestCount={pendingIncomingRequestCount}
        onPendingRequestsPress={() => setJoinRequestsOpen(true)}
        onCreatePress={() => setCreateOpen(true)}
      />

      <ScrollView
        contentContainerStyle={[pawCircleStyles.pageScroll, { paddingBottom: tabBarPad }]}
        showsVerticalScrollIndicator={false}
        {...tabBarScrollProps}
      >
        <PawCircleInbox
          circles={allCircles}
          createdIds={createdIds}
          listings={listings}
          requests={requests}
          initialFilter={inboxFilter}
          onFilterChange={setInboxFilter}
          onExplore={() => navigation.navigate('Explore')}
          onOpenCircleChat={id => navigation.navigate('CircleChat', { circleId: id, returnTo: 'Hub' })}
          onOpenThread={handleOpenThread}
          onReviewListingRequests={listing => {
            setReviewListing(listing);
            void markListingRequestNotificationsRead(listing.id);
          }}
        />

      </ScrollView>

      <AdoptionPosterInbox
        visible={!!reviewListing}
        listing={reviewListing}
        requests={reviewRequests}
        onClose={() => setReviewListing(null)}
        onReject={(id) => {
          const req = reviewRequests.find(r => r.id === id);
          rejectRequest(id);
          if (req?.threadId) dismissAdoptionThread(req.threadId);
        }}
        onAccept={openRequestChat}
        onOpenChat={openRequestChat}
      />

      <CreateCircleSheet
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={async (name, location, privacy, slug, photo) => {
          const c = await createCircle(name, location, privacy, slug || undefined, photo);
          setCreateOpen(false);
          setToast({ msg: `Created ${c.name}`, icon: 'check', tone: 'success' });
        }}
      />

      <HubCircleJoinRequestsSheet
        visible={joinRequestsOpen}
        onClose={() => setJoinRequestsOpen(false)}
        circles={adminCirclesForRequests}
        expectedCount={pendingIncomingRequestCount}
      />

      <Toast data={toast} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

const PRIVACY_OPTIONS = [
  { id: 'open', label: 'Open' },
  { id: 'request', label: 'Request to join' },
] as const;

function CreateCircleSheet({
  visible,
  onClose,
  onCreate,
}: {
  visible: boolean;
  onClose: () => void;
  onCreate: (
    name: string,
    location: string,
    privacy: CirclePrivacy,
    slug: string,
    photo: PickedAsset | null,
  ) => Promise<void>;
}) {
  const { colors, iconBg } = useTheme();
  const { selectedAsset: photo, pickImage, clear: clearPhoto } = useMediaPicker();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [slugStatus, setSlugStatus] = useState<CircleSlugStatus>('idle');
  const [location, setLocation] = useState('');
  const [privacy, setPrivacy] = useState<CirclePrivacy>('open');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) {
      setName(''); setSlug(''); setSlugEdited(false);
      setSlugStatus('idle'); setLocation('');
      setPrivacy('open'); setError(null);
      clearPhoto();
    }
  }, [visible, clearPhoto]);

  const handleNameChange = (text: string) => {
    setName(text);
    if (!slugEdited) {
      setSlug(toSlugDraft(text));
      setSlugStatus('idle');
    }
  };

  const checkSlug = useCallback((raw: string) => {
    if (checkTimer.current) clearTimeout(checkTimer.current);
    const next = slugStatusFromDraft(raw);
    if (next !== 'checking') {
      setSlugStatus(next);
      return;
    }
    setSlugStatus('checking');
    checkTimer.current = setTimeout(async () => {
      const status = await fetchCircleSlugAvailability(raw);
      setSlugStatus(status);
    }, 420);
  }, []);

  const handleSlugChange = (text: string) => {
    const raw = text.replace(/[^a-z0-9-]/gi, '').toLowerCase();
    setSlug(raw);
    setSlugEdited(true);
    checkSlug(raw);
  };

  const handleCreate = async () => {
    const finalSlug = toSlugDraft(slug) || toSlugDraft(name);
    if (!name.trim() || !finalSlug) return;
    if (slugStatus === 'taken') { setError(CIRCLE_USERNAME_UNAVAILABLE); return; }
    if (slugStatus === 'invalid') { setError('Username must be at least 2 characters.'); return; }
    setError(null);
    setSaving(true);
    try {
      await onCreate(name, location || 'Dhaka', privacy, finalSlug, photo);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg.includes('already taken') ? CIRCLE_USERNAME_UNAVAILABLE : 'Could not create circle. Try again.');
      setSaving(false);
    }
  };

  const indicator = circleSlugIndicator(slugStatus, colors);
  const privacyHint = privacy === 'open'
    ? 'Anyone nearby can find and join this circle.'
    : 'New members must be approved before they can join.';

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Create Circle"
      footer={(
        <View style={{ gap: 6 }}>
          {error && <Text style={[styles.sheetError, { color: '#E5424F' }]}>{error}</Text>}
          <Button
            variant="primary"
            full
            loading={saving}
            disabled={slugStatus === 'taken' || slugStatus === 'invalid'}
            onPress={handleCreate}
          >
            Create Circle
          </Button>
        </View>
      )}
    >
      <View style={styles.sheetBody}>
        <Text style={[styles.sheetLabel, { color: colors.textSecondary }]}>Circle photo</Text>
        <Pressable
          onPress={() => { void pickImage({ squareCrop: true }); }}
          accessibilityRole="button"
          accessibilityLabel={photo ? 'Change circle photo' : 'Add circle photo'}
          style={({ pressed }) => [styles.photoPick, pressed && { opacity: 0.82 }]}
        >
          {photo ? (
            <Image source={{ uri: photo.uri }} style={styles.photoPreview} resizeMode="cover" />
          ) : (
            <View style={[styles.photoPlaceholder, { backgroundColor: iconBg(CIRCLE_DEFAULT_ICON_BG) }]}>
              <Icon name="paw" size={36} color={colors.primary} fill={colors.primary} />
            </View>
          )}
          <View style={[styles.photoBadge, { backgroundColor: colors.primary, borderColor: colors.bg }]}>
            <Icon name="camera" size={11} color="#fff" sw={2.2} />
          </View>
        </Pressable>
        <Text style={[styles.sheetHint, { color: colors.textTertiary }]}>
          Optional. Shown on your circle profile and in search.
        </Text>

        <Text style={[styles.sheetLabel, { color: colors.textSecondary }]}>Circle name</Text>
        <TextInput
          value={name}
          onChangeText={handleNameChange}
          placeholder="e.g. Dhanmondi Paw Circle"
          placeholderTextColor={colors.textTertiary}
          style={[styles.sheetInput, { color: colors.text, borderBottomColor: colors.border }]}
        />

        <View style={styles.slugLabelRow}>
          <Text style={[styles.sheetLabel, { color: colors.textSecondary }]}>Username</Text>
          {indicator && (
            <Text style={[styles.slugIndicator, { color: indicator.color }]}>{indicator.label}</Text>
          )}
        </View>
        <View style={[styles.slugInputRow, { borderBottomColor: colors.border }]}>
          <Text style={[styles.slugAt, { color: colors.textTertiary }]}>@</Text>
          <TextInput
            value={slug}
            onChangeText={handleSlugChange}
            placeholder="dhanmondi-paws"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.slugInput, { color: colors.text }]}
          />
        </View>
        <Text style={[styles.sheetHint, { color: colors.textTertiary }]}>
          Lowercase letters, numbers and hyphens only. Used for search and sharing.
        </Text>

        <Text style={[styles.sheetLabel, { color: colors.textSecondary }]}>Location</Text>
        <TextInput
          value={location}
          onChangeText={setLocation}
          placeholder="Neighbourhood or area"
          placeholderTextColor={colors.textTertiary}
          style={[styles.sheetInput, { color: colors.text, borderBottomColor: colors.border }]}
        />
        <Text style={[styles.sheetLabel, { color: colors.textSecondary }]}>Privacy</Text>
        <Segmented
          options={[...PRIVACY_OPTIONS]}
          value={privacy}
          onChange={id => setPrivacy(id as CirclePrivacy)}
        />
        <Text style={[styles.sheetHint, { color: colors.textTertiary }]}>{privacyHint}</Text>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: spacing.xl3,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  emptyTitle: { ...typography.title },
  emptyBody: { ...typography.small, textAlign: 'center' },
  sheetBody: { paddingHorizontal: spacing.xl, gap: spacing.sm },
  sheetLabel: { ...typography.caption, marginTop: spacing.xs },
  photoPick: {
    alignSelf: 'center',
    marginTop: spacing.xs,
    position: 'relative',
  },
  photoPreview: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  photoPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetHint: { ...typography.meta, lineHeight: 17, marginTop: 2 },
  sheetInput: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 0,
    paddingVertical: 11,
    fontSize: 16,
  },
  slugLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xs },
  slugIndicator: { fontSize: 11.5, fontWeight: '600' },
  slugInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 11,
  },
  slugAt: { fontSize: 16, marginRight: 2 },
  slugInput: { flex: 1, fontSize: 16 },
  sheetError: { fontSize: 12.5, textAlign: 'center' },
});
