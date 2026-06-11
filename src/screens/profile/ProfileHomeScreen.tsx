import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
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
import { CompanionFullProfile } from '../../components/CompanionProfile';
import { AddCompanionSheet } from '../../components/profile/AddCompanionSheet';
import { users } from '../../data/mockData';
import { useCompanions } from '../../context/CompanionContext';
import { PROFILE_STATS, getProfileTrust, getRescuesForUser } from '../../data/profileData';
import { getAdopterTrustSummary } from '../../data/adoptionRecords';
import { PostHomeUpdateSheet } from '../../components/adoption/AdoptionUpdateUI';
import { useAdoption } from '../../context/AdoptionContext';
import { getActivePrompt } from '../../utils/adoptionUpdateSchedule';
import { useFeedPosts } from '../../context/FeedPostContext';
import type { ProfileStackParamList } from '../../navigation/ProfileNavigator';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';
import { useTabBarScrollProps } from '../../context/TabBarScrollContext';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'Home'>;

export function ProfileHomeScreen() {
  const { colors, mode, setMode } = useTheme();
  const navigation = useNavigation<Nav>();
  const me = users.you;
  const stats = PROFILE_STATS.you;
  const trust = getProfileTrust(me.id);
  const { getMyCompanions, hasCompanionForAdoption, addFromAdoption, addManual, removeCompanion } = useCompanions();
  const myCompanions = getMyCompanions(me.id);
  const myCompanionIds = new Set(myCompanions.map(c => c.id));
  const tabBarPad = useTabBarScrollPadding();
  const tabBarScrollProps = useTabBarScrollProps();
  const { posts: feedPosts } = useFeedPosts();
  const { records, getPromptsForUser, submitAdopterUpdate } = useAdoption();

  const outgoingAdoptions = useMemo(
    () => records.filter(r => r.posterId === me.id && r.status !== 'pending_confirmation'),
    [records, me.id],
  );
  const incomingAdopted = useMemo(
    () => records.filter(
      r => r.adopterId === me.id && (r.status === 'confirmed' || r.status === 'update_due'),
    ),
    [records, me.id],
  );
  const adopterTrust = useMemo(() => getAdopterTrustSummary(records, me.id), [me.id, records]);
  const updatePrompts = useMemo(() => getPromptsForUser(me.id), [getPromptsForUser, me.id]);

  const myPosts = useMemo(
    () => feedPosts.filter(p => {
      const isOwner = p.userId === me.id || (p.companionAuthorId && myCompanionIds.has(p.companionAuthorId));
      return isOwner && !p.circle;
    }),
    [feedPosts, me.id, myCompanionIds],
  );
  const myRescues = useMemo(() => getRescuesForUser(me.id), [me.id]);
  const adoptableForCompanion = useMemo(
    () => incomingAdopted.filter(r => !hasCompanionForAdoption(r)),
    [incomingAdopted, hasCompanionForAdoption],
  );

  const [loading, setLoading] = useState(true);
  const [contentTab, setContentTab] = useState<ProfileContentTab>('posts');
  const [companionProfileId, setCompanionProfileId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [updateSheetRecordId, setUpdateSheetRecordId] = useState<string | null>(null);
  const [addCompanionOpen, setAddCompanionOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  useFocusEffect(useCallback(() => () => {
    setCompanionProfileId(null);
  }, []));

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const adoptedCount = incomingAdopted.length || stats.adopted;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ProfileHomeHeader onSettings={() => navigation.navigate('Settings')} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: tabBarPad }]}
        showsVerticalScrollIndicator={false}
        {...tabBarScrollProps}
      >
        <ProfileHero
          user={me}
          trust={trust}
          stats={{
            rescues: stats.rescues,
            rehomed: outgoingAdoptions.length || stats.successfulAdoptions,
            adopted: adoptedCount,
          }}
          onStatPress={setContentTab}
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

        <ProfileContentTabs value={contentTab} onChange={setContentTab} />

        <ProfileContentGrid
          tab={contentTab}
          posts={myPosts}
          rescues={myRescues}
          outgoingAdoptions={outgoingAdoptions}
          incomingAdopted={incomingAdopted}
          adopterTrust={adopterTrust}
          updatePrompts={contentTab === 'adopted' ? updatePrompts : undefined}
          onPostUpdate={setUpdateSheetRecordId}
          onCompanionPress={setCompanionProfileId}
          onToast={setToast}
          onOpenRescue={id => navigation.navigate('RescueDetail', { caseId: id })}
          onOpenOutgoingAdoption={id => navigation.navigate('AdoptedDetail', { recordId: id })}
          onPostAsOwner={id => navigation.navigate('AdoptedDetail', { recordId: id, openOwnerPost: true })}
          onOpenAdopted={id => navigation.navigate('AdoptedDetail', { recordId: id })}
        />

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

      {updateSheetRecordId && (() => {
        const record = records.find(r => r.id === updateSheetRecordId);
        const active = record ? getActivePrompt(record) : null;
        if (!record || !active) return null;
        return (
          <PostHomeUpdateSheet
            visible
            onClose={() => setUpdateSheetRecordId(null)}
            record={record}
            milestoneLabel={active.milestone.label}
            promptText={active.milestone.prompt}
            onSubmit={payload => {
              submitAdopterUpdate(record.id, payload);
              setUpdateSheetRecordId(null);
              setToast({ msg: `Update posted for ${record.petName}`, icon: 'check', tone: 'success' });
            }}
          />
        );
      })()}

      <Toast data={toast} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 16, gap: 14, paddingTop: 2 },
});
