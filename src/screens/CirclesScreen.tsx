import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, StyleSheet, Platform, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { radius, spacing, typography } from '../theme/tokens';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { Sheet } from '../components/ui/Sheet';
import { Segmented } from '../components/ui/Segmented';
import { Toast, ToastData } from '../components/ui/Toast';
import { Icon } from '../components/icons/Icon';
import { supabase } from '../lib/supabase';
import { usePawCircles } from '../context/PawCircleContext';
import { CirclePrivacy, PawCircle } from '../data/pawCircles';
import { useCurrentUserProfile } from '../context/CurrentUserProfileContext';
import { useNotifications } from '../hooks/useNotifications';
import type { CirclesStackParamList } from '../navigation/CirclesNavigator';
import { useTabBarScrollPadding } from '../navigation/tabBarInsets';
import { useTabBarScrollProps } from '../context/TabBarScrollContext';
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
    exploreCircles,
  } = usePawCircles();
  const { me } = useCurrentUserProfile();
  const { notifs } = useNotifications();
  const unreadNotifCount = notifs.filter(n => !n.read).length;

  const [toast, setToast] = useState<ToastData | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [activeThread, setActiveThread] = useState<ChatThread | null>(null);
  const tabBarPad = useTabBarScrollPadding();
  const tabBarScrollProps = useTabBarScrollProps();

  const allCircles = [
    ...createdCircles,
    ...joinedCircles.filter(j => !createdCircles.some(c => c.id === j.id)),
  ];

  const createdIds = useMemo(
    () => new Set(createdCircles.map(c => c.id)),
    [createdCircles],
  );

  const suggestedCircle: PawCircle | null = (() => {
    const open = exploreCircles.filter(c => c.privacy === 'open');
    if (!open.length) return null;
    const userLoc = me?.location?.toLowerCase().trim() ?? '';
    if (userLoc) {
      const match = open.find(c => c.location.toLowerCase().includes(userLoc));
      if (match) return match;
    }
    return open[0];
  })();

  const goFeed = () => navigation.getParent()?.navigate('Feed');
  const goNotifications = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigation.getParent() as any)?.navigate('Profile', { screen: 'Notifications', initial: false });
  }, [navigation]);

  if (!ready) {
    return <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']} />;
  }

  if (!onboardingComplete) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
        <PawCircleHubHeader showBack onBack={goFeed} notificationCount={unreadNotifCount} onNotificationsPress={goNotifications} />
        <OnboardingView
          suggestedCircle={suggestedCircle}
          onJoin={async () => {
            await completeOnboarding({ joinLocal: true });
            setToast({ msg: 'Joined your local circle!', icon: 'check', tone: 'success' });
          }}
          onSkip={async () => {
            await completeOnboarding({ joinLocal: false });
          }}
        />
        <Toast data={toast} onHide={() => setToast(null)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <PawCircleHubHeader showBack onBack={goFeed} />

      <ScrollView
        contentContainerStyle={[pawCircleStyles.pageScroll, { paddingBottom: tabBarPad }]}
        showsVerticalScrollIndicator={false}
        {...tabBarScrollProps}
      >
        <PawCircleInbox
          circles={allCircles}
          createdIds={createdIds}
          onCreate={() => setCreateOpen(true)}
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
        onCreate={async (name, location, privacy, slug) => {
          const c = await createCircle(name, location, privacy, slug || undefined);
          setCreateOpen(false);
          setToast({ msg: `Created ${c.name}`, icon: 'check', tone: 'success' });
        }}
      />

      <Toast data={toast} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

const PLACEHOLDER_TINTS = ['#F2972E', '#7A5AE0', '#14A697'];

function OnboardingView({
  suggestedCircle,
  onJoin,
  onSkip,
}: {
  suggestedCircle: PawCircle | null;
  onJoin: () => void;
  onSkip: () => void;
}) {
  const { colors, iconBg } = useTheme();
  const [joining, setJoining] = useState(false);
  const tabBarPad = useTabBarScrollPadding();

  const circleName = suggestedCircle?.name ?? 'Local Paw Circle';
  const circleLocation = suggestedCircle?.location
    ? `${suggestedCircle.location} · pet owners & fosters`
    : 'Nearby pet owners & fosters';
  const memberCount = suggestedCircle?.memberCount ?? 0;
  const extraCount = Math.max(0, memberCount - 3);

  return (
    <ScrollView
      contentContainerStyle={[styles.onboardScroll, { paddingBottom: tabBarPad }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.onboardHero}>
        <PawCircleLogo size={64} />
        <Text style={[styles.onboardTitle, { color: colors.text }]}>Welcome to Paw Circle</Text>
        <Text style={[styles.onboardSubtitle, { color: colors.textSecondary }]}>
          Connect locally
        </Text>
      </View>

      <View style={styles.localBlock}>
        <View style={styles.localCardHeader}>
          <View style={[styles.localPin, { backgroundColor: iconBg('#D6F5EE') }]}>
            <Icon name="mapPin" size={14} color="#14A697" />
          </View>
          <Text style={[styles.localEyebrow, { color: colors.primary }]}>
            {suggestedCircle ? 'Your local circle' : 'Find your circle'}
          </Text>
        </View>
        <Text style={[styles.localName, { color: colors.text }]}>{circleName}</Text>
        <Text style={[styles.localMeta, { color: colors.textSecondary }]}>{circleLocation}</Text>
        {memberCount > 0 && (
          <View style={styles.avatarRow}>
            {PLACEHOLDER_TINTS.slice(0, Math.min(3, memberCount)).map((tint, i) => (
              <Avatar key={i} user={{ id: `ph-${i}`, name: '', tint }} size={32} />
            ))}
            {extraCount > 0 && (
              <View style={[styles.moreBubble, { backgroundColor: colors.primary + '18' }]}>
                <Text style={[styles.moreBubbleText, { color: colors.primary }]}>+{extraCount}</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {suggestedCircle ? (
        <Button
          variant="primary"
          iconNode={<PawCircleLogo size={15} color={colors.onPrimary} />}
          full
          loading={joining}
          onPress={async () => {
            setJoining(true);
            await onJoin();
            setJoining(false);
          }}
          style={{ marginTop: spacing.xl2 }}
        >
          Join Circle
        </Button>
      ) : (
        <Button
          variant="primary"
          full
          onPress={onSkip}
          style={{ marginTop: spacing.xl2 }}
        >
          Explore Circles
        </Button>
      )}
      <Button variant="outline" full onPress={onSkip} style={{ marginTop: spacing.sm }}>
        Not Now
      </Button>

      <View style={styles.onboardFooter}>
        <Icon name="heart" size={14} color={colors.primary} />
        <Text style={[styles.onboardFooterText, { color: colors.textTertiary }]}>
          You can join now or explore later.
        </Text>
      </View>
    </ScrollView>
  );
}

const PRIVACY_OPTIONS = [
  { id: 'open', label: 'Open' },
  { id: 'request', label: 'Request to join' },
] as const;

function toSlugDraft(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

type SlugStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

function CreateCircleSheet({
  visible,
  onClose,
  onCreate,
}: {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string, location: string, privacy: CirclePrivacy, slug: string) => Promise<void>;
}) {
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle');
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
    }
  }, [visible]);

  const handleNameChange = (text: string) => {
    setName(text);
    if (!slugEdited) {
      setSlug(toSlugDraft(text));
      setSlugStatus('idle');
    }
  };

  const checkSlug = useCallback((raw: string) => {
    if (checkTimer.current) clearTimeout(checkTimer.current);
    const normalized = toSlugDraft(raw);
    if (!normalized || normalized.length < 2) {
      setSlugStatus(normalized.length === 0 ? 'idle' : 'invalid');
      return;
    }
    setSlugStatus('checking');
    checkTimer.current = setTimeout(async () => {
      const { data } = await supabase.rpc(
        'check_circle_slug' as never,
        { p_slug: normalized } as never,
      ) as { data: { available: boolean } | null };
      setSlugStatus(data?.available ? 'available' : 'taken');
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
    if (slugStatus === 'taken') { setError('That username is already taken — choose another.'); return; }
    if (slugStatus === 'invalid') { setError('Username must be at least 2 characters.'); return; }
    setError(null);
    setSaving(true);
    try {
      await onCreate(name, location || 'Dhaka', privacy, finalSlug);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg.includes('already taken') ? 'That username is already taken — choose another.' : 'Could not create circle. Try again.');
      setSaving(false);
    }
  };

  const slugIndicator = (): { label: string; color: string } | null => {
    if (slugStatus === 'checking') return { label: 'Checking…', color: colors.textTertiary };
    if (slugStatus === 'available') return { label: 'Available', color: colors.success };
    if (slugStatus === 'taken') return { label: 'Already taken', color: '#E5424F' };
    if (slugStatus === 'invalid') return { label: 'Min 2 characters', color: '#E5424F' };
    return null;
  };

  const privacyHint = privacy === 'open'
    ? 'Anyone nearby can find and join this circle.'
    : 'New members must be approved before they can join.';

  const indicator = slugIndicator();

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
  onboardScroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: spacing.xl3,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  emptyTitle: { ...typography.title },
  emptyBody: { ...typography.small, textAlign: 'center' },
  onboardHero: {
    alignItems: 'center',
    paddingBottom: spacing.xl2,
    gap: spacing.sm,
  },
  onboardTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  onboardSubtitle: {
    ...typography.bodySm,
    textAlign: 'center',
    paddingHorizontal: spacing.xl2,
  },
  localBlock: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingBottom: spacing.sm,
  },
  localCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  localPin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  localEyebrow: { ...typography.caption, textAlign: 'center' },
  localName: { ...typography.title, fontSize: 17, marginTop: spacing.xs, textAlign: 'center' },
  localMeta: { ...typography.small, textAlign: 'center' },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  moreBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreBubbleText: { fontSize: 11, fontWeight: '700' },
  onboardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl2,
  },
  onboardFooterText: { ...typography.meta },
  sheetBody: { paddingHorizontal: spacing.xl, gap: spacing.sm },
  sheetLabel: { ...typography.caption, marginTop: spacing.xs },
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
