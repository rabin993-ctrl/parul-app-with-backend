import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Switch, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { typography, spacing } from '../../theme/tokens';
import { profileOwnerScreenBg } from '../../theme/profileCanvasTheme';
import { Icon } from '../../components/icons/Icon';
import { AppCenteredHeader, HUB_USERNAME_TITLE_STYLE } from '../../components/ui/AppSubHeader';
import { Toast, ToastData } from '../../components/ui/Toast';
import { useFeedPosts } from '../../context/FeedPostContext';
import { useUserPrivacy } from '../../context/UserPrivacyContext';
import { useCurrentUserProfile } from '../../context/CurrentUserProfileContext';
import { useAuth } from '../../context/AuthContext';
import { useMediaPicker } from '../../hooks/useMediaPicker';
import type { ThemePreference } from '../../theme/ThemeContext';
import type { ProfileStackParamList } from '../../navigation/ProfileNavigator';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';
import { ProfileMenuAccordion, ProfileMenuPickerRow } from '../../components/profile/ProfileSettingsRows';
import { ProfileSettingsHero, ProfileContentDrawer, ProfileScreenCanvas } from '../../components/profile/ProfileChrome';
import { normalizeUsername, validateUsername } from '../../utils/username';

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

const APPEARANCE_OPTIONS: { id: ThemePreference; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

function AppearanceSelector() {
  const { colors, preference, setPreference } = useTheme();
  return (
    <ProfileMenuPickerRow
      icon="sun"
      label="Theme"
      hint="Light, dark, or match your device"
      tint={colors.primary}
      value={preference}
      options={APPEARANCE_OPTIONS}
      onChange={id => setPreference(id as ThemePreference)}
    />
  );
}

export function ProfileSettingsScreen() {
  const { colors, isDark } = useTheme();
  const screenBg = profileOwnerScreenBg(isDark, colors);
  const { signOut } = useAuth();
  const navigation = useNavigation<Nav>();
  const tabBarPad = useTabBarScrollPadding();
  const { me, updateProfile, updateAvatar } = useCurrentUserProfile();
  const { pickImage, takePhoto } = useMediaPicker();
  const { savedPosts } = useFeedPosts();
  const { blockedUserIds, settings, patchSettings } = useUserPrivacy();

  const [bio, setBio] = useState(me.bio ?? '');
  const [location, setLocation] = useState(me.location ?? me.loc ?? '');
  const [name, setName] = useState(me.name);
  const [handle, setHandle] = useState(me.handle);
  const notifyPosts = settings.notifyPostActivity;
  const notifyAdoption = settings.notifyAdoptionUpdates;
  const [profileEditing, setProfileEditing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  useEffect(() => {
    if (profileEditing || dirty) return;
    setBio(me.bio ?? '');
    setLocation(me.location ?? me.loc ?? '');
    setName(me.name);
    setHandle(me.handle);
  }, [me.bio, me.location, me.loc, me.name, me.handle, dirty, profileEditing]);

  const patch = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setDirty(true);
  };

  const patchHandle = (v: string) => {
    setHandle(normalizeUsername(v));
    setDirty(true);
  };

  const save = useCallback(async () => {
    const nextBio = bio.trim();
    const nextLocation = location.trim();
    const nextName = name.trim();
    const nextHandle = normalizeUsername(handle);
    if (nextName.length < 2) {
      setToast({ msg: 'Name must be at least 2 characters', icon: 'close', tone: 'danger' });
      return;
    }
    const handleError = validateUsername(nextHandle);
    if (handleError) {
      setToast({ msg: handleError, icon: 'close', tone: 'danger' });
      return;
    }
    try {
      await updateProfile({
        bio: nextBio,
        location: nextLocation,
        name: nextName,
        handle: nextHandle,
      });
      setBio(nextBio);
      setLocation(nextLocation);
      setName(nextName);
      setHandle(nextHandle);
      setDirty(false);
      setProfileEditing(false);
      setToast({ msg: 'Profile updated', icon: 'check', tone: 'success' });
    } catch (err) {
      const msg = err instanceof Error && err.message
        ? err.message
        : 'Could not update profile';
      setToast({ msg, icon: 'close', tone: 'danger' });
    }
  }, [bio, location, name, handle, updateProfile]);

  const toggleProfileEdit = () => {
    if (profileEditing && dirty) {
      void save();
      return;
    }
    setProfileEditing(prev => !prev);
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
    if (Platform.OS === 'web') {
      void uploadPickedAvatar('library');
      return;
    }
    Alert.alert('Profile photo', 'Choose a photo for your profile', [
      { text: 'Photo library', onPress: () => { void uploadPickedAvatar('library'); } },
      { text: 'Take photo', onPress: () => { void uploadPickedAvatar('camera'); } },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [avatarUploading, uploadPickedAvatar]);

  return (
    <SafeAreaView
      style={[
        styles.safe,
        { backgroundColor: screenBg },
      ]}
      edges={['top']}
    >
      <ProfileScreenCanvas>
        <AppCenteredHeader
          title={`@${me.handle}`}
          onBack={() => navigation.reset({ index: 0, routes: [{ name: 'Home' }] })}
          titleStyle={HUB_USERNAME_TITLE_STYLE}
          trailing={dirty ? (
            <Pressable
              onPress={() => { void save(); }}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            >
              <Text style={[styles.saveLabel, { color: colors.primary }]}>Save</Text>
            </Pressable>
          ) : undefined}
        />

        <View style={styles.page}>
          <ProfileSettingsHero
            user={me}
            name={name}
            handle={handle}
            bio={bio}
            location={location}
            editing={profileEditing}
            onToggleEdit={toggleProfileEdit}
            onNameChange={patch(setName)}
            onHandleChange={patchHandle}
            onBioChange={patch(setBio)}
            onLocationChange={patch(setLocation)}
            onAvatarPress={openAvatarPicker}
            avatarUploading={avatarUploading}
          />

          <ProfileContentDrawer fill scrollable bottomInset={tabBarPad}>
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
                {
                  id: 'legal',
                  title: 'Legal',
                  content: (
                    <View style={styles.linkStack}>
                      <MenuLink
                        icon="shield"
                        label="Privacy Policy"
                        hint="How we collect and use your data"
                        onPress={() => navigation.navigate('PrivacyPolicy')}
                      />
                      <MenuLink
                        icon="check-circle"
                        label="Terms of Service"
                        hint="Rules for using Parul"
                        onPress={() => navigation.navigate('TermsOfService')}
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
          </ProfileContentDrawer>
        </View>

        <Toast data={toast} onHide={() => setToast(null)} />
      </ProfileScreenCanvas>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  saveLabel: { fontSize: 15, fontWeight: '700', paddingHorizontal: 4, paddingVertical: 8 },

  page: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 2,
  },

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

  shelfBlock: { marginTop: spacing.xl2 },
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
    paddingTop: 10,
    paddingBottom: 10,
  },

  accordionRule: {
    height: StyleSheet.hairlineWidth,
  },
});
