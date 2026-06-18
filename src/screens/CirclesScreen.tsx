import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, StyleSheet, Modal, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
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
import { PawCircleLogo } from '../components/ui/PawCircleLogo';
import { PawCircleInbox } from './pawCircles/PawCircleInbox';
import { ChatThreadScreen } from './ChatThreadScreen';
import type { ChatThread } from '../context/AdoptionContext';
import {
  PawCircleHubHeader,
  pawCircleStyles,
} from './pawCircles/PawCircleChrome';

type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<CirclesStackParamList, 'Hub'>,
  BottomTabNavigationProp<{ Feed: undefined; Circles: undefined }>
>;

export function CirclesScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const {
    ready,
    onboardingComplete,
    createdCircles,
    joinedCircles,
    completeOnboarding,
    createCircle,
    pendingIncomingRequestCount,
    getDbId,
  } = usePawCircles();

  const [toast, setToast] = useState<ToastData | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinRequestsOpen, setJoinRequestsOpen] = useState(false);
  const [activeThread, setActiveThread] = useState<ChatThread | null>(null);
  const tabBarPad = useTabBarScrollPadding();
  const tabBarScrollProps = useTabBarScrollProps();

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

  const goFeed = () => navigation.getParent()?.navigate('Feed');

  const adminCircles = useMemo(
    () => createdCircles
      .map(c => ({ id: c.id, dbId: getDbId(c.id) ?? '', name: c.name }))
      .filter(c => c.dbId),
    [createdCircles, getDbId],
  );

  if (!ready) {
    return <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']} />;
  }

  if (!onboardingComplete) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
        <PawCircleHubHeader showBack onBack={goFeed} />
        <PawCircleWelcomeView onContinue={() => completeOnboarding({ joinLocal: false })} />
      </SafeAreaView>
    );
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
          onExplore={() => navigation.navigate('Explore')}
          onOpenCircleChat={id => navigation.navigate('CircleChat', { circleId: id, returnTo: 'Hub' })}
          onOpenDmThread={setActiveThread}
        />

      </ScrollView>

      <Modal visible={!!activeThread} animationType="slide" onRequestClose={() => setActiveThread(null)}>
        {activeThread && (
          <ChatThreadScreen thread={activeThread} onClose={() => setActiveThread(null)} />
        )}
      </Modal>

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
        circles={adminCircles}
      />

      <Toast data={toast} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

const WELCOME_POINTS = [
  {
    icon: 'comment',
    tint: '#7C5CBF',
    bg: '#F0EBFA',
    title: 'Chat & share',
    body: 'Swap tips, plan meet-ups, and keep up with the companions around you.',
  },
  {
    icon: 'alert',
    tint: '#E5424F',
    bg: '#FFE8E8',
    title: 'Look out for each other',
    body: 'Lost-pet alerts and local help travel faster when neighbors are connected.',
  },
] as const;

function PawCircleWelcomeView({ onContinue }: { onContinue: () => void | Promise<void> }) {
  const { colors, iconBg } = useTheme();
  const tabBarPad = useTabBarScrollPadding();
  const [continuing, setContinuing] = useState(false);

  const handleContinue = async () => {
    setContinuing(true);
    try {
      await onContinue();
    } finally {
      setContinuing(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.welcomeScroll, { paddingBottom: tabBarPad + spacing.xl }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.welcomeHero}>
        <PawCircleLogo size={72} />
        <Text style={[styles.welcomeTitle, { color: colors.text }]}>Welcome to Paw Circle</Text>
        <Text style={[styles.welcomeLead, { color: colors.textSecondary }]}>
          Your neighborhood, your pack.
        </Text>
      </View>

      <Text style={[styles.welcomeBody, { color: colors.textSecondary }]}>
        Paw Circle is a home for pet owners, fosters, and animal lovers nearby — small local groups
        where everyday companion life actually happens.
      </Text>

      <View style={styles.welcomePoints}>
        {WELCOME_POINTS.map(point => (
          <View
            key={point.title}
            style={[styles.welcomePoint, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={[styles.welcomePointIcon, { backgroundColor: iconBg(point.bg) }]}>
              <Icon name={point.icon} size={18} color={point.tint} />
            </View>
            <View style={styles.welcomePointCopy}>
              <Text style={[styles.welcomePointTitle, { color: colors.text }]}>{point.title}</Text>
              <Text style={[styles.welcomePointBody, { color: colors.textSecondary }]}>{point.body}</Text>
            </View>
          </View>
        ))}
      </View>

      <Text style={[styles.welcomeTagline, { color: colors.textTertiary }]}>
        Find your circle, say hello, and stay close to the people who get it.
      </Text>

      <Button
        variant="primary"
        full
        loading={continuing}
        onPress={handleContinue}
        style={{ marginTop: spacing.xl2 }}
      >
        Get started
      </Button>

      <Text style={[styles.welcomeOnce, { color: colors.textTertiary }]}>
        Shown once — you will not see this again.
      </Text>
    </ScrollView>
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
  const { colors } = useTheme();
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
          accessibilityLabel="Add circle photo"
          style={({ pressed }) => [styles.photoPick, pressed && { opacity: 0.82 }]}
        >
          {photo ? (
            <Image source={{ uri: photo.uri }} style={styles.photoPreview} resizeMode="cover" />
          ) : (
            <View style={[styles.photoPlaceholder, { backgroundColor: colors.primary + '10', borderColor: colors.border }]}>
              <Icon name="camera" size={22} color={colors.primary} />
              <Text style={[styles.photoPlaceholderText, { color: colors.textSecondary }]}>Add photo</Text>
            </View>
          )}
          {photo ? (
            <View style={[styles.photoBadge, { backgroundColor: colors.primary, borderColor: colors.bg }]}>
              <Icon name="camera" size={11} color="#fff" sw={2.2} />
            </View>
          ) : null}
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
  welcomeScroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  welcomeHero: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  welcomeLead: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  welcomeBody: {
    ...typography.bodySm,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.sm,
  },
  welcomePoints: {
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  welcomePoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  welcomePointIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  welcomePointCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  welcomePointTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  welcomePointBody: {
    ...typography.small,
    lineHeight: 19,
  },
  welcomeTagline: {
    ...typography.small,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
    fontStyle: 'italic',
  },
  welcomeOnce: {
    ...typography.meta,
    textAlign: 'center',
    marginTop: spacing.md,
  },
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
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  photoPlaceholderText: {
    fontSize: 11.5,
    fontWeight: '600',
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
