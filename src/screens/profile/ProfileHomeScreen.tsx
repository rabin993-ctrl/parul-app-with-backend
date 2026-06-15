import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { Toast, ToastData } from '../../components/ui/Toast';
import {
  ProfileHomeHeader,
  ProfileHero,
  ProfileCompanionsSection,
  ProfileContentTabs,
  ProfileContentGrid,
  ProfileActionLink,
  type ProfileContentTab,
} from '../../components/profile/ProfileChrome';
import { ProfileRehomedShowcase, ProfileAdoptedShowcase } from '../../components/profile/ProfileAdoptionPanel';
import { useAdoption } from '../../context/AdoptionContext';
import { countProfileAdoptedMissedUpdates } from '../../utils/profileAdoptionDisplay';
import { CompanionFullProfile } from '../../components/CompanionProfile';
import { AddCompanionSheet } from '../../components/profile/AddCompanionSheet';
import { useCompanions } from '../../context/CompanionContext';
import { useCurrentUserProfile } from '../../context/CurrentUserProfileContext';
import { useMediaPicker } from '../../hooks/useMediaPicker';
import { useProfileViewData } from '../../hooks/useProfileViewData';
import { useFeedPosts } from '../../context/FeedPostContext';
import { LostCard } from '../../components/feed/AlertCards';
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
  const { me, updateAvatar } = useCurrentUserProfile();
  const { pickImage } = useMediaPicker();
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
    trust,
  } = useProfileViewData(me.id);
  const { posts: feedPosts, setPosts, toggleSaved, persistForward, resolveAlert } = useFeedPosts();
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
  const [companionProfileId, setCompanionProfileId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [addCompanionOpen, setAddCompanionOpen] = useState(false);
  const [forwardPost, setForwardPost] = useState<Post | null>(null);

  const myActiveLostPosts = useMemo(
    () => feedPosts.filter(p => p.userId === me.id && p.label === 'lost' && p.lost && !p.lost.resolved),
    [feedPosts, me.id],
  );
  const hasActiveLost = myActiveLostPosts.length > 0;

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  useFocusEffect(useCallback(() => () => {
    setCompanionProfileId(null);
  }, []));

  useEffect(() => {
    if (contentTab === 'lost' && !hasActiveLost) setContentTab('posts');
  }, [hasActiveLost, contentTab]);

  const handleStatPress = useCallback((tab: ProfileContentTab) => {
    setContentTab(tab);
  }, []);

  const openAvatarPicker = useCallback(async () => {
    const asset = await pickImage({ squareCrop: true });
    if (asset) {
      await updateAvatar(asset);
      setToast({ msg: 'Profile photo updated', icon: 'check', tone: 'success' });
    }
  }, [pickImage, updateAvatar]);

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
      <ProfileHomeHeader user={me} onSettings={() => navigation.navigate('Settings')} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: tabBarPad }]}
        showsVerticalScrollIndicator={false}
        {...tabBarScrollProps}
      >
        <ProfileHero
          user={me}
          trust={trust}
          stats={impactStats}
          onStatPress={handleStatPress}
          onAvatarPress={openAvatarPicker}
          showTreatBalance
          showHandle={false}
        />

        <ProfileCompanionsSection
          companions={myCompanions}
          onSelect={setCompanionProfileId}
          onAdd={() => setAddCompanionOpen(true)}
          onRemove={id => {
            const removed = removeCompanion(id, me.id);
            if (removed) {
              if (companionProfileId === id) setCompanionProfileId(null);
              setToast({ msg: `${removed.name} removed from companions`, icon: 'check', tone: 'success' });
            }
          }}
        />

        <ProfileContentTabs
          value={contentTab}
          onChange={setContentTab}
          tabAlerts={adoptedMissedCount > 0 ? { adopted: adoptedMissedCount } : undefined}
          showLostTab={hasActiveLost}
        />

        {contentTab === 'lost' ? (
          <View style={styles.lostTab}>
            {myActiveLostPosts.map(post => (
              <View key={post.id} style={styles.lostPostWrap}>
                <LostCard
                  post={post}
                  onToast={setToast}
                  onForward={() => setForwardPost(post)}
                  onUserPress={() => {}}
                  saved={post.saved}
                  onSave={() => {
                    const nowSaved = toggleSaved(post.id);
                    setToast({ msg: nowSaved ? 'Saved to your collection' : 'Removed from saved', icon: 'bookmark', tone: 'primary' });
                  }}
                />
                <Pressable
                  onPress={() => {
                    resolveAlert(post.id);
                    setToast({ msg: `${post.companionName ?? 'Companion'} marked as returned home`, icon: 'check', tone: 'success' });
                  }}
                  style={({ pressed }) => [styles.returnedBtn, { opacity: pressed ? 0.75 : 1 }]}
                  accessibilityRole="button"
                  accessibilityLabel={`${post.companionName ?? 'Companion'} has returned home`}
                >
                  <Icon name="check" size={16} color="#fff" sw={2.5} />
                  <Text style={styles.returnedBtnText}>
                    {post.companionName ?? 'Companion'} has returned home
                  </Text>
                </Pressable>
              </View>
            ))}
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
            onCompanionPress={setCompanionProfileId}
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
            setCompanionProfileId(added.id);
          }
          return added;
        }}
        onAddManual={input => {
          const added = addManual(input);
          if (added) {
            setToast({ msg: `${added.name} is now on your profile`, icon: 'check', tone: 'success' });
            setCompanionProfileId(added.id);
          }
          return added;
        }}
      />

      {companionProfileId && (
        <CompanionFullProfile
          companionId={companionProfileId}
          visible
          onClose={() => setCompanionProfileId(null)}
          onSwitchCompanion={setCompanionProfileId}
          onToast={setToast}
        />
      )}

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
              setPosts(ps => ps.map(p => p.id === forwardPost.id ? { ...p, forwards: p.forwards + 1 } : p));
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
