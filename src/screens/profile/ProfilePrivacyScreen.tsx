import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { ProfileSubHeader } from '../../components/profile/ProfileChrome';
import {
  ProfileMenuIntro,
  ProfileMenuPickerRow,
  ProfileMenuSection,
  ProfileMenuToggleRow,
  profileMenuStyles,
} from '../../components/profile/ProfileSettingsRows';
import {
  MessagePolicy,
  ProfileVisibility,
  useUserPrivacy,
} from '../../context/UserPrivacyContext';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';
import { useTabBarScrollProps } from '../../context/TabBarScrollContext';

const VISIBILITY_OPTIONS = [
  { id: 'everyone', label: 'Everyone' },
  { id: 'circles', label: 'Circles' },
  { id: 'only_me', label: 'Only me' },
] as const;

const MESSAGE_OPTIONS = [
  { id: 'everyone', label: 'Everyone' },
  { id: 'circles', label: 'Circles' },
  { id: 'none', label: 'No one' },
] as const;

export function ProfilePrivacyScreen() {
  const { colors } = useTheme();
  const tabBarPad = useTabBarScrollPadding();
  const tabBarScrollProps = useTabBarScrollProps();
  const { settings, patchSettings } = useUserPrivacy();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ProfileSubHeader title="Privacy settings" />

      <ScrollView
        contentContainerStyle={[profileMenuStyles.scroll, { paddingBottom: tabBarPad + 32 }]}
        showsVerticalScrollIndicator={false}
        {...tabBarScrollProps}
      >
        <ProfileMenuIntro>
          You're in control of who sees you and how you show up.
        </ProfileMenuIntro>

        <ProfileMenuSection title="profile" kicker first>
          <ProfileMenuPickerRow
            icon="user"
            label="Who can see your profile"
            barTint={colors.primary}
            value={settings.profileVisibility}
            options={[...VISIBILITY_OPTIONS]}
            onChange={id => patchSettings({ profileVisibility: id as ProfileVisibility })}
          />
          <ProfileMenuToggleRow
            icon="search"
            label="Discoverable in search"
            barTint={colors.primary}
            value={settings.discoverable}
            onValueChange={v => patchSettings({ discoverable: v })}
          />
          <ProfileMenuToggleRow
            icon="eye"
            label="Show when you're online"
            barTint={colors.primary}
            value={settings.showOnline}
            onValueChange={v => patchSettings({ showOnline: v })}
          />
        </ProfileMenuSection>

        <ProfileMenuSection title="posts & paws" kicker>
          <ProfileMenuPickerRow
            icon="grid"
            label="Who can see your posts"
            barTint={colors.accent}
            value={settings.postVisibility}
            options={[...VISIBILITY_OPTIONS]}
            onChange={id => patchSettings({ postVisibility: id as ProfileVisibility })}
          />
          <ProfileMenuToggleRow
            icon="mapPin"
            barTint={colors.accent}
            label="Show location on posts"
            value={settings.showLocation}
            onValueChange={v => patchSettings({ showLocation: v })}
          />
          <ProfileMenuToggleRow
            icon="paw"
            barTint={colors.accent}
            label="Show companions on profile"
            value={settings.showCompanions}
            onValueChange={v => patchSettings({ showCompanions: v })}
          />
        </ProfileMenuSection>

        <ProfileMenuSection title="messaging" kicker>
          <ProfileMenuPickerRow
            icon="comment"
            label="Who can message you"
            barTint={colors.success}
            value={settings.messagePolicy}
            options={[...MESSAGE_OPTIONS]}
            onChange={id => patchSettings({ messagePolicy: id as MessagePolicy })}
          />
        </ProfileMenuSection>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
});
