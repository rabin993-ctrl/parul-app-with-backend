import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { Toast, ToastData } from '../../components/ui/Toast';
import {
  ProfileHomeHeader,
  ProfileOwnerHero,
  ProfileCompanionsSection,
  ProfileOwnerContentTabs,
  ProfileContentGrid,
  ProfileActionLink,
  type ProfileContentTab,
} from '../../components/profile/ProfileChrome';
import { ProfileRehomedShowcase, ProfileAdoptedShowcase } from '../../components/profile/ProfileAdoptionPanel';
import { useAdoption } from '../../context/AdoptionContext';
import { countProfileAdoptedMissedUpdates } from '../../utils/profileAdoptionDisplay';
import { AddCompanionSheet } from '../../components/profile/AddCompanionSheet';
import { useCompanions } from '../../context/CompanionContext';
import { useCurrentUserProfile } from '../../context/CurrentUserProfileContext';
import { useProfileViewData } from '../../hooks/useProfileViewData';
import { useFeedPosts } from '../../context/FeedPostContext';
import { FoundCard, LostCard } from '../../components/feed/AlertCards';
import { confirmDeletePost } from '../../components/feed/PostOwnerMenu';
import { ForwardSheet, type ForwardDest } from '../../components/ForwardSheet';
import { usePawCircles } from '../../context/PawCircleContext';
import { useCommunityGroups } from '../../context/CommunityGroupsContext';
import { Icon } from '../../components/icons/Icon';
import { radius, typography } from '../../theme/tokens';
import type { Post } from '../../data/mockData';
import type { ProfileStackParamList } from '../../navigation/ProfileNavigator';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';
import { useTabBarScrollProps } from '../../context/TabBarScrollContext';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'Home'>;

export function ProfileHomeScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const { me } = useCurrentUserProfile();
  const { getMyCompanions, hasCompanionForAdoption, addFromAdoption, addManual, removeCompanion } = useCompanions();
  const myCompanions = getMyCompanions(me.id);
  const tabBarPad = useTabBarScrollPadding();
  const tabBarScrollProps = useTabBarScrollProps();
  const {
    posts: myPosts,
    rescues: myRescues,
    outgoingAdoptions,
    incomingAdopted,
    impactStats,
  } = useProfileViewData(me.id);
  const { posts: feedPosts, setPosts, toggleSaved, persistForward, resolveAlert, deletePost, openComposerForEdit } = useFeedPosts();
  const { createdCircles, joinedCircles } = usePawCircles();
  const { joinedCommunities } = useCommunityGroups();
  const { records } = useAdoption();
  const adoptedMissedCount = useMemo(
    () => countProfileAdoptedMissedUpdates(records, me.id),
    [records, me.id],
  );

  const adoptableForCompanion = useMemo(
    () => incomingAdopted.filter(r => !hasCompanionForAdoption(r)),
    [incomingAdopted, hasCompanionForAdoption],
  );

  const [loading, setLoading] = useState(true);
  const [contentTab, setContentTab] = useState<ProfileContentTab>('posts');
  const [toast, setToast] = useState<ToastData | null>(null);
  const [addCompanionOpen, setAddCompanionOpen] = useState(false);
  const [forwardPost, setForwardPost] = useState<Post | null>(null);

  const myActiveAlertPosts = useMemo(
    () => feedPosts.filter(p =>
      p.userId === me.id
      && ((p.label === 'lost' && p.lost && !p.lost.resolved)
        || (p.label === 'found' && p.found && !p.found.resolved)),
    ),
    [feedPosts, me.id],
  );
  const hasAlertsTab = myActiveAlertPosts.length > 0;
  const hasFoundAlerts = myActiveAlertPosts.some(p => p.label === 'found');
  const hasLostAlerts = myActiveAlertPosts.some(p => p.label === 'lost');
  const alertsTabLabel = hasLostAlerts && hasFoundAlerts
    ? 'Alerts'
    : hasFoundAlerts
      ? 'Found'
      : 'Lost';

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  const openCompanionProfile = useCallback((companionId: string) => {
    navigation.navigate('Companion', { companionId });
  }, [navigation]);

  useEffect(() => {
    if (contentTab === 'lost' && !hasAlertsTab) setContentTab('posts');
  }, [hasAlertsTab, contentTab]);

  const handleStatPress = useCallback((tab: ProfileContentTab) => {
    setContentTab(tab);
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ProfileHomeHeader
        user={me}
        onBack={() => navigation.getParent()?.navigate('Feed')}
        onSettings={() => navigation.navigate('Settings')}
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: tabBarPad }]}
        showsVerticalScrollIndicator={false}
        {...tabBarScrollProps}
      >
        <ProfileOwnerHero
          user={me}
          postsCount={myPosts.length}
          stats={impactStats}
          contentTab={contentTab}
          onStatPress={handleStatPress}
          onFollowingPress={() => navigation.navigate('Following')}
          adoptedMissedCount={adoptedMissedCount}
        />

        <ProfileCompanionsSection
          companions={myCompanions}
          onSelect={openCompanionProfile}
          onAdd={() => setAddCompanionOpen(true)}
          onRemove={id => {
            const removed = removeCompanion(id, me.id);
            if (removed) {
              setToast({ msg: `${removed.name} removed from companions`, icon: 'check', tone: 'success' });
            }
          }}
        />

        <ProfileOwnerContentTabs
          value={contentTab}
          onChange={setContentTab}
          tabAlerts={adoptedMissedCount > 0 ? { adopted: adoptedMissedCount } : undefined}
          showLostTab={hasAlertsTab}
          alertsTabLabel={alertsTabLabel}
        />

        {contentTab === 'lost' ? (
          <View style={styles.lostTab}>
            {myActiveAlertPosts.map(post => {
              const companion = post.companionName ?? 'Companion';
              const isFound = post.label === 'found' && !!post.found;
              const resolveLabel = isFound
                ? 'This pet found its home'
                : `${companion} has returned home`;
              const resolveToast = isFound
                ? `${companion} marked as reunited with their owner`
                : `${companion} marked as returned home`;
              const cardProps = {
                post,
                onToast: setToast,
                onForward: () => setForwardPost(post),
                onUserPress: () => {},
                onCompanionPress: openCompanionProfile,
                saved: post.saved,
                onSave: () => {
                  const nowSaved = toggleSaved(post.id);
                  setToast({ msg: nowSaved ? 'Saved to your collection' : 'Removed from saved', icon: 'bookmark', tone: 'primary' });
                },
                onEdit: () => openComposerForEdit(post),
                onDelete: () => confirmDeletePost(() => {
                  deletePost(post.id);
                  setToast({ msg: 'Post deleted', icon: 'check', tone: 'success' });
                }),
              };

              return (
                <View key={post.id} style={styles.lostPostWrap}>
                  {isFound ? (
                    <FoundCard {...cardProps} />
                  ) : (
                    <LostCard {...cardProps} />
                  )}
                  <Pressable
                    onPress={() => {
                      resolveAlert(post.id);
                      setToast({ msg: resolveToast, icon: 'check', tone: 'success' });
                    }}
                    style={({ pressed }) => [styles.returnedBtn, { opacity: pressed ? 0.75 : 1 }]}
                    accessibilityRole="button"
                    accessibilityLabel={resolveLabel}
                  >
                    <Icon name="check" size={16} color="#fff" sw={2.5} />
                    <Text style={styles.returnedBtnText}>{resolveLabel}</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        ) : contentTab === 'adoptions' ? (
          <ProfileRehomedShowcase
            records={outgoingAdoptions}
            viewMode="owner"
            onOpenRecord={id => navigation.navigate('AdoptedDetail', { recordId: id })}
          />
        ) : contentTab === 'adopted' ? (
          <ProfileAdoptedShowcase
            incoming={incomingAdopted}
            viewMode="owner"
            onOpenRecord={id => navigation.navigate('AdoptedDetail', { recordId: id })}
          />
        ) : (
          <ProfileContentGrid
            tab={contentTab}
            posts={myPosts}
            rescues={myRescues}
            outgoingAdoptions={outgoingAdoptions}
            profileUserId={me.id}
            onCompanionPress={openCompanionProfile}
            onUserPress={id => {
              if (id !== me.id) {
                navigation.getParent()?.navigate('Circles', {
                  screen: 'UserProfile',
                  params: { userId: id },
                });
              }
            }}
            onToast={setToast}
            onOpenRescue={id => navigation.navigate('RescueDetail', { caseId: id })}
            onOpenOutgoingAdoption={id => navigation.navigate('AdoptedDetail', { recordId: id })}
            onPostAsOwner={id => navigation.navigate('AdoptedDetail', { recordId: id, openOwnerPost: true })}
            onOpenAdopted={id => navigation.navigate('AdoptedDetail', { recordId: id })}
            onAdoptedUpdateSubmitted={record => {
              setToast({ msg: `Update posted for ${record.petName}`, icon: 'check', tone: 'success' });
            }}
          />
        )}

        {contentTab === 'adopted' && incomingAdopted.length > 0 && (
          <ProfileActionLink
            label="View all adopted companions"
            onPress={() => navigation.navigate('Adopted')}
          />
        )}
      </ScrollView>

      <AddCompanionSheet
        visible={addCompanionOpen}
        onClose={() => setAddCompanionOpen(false)}
        ownerId={me.id}
        adoptableRecords={adoptableForCompanion}
        onAddFromAdoption={record => {
          const added = addFromAdoption(record);
          if (added) {
            setToast({ msg: `${added.name} added to your companions`, icon: 'check', tone: 'success' });
            openCompanionProfile(added.id);
          }
          return added;
        }}
        onAddManual={input => {
          const added = addManual(input);
          if (added) {
            setToast({ msg: `${added.name} is now on your profile`, icon: 'check', tone: 'success' });
            openCompanionProfile(added.id);
          }
          return added;
        }}
      />

      {forwardPost && (
        <ForwardSheet
          visible
          previewAuthorId={forwardPost.author}
          previewText={forwardPost.text}
          createdCircles={createdCircles}
          joinedCircles={joinedCircles}
          joinedCommunities={joinedCommunities}
          onClose={() => setForwardPost(null)}
          onSelect={(dests: ForwardDest[]) => {
            if (dests.length > 0) {
              setPosts(ps => ps.map(p => (
                p.id === forwardPost.id ? { ...p, forwards: p.forwards + dests.length } : p
              )));
              persistForward(forwardPost.id, dests, forwardPost.text, forwardPost.label);
              const label = dests.map(d => d.label).join(', ');
              setToast({ msg: `Shared to ${label}`, icon: 'forward', tone: 'success' });
            }
            setForwardPost(null);
          }}
        />
      )}

      <Toast data={toast} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 16, gap: 12, paddingTop: 2 },
  lostTab: { gap: 12 },
  lostPostWrap: { gap: 10 },
  returnedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2FA46A',
    borderRadius: radius.full,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 16,
    marginBottom: 4,
  },
  returnedBtnText: {
    ...typography.label,
    color: '#fff',
    fontSize: 15,
  },
});
