import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, StyleSheet, Platform,
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
import { usePawCircles } from '../context/PawCircleContext';
import { CirclePrivacy, LOCAL_PAW_CIRCLE } from '../data/pawCircles';
import { users } from '../data/mockData';
import type { CirclesStackParamList } from '../navigation/CirclesNavigator';
import { useTabBarScrollPadding } from '../navigation/tabBarInsets';
import { useTabBarScrollProps } from '../context/TabBarScrollContext';
import { PawCircleLogo } from '../components/ui/PawCircleLogo';
import { CirclesManageSection } from './pawCircles/CirclesManageSection';
import {
  PawCircleActionPill,
  PawCircleHubHeader,
  pawCircleStyles,
} from './pawCircles/PawCircleChrome';

const PREVIEW_MEMBERS = [users.omar, users.lena, users.dev];
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
  } = usePawCircles();

  const [toast, setToast] = useState<ToastData | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const tabBarPad = useTabBarScrollPadding();
  const tabBarScrollProps = useTabBarScrollProps();

  const allCircles = [
    ...createdCircles,
    ...joinedCircles.filter(j => !createdCircles.some(c => c.id === j.id)),
  ];

  const goFeed = () => navigation.getParent()?.navigate('Feed');

  if (!ready) {
    return <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']} />;
  }

  if (!onboardingComplete) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
        <PawCircleHubHeader showBack onBack={goFeed} />
        <OnboardingView
          onJoin={async () => {
            await completeOnboarding({ joinLocal: true });
            setToast({ msg: `Joined ${LOCAL_PAW_CIRCLE.name}!`, icon: 'check', tone: 'success' });
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
        <View style={styles.actionRow}>
          <PawCircleActionPill
            label="Create"
            icon="plus"
            tint={colors.primary}
            onPress={() => setCreateOpen(true)}
          />
          <PawCircleActionPill
            label="Explore"
            icon="search"
            tint={colors.success}
            onPress={() => navigation.navigate('Explore')}
          />
        </View>

        {allCircles.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Icon name="circles" size={32} color={colors.primary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No circles yet</Text>
            <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
              Create a circle or explore nearby groups to start managing chats and members.
            </Text>
          </View>
        ) : (
          <CirclesManageSection
            circles={allCircles}
            createdIds={new Set(createdCircles.map(c => c.id))}
            onOpenChat={id => navigation.navigate('CircleChat', { circleId: id, returnTo: 'Hub' })}
            onOpenSettings={id => navigation.navigate('CircleSettings', { circleId: id })}
          />
        )}

      </ScrollView>

      <CreateCircleSheet
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={async (name, location, privacy) => {
          const c = await createCircle(name, location, privacy);
          setCreateOpen(false);
          setToast({ msg: `Created ${c.name}`, icon: 'check', tone: 'success' });
        }}
      />

      <Toast data={toast} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

function OnboardingView({
  onJoin,
  onSkip,
}: {
  onJoin: () => void;
  onSkip: () => void;
}) {
  const { colors, iconBg } = useTheme();
  const [joining, setJoining] = useState(false);
  const tabBarPad = useTabBarScrollPadding();

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
          <View style={[styles.localPin, { backgroundColor: iconBg(LOCAL_PAW_CIRCLE.iconBg) }]}>
            <Icon name="mapPin" size={14} color={LOCAL_PAW_CIRCLE.tint} />
          </View>
          <Text style={[styles.localEyebrow, { color: colors.primary }]}>Your local circle</Text>
        </View>
        <Text style={[styles.localName, { color: colors.text }]}>{LOCAL_PAW_CIRCLE.name}</Text>
        <Text style={[styles.localMeta, { color: colors.textSecondary }]}>
          {LOCAL_PAW_CIRCLE.tagline} · {LOCAL_PAW_CIRCLE.memberCount} members
        </Text>
        <View style={styles.avatarRow}>
          {PREVIEW_MEMBERS.map(u => (
            <Avatar key={u.id} user={u} size={32} />
          ))}
          <View style={[styles.moreBubble, { backgroundColor: colors.primary + '18' }]}>
            <Text style={[styles.moreBubbleText, { color: colors.primary }]}>+21</Text>
          </View>
        </View>
      </View>

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

function CreateCircleSheet({
  visible,
  onClose,
  onCreate,
}: {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string, location: string, privacy: CirclePrivacy) => Promise<void>;
}) {
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [privacy, setPrivacy] = useState<CirclePrivacy>('open');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) {
      setName('');
      setLocation('');
      setPrivacy('open');
    }
  }, [visible]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await onCreate(name, location || 'Dhaka', privacy);
    setSaving(false);
  };

  const privacyHint = privacy === 'open'
    ? 'Anyone nearby can find and join this circle.'
    : 'New members must be approved before they can join.';

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Create Circle"
      footer={(
        <Button variant="primary" full loading={saving} onPress={handleCreate}>
          Create Circle
        </Button>
      )}
    >
      <View style={styles.sheetBody}>
        <Text style={[styles.sheetLabel, { color: colors.textSecondary }]}>Circle name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Dhanmondi Paw Circle"
          placeholderTextColor={colors.textTertiary}
          style={[styles.sheetInput, { color: colors.text, borderBottomColor: colors.border }]}
        />
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
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
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
});
