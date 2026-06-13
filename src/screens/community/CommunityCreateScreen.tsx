import React, { useState } from 'react';
import {
  ScrollView, StyleSheet, Text, View, TextInput, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { Icon } from '../../components/icons/Icon';
import { Button } from '../../components/ui/Button';
import { Toast, ToastData } from '../../components/ui/Toast';
import { ProfileSubHeader } from '../../components/profile/ProfileChrome';
import { ProfileMenuIntro, profileMenuStyles } from '../../components/profile/ProfileSettingsRows';
import { useCommunityGroups } from '../../context/CommunityGroupsContext';
import { COMMUNITY_TOPIC_OPTIONS } from '../../data/communityPosts';
import type { CommunityStackParamList } from '../../navigation/CommunityNavigator';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';

type Nav = NativeStackNavigationProp<CommunityStackParamList, 'Create'>;

const ICON_OPTIONS = [
  { icon: 'dog', tint: '#F2972E' },
  { icon: 'cat', tint: '#14A697' },
  { icon: 'heart', tint: '#7A5AE0' },
  { icon: 'shield', tint: '#E0503F' },
  { icon: 'communities', tint: '#7C5CBF' },
] as const;

const JOIN_POLICIES = [
  { id: 'open' as const, label: 'Open', hint: 'Anyone can join' },
  { id: 'request' as const, label: 'Request', hint: 'You approve members' },
  { id: 'invite' as const, label: 'Invite', hint: 'Invite-only' },
];

export function CommunityCreateScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const tabBarPad = useTabBarScrollPadding();
  const { createCommunity } = useCommunityGroups();

  const [name, setName] = useState('');
  const [about, setAbout] = useState('');
  const [iconIdx, setIconIdx] = useState(0);
  const [joinPolicy, setJoinPolicy] = useState<'open' | 'request' | 'invite'>('open');
  const [topics, setTopics] = useState<string[]>(['general', 'tips', 'events']);
  const [toast, setToast] = useState<ToastData | null>(null);

  const picked = ICON_OPTIONS[iconIdx];
  const canCreate = name.trim().length >= 3 && about.trim().length >= 12 && topics.length > 0;

  const toggleTopic = (id: string) => {
    setTopics(prev => (
      prev.includes(id)
        ? (prev.length > 1 ? prev.filter(t => t !== id) : prev)
        : [...prev, id]
    ));
  };

  const handleCreate = async () => {
    if (!canCreate) return;
    try {
      const group = await createCommunity({
        name,
        about,
        tint: picked.tint,
        icon: picked.icon,
        joinPolicy,
        enabledTopics: topics,
      });
      setToast({ msg: `${group.name} is live`, icon: 'check', tone: 'success' });
      setTimeout(() => {
        navigation.replace('Group', { communityId: group.id });
      }, 400);
    } catch {
      setToast({ msg: 'Could not create group. Try again.', icon: 'alert', tone: 'neutral' });
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ProfileSubHeader onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={[profileMenuStyles.scroll, { paddingBottom: tabBarPad + 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <LinearGradient
            colors={[picked.tint, picked.tint + 'AA']}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroIcon}
          >
            <Icon name={picked.icon} size={34} color="#fff" fill="#fff" />
          </LinearGradient>
          <Text style={[styles.heroTitle, { color: colors.text }]}>Start a group</Text>
          <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
            You&apos;ll be the creator — manage members, topics, and rules.
          </Text>
        </View>

        <ProfileMenuIntro>
          Step 1 · Identity
        </ProfileMenuIntro>

        <Text style={[styles.label, { color: colors.textTertiary }]}>Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Dhanmondi Dog Walkers"
          placeholderTextColor={colors.textTertiary}
          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface2 }]}
          maxLength={60}
        />

        <Text style={[styles.label, { color: colors.textTertiary }]}>About</Text>
        <TextInput
          value={about}
          onChangeText={setAbout}
          placeholder="What is this group for?"
          placeholderTextColor={colors.textTertiary}
          multiline
          style={[styles.input, styles.inputMulti, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface2 }]}
          maxLength={280}
        />

        <Text style={[styles.label, { color: colors.textTertiary }]}>Icon</Text>
        <View style={styles.iconRow}>
          {ICON_OPTIONS.map((opt, i) => {
            const on = i === iconIdx;
            return (
              <Pressable
                key={opt.icon}
                onPress={() => setIconIdx(i)}
                style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
              >
                <LinearGradient
                  colors={on ? [opt.tint, opt.tint + 'AA'] : [colors.surface2, colors.surface2]}
                  style={[
                    styles.iconPick,
                    on && { borderColor: opt.tint },
                  ]}
                >
                  <Icon name={opt.icon} size={22} color={on ? '#fff' : colors.textSecondary} fill={on ? '#fff' : 'none'} />
                </LinearGradient>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.stepGap} />
        <ProfileMenuIntro>Step 2 · Topics</ProfileMenuIntro>
        <View style={styles.topicWrap}>
          {COMMUNITY_TOPIC_OPTIONS.map(cat => {
            const on = topics.includes(cat.id);
            return (
              <Pressable
                key={cat.id}
                onPress={() => toggleTopic(cat.id)}
                style={[
                  styles.topicChip,
                  {
                    backgroundColor: on ? cat.tint + '18' : colors.surface2,
                    borderColor: on ? cat.tint + '55' : 'transparent',
                  },
                ]}
              >
                <Icon name={cat.icon} size={12} color={on ? cat.tint : colors.textTertiary} />
                <Text style={[styles.topicLabel, { color: on ? cat.tint : colors.textSecondary }]}>
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.stepGap} />
        <ProfileMenuIntro>Step 3 · Who can join</ProfileMenuIntro>
        <View style={styles.policyRow}>
          {JOIN_POLICIES.map(p => {
            const on = joinPolicy === p.id;
            return (
              <Pressable
                key={p.id}
                onPress={() => setJoinPolicy(p.id)}
                style={[
                  styles.policyChip,
                  {
                    backgroundColor: on ? colors.primary + '14' : colors.surface2,
                    borderColor: on ? colors.primary + '44' : 'transparent',
                  },
                ]}
              >
                <Text style={[styles.policyLabel, { color: on ? colors.primary : colors.text }]}>
                  {p.label}
                </Text>
                <Text style={[styles.policyHint, { color: on ? colors.primary : colors.textTertiary }]}>
                  {p.hint}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.bg, borderTopColor: colors.border }]}>
        <Button full variant="primary" onPress={handleCreate} disabled={!canCreate}>
          Create group
        </Button>
      </View>

      <Toast data={toast} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  hero: { alignItems: 'center', gap: 8, marginBottom: 8, paddingTop: 4 },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { fontSize: 24, fontWeight: '800', letterSpacing: -0.4 },
  heroSub: { fontSize: 14, lineHeight: 20, textAlign: 'center', maxWidth: 300 },
  label: { fontSize: 12, fontWeight: '700', marginTop: 14, marginBottom: 6, letterSpacing: 0.3 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  inputMulti: { minHeight: 88, textAlignVertical: 'top' },
  iconRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  iconPick: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  stepGap: { height: 8 },
  topicWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  topicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  topicLabel: { fontSize: 12.5, fontWeight: '600' },
  policyRow: { gap: 10 },
  policyChip: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 2,
  },
  policyLabel: { fontSize: 15, fontWeight: '700' },
  policyHint: { fontSize: 12.5 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
