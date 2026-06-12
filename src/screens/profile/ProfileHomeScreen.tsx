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
import { ProfileRehomedShowcase, ProfileAdoptedShowcase } from '../../components/profile/ProfileAdoptionPanel';
import { useAdoption } from '../../context/AdoptionContext';
import { countProfileAdoptedMissedUpdates } from '../../utils/profileAdoptionDisplay';
import { CompanionFullProfile } from '../../components/CompanionProfile';
import { AddCompanionSheet } from '../../components/profile/AddCompanionSheet';
import { useCompanions } from '../../context/CompanionContext';
import { useCurrentUserProfile } from '../../context/CurrentUserProfileContext';
import { useProfileViewData } from '../../hooks/useProfileViewData';
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
    trust,
  } = useProfileViewData(me.id);
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

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  useFocusEffect(useCallback(() => () => {
    setCompanionProfileId(null);
  }, []));

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
        />

        {contentTab === 'adoptions' ? (
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

      <Toast data={toast} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 16, gap: 12, paddingTop: 2 },
});
