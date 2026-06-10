import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TextInput, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { radius, typography } from '../../theme/tokens';
import { Sheet } from '../../components/ui/Sheet';
import { Toast, ToastData } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/icons/Icon';
import {
  ProfileHomeHeader,
  ProfileUserRow,
  ProfileStatsRow,
  ProfileCompanionsSection,
  ProfileContentTabs,
  ProfileContentGrid,
  ProfileActionLink,
  type ProfileContentTab,
} from '../../components/profile/ProfileChrome';
import { CompanionFullProfile } from '../../components/CompanionProfile';
import { users, companions } from '../../data/mockData';
import { PROFILE_STATS, getProfileTrust, getRescuesForUser } from '../../data/profileData';
import { getAdopterTrustSummary } from '../../data/adoptionRecords';
import {
  AdoptionUpdatePromptBanner,
  PostHomeUpdateSheet,
} from '../../components/adoption/AdoptionUpdateUI';
import { useAdoption } from '../../context/AdoptionContext';
import { getActivePrompt } from '../../utils/adoptionUpdateSchedule';
import { useFeedPosts } from '../../context/FeedPostContext';
import type { ProfileStackParamList } from '../../navigation/ProfileNavigator';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';
import { useTabBarScrollProps } from '../../context/TabBarScrollContext';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'Home'>;

export function ProfileHomeScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const me = users.you;
  const stats = PROFILE_STATS.you;
  const trust = getProfileTrust(me.id);
  const myCompanions = Object.values(companions).filter(c => c.ownerId === me.id);
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

  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [contentTab, setContentTab] = useState<ProfileContentTab>('posts');
  const [companionProfileId, setCompanionProfileId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [updateSheetRecordId, setUpdateSheetRecordId] = useState<string | null>(null);
  const [bio, setBio] = useState(me.bio ?? '');
  const [location, setLocation] = useState(me.location ?? '');

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  useFocusEffect(useCallback(() => () => {
    setEditOpen(false);
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
      <ProfileHomeHeader onSettings={() => setEditOpen(true)} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: tabBarPad }]}
        showsVerticalScrollIndicator={false}
        {...tabBarScrollProps}
      >
        <ProfileUserRow
          user={me}
          trust={trust}
          tagline={`Pet parent • rescuer • ${me.location?.split(',')[0]?.trim() ?? me.loc}`}
        />

        <Pressable
          onPress={() => navigation.navigate('ReviewsSafety')}
          style={styles.reviewsLink}
        >
          <Icon name="shield" size={14} color={colors.primary} />
          <Text style={[styles.reviewsLinkText, { color: colors.primary }]}>
            {trust.rating.toFixed(1)} · {trust.reviewCount} reviews & safety
          </Text>
          <Icon name="chevronRight" size={14} color={colors.textTertiary} />
        </Pressable>

        <ProfileStatsRow
          items={[
            { value: stats.posts, label: 'Posts', onPress: () => setContentTab('posts') },
            { value: stats.rescues, label: 'Rescues', onPress: () => setContentTab('rescues') },
            {
              value: outgoingAdoptions.length || stats.successfulAdoptions,
              label: 'Adoptions',
              onPress: () => setContentTab('adoptions'),
            },
            { value: adoptedCount, label: 'Adopted', onPress: () => setContentTab('adopted') },
          ]}
        />

        <ProfileCompanionsSection
          companions={myCompanions}
          onSelect={setCompanionProfileId}
        />

        <ProfileContentTabs value={contentTab} onChange={setContentTab} />

        {contentTab === 'adopted' && updatePrompts.map(prompt => (
          <AdoptionUpdatePromptBanner
            key={prompt.id}
            prompt={prompt}
            onPostUpdate={() => setUpdateSheetRecordId(prompt.recordId)}
          />
        ))}

        <ProfileContentGrid
          tab={contentTab}
          posts={myPosts}
          rescues={myRescues}
          outgoingAdoptions={outgoingAdoptions}
          incomingAdopted={incomingAdopted}
          adopterTrust={adopterTrust}
          onOpenPost={() => navigation.navigate('Posts')}
          onOpenRescue={id => navigation.navigate('RescueDetail', { caseId: id })}
          onOpenOutgoingAdoption={id => navigation.navigate('AdoptedDetail', { recordId: id })}
          onOpenAdopted={id => navigation.navigate('AdoptedDetail', { recordId: id })}
        />

        {contentTab === 'adopted' && incomingAdopted.length > 0 && (
          <ProfileActionLink
            label="View all adopted companions"
            onPress={() => navigation.navigate('Adopted')}
          />
        )}
      </ScrollView>

      <Sheet visible={editOpen} onClose={() => setEditOpen(false)} title="Edit profile">
        <View style={{ gap: 12, paddingBottom: 8 }}>
          <Field label="Bio" value={bio} onChangeText={setBio} colors={colors} multiline />
          <Field label="Location" value={location} onChangeText={setLocation} colors={colors} />
          <Button onPress={() => {
            setEditOpen(false);
            setToast({ msg: 'Profile updated', icon: 'check', tone: 'success' });
          }}>
            Save changes
          </Button>
        </View>
      </Sheet>

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

function Field({
  label, value, onChangeText, colors, multiline,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  colors: { text: string; textSecondary: string; surface2: string; border: string };
  multiline?: boolean;
}) {
  return (
    <View>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label.toUpperCase()}</Text>
      <TextInput
        style={[styles.fieldInput, {
          color: colors.text,
          backgroundColor: colors.surface2,
          borderColor: colors.border,
          minHeight: multiline ? 80 : 44,
          textAlignVertical: multiline ? 'top' : 'center',
        }]}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        placeholderTextColor={colors.textSecondary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 16, gap: 14, paddingTop: 2 },
  reviewsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -6,
  },
  reviewsLinkText: { ...typography.caption, fontSize: 13, flex: 1 },
  fieldLabel: { ...typography.sectionLabel, letterSpacing: 0.6, marginBottom: 6 },
  fieldInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    ...typography.body,
    fontSize: 15,
  },
});
