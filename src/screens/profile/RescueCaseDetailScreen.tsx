import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/tokens';
import { Toast, ToastData } from '../../components/ui/Toast';
import { ProfileSubHeader } from '../../components/profile/ProfileChrome';
import {
  RescueCaseHero,
  RescueActionRow,
  RescueCaseMetaStrip,
  RescueTagsRow,
  RescueUpdatesTimeline,
} from '../../components/rescue/RescueCaseUI';
import { RESCUE_STATUS_META, type RescueCase } from '../../data/profileData';
import { getRescueCaseById } from '../../data/rescueData';
import { useRescueFeedOptional } from '../../context/RescueFeedContext';
import { useRescueOpenCaseBack } from '../../context/RescueOpenCaseFlowContext';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';
import type { RescueStackParamList } from '../../navigation/RescueNavigator';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

type Nav = NativeStackNavigationProp<RescueStackParamList, 'Detail'>;

const HIDDEN_CASE_TAGS = new Set([
  ...Object.values(RESCUE_STATUS_META).flatMap(m => [m.label, m.shortLabel]),
  'In Vet Care',
  'Vet Care',
  'Injured',
  'Lost',
  'Found',
]);

function buildTags(item: RescueCase) {
  const species = item.species === 'cat' ? 'Cat' : item.species === 'dog' ? 'Dog' : item.species;
  const raw = item.tags?.length ? item.tags : [species];
  return raw.filter(tag => !HIDDEN_CASE_TAGS.has(tag));
}

export function RescueCaseDetailScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const handleBack = useRescueOpenCaseBack(navigation);
  const route = useRoute();
  const caseId = (route.params as { caseId?: string } | undefined)?.caseId ?? '';
  const rescueFeed = useRescueFeedOptional();
  const { user } = useAuth();
  const item = rescueFeed?.cases.find(c => c.id === caseId) ?? getRescueCaseById(caseId);
  const tabBarPad = useTabBarScrollPadding();
  const [toast, setToast] = useState<ToastData | null>(null);

  if (!item) return null;

  const isOwner = !!user && item.userId === user.id && !!rescueFeed;
  const following = rescueFeed?.isFollowing(caseId) ?? false;
  const updates = item.updates ?? [];
  const aboutTags = buildTags(item);

  const handleFollow = () => {
    if (!user) return;
    rescueFeed?.toggleFollow(caseId);
    setToast({
      msg: following ? 'Unfollowed case' : 'Following this case',
      icon: 'paw',
      tone: 'primary',
    });
  };

  const handleHelp = async () => {
    if (!user) {
      setToast({ msg: 'Sign in to offer help', icon: 'heart', tone: 'primary' });
      return;
    }
    await supabase.from('rescue_help_offers').upsert(
      {
        case_id: caseId,
        helper_user_id: user.id,
        type: 'other',
        status: 'offered',
      },
      { onConflict: 'case_id,helper_user_id', ignoreDuplicates: true },
    );
    setToast({ msg: 'Thanks — the poster will be notified', icon: 'heart', tone: 'success' });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ProfileSubHeader
        title={isOwner ? item.name : 'Case Details'}
        rightIcon="forward"
        onBack={handleBack}
        onRightPress={() => setToast({ msg: 'Case link copied', icon: 'forward', tone: 'success' })}
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: tabBarPad }]}
        showsVerticalScrollIndicator={false}
      >
        <RescueCaseHero item={item} />

        {isOwner ? (
          <Pressable
            onPress={() => navigation.navigate('PostUpdate', { caseId })}
            hitSlop={6}
            style={styles.ownerActionWrap}
          >
            <Text style={[styles.ownerAction, { color: colors.primary }]}>Post update</Text>
          </Pressable>
        ) : (
          <RescueActionRow
            followers={item.followers ?? 0}
            onFollow={handleFollow}
            onHelp={handleHelp}
            onShare={() => setToast({ msg: 'Case shared', icon: 'forward', tone: 'success' })}
          />
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>About the Case</Text>
          <Text style={[styles.body, { color: colors.text }]}>{item.story}</Text>
          {aboutTags.length > 0 && <RescueTagsRow tags={aboutTags} />}
        </View>

        <RescueCaseMetaStrip item={item} />

        {updates.length > 0 && (
          <RescueUpdatesTimeline
            updates={updates}
            tint={item.tint}
            icon={item.icon}
            onViewAll={() => setToast({ msg: 'All updates', icon: 'paw', tone: 'primary' })}
          />
        )}

        {updates.length === 0 && (
          <Text style={[styles.emptyUpdatesText, { color: colors.textSecondary }]}>
            {isOwner ? 'No updates yet — post one above.' : 'No updates yet.'}
          </Text>
        )}
      </ScrollView>

      <Toast data={toast} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 16, gap: 16, paddingTop: 4 },
  section: { gap: 10 },
  sectionTitle: { ...typography.title, fontSize: 16 },
  body: { fontSize: 15, lineHeight: 23 },
  ownerActionWrap: { alignItems: 'center' },
  ownerAction: { fontSize: 14, fontWeight: '700' },
  emptyUpdatesText: { fontSize: 13.5, lineHeight: 19, textAlign: 'center' },
});
