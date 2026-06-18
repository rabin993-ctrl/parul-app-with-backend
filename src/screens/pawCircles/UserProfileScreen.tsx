import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { radius, typography } from '../../theme/tokens';
import { CompanionAvatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/icons/Icon';
import { IconButton } from '../../components/ui/Button';
import {
  ProfileHero,
  ProfilePublicStatsSection,
  ProfileContentDrawer,
  ProfileContentTabs,
  ProfileContentGrid,
  type ProfileContentTab,
} from '../../components/profile/ProfileChrome';
import { ProfileRehomedShowcase, ProfileAdoptedShowcase } from '../../components/profile/ProfileAdoptionPanel';
import { useAdoption } from '../../context/AdoptionContext';
import { countProfileAdoptedMissedUpdates } from '../../utils/profileAdoptionDisplay';
import { CompanionFullProfile } from '../../components/CompanionProfile';
import { Toast, ToastData } from '../../components/ui/Toast';
import { useProfileViewData } from '../../hooks/useProfileViewData';
import type { CirclesStackParamList } from '../../navigation/CirclesNavigator';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';
import type { User } from '../../data/mockData';
import { useUserProfile } from '../../hooks/useUserProfile';
import { startDirectMessage } from '../../utils/startDirectMessage';
import { useAuth } from '../../context/AuthContext';
import { ChatThreadScreen } from '../ChatThreadScreen';
import type { ChatThread } from '../../context/AdoptionContext';

type Route = RouteProp<CirclesStackParamList, 'UserProfile'>;
type Nav = NativeStackNavigationProp<CirclesStackParamList, 'UserProfile'>;

export function UserProfileScreen() {
  const { colors } = useTheme();
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const tabBarPad = useTabBarScrollPadding();
  const { userId, returnTo } = route.params;
  const userMini = useUserProfile(userId);
  const user = userMini
    ? ({ ...userMini, bio: undefined, location: undefined, loc: '', verified: false, circle: 0, circleCount: 0, companions: 0 } as unknown as User)
    : null;

  const { user: authUser } = useAuth();
  const isSelf = authUser?.id === userId;
  const [contentTab, setContentTab] = useState<ProfileContentTab>('posts');
  const [companionProfileId, setCompanionProfileId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [dmThread, setDmThread] = useState<ChatThread | null>(null);
  const [dmLoading, setDmLoading] = useState(false);

  useEffect(() => {
    if (!isSelf) return;
    navigation.getParent()?.navigate('Profile', { screen: 'Home' });
  }, [isSelf, navigation]);

  const handleMessage = useCallback(async () => {
    if (!authUser) return;
    if (dmLoading) return;
    setDmLoading(true);
    const result = await startDirectMessage(userId);
    setDmLoading(false);
    if ('error' in result) {
      setToast({ msg: result.error, icon: 'close', tone: 'danger' });
      return;
    }
    setDmThread({
      id: result.threadId,
      participantId: userId,
      participantName: userMini?.name,
      participantHandle: userMini?.handle,
      participantTint: userMini?.tint,
      participantAvatarUrl: userMini?.avatarUrl,
      participantAvatarFallbackUrl: userMini?.avatarFallbackUrl,
      preview: '',
      time: '',
      unread: 0,
    });
  }, [authUser, userId, userMini, dmLoading]);

  const { records } = useAdoption();
  const {
    posts,
    rescues,
    outgoingAdoptions,
    incomingAdopted,
    impactStats,
    trust,
    adopterTrust,
    userCompanions,
  } = useProfileViewData(userId);

  const adoptedMissedCount = useMemo(
    () => countProfileAdoptedMissedUpdates(records, userId),
    [records, userId],
  );

  const handleStatPress = useCallback((tab: ProfileContentTab) => {
    setContentTab(tab);
  }, []);

  const handleBack = () => {
    if (returnTo === 'Feed') {
      navigation.getParent()?.navigate('Feed');
      return;
    }
    if (returnTo === 'Hub' || returnTo === 'Messages') {
      navigation.getParent()?.navigate('Circles', { screen: 'Hub' });
      return;
    }
    navigation.goBack();
  };

  if (!user || isSelf) return null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <IconButton name="chevronLeft" size={40} tone="soft" color={colors.textSecondary} onPress={handleBack} />
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {isSelf ? 'Your public profile' : user.name}
        </Text>
        <IconButton name="more" size={40} tone="soft" color={colors.textSecondary} onPress={() => {}} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <ProfileHero
          user={user}
          trust={trust}
        />

        <ProfileContentDrawer bottomInset={tabBarPad}>
          <ProfilePublicStatsSection
            stats={impactStats}
            onStatPress={handleStatPress}
          />

          {!isSelf && (
            <View style={styles.actions}>
              <Pressable
                onPress={handleMessage}
                style={({ pressed }) => [
                  styles.actionBtn,
                  styles.actionBtnPrimary,
                  { backgroundColor: colors.primary, opacity: pressed || dmLoading ? 0.7 : 1 },
                ]}
              >
                <Icon name="send" size={15} color="#fff" />
                <Text style={styles.actionBtnLabel}>{dmLoading ? 'Opening…' : 'Message'}</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  navigation.getParent()?.navigate('Circles', { screen: 'Hub' });
                  setToast({ msg: 'Open a circle to add this member', icon: 'circles', tone: 'primary' });
                }}
                style={({ pressed }) => [
                  styles.actionBtn,
                  styles.actionBtnSoft,
                  {
                    backgroundColor: colors.surface2,
                    borderColor: colors.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Icon name="plus" size={15} color={colors.text} />
                <Text style={[styles.actionBtnLabelSoft, { color: colors.text }]}>Add to circle</Text>
              </Pressable>
            </View>
          )}

          {userCompanions.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>Companions</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.companionScroll}>
                {userCompanions.map(c => (
                  <Pressable
                    key={c.id}
                    style={({ pressed }) => [styles.companionChip, pressed && { opacity: 0.7 }]}
                    onPress={() => setCompanionProfileId(c.id)}
                  >
                    <CompanionAvatar companion={c} size={54} />
                    <Text style={[styles.companionName, { color: colors.text }]} numberOfLines={1}>{c.name}</Text>
                    <Text style={[styles.companionMeta, { color: colors.textTertiary }]} numberOfLines={1}>
                      {c.species === 'dog' ? 'Dog' : c.species === 'cat' ? 'Cat' : c.species}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          <ProfileContentTabs
            value={contentTab}
            onChange={setContentTab}
            tabAlerts={adoptedMissedCount > 0 ? { adopted: adoptedMissedCount } : undefined}
          />

          <View style={styles.tabContent}>
            {contentTab === 'adoptions' ? (
              <ProfileRehomedShowcase
                records={outgoingAdoptions}
                viewMode="public"
                onOpenRecord={id => navigation.navigate('PublicAdoptedDetail', { recordId: id })}
              />
            ) : contentTab === 'adopted' ? (
              <ProfileAdoptedShowcase
                incoming={incomingAdopted}
                viewMode="public"
                onOpenRecord={id => navigation.navigate('PublicAdoptedDetail', { recordId: id })}
              />
            ) : (
              <ProfileContentGrid
                tab={contentTab}
                posts={posts}
                rescues={rescues}
                outgoingAdoptions={outgoingAdoptions}
                viewMode="public"
                profileUserId={userId}
                incomingAdopted={incomingAdopted}
                adopterTrust={adopterTrust}
                onCompanionPress={setCompanionProfileId}
                onUserPress={id => {
                  if (id !== userId) {
                    navigation.push('UserProfile', { userId: id });
                  }
                }}
                onToast={setToast}
                onOpenRescue={id =>
                  navigation.getParent()?.navigate('Profile', {
                    screen: 'RescueDetail',
                    params: { caseId: id },
                  })
                }
                onOpenOutgoingAdoption={id => navigation.navigate('PublicAdoptedDetail', { recordId: id })}
                onOpenAdopted={id => navigation.navigate('PublicAdoptedDetail', { recordId: id })}
              />
            )}
          </View>
        </ProfileContentDrawer>
      </ScrollView>

      {companionProfileId && (
        <CompanionFullProfile
          companionId={companionProfileId}
          visible
          onClose={() => setCompanionProfileId(null)}
          onSwitchCompanion={setCompanionProfileId}
          onOwnerPress={ownerId => {
            setCompanionProfileId(null);
            if (ownerId !== userId) {
              navigation.navigate('UserProfile', { userId: ownerId });
            }
          }}
          onToast={setToast}
        />
      )}

      <Modal visible={!!dmThread} animationType="slide" onRequestClose={() => setDmThread(null)}>
        {dmThread && (
          <ChatThreadScreen thread={dmThread} onClose={() => setDmThread(null)} />
        )}
      </Modal>

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

  scroll: {
    paddingHorizontal: 16,
    paddingTop: 4,
    flexGrow: 1,
  },
  scrollView: { flex: 1 },

  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radius.full,
  },
  actionBtnPrimary: {},
  actionBtnSoft: { borderWidth: StyleSheet.hairlineWidth },
  actionBtnLabel: { fontSize: 14, fontWeight: '700', color: '#fff' },
  actionBtnLabelSoft: { fontSize: 14, fontWeight: '700' },

  section: { paddingTop: 4, paddingBottom: 8 },
  sectionLabel: {
    ...typography.sectionLabel,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
    textTransform: 'none',
    marginBottom: 10,
  },
  companionScroll: { gap: 16 },
  companionChip: { alignItems: 'center', gap: 5, width: 64 },
  companionName: { fontSize: 11.5, fontWeight: '700', textAlign: 'center' },
  companionMeta: { fontSize: 10.5, textAlign: 'center' },

  tabContent: { paddingTop: 4 },
});
