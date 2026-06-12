import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { radius, shadows } from '../theme/tokens';
import { Avatar } from '../components/ui/Avatar';
import { Button, IconButton } from '../components/ui/Button';
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
import { AppLogo } from '../components/ui/AppLogo';
import { PawCircleLogo } from '../components/ui/PawCircleLogo';
import { CirclesManageSection } from './pawCircles/CirclesManageSection';

const PREVIEW_MEMBERS = [users.omar, users.lena, users.dev];
type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<CirclesStackParamList, 'Hub'>,
  BottomTabNavigationProp<{ Feed: undefined; Circles: undefined }>
>;

function CirclesHeader({ showBack }: { showBack?: boolean }) {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();

  return (
    <View style={styles.header}>
      {showBack && (
        <IconButton
          name="chevronLeft"
          size={40}
          tone="soft"
          color={colors.textSecondary}
          onPress={() => navigation.getParent()?.navigate('Feed')}
        />
      )}
      <AppLogo size={32} />
      <View style={{ flex: 1 }} />
      <IconButton name="bell" size={40} tone="soft" color={colors.textSecondary} count={2} />
    </View>
  );
}

export function CirclesScreen() {
  const { colors, groupedBg } = useTheme();
  const navigation = useNavigation<Nav>();
  const {
    ready,
    onboardingComplete,
    createdCircles,
    joinedCircles,
    completeOnboarding,
    createCircle,
    resetPawCircles,
  } = usePawCircles();

  const [toast, setToast] = useState<ToastData | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinRequestsResetKey, setJoinRequestsResetKey] = useState(0);
  const tabBarPad = useTabBarScrollPadding();
  const tabBarScrollProps = useTabBarScrollProps();

  const handleResetOnboarding = async () => {
    await resetPawCircles();
    setJoinRequestsResetKey(k => k + 1);
  };

  const handleResetJoinRequests = () => {
    setJoinRequestsResetKey(k => k + 1);
    setToast({ msg: 'Join requests restored', icon: 'check', tone: 'success' });
  };

  const allCircles = [
    ...createdCircles,
    ...joinedCircles.filter(j => !createdCircles.some(c => c.id === j.id)),
  ];

  if (!ready) {
    return <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']} />;
  }

  if (!onboardingComplete) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
        <CirclesHeader showBack />
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
    <SafeAreaView style={[styles.safe, { backgroundColor: groupedBg }]} edges={['top']}>
      <CirclesHeader showBack />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: tabBarPad }]}
        style={{ backgroundColor: groupedBg }}
        showsVerticalScrollIndicator={false}
        {...tabBarScrollProps}
      >
        <View style={[styles.hubTopCard, { backgroundColor: colors.surface }]}>
          <HubHero compact />
          <View style={styles.actionRow}>
            <ActionOrb
              compact
              label="Create"
              icon="plus"
              tint="#F2972E"
              onPress={() => setCreateOpen(true)}
            />
            <ActionOrb
              compact
              label="Explore"
              icon="search"
              tint="#14A697"
              sparkle
              onPress={() => navigation.navigate('Explore')}
            />
          </View>
        </View>

        {allCircles.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Icon name="circles" size={28} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No circles yet</Text>
            <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
              Create a circle or explore nearby groups to start managing chats and members.
            </Text>
          </View>
        ) : (
          <CirclesManageSection
            circles={allCircles}
            createdIds={new Set(createdCircles.map(c => c.id))}
            joinRequestsResetKey={joinRequestsResetKey}
            onOpenChat={id => navigation.navigate('CircleChat', { circleId: id, returnTo: 'Hub' })}
            onOpenSettings={id => navigation.navigate('CircleSettings', { circleId: id })}
          />
        )}

        {__DEV__ && (
          <View style={styles.devRow}>
            <Button variant="ghost" size="sm" onPress={handleResetOnboarding}>
              Reset Paw Circle onboarding
            </Button>
            <Button variant="ghost" size="sm" onPress={handleResetJoinRequests}>
              Reset join requests
            </Button>
          </View>
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
      <HubHero subtitle="Connect with pet parents around you." />

      <View style={[styles.localCard, { backgroundColor: colors.surface, borderColor: colors.border }, shadows.md]}>
        <View style={styles.localCardHeader}>
          <View style={[styles.localPin, { backgroundColor: iconBg(LOCAL_PAW_CIRCLE.iconBg) }]}>
            <Icon name="mapPin" size={14} color={LOCAL_PAW_CIRCLE.tint} />
          </View>
          <Text style={[styles.localEyebrow, { color: LOCAL_PAW_CIRCLE.tint }]}>Your Local Circle</Text>
        </View>
        <Text style={[styles.localName, { color: colors.text }]}>{LOCAL_PAW_CIRCLE.name}</Text>
        <Text style={[styles.localMeta, { color: colors.textSecondary }]}>
          {LOCAL_PAW_CIRCLE.tagline} · {LOCAL_PAW_CIRCLE.memberCount} members
        </Text>
        <View style={styles.avatarRow}>
          {PREVIEW_MEMBERS.map(u => (
            <Avatar key={u.id} user={u} size={32} />
          ))}
          <View style={[styles.moreBubble, { backgroundColor: colors.infoBg }]}>
            <Text style={[styles.moreBubbleText, { color: colors.primary }]}>+21</Text>
          </View>
        </View>
      </View>

      <Button
        variant="primary"
        icon="paw"
        full
        loading={joining}
        onPress={async () => {
          setJoining(true);
          await onJoin();
          setJoining(false);
        }}
        style={{ marginTop: 20 }}
      >
        Join Circle
      </Button>
      <Button variant="outline" full onPress={onSkip} style={{ marginTop: 10 }}>
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

function HubHero({ subtitle, compact }: { subtitle?: string; compact?: boolean }) {
  const { colors } = useTheme();

  if (compact) {
    return (
      <View style={styles.heroCompact}>
        <PawCircleLogo size={36} />
        <Text style={[styles.heroTitleCompact, { color: colors.text }]}>Paw Circle</Text>
      </View>
    );
  }

  return (
    <View style={styles.hero}>
      <PawCircleLogo size={88} />
      <Text style={[styles.heroTitle, { color: colors.text }]}>Paw Circle</Text>
      {subtitle && (
        <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
      )}
    </View>
  );
}

function ActionOrb({
  label,
  icon,
  tint,
  sparkle,
  compact,
  onPress,
}: {
  label: string;
  icon: string;
  tint: string;
  sparkle?: boolean;
  compact?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const iconSize = compact ? 26 : 30;
  return (
    <Pressable onPress={onPress} style={[styles.actionOrb, compact && styles.actionOrbCompact]}>
      <View style={styles.actionOrbIconWrap}>
        {sparkle && (
          <View style={[styles.sparkle, compact && styles.sparkleCompact]}>
            <Icon name="sparkle" size={compact ? 11 : 13} color="#E8B020" />
          </View>
        )}
        <Icon name={icon} size={iconSize} color={tint} fill={icon === 'paw' ? tint : 'none'} sw={2} />
      </View>
      <Text style={[
        styles.actionOrbLabel,
        compact && styles.actionOrbLabelCompact,
        { color: colors.text },
      ]}>
        {label}
      </Text>
    </Pressable>
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
    await onCreate(name, location || 'Mumbai', privacy);
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
          placeholder="e.g. Bandra Paw Circle"
          placeholderTextColor={colors.textTertiary}
          style={[styles.sheetInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
        />
        <Text style={[styles.sheetLabel, { color: colors.textSecondary }]}>Location</Text>
        <TextInput
          value={location}
          onChangeText={setLocation}
          placeholder="Neighbourhood or area"
          placeholderTextColor={colors.textTertiary}
          style={[styles.sheetInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
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
  scroll: { paddingHorizontal: 16 },
  devRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 8,
  },
  onboardScroll: { paddingHorizontal: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 4,
  },
  hubTopCard: {
    borderRadius: radius.xl,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 22,
  },
  hero: { alignItems: 'center', paddingTop: 12, paddingBottom: 8, gap: 6 },
  heroCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 2,
    paddingBottom: 2,
  },
  heroTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  heroTitleCompact: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  heroSubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 24,
  },
  actionOrb: { alignItems: 'center', gap: 8 },
  actionOrbCompact: { gap: 4 },
  actionOrbIconWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkle: { position: 'absolute', top: -6, right: -8, zIndex: 1 },
  sparkleCompact: { top: -4, right: -6 },
  actionOrbLabel: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  actionOrbLabelCompact: { fontSize: 11, fontWeight: '600' },
  emptyCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700' },
  emptyBody: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  localCard: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginTop: 8,
    gap: 6,
  },
  localCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  localPin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  localEyebrow: { fontSize: 13, fontWeight: '700' },
  localName: { fontSize: 18, fontWeight: '800' },
  localMeta: { fontSize: 13 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
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
    gap: 6,
    marginTop: 20,
  },
  onboardFooterText: { fontSize: 12.5 },
  sheetBody: { paddingHorizontal: 20, gap: 10 },
  sheetLabel: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  sheetHint: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  sheetInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
  },
});
