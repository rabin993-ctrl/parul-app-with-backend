import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import {
  ProfilePublicHeader,
  ProfilePublicHeroBand,
  ProfilePublicActions,
  ProfilePublicCompanionsSection,
  ProfileContentDrawer,
  ProfileScreenCanvas,
  ProfileOwnerContentTabs,
  ProfileContentGrid,
  profileFeedPosts,
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
import { useTabBarScrollProps } from '../../context/TabBarScrollContext';
import { navigateToAdoptionListingFromNested } from '../../navigation/adoptionListingRouting';
import {
  navigateToCompanionPostDetailFromNested,
} from '../../navigation/companionProfileRouting';
import { useUserProfileBack } from '../../navigation/userProfileBack';
import { profileOwnerScreenBg } from '../../theme/profileCanvasTheme';
import type { User } from '../../data/mockData';
import { useUserProfile } from '../../hooks/useUserProfile';
import { startDirectMessage } from '../../utils/startDirectMessage';
import { useAuth } from '../../context/AuthContext';
import { useUserPrivacy } from '../../context/UserPrivacyContext';
import { usePawCircles } from '../../context/PawCircleContext';
import { AddToCircleSheet } from '../../components/AddToCircleSheet';
import { UserProfileOptionsSheet } from '../../components/profile/UserProfileOptionsSheet';
import { shareUserProfileLink } from '../../utils/shareLinks';
import type { ChatThread } from '../../context/AdoptionContext';
import { navigateToChatThread } from '../../navigation/chatThreadRouting';
import { supabase } from '../../lib/supabase';
import { Icon } from '../../components/icons/Icon';

type Route = RouteProp<CirclesStackParamList, 'UserProfile'>;
type Nav = NativeStackNavigationProp<CirclesStackParamList, 'UserProfile'>;

function userFromMini(mini: NonNullable<ReturnType<typeof useUserProfile>>): User {
  return {
    ...mini,
    loc: mini.location ?? '',
    verified: false,
    circle: 0,
    circleCount: 0,
    companions: 0,
  } as unknown as User;
}

export function UserProfileScreen() {
  const { colors, isDark } = useTheme();
  const screenBg = profileOwnerScreenBg(isDark, colors);
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const tabBarPad = useTabBarScrollPadding();
  const tabBarScrollProps = useTabBarScrollProps();
  const { userId, returnTo } = route.params;
  const userMini = useUserProfile(userId);
  const user = userMini ? userFromMini(userMini) : null;

  const { user: authUser } = useAuth();
  const { joinedCircles, fetchInvitableCircles } = usePawCircles();
  const isSelf = authUser?.id === userId;
  const [contentTab, setContentTab] = useState<ProfileContentTab>('posts');
  const [companionProfileId, setCompanionProfileId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [dmLoading, setDmLoading] = useState(false);
  const [addToCircleOpen, setAddToCircleOpen] = useState(false);
  const [hideAddToCircle, setHideAddToCircle] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [profileAccess, setProfileAccess] = useState<'loading' | 'allowed' | 'denied'>('loading');

  const { blockUser, unblockUser, reportUser, isBlocked } = useUserPrivacy();
  const userBlocked = isBlocked(userId);

  useEffect(() => {
    if (isSelf) {
      setProfileAccess('allowed');
      return;
    }
    let cancelled = false;
    void supabase.rpc('can_view_user_profile', { p_target: userId }).then(({ data, error }) => {
      if (cancelled) return;
      setProfileAccess(error || !data ? 'denied' : 'allowed');
    });
    return () => { cancelled = true; };
  }, [userId, isSelf]);

  useEffect(() => {
    if (!isSelf) return;
    navigation.getParent()?.navigate('Profile', { screen: 'Home' });
  }, [isSelf, navigation]);

  useEffect(() => {
    if (isSelf || !authUser || joinedCircles.length === 0) {
      setHideAddToCircle(joinedCircles.length === 0);
      return;
    }
    let cancelled = false;
    void fetchInvitableCircles(userId).then(rows => {
      if (!cancelled) {
        setHideAddToCircle(rows.length > 0 && rows.every(r => r.status === 'already_member'));
      }
    });
    return () => { cancelled = true; };
  }, [isSelf, authUser, userId, joinedCircles.length, fetchInvitableCircles]);

  const { records, registerDmThread, reloadThreads } = useAdoption();
  const {
    posts,
    rescues,
    outgoingAdoptions,
    incomingAdopted,
    impactStats,
    trust,
    userCompanions,
  } = useProfileViewData(userId);

  const handleMessage = useCallback(() => {
    if (!authUser || dmLoading) return;

    setDmLoading(true);
    void (async () => {
      const result = await startDirectMessage(userId);
      setDmLoading(false);
      if ('error' in result) {
        setToast({ msg: result.error, icon: 'close', tone: 'danger' });
        return;
      }
      const resolved: ChatThread = {
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
      };
      registerDmThread(resolved);
      await reloadThreads();
      navigateToChatThread(navigation, resolved);
    })();
  }, [authUser, dmLoading, navigation, registerDmThread, reloadThreads, userId, userMini]);

  const postsCount = useMemo(() => profileFeedPosts(posts).length, [posts]);

  const visibleCompanions = userMini?.showCompanions !== false ? userCompanions : [];

  const adoptedMissedCount = useMemo(
    () => countProfileAdoptedMissedUpdates(records, userId),
    [records, userId],
  );

  const handleStatPress = useCallback((tab: ProfileContentTab) => {
    setContentTab(tab);
  }, []);

  const handleFollowingPress = useCallback(() => {
    navigation.navigate('UserFollowing', { userId });
  }, [navigation, userId]);

  const handleBack = useUserProfileBack(returnTo);

  const handleShareProfile = useCallback(async () => {
    const ok = await shareUserProfileLink(userId);
    if (ok) {
      setToast({ msg: 'Profile link copied', icon: 'check', tone: 'success' });
    } else {
      setToast({ msg: 'Could not share profile link', icon: 'close', tone: 'danger' });
    }
    setOptionsOpen(false);
  }, [userId]);

  const handleReportProfile = useCallback(() => {
    reportUser(userId, 'Report from public profile');
    setToast({ msg: 'Report submitted — thanks for helping keep Parul safe', icon: 'flag', tone: 'primary' });
  }, [reportUser, userId]);

  const handleBlockProfile = useCallback(() => {
    blockUser(userId);
    setToast({
      msg: `${userMini?.name ?? 'User'} blocked`,
      icon: 'block',
      tone: 'neutral',
    });
    handleBack();
  }, [blockUser, handleBack, userId, userMini?.name]);

  const handleUnblockProfile = useCallback(() => {
    unblockUser(userId);
    setToast({
      msg: `${userMini?.name ?? 'User'} unblocked`,
      icon: 'check',
      tone: 'success',
    });
  }, [unblockUser, userId, userMini?.name]);

  if (isSelf) {
    return (
      <SafeAreaView
        style={[styles.safe, { backgroundColor: screenBg }]}
        edges={['top']}
      >
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (profileAccess === 'loading') {
    return (
      <SafeAreaView
        style={[styles.safe, { backgroundColor: screenBg }]}
        edges={['top']}
      >
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (profileAccess === 'denied') {
    return (
      <SafeAreaView
        style={[styles.safe, { backgroundColor: screenBg }]}
        edges={['top']}
      >
        <ProfilePublicHeader
          handle={userMini?.handle ?? 'profile'}
          onBack={handleBack}
        />
        <View style={styles.privateWrap}>
          <View style={[styles.privateIcon, { backgroundColor: colors.surface2 }]}>
            <Icon name="lock" size={28} color={colors.textTertiary} />
          </View>
          <Text style={[styles.privateTitle, { color: colors.text }]}>This profile is private</Text>
          <Text style={[styles.privateBody, { color: colors.textSecondary }]}>
            Only people this user allows can view their profile.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView
        style={[
          styles.safe,
          { backgroundColor: screenBg },
        ]}
        edges={['top']}
      >
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.safe,
        { backgroundColor: screenBg },
      ]}
      edges={['top']}
    >
      <ProfileScreenCanvas>
        <ProfilePublicHeader
          handle={user.handle}
          onBack={handleBack}
          onMore={() => setOptionsOpen(true)}
        />

        <View style={styles.page}>
          <ProfilePublicHeroBand
            user={user}
            trust={trust}
            ownerId={userId}
            postsCount={postsCount}
            stats={impactStats}
            contentTab={contentTab}
            onStatPress={handleStatPress}
            onFollowingPress={handleFollowingPress}
            adoptedMissedCount={adoptedMissedCount}
          />

          <ProfileContentDrawer
            fill
            scrollable
            bottomInset={tabBarPad}
            scrollProps={tabBarScrollProps}
          >
            <ProfilePublicActions
              onMessage={handleMessage}
              messageLoading={dmLoading}
              showAddToCircle={!hideAddToCircle}
              onAddToCircle={() => setAddToCircleOpen(true)}
            />

            <ProfilePublicCompanionsSection
              companions={visibleCompanions}
              onSelect={setCompanionProfileId}
            />

            <ProfileOwnerContentTabs
              value={contentTab}
              onChange={setContentTab}
              tabAlerts={adoptedMissedCount > 0 ? { adopted: adoptedMissedCount } : undefined}
            />

            {contentTab === 'adoptions' ? (
              <ProfileRehomedShowcase
                records={outgoingAdoptions}
                viewMode="public"
                onOpenRecord={id => navigation.navigate('PublicAdoptedDetail', { recordId: id })}
                onOpenListing={id => navigateToAdoptionListingFromNested(navigation, id)}
              />
            ) : contentTab === 'adopted' ? (
              <ProfileAdoptedShowcase
                incoming={incomingAdopted}
                viewMode="public"
                onOpenRecord={id => navigation.navigate('PublicAdoptedDetail', { recordId: id })}
                onOpenListing={id => navigateToAdoptionListingFromNested(navigation, id)}
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
                onCompanionPress={setCompanionProfileId}
                onUserPress={id => {
                  if (id !== userId) {
                    navigation.push('UserProfile', { userId: id, returnTo });
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
                onOpenListing={id => navigateToAdoptionListingFromNested(navigation, id)}
              />
            )}
          </ProfileContentDrawer>
        </View>

        {companionProfileId && (
          <CompanionFullProfile
            companionId={companionProfileId}
            visible
            onClose={() => setCompanionProfileId(null)}
            onSwitchCompanion={setCompanionProfileId}
            onOwnerPress={ownerId => {
              setCompanionProfileId(null);
              if (ownerId !== userId) {
                navigation.navigate('UserProfile', { userId: ownerId, returnTo });
              }
            }}
            onToast={setToast}
            onOpenPostDetail={(postId, cid) => {
              setCompanionProfileId(null);
              navigateToCompanionPostDetailFromNested(navigation, { postId, companionId: cid });
            }}
          />
        )}

        <Toast data={toast} onHide={() => setToast(null)} />

        <AddToCircleSheet
          visible={addToCircleOpen}
          onClose={() => setAddToCircleOpen(false)}
          inviteeUserId={userId}
          inviteeName={user.name}
          onInviteSent={msg => setToast({ msg, icon: 'circles', tone: 'primary' })}
        />

        <UserProfileOptionsSheet
          visible={optionsOpen}
          user={user}
          isBlocked={userBlocked}
          onClose={() => setOptionsOpen(false)}
          onShare={() => { void handleShareProfile(); }}
          onReport={handleReportProfile}
          onBlock={handleBlockProfile}
          onUnblock={handleUnblockProfile}
        />
      </ProfileScreenCanvas>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  privateWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  privateIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  privateTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  privateBody: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  page: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 2,
  },
});
