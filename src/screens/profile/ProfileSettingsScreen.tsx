import React, { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, StyleSheet, Switch, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';
import { radius, typography } from '../../theme/tokens';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/icons/Icon';
import { IconButton } from '../../components/ui/Button';
import { Segmented } from '../../components/ui/Segmented';
import { Toast, ToastData } from '../../components/ui/Toast';
import { ProfileTrustBadge } from '../../components/profile/ProfileChrome';
import { getProfileTrust } from '../../data/profileData';
import { getAdopterTrustSummary } from '../../data/adoptionRecords';
import { useAdoption } from '../../context/AdoptionContext';
import { users } from '../../data/mockData';
import type { ProfileStackParamList } from '../../navigation/ProfileNavigator';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'Settings'>;

// ─── Reusable rows ─────────────────────────────────────────────────────────

function SectionLabel({ title }: { title: string }) {
  const { colors } = useTheme();
  return (
    <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>{title}</Text>
  );
}

function SettingRow({
  icon,
  iconTint,
  label,
  hint,
  trailing,
  onPress,
  last,
  danger,
}: {
  icon: string;
  iconTint?: string;
  label: string;
  hint?: string;
  trailing?: React.ReactNode;
  onPress?: () => void;
  last?: boolean;
  danger?: boolean;
}) {
  const { colors } = useTheme();
  const tint = iconTint ?? colors.primary;
  const content = (
    <View
      style={[
        styles.row,
        !last && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: tint + '18' }]}>
        <Icon name={icon} size={17} color={tint} />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowLabel, { color: danger ? colors.danger : colors.text }]}>{label}</Text>
        {hint ? <Text style={[styles.rowHint, { color: colors.textTertiary }]}>{hint}</Text> : null}
      </View>
      {trailing ?? (onPress ? (
        <Icon name="chevronRight" size={16} color={colors.textTertiary} />
      ) : null)}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.65 }}>
      {content}
    </Pressable>
  );
}

// ─── Inline editable field ─────────────────────────────────────────────────

function InlineField({
  icon,
  iconTint,
  placeholder,
  value,
  onChangeText,
  multiline,
  last,
}: {
  icon: string;
  iconTint?: string;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  multiline?: boolean;
  last?: boolean;
}) {
  const { colors } = useTheme();
  const tint = iconTint ?? colors.primary;
  return (
    <View
      style={[
        styles.row,
        styles.rowField,
        !last && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: tint + '18' }]}>
        <Icon name={icon} size={17} color={tint} />
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        multiline={multiline}
        style={[
          styles.fieldInput,
          { color: colors.text },
          multiline && { minHeight: 56, textAlignVertical: 'top' },
          Platform.select({ web: { outlineStyle: 'none' } as object, default: {} }),
        ]}
      />
    </View>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────

export function ProfileSettingsScreen() {
  const { colors, mode, setMode } = useTheme();
  const navigation = useNavigation<Nav>();
  const tabBarPad = useTabBarScrollPadding();
  const me = users.you;
  const trust = getProfileTrust('you');
  const { records } = useAdoption();
  const adopterTrust = getAdopterTrustSummary(records, 'you');

  const [bio, setBio] = useState(me.bio ?? '');
  const [location, setLocation] = useState(me.location ?? '');
  const [notifyPosts, setNotifyPosts] = useState(true);
  const [notifyAdoption, setNotifyAdoption] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  const patch = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setDirty(true);
  };

  const save = () => {
    setDirty(false);
    setToast({ msg: 'Profile updated', icon: 'check', tone: 'success' });
  };

  // Adopter trust badge config
  const adopterBadge = adopterTrust.badge === 'trusted'
    ? { label: 'Trusted Adopter', tint: colors.success, bg: colors.successBg, icon: 'shield' }
    : adopterTrust.badge === 'active'
      ? { label: 'Active Adopter', tint: colors.primary, bg: colors.infoBg, icon: 'heart' }
      : adopterTrust.badge === 'update_pending'
        ? { label: 'Update Pending', tint: colors.warning, bg: colors.warningBg, icon: 'alert' }
        : null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <IconButton
          name="chevronLeft"
          size={40}
          tone="soft"
          color={colors.textSecondary}
          onPress={() => navigation.goBack()}
        />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
        {dirty ? (
          <Pressable
            onPress={save}
            style={({ pressed }) => [
              styles.saveBtn,
              { backgroundColor: colors.primary + '18', opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={[styles.saveBtnLabel, { color: colors.primary }]}>Save</Text>
          </Pressable>
        ) : (
          <View style={{ width: 56 }} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: tabBarPad + 24 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Profile mini-card ─────────────────────────────────────── */}
        <LinearGradient
          colors={[me.tint + '18', me.tint + '06', 'transparent']}
          style={styles.profileCard}
        >
          <Avatar user={me} size={58} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.profileName, { color: colors.text }]}>{me.name}</Text>
            <Text style={[styles.profileHandle, { color: colors.primary }]}>@{me.handle}</Text>
            <View style={{ marginTop: 4 }}>
              <ProfileTrustBadge trust={trust} />
            </View>
          </View>
          {adopterBadge && (
            <View style={[styles.adopterBadge, { backgroundColor: adopterBadge.bg }]}>
              <Icon name={adopterBadge.icon} size={13} color={adopterBadge.tint} />
              <Text style={[styles.adopterBadgeText, { color: adopterBadge.tint }]}>
                {adopterBadge.label}
              </Text>
            </View>
          )}
        </LinearGradient>

        {/* ── Edit profile ──────────────────────────────────────────── */}
        <SectionLabel title="PROFILE" />
        <InlineField
          icon="edit"
          placeholder="Write a short bio…"
          value={bio}
          onChangeText={patch(setBio)}
          multiline
        />
        <InlineField
          icon="mapPin"
          placeholder="Your city or neighbourhood"
          value={location}
          onChangeText={patch(setLocation)}
          last
        />

        {/* ── Appearance ────────────────────────────────────────────── */}
        <SectionLabel title="APPEARANCE" />
        <View style={[styles.row, styles.rowLast]}>
          <View style={[styles.rowIcon, { backgroundColor: colors.primary + '18' }]}>
            <Icon name={mode === 'dark' ? 'moon' : 'sun'} size={17} color={colors.primary} />
          </View>
          <View style={styles.rowBody}>
            <Text style={[styles.rowLabel, { color: colors.text }]}>Theme</Text>
            <Text style={[styles.rowHint, { color: colors.textTertiary }]}>
              {mode === 'dark' ? 'Dark mode' : 'Light mode'}
            </Text>
          </View>
          <Segmented
            items={[
              { id: 'light', label: '', icon: 'sun' },
              { id: 'dark', label: '', icon: 'moon' },
            ]}
            value={mode}
            onChange={id => setMode(id as 'light' | 'dark')}
          />
        </View>

        {/* ── My content ────────────────────────────────────────────── */}
        <SectionLabel title="MY CONTENT" />
        <SettingRow
          icon="comment"
          label="Activity"
          hint="Thoughts and text updates"
          onPress={() => navigation.navigate('Activity')}
        />
        <SettingRow
          icon="grid"
          label="My posts"
          hint="Posts you've shared to the feed"
          onPress={() => navigation.navigate('Posts')}
          last
        />

        {/* ── Adoption & rescue ─────────────────────────────────────── */}
        <SectionLabel title="ADOPTION & RESCUE" />
        <SettingRow
          icon="heart"
          iconTint={colors.accent}
          label="Adopted companions"
          hint="Pets you've given a home"
          onPress={() => navigation.navigate('Adopted')}
        />
        <SettingRow
          icon="repeat"
          iconTint="#14A697"
          label="Rehomed pets"
          hint="Successful adoptions you facilitated"
          onPress={() => navigation.navigate('SuccessfulAdoptions')}
        />
        <SettingRow
          icon="shield"
          iconTint="#E0503F"
          label="My rescues"
          hint="Cases you opened or contributed to"
          onPress={() => navigation.navigate('Rescues')}
        />
        <SettingRow
          icon="star"
          iconTint="#E2941A"
          label="Reviews & safety"
          hint="Your ratings and trust record"
          onPress={() => navigation.navigate('ReviewsSafety')}
          last
        />

        {/* ── Notifications ─────────────────────────────────────────── */}
        <SectionLabel title="NOTIFICATIONS" />
        <SettingRow
          icon="bell"
          label="Post activity"
          hint="Likes, comments, and shares"
          trailing={
            <Switch
              value={notifyPosts}
              onValueChange={setNotifyPosts}
              trackColor={{ false: colors.border, true: colors.primary + '88' }}
              thumbColor="#fff"
            />
          }
        />
        <SettingRow
          icon="paw"
          iconTint={colors.accent}
          label="Adoption updates"
          hint="Milestones, approvals, and messages"
          trailing={
            <Switch
              value={notifyAdoption}
              onValueChange={setNotifyAdoption}
              trackColor={{ false: colors.border, true: colors.primary + '88' }}
              thumbColor="#fff"
            />
          }
          last
        />

        {/* ── Privacy ───────────────────────────────────────────────── */}
        <SectionLabel title="PRIVACY" />
        <SettingRow
          icon="lock"
          label="Privacy settings"
          hint="Who can see your profile and posts"
          onPress={() => setToast({ msg: 'Coming soon', icon: 'sparkle', tone: 'primary' })}
        />
        <SettingRow
          icon="flag"
          iconTint={colors.warning}
          label="Blocked users"
          hint="Manage who you've blocked"
          onPress={() => setToast({ msg: 'No blocked users', icon: 'check', tone: 'neutral' })}
          last
        />

        {/* ── Account ───────────────────────────────────────────────── */}
        <SectionLabel title="ACCOUNT" />
        <SettingRow
          icon="user"
          label={`Joined ${me.joinedDate}`}
          hint="Your account creation date"
          last
        />

        {/* Danger zone */}
        <SectionLabel title="DANGER ZONE" />
        <SettingRow
          icon="close"
          iconTint={colors.danger}
          label="Sign out"
          danger
          onPress={() => setToast({ msg: 'Coming soon', icon: 'alert', tone: 'neutral' })}
          last
        />
      </ScrollView>

      <Toast data={toast} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700' },
  saveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    marginRight: 8,
  },
  saveBtnLabel: { fontSize: 14, fontWeight: '700' },

  scroll: { paddingTop: 0 },

  // Profile card
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 4,
  },
  profileName: { fontSize: 16, fontWeight: '800' },
  profileHandle: { fontSize: 13 },
  adopterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  adopterBadgeText: { fontSize: 11, fontWeight: '700' },

  // Section
  sectionLabel: {
    ...typography.sectionLabel,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 6,
  },

  // Rows
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  rowLast: {},
  rowField: { alignItems: 'flex-start', paddingVertical: 10 },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  rowBody: { flex: 1, minWidth: 0 },
  rowLabel: { fontSize: 15, fontWeight: '600' },
  rowHint: { fontSize: 12, marginTop: 1.5, lineHeight: 16 },

  fieldInput: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
});
