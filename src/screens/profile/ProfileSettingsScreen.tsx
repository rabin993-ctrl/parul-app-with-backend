import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, StyleSheet, Switch, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { radius, typography } from '../../theme/tokens';
import { Icon } from '../../components/icons/Icon';
import { IconButton } from '../../components/ui/Button';
import { Toast, ToastData } from '../../components/ui/Toast';
import { getAdopterTrustSummary } from '../../data/adoptionRecords';
import { useAdoption } from '../../context/AdoptionContext';
import { useFeedPosts } from '../../context/FeedPostContext';
import { useUserPrivacy } from '../../context/UserPrivacyContext';
import { useCurrentUserProfile } from '../../context/CurrentUserProfileContext';
import { useAuth } from '../../context/AuthContext';
import { useMediaPicker } from '../../hooks/useMediaPicker';
import type { ThemePreference } from '../../theme/ThemeContext';
import type { ProfileStackParamList } from '../../navigation/ProfileNavigator';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';
import { ProfileMenuAccordion } from '../../components/profile/ProfileSettingsRows';
import { AvatarGradientRing } from '../../components/profile/ProfileChrome';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'Settings'>;

function SectionTitle({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionTitleRow}>
      <View style={styles.sectionTitleGroup}>
        <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>{title}</Text>
        {action}
      </View>
    </View>
  );
}

function ShelfRailLink({
  barTint,
  icon,
  label,
  meta,
  onPress,
}: {
  barTint: string;
  icon: string;
  label: string;
  meta: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ opacity: pressed ? 0.72 : 1 }]}
    >
      <View style={styles.shelfRailRow}>
        <View style={[styles.shelfRailBar, { backgroundColor: barTint }]} />
        <Icon name={icon} size={20} color={barTint} sw={2} />
        <View style={styles.menuLinkBody}>
          <Text style={[styles.menuLinkLabel, { color: colors.text }]}>{label}</Text>
          <Text style={[styles.menuLinkHint, { color: colors.textTertiary }]}>{meta}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function YourShelfSection({
  savedCount,
  onActivity,
  onSaved,
}: {
  savedCount: number;
  onActivity: () => void;
  onSaved: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.shelfBlock}>
      <View style={styles.shelfKickerRow}>
        <View style={[styles.shelfKickerLine, { backgroundColor: colors.border }]} />
        <Text style={[styles.shelfKicker, { color: colors.textTertiary }]}>your shelf</Text>
        <View style={[styles.shelfKickerLine, { backgroundColor: colors.border }]} />
      </View>
      <View style={styles.shelfRailStack}>
        <ShelfRailLink
          barTint={colors.primary}
          icon="comment"
          label="Activity"
          meta="Comments you've left on posts"
          onPress={onActivity}
        />
        <ShelfRailLink
          barTint={colors.success}
          icon="bookmark"
          label="Saved"
          meta={
            savedCount > 0
              ? `${savedCount} bookmarked from the feed`
              : 'Posts you save from the feed'
          }
          onPress={onSaved}
        />
      </View>
    </View>
  );
}

function MenuLink({
  icon,
  label,
  hint,
  value,
  tint,
  onPress,
  danger,
}: {
  icon: string;
  label: string;
  hint?: string;
  value?: string;
  tint?: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  const { colors } = useTheme();
  const iconColor = danger ? colors.danger : (tint ?? colors.primary);

  const content = (
    <View style={styles.menuLink}>
      <Icon name={icon} size={20} color={iconColor} sw={2} />
      <View style={styles.menuLinkBody}>
        <Text style={[styles.menuLinkLabel, { color: danger ? colors.danger : colors.text }]}>
          {label}
        </Text>
        {hint ? (
          <Text style={[styles.menuLinkHint, { color: colors.textTertiary }]}>{hint}</Text>
        ) : null}
      </View>
      {value ? (
        <Text style={[styles.menuLinkValue, { color: colors.textSecondary }]} numberOfLines={1}>
          {value}
        </Text>
      ) : onPress ? (
        <Icon name="chevronRight" size={15} color={colors.textTertiary} />
      ) : null}
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
      {content}
    </Pressable>
  );
}

function ToggleRow({
  icon,
  label,
  hint,
  tint,
  value,
  onValueChange,
}: {
  icon: string;
  label: string;
  hint?: string;
  tint?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.toggleRow}>
      <Icon name={icon} size={20} color={tint ?? colors.primary} sw={2} />
      <View style={styles.menuLinkBody}>
        <Text style={[styles.menuLinkLabel, { color: colors.text }]}>{label}</Text>
        {hint ? (
          <Text style={[styles.menuLinkHint, { color: colors.textTertiary }]}>{hint}</Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primary + '88' }}
        thumbColor="#fff"
      />
    </View>
  );
}

function AppearanceSelector() {
  const { colors, preference, setPreference } = useTheme();
  const options: { key: ThemePreference; label: string }[] = [
    { key: 'system', label: 'System' },
    { key: 'light', label: 'Light' },
    { key: 'dark', label: 'Dark' },
  ];
  return (
    <View style={styles.segmentRow}>
      {options.map(opt => {
        const active = preference === opt.key;
        return (
          <Pressable
            key={opt.key}
            onPress={() => setPreference(opt.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [
              styles.segment,
              {
                backgroundColor: active ? colors.primary : 'transparent',
                borderColor: active ? colors.primary : colors.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                { color: active ? colors.onPrimary : colors.textSecondary },
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ProfileSettingsScreen() {
  const { colors } = useTheme();
  const { signOut } = useAuth();
  const navigation = useNavigation<Nav>();
  const tabBarPad = useTabBarScrollPadding();
  const { me, updateProfile, updateAvatar } = useCurrentUserProfile();
  const { pickImage, takePhoto } = useMediaPicker();
  const { records } = useAdoption();
  const { savedPosts } = useFeedPosts();
  const { blockedUserIds, settings, patchSettings } = useUserPrivacy();
  const adopterTrust = getAdopterTrustSummary(records, 'you');

  const [bio, setBio] = useState(me.bio ?? '');
  const [location, setLocation] = useState(me.location ?? me.loc ?? '');
  const notifyPosts = settings.notifyPostActivity;
  const notifyAdoption = settings.notifyAdoptionUpdates;
  const [aboutEditing, setAboutEditing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  useEffect(() => {
    if (!dirty) {
      setBio(me.bio ?? '');
      setLocation(me.location ?? me.loc ?? '');
    }
  }, [me.bio, me.location, me.loc, dirty]);

  const patch = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setDirty(true);
  };

  const save = useCallback(async () => {
    const nextBio = bio.trim();
    const nextLocation = location.trim();
    await updateProfile({ bio: nextBio, location: nextLocation });
    setBio(nextBio);
    setLocation(nextLocation);
    setDirty(false);
    setAboutEditing(false);
    setToast({ msg: 'Profile updated', icon: 'check', tone: 'success' });
  }, [bio, location, updateProfile]);

  const toggleAboutEdit = () => {
    if (aboutEditing && dirty) {
      void save();
      return;
    }
    setAboutEditing(prev => !prev);
  };

  const uploadPickedAvatar = useCallback(async (source: 'library' | 'camera') => {
    if (avatarUploading) return;
    setAvatarUploading(true);
    try {
      const asset = source === 'camera'
        ? await takePhoto({ squareCrop: true })
        : await pickImage({ squareCrop: true });
      if (!asset) return;
      await updateAvatar(asset);
      setToast({ msg: 'Profile photo updated', icon: 'check', tone: 'success' });
    } catch {
      setToast({ msg: 'Could not update profile photo', icon: 'close', tone: 'danger' });
    } finally {
      setAvatarUploading(false);
    }
  }, [avatarUploading, pickImage, takePhoto, updateAvatar]);

  const openAvatarPicker = useCallback(() => {
    if (avatarUploading) return;
    Alert.alert('Profile photo', 'Choose a photo for your profile', [
      { text: 'Photo library', onPress: () => { void uploadPickedAvatar('library'); } },
      { text: 'Take photo', onPress: () => { void uploadPickedAvatar('camera'); } },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [avatarUploading, uploadPickedAvatar]);

  const adopterBadge = adopterTrust.badge === 'trusted'
    ? { label: 'Trusted adopter', tint: colors.success, icon: 'shield' }
    : adopterTrust.badge === 'active'
      ? { label: 'Active adopter', tint: colors.primary, icon: 'heart' }
      : adopterTrust.badge === 'update_pending'
        ? { label: 'Update pending', tint: colors.warning, icon: 'alert' }
        : null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.header}>
        <IconButton
          name="chevronLeft"
          size={40}
          tone="soft"
          color={colors.textSecondary}
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Home' }] })}
        />
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          @{me.handle}
        </Text>
        {dirty ? (
          <Pressable
            onPress={() => { void save(); }}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, marginRight: 6 }]}
          >
            <Text style={[styles.saveLabel, { color: colors.primary }]}>Save</Text>
          </Pressable>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: tabBarPad + 32 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <AvatarGradientRing
            user={me}
            size={88}
            onPress={openAvatarPicker}
            showCameraBadge
            uploading={avatarUploading}
          />
          <View style={styles.heroText}>
            <Text style={[styles.heroName, { color: colors.text }]}>{me.name}</Text>
            <Text style={[styles.heroHandle, { color: colors.primary }]}>@{me.handle}</Text>
            {adopterBadge ? (
              <View style={styles.heroBadges}>
                <View style={styles.adopterPill}>
                  <Icon name={adopterBadge.icon} size={11} color={adopterBadge.tint} />
                  <Text style={[styles.adopterPillText, { color: adopterBadge.tint }]}>
                    {adopterBadge.label}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        </View>

        <SectionTitle
          title="About you"
          action={(
            <Pressable
              onPress={toggleAboutEdit}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={aboutEditing ? 'Done editing about you' : 'Edit about you'}
              style={({ pressed }) => [{ opacity: pressed ? 0.65 : 1 }]}
            >
              {aboutEditing ? (
                <Text style={[styles.sectionEditDone, { color: colors.primary }]}>Done</Text>
              ) : (
                <Icon name="edit" size={15} color={colors.textSecondary} />
              )}
            </Pressable>
          )}
        />
        <View style={styles.fieldStack}>
          {aboutEditing ? (
            <TextInput
              value={bio}
              onChangeText={patch(setBio)}
              placeholder="Write a short bio…"
              placeholderTextColor={colors.textTertiary}
              multiline
              autoFocus
              style={[
                styles.fieldInput,
                styles.fieldBio,
                { color: colors.text },
                Platform.select({ web: { outlineStyle: 'none' } as object, default: {} }),
              ]}
            />
          ) : (
            <Text
              style={[
                styles.fieldReadonly,
                { color: bio ? colors.text : colors.textTertiary },
              ]}
            >
              {bio || 'Write a short bio…'}
            </Text>
          )}
          <View style={styles.fieldLocationReadonly}>
            <Icon name="mapPin" size={15} color={colors.primary} />
            {aboutEditing ? (
              <TextInput
                value={location}
                onChangeText={patch(setLocation)}
                placeholder="Your city or neighbourhood"
                placeholderTextColor={colors.textTertiary}
                style={[
                  styles.fieldInput,
                  styles.fieldLocation,
                  { color: colors.primary },
                  Platform.select({ web: { outlineStyle: 'none' } as object, default: {} }),
                ]}
              />
            ) : (
              <Text
                style={[
                  styles.fieldLocationText,
                  { color: location ? colors.primary : colors.textTertiary },
                ]}
              >
                {location || 'Your city or neighbourhood'}
              </Text>
            )}
          </View>
        </View>

        <YourShelfSection
          savedCount={savedPosts.length}
          onActivity={() => navigation.navigate('Activity')}
          onSaved={() => navigation.navigate('Saved')}
        />

        <SectionTitle title="Appearance" />
        <AppearanceSelector />

        <ProfileMenuAccordion
          items={[
            {
              id: 'alerts',
              title: 'Alerts',
              content: (
                <View style={styles.linkStack}>
                  <ToggleRow
                    icon="bell"
                    label="Post activity"
                    hint="Likes, comments, and shares"
                    value={notifyPosts}
                    onValueChange={v => patchSettings({ notifyPostActivity: v })}
                  />
                  <ToggleRow
                    icon="paw"
                    label="Adoption updates"
                    hint="Milestones, approvals, and messages"
                    tint={colors.accent}
                    value={notifyAdoption}
                    onValueChange={v => patchSettings({ notifyAdoptionUpdates: v })}
                  />
                </View>
              ),
            },
            {
              id: 'privacy',
              title: 'Privacy & account',
              content: (
                <View style={styles.linkStack}>
                  <MenuLink
                    icon="lock"
                    label="Privacy settings"
                    hint="Who can see your profile and posts"
                    onPress={() => navigation.navigate('Privacy')}
                  />
                  <MenuLink
                    icon="block"
                    label="Blocked users"
                    hint={
                      blockedUserIds.length > 0
                        ? `${blockedUserIds.length} blocked`
                        : 'Manage who you\'ve blocked'
                    }
                    tint={colors.warning}
                    onPress={() => navigation.navigate('BlockedUsers')}
                  />
                  <MenuLink
                    icon="calendar"
                    label="Member since"
                    value={me.joinedDate ?? '—'}
                    tint={colors.textSecondary}
                  />
                </View>
              ),
            },
          ]}
        />

        <View style={[styles.accordionRule, { backgroundColor: colors.border }]} />
        <View style={styles.signOutRow}>
          <MenuLink
            icon="logout"
            label="Sign out"
            danger
            onPress={() => { void signOut(); }}
          />
        </View>
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
    paddingHorizontal: 6,
    paddingTop: 4,
    paddingBottom: 6,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  headerSpacer: { width: 56 },
  saveLabel: { fontSize: 15, fontWeight: '700', paddingHorizontal: 10, paddingVertical: 8 },

  scroll: { paddingHorizontal: 20, paddingTop: 4 },

  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 18,
    paddingHorizontal: 4,
    marginBottom: 8,
    borderRadius: radius.xl,
  },
  heroText: { flex: 1, gap: 3 },
  heroName: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  heroHandle: { fontSize: 14, fontWeight: '600' },
  heroBadges: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 6 },
  adopterPill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  adopterPillText: { fontSize: 11, fontWeight: '700' },

  sectionTitleRow: {
    marginTop: 22,
    marginBottom: 12,
  },
  sectionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    ...typography.sectionLabel,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  sectionEditDone: {
    fontSize: 13,
    fontWeight: '700',
  },
  fieldStack: { gap: 8 },
  fieldInput: { fontSize: 15, lineHeight: 22 },
  fieldReadonly: { fontSize: 15, lineHeight: 22 },
  fieldBio: { minHeight: 44 },
  fieldLocationReadonly: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fieldLocationText: { fontSize: 15, fontWeight: '600' },
  fieldLocation: { flex: 1, paddingVertical: 0 },

  shelfBlock: { marginTop: 20 },
  shelfKickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  shelfKickerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  shelfKicker: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  shelfRailStack: { gap: 18 },
  shelfRailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  shelfRailBar: {
    width: 2,
    borderRadius: 1,
    alignSelf: 'stretch',
    minHeight: 44,
  },

  linkStack: { gap: 18 },
  menuLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  menuLinkBody: { flex: 1, gap: 2 },
  menuLinkLabel: { fontSize: 14, fontWeight: '600', lineHeight: 19, letterSpacing: -0.1 },
  menuLinkHint: { fontSize: 12.5, lineHeight: 17 },
  menuLinkValue: { fontSize: 13.5, fontWeight: '600', letterSpacing: -0.1, flexShrink: 0 },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },

  signOutRow: {
    paddingVertical: 10,
  },

  segmentRow: { flexDirection: 'row', gap: 8 },
  segment: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: { fontSize: 14, fontWeight: '600' },

  accordionRule: {
    height: StyleSheet.hairlineWidth,
    marginTop: 24,
    marginBottom: 4,
  },
});
