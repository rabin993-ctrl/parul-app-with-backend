import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions, Animated, Easing } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing, typography } from '../../theme/tokens';
import { Avatar, CompanionAvatar } from '../ui/Avatar';
import { getPetAvatarFrameSize, getPetInnerCircleSize } from '../ui/PawPadShape';
import { Icon } from '../icons/Icon';
import { AppSubHeader } from '../ui/AppSubHeader';
import { IconButton } from '../ui/Button';
import { PhotoSlot } from '../ui/PhotoSlot';
import { Empty } from '../ui/Empty';
import { FeedPostCard, resolvePostTagKey } from '../feed/FeedPostCard';
import { FeedCommentSheet } from '../feed/FeedCommentSheet';
import { ForwardSheet, type ForwardDest } from '../ForwardSheet';
import { RescueGridCell } from '../rescue/RescueCaseUI';
import { useFeedPosts } from '../../context/FeedPostContext';
import { usePawCircles } from '../../context/PawCircleContext';
import { useCommunityGroups } from '../../context/CommunityGroupsContext';
import { Toast, type ToastData } from '../ui/Toast';
import type { UserFeedComment } from '../../utils/postComments';
import { companions, users, type User, type Companion, type Post } from '../../data/mockData';
import type { ProfileImpactStats, ProfileTrust, RescueCase } from '../../data/profileData';
import type { AdoptionRecord, AdopterTrustSummary, AdoptionUpdatePrompt } from '../../data/adoptionRecords';
import { AdoptionUpdatePromptBanner } from '../adoption/AdoptionUpdateUI';
import { AdoptedRecordsPanel } from '../adoption/AdoptedRecordsPanel';
import {
  getAdopterUpdateCount,
  getEvidenceState,
  getLatestPosterEndorsementUpdate,
  getLatestUpdate,
  getPosterRecommendation,
  getUserHandle,
  updateAttributionLabel,
} from '../../data/adoptionRecords';
import { formatDueLabel, getNextUpdateSummary } from '../../utils/adoptionUpdateSchedule';
import { TreatWalletHint } from '../TreatWalletPill';
import { ProfileAdoptedShowcase } from './ProfileAdoptionPanel';

export function ProfileHomeHeader({ user, onSettings }: { user: User; onSettings: () => void }) {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();

  return (
    <View style={styles.homeHeader}>
      <IconButton
        name="chevronLeft"
        size={40}
        tone="soft"
        color={colors.textSecondary}
        onPress={() => {
          const parent = navigation.getParent();
          if (parent?.canGoBack()) parent.goBack();
          else parent?.navigate('Feed');
        }}
      />
      <Text style={[styles.homeHeaderTitle, { color: colors.text }]} numberOfLines={1}>
        @{user.handle}
      </Text>
      <IconButton name="menu" size={40} tone="soft" color={colors.textSecondary} onPress={onSettings} />
    </View>
  );
}

export function ProfileSubHeader({
  title,
  rightIcon,
  onRightPress,
  onBack,
}: {
  title?: string;
  rightIcon?: string;
  onRightPress?: () => void;
  onBack?: () => void;
}) {
  return (
    <AppSubHeader
      title={title}
      onBack={onBack}
      rightIcon={rightIcon}
      onRightPress={onRightPress}
    />
  );
}

export function ProfileTrustBadge({ trust }: { trust: ProfileTrust }) {
  const { colors } = useTheme();
  if (trust.status === 'flagged') {
    return (
      <View style={[styles.trustPill, { backgroundColor: colors.dangerBg, borderColor: colors.danger + '40' }]}>
        <Icon name="flag" size={13} color={colors.danger} />
        <Text style={[styles.trustText, { color: colors.danger }]}>Flagged profile</Text>
      </View>
    );
  }
  if (trust.status === 'warning') {
    return (
      <View style={[styles.trustPill, { backgroundColor: colors.warningBg, borderColor: colors.warning + '40' }]}>
        <Icon name="alert" size={13} color={colors.warning} />
        <Text style={[styles.trustText, { color: colors.warning }]}>Needs review</Text>
      </View>
    );
  }
  if (trust.status === 'trusted') {
    return (
      <View style={[styles.trustPill, { backgroundColor: colors.infoBg, borderColor: colors.primary + '40' }]}>
        <Icon name="shield" size={13} color={colors.primary} />
        <Text style={[styles.trustText, { color: colors.primary }]}>Trusted</Text>
      </View>
    );
  }
  return null;
}

export function ProfileUserRow({
  user,
  trust,
  tagline,
}: {
  user: User;
  trust: ProfileTrust;
  tagline?: string;
}) {
  const { colors } = useTheme();
  const subtitle = tagline ?? buildProfileTagline(user);

  return (
    <View style={styles.userRow}>
      <Avatar user={user} size={64} />
      <View style={styles.userMeta}>
        <Text style={[styles.userName, { color: colors.text }]}>{user.name}</Text>
        <Text style={[styles.userHandle, { color: colors.primary }]}>@{user.handle}</Text>
        <Text style={[styles.userTagline, { color: colors.textSecondary }]} numberOfLines={2}>
          {subtitle}
        </Text>
        <View style={{ marginTop: 6 }}>
          <ProfileTrustBadge trust={trust} />
        </View>
      </View>
    </View>
  );
}

export function ProfileHero({
  user,
  trust,
  stats,
  onStatPress,
  showTrustBadge,
  showTreatBalance,
  showHandle = true,
  showName = true,
}: {
  user: User;
  trust: ProfileTrust;
  stats: ProfileImpactStats;
  onStatPress?: (tab: ProfileContentTab) => void;
  showTrustBadge?: boolean;
  /** Subtle remaining treats line — My Profile only */
  showTreatBalance?: boolean;
  showHandle?: boolean;
  showName?: boolean;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.profileHero}>
      <View style={styles.heroIdentityRow}>
        <View style={styles.heroAvatarSlot}>
          <Avatar user={user} size={88} />
        </View>
        <View style={styles.heroIdentityMeta}>
          {showName ? (
            <Text style={[styles.heroName, { color: colors.text }]}>{user.name}</Text>
          ) : null}
          {showHandle ? (
            <Text style={styles.heroHandleLine} numberOfLines={1}>
              <Text style={[styles.heroHandle, { color: colors.primary }]}>@{user.handle}</Text>
            </Text>
          ) : null}
          {user.bio ? (
            <Text style={[styles.heroBio, { color: colors.textSecondary }]}>{user.bio}</Text>
          ) : null}
          {user.location ? (
            <Text
              style={[
                styles.heroLocation,
                user.bio && styles.heroLocationAfterBio,
                { color: colors.textSecondary },
              ]}
              numberOfLines={2}
            >
              {user.location}
            </Text>
          ) : null}
        </View>
      </View>

      <ProfileStatsRow items={buildProfileStatRowItems(stats, onStatPress)} />

      {showTreatBalance ? <TreatWalletHint align="start" /> : null}

      {showTrustBadge ? (
        <View style={styles.heroTrustWrap}>
          <ProfileTrustBadge trust={trust} />
        </View>
      ) : null}
    </View>
  );
}

function buildProfileTagline(user: User) {
  const parts: string[] = [];
  if (user.bio) {
    const first = user.bio.split('·')[0]?.trim();
    if (first) parts.push(first);
  }
  if (user.location) {
    const loc = user.location.split(',')[0]?.trim();
    if (loc) parts.push(loc);
  }
  if (parts.length === 0) return user.loc;
  return parts.join(' • ');
}

type StatItem = {
  value: number | string;
  label: string;
  onPress?: () => void;
};

export function buildProfileStatRowItems(
  stats: ProfileImpactStats,
  onStatPress?: (tab: ProfileContentTab) => void,
): StatItem[] {
  return [
    {
      value: stats.rescues,
      label: 'Rescues',
      onPress: onStatPress ? () => onStatPress('rescues') : undefined,
    },
    {
      value: stats.rehomed,
      label: 'Rehomed',
      onPress: onStatPress ? () => onStatPress('adoptions') : undefined,
    },
    {
      value: stats.adopted,
      label: 'Adopted',
      onPress: onStatPress ? () => onStatPress('adopted') : undefined,
    },
  ];
}

export function ProfileStatsRow({ items }: { items: StatItem[] }) {
  const { colors } = useTheme();

  return (
    <View style={styles.statsGrid}>
      {items.map(item => (
        <StatCell key={item.label} item={item} colors={colors} />
      ))}
    </View>
  );
}

function StatCell({
  item,
  colors,
}: {
  item: StatItem;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const content = (
    <View style={styles.statsCell}>
      <Text style={[styles.statsValue, { color: colors.text }]}>{item.value}</Text>
      <Text style={[styles.statsLabel, { color: colors.textTertiary }]} numberOfLines={2}>
        {item.label}
      </Text>
    </View>
  );

  if (item.onPress) {
    return (
      <Pressable
        onPress={item.onPress}
        style={({ pressed }) => [styles.statsCellPressable, pressed && { opacity: 0.7 }]}
      >
        {content}
      </Pressable>
    );
  }
  return <View style={styles.statsCellPressable}>{content}</View>;
}

export type ProfileContentTab = 'posts' | 'rescues' | 'adoptions' | 'adopted';

const PROFILE_CONTENT_TABS: { id: ProfileContentTab; icon: string; label: string }[] = [
  { id: 'posts', icon: 'grid', label: 'Posts' },
  { id: 'rescues', icon: 'shield', label: 'Rescues' },
  { id: 'adoptions', icon: 'repeat', label: 'Rehomed' },
  { id: 'adopted', icon: 'heart', label: 'Adopted' },
];

export function ProfileAdopterTrustStrip({ summary }: { summary: AdopterTrustSummary }) {
  const { colors } = useTheme();

  if (summary.badge === 'update_pending' || summary.badge === 'new') return null;

  const badgeColors = {
    trusted: { bg: colors.successBg, text: colors.success, icon: 'shield' },
    active: { bg: colors.infoBg, text: colors.primary, icon: 'heart' },
    new: { bg: colors.neutralBg, text: colors.textSecondary, icon: 'paw' },
    update_pending: { bg: colors.warningBg, text: colors.warning, icon: 'alert' },
  }[summary.badge];

  return (
    <View style={styles.trustStrip}>
      <View style={[styles.trustBadge, { backgroundColor: badgeColors.bg }]}>
        <Icon name={badgeColors.icon} size={12} color={badgeColors.text} />
        <Text style={[styles.trustBadgeText, { color: badgeColors.text }]}>{summary.badgeLabel}</Text>
      </View>
    </View>
  );
}

function adoptedStatusMeta(
  state: ReturnType<typeof getEvidenceState>,
  colors: ReturnType<typeof useTheme>['colors'],
) {
  switch (state) {
    case 'update_due':
      return { label: 'Update due', tint: colors.warning, bg: colors.warningBg };
    case 'update_on_track':
      return { label: 'On track', tint: colors.success, bg: colors.successBg };
    case 'confirmed':
      return { label: 'Recently adopted', tint: colors.primary, bg: colors.infoBg };
    default:
      return { label: 'Share first update', tint: colors.textSecondary, bg: colors.surface2 };
  }
}

export function ProfileAdoptedGridCell({
  record,
  width,
  onPress,
}: {
  record: AdoptionRecord;
  width: number;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const evidence = getEvidenceState(record);
  const status = adoptedStatusMeta(evidence, colors);
  const speciesLabel = record.species === 'cat' ? 'Cat' : record.species === 'dog' ? 'Dog' : record.species;
  const photoH = Math.round(width * 0.82);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.adoptedCell,
        {
          width,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          opacity: pressed ? 0.88 : 1,
        },
      ]}
    >
      <PhotoSlot
        height={photoH}
        imageKey={record.id}
        borderRadius={0}
        label=""
        style={styles.adoptedCellPhoto}
      />
      <View style={styles.adoptedCellBody}>
        <Text style={[styles.adoptedCellName, { color: colors.text }]} numberOfLines={1}>
          {record.petName}
        </Text>
        <Text style={[styles.adoptedCellMeta, { color: colors.textSecondary }]} numberOfLines={1}>
          {speciesLabel} · {record.confirmedAt ?? 'Adopted'}
        </Text>
        <View style={[styles.adoptedCellStatus, { backgroundColor: status.bg }]}>
          <EvidenceDot state={evidence} colors={colors} />
          <Text style={[styles.adoptedCellStatusText, { color: status.tint }]} numberOfLines={1}>
            {status.label}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function EvidenceDot({ state, colors }: { state: ReturnType<typeof getEvidenceState>; colors: ReturnType<typeof useTheme>['colors'] }) {
  const tint = state === 'update_on_track' ? colors.success
    : state === 'update_due' ? colors.warning
      : state === 'confirmed' ? colors.primary
        : colors.textTertiary;
  return <View style={[styles.evidenceDot, { backgroundColor: tint }]} />;
}

function publicUpdateLine(record: AdoptionRecord): { label: string; urgent: boolean } {
  if (record.status === 'closed') {
    return {
      label: record.closedReason === 'relisted' ? 'Re-listed for adoption' : 'Adoption closed',
      urgent: false,
    };
  }
  const next = getNextUpdateSummary(record);
  if (next?.toLowerCase().includes('overdue')) {
    const duePart = next.split('·').pop()?.trim();
    return { label: duePart ? `Update requested · ${duePart.replace(/^was due /i, '')}` : 'Update requested', urgent: true };
  }
  if (next) return { label: next, urgent: false };
  const due = formatDueLabel(record);
  if (due) return { label: due, urgent: true };
  const last = getLatestUpdate(record);
  if (last?.createdAt) return { label: `Last check-in ${last.createdAt}`, urgent: false };
  return { label: 'Awaiting first check-in', urgent: false };
}

/** Flat adopted row for another user's profile. */
export function ProfileAdoptedPublicHighlight({
  record,
  onPress,
  isLast,
}: {
  record: AdoptionRecord;
  onPress: () => void;
  isLast?: boolean;
}) {
  const { colors } = useTheme();
  const speciesLabel = record.species === 'cat' ? 'Cat' : record.species === 'dog' ? 'Dog' : record.species;
  const update = publicUpdateLine(record);
  const endorsementUpdate = getLatestPosterEndorsementUpdate(record);
  const recommendation = getPosterRecommendation(record);
  const posterHandle = getUserHandle(record.posterId);
  const positive = recommendation !== 'not_recommended';
  const ratingTint = recommendation
    ? (positive ? colors.success : colors.danger)
    : colors.textTertiary;

  return (
    <View style={[styles.adoptedPublicRowWrap, !isLast && { borderBottomColor: colors.border }]}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.adoptedPublicRow,
          { opacity: pressed ? 0.82 : 1 },
        ]}
      >
        <PhotoSlot
          height={76}
          imageKey={record.id}
          borderRadius={radius.md}
          label=""
          style={{ width: 76 }}
        />

        <View style={styles.adoptedPublicMain}>
          <View style={styles.adoptedPublicTitleRow}>
            <Text style={[styles.adoptedPublicName, { color: colors.text }]} numberOfLines={1}>
              {record.petName}
            </Text>
            <Icon name="chevronRight" size={16} color={colors.textTertiary} />
          </View>
          <Text style={[styles.adoptedPublicSpecies, { color: colors.textTertiary }]} numberOfLines={1}>
            {speciesLabel} · {record.confirmedAt ?? 'Adopted'}
          </Text>

          <View style={styles.adoptedPublicMetaLine}>
            <Icon
              name="clock"
              size={12}
              color={update.urgent ? colors.warning : colors.textTertiary}
            />
            <Text
              style={[
                styles.adoptedPublicMetaText,
                { color: update.urgent ? colors.warning : colors.textSecondary },
              ]}
              numberOfLines={1}
            >
              {update.label}
            </Text>
          </View>

          {recommendation ? (
            <View style={[
              styles.adoptedPublicOwnerNote,
              { borderLeftColor: ratingTint },
            ]}>
              <View style={styles.adoptedPublicOwnerHead}>
                <Text style={[styles.adoptedPublicOwnerLabel, { color: colors.textTertiary }]}>
                  Feedback
                </Text>
                <View style={[
                  styles.adoptedPublicRatingPill,
                  {
                    backgroundColor: ratingTint + '14',
                    borderColor: ratingTint + '40',
                  },
                ]}>
                  <Text style={[styles.adoptedPublicRatingPillText, { color: ratingTint }]}>
                    {positive ? 'Recommended' : 'Not recommended'}
                  </Text>
                </View>
              </View>
              {endorsementUpdate?.text ? (
                <Text style={[styles.adoptedPublicOwnerQuote, { color: colors.text }]} numberOfLines={3}>
                  {endorsementUpdate.text}
                </Text>
              ) : null}
              <Text style={[styles.adoptedPublicOwnerBy, { color: colors.textTertiary }]}>
                @{posterHandle}
              </Text>
            </View>
          ) : (
            <Text style={[styles.adoptedPublicNoRating, { color: colors.textTertiary }]}>
              No feedback from @{posterHandle} yet
            </Text>
          )}
        </View>
      </Pressable>
    </View>
  );
}

export function ProfileAdoptedStoryCard({
  record,
  onPress,
  compact,
}: {
  record: AdoptionRecord;
  onPress: () => void;
  compact?: boolean;
}) {
  const { colors } = useTheme();
  const poster = users[record.posterId as keyof typeof users];
  const adopter = users[record.adopterId as keyof typeof users];
  const updateCount = getAdopterUpdateCount(record);
  const latest = getLatestUpdate(record);
  const evidence = getEvidenceState(record);
  const speciesLabel = record.species === 'cat' ? 'Cat' : record.species === 'dog' ? 'Dog' : record.species;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.adoptedStory,
        { borderBottomColor: colors.border, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <PhotoSlot
        height={compact ? 88 : 160}
        imageKey={record.id}
        borderRadius={compact ? radius.sm : radius.md}
        label=""
        style={{ width: '100%' }}
      />

      <View style={styles.adoptedStoryBody}>
        <View style={styles.adoptedStoryHead}>
          <Text style={[styles.adoptedPetName, { color: colors.text }]}>
            {record.petName} · {speciesLabel}
          </Text>
          <EvidenceDot state={evidence} colors={colors} />
        </View>
        <Text style={[styles.adoptedMeta, { color: colors.textSecondary }]}>
          Adopted {record.confirmedAt ?? '—'}
        </Text>

        <View style={styles.confirmRow}>
          <Avatar user={adopter ?? { name: 'Adopter', tint: record.tint }} size={22} />
          <Icon name="check" size={12} color={colors.success} />
          <Avatar user={poster ?? { name: 'Foster', tint: colors.primary }} size={22} />
          <Text style={[styles.confirmText, { color: colors.textSecondary }]}>
            Confirmed with @{getUserHandle(record.posterId)}
          </Text>
        </View>

        {!compact && (
          <>
            <View style={styles.trustChips}>
              <Text style={[styles.trustChip, { color: colors.text }]}>✓ Mutual confirm</Text>
              <Text style={[styles.trustChip, { color: colors.textSecondary }]}>·</Text>
              <Text style={[styles.trustChip, { color: colors.text }]}>📸 {updateCount} updates</Text>
            </View>

            {updateCount > 0 && (
              <View style={styles.timelineRow}>
                {record.updates.filter(u => u.type === 'adopter_home').slice(0, 4).map((u, i, arr) => (
                  <View
                    key={u.id}
                    style={[
                      styles.timelineDot,
                      {
                        backgroundColor: colors.primary,
                        opacity: i === arr.length - 1 ? 1 : 0.55,
                      },
                    ]}
                  />
                ))}
              </View>
            )}

            {latest ? (
              <View style={styles.latestUpdate}>
                <Text style={[styles.latestCaption, { color: colors.text }]} numberOfLines={2}>
                  {latest.text}
                </Text>
                <Text style={[styles.latestAttr, { color: colors.textTertiary }]}>
                  {updateAttributionLabel(latest.type)} · {latest.createdAt}
                </Text>
              </View>
            ) : (
              <Text style={[styles.awaitingUpdate, { color: colors.textTertiary }]}>
                Awaiting first home update
              </Text>
            )}
          </>
        )}

        {compact && (
          <View style={styles.compactDots}>
            {Array.from({ length: Math.min(updateCount, 5) }).map((_, i) => (
              <View key={i} style={[styles.miniDot, { backgroundColor: colors.primary }]} />
            ))}
          </View>
        )}
      </View>
    </Pressable>
  );
}

function ProfileOutgoingAdoptionRow({
  record,
  onPress,
  onPostPress,
}: {
  record: AdoptionRecord;
  onPress: () => void;
  onPostPress?: () => void;
}) {
  const { colors } = useTheme();
  const adopter = users[record.adopterId as keyof typeof users];

  return (
    <View style={[styles.outgoingRowWrap, { borderBottomColor: colors.border }]}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.outgoingRow,
          { opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <PhotoSlot height={72} imageKey={`${record.id}-thumb`} borderRadius={radius.sm} label="" style={{ width: 72 }} />
        <View style={styles.outgoingMeta}>
          <Text style={[styles.adoptedPetName, { color: colors.text }]}>{record.petName}</Text>
          <Text style={[styles.adoptedMeta, { color: colors.textSecondary }]}>
            {record.confirmedAt} · @{getUserHandle(record.adopterId)}
          </Text>
          {adopter ? (
            <View style={styles.confirmRow}>
              <Avatar user={adopter} size={20} />
              <Text style={[styles.confirmText, { color: colors.textTertiary }]}>{record.newHome ?? 'In new home'}</Text>
            </View>
          ) : null}
        </View>
        <Icon name="chevronRight" size={18} color={colors.textTertiary} />
      </Pressable>
      {onPostPress ? (
        <Pressable
          onPress={onPostPress}
          style={({ pressed }) => [
            styles.outgoingPostBtn,
            { backgroundColor: colors.surface2, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Icon name="comment" size={12} color={colors.primary} />
          <Text style={[styles.outgoingPostText, { color: colors.primary }]}>Post as owner</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const TAB_TRACK_H = 1;
const INDICATOR_H = 3;
const INDICATOR_INSET = 0;
const PROFILE_TAB_EDGE_INSET = 16;
const PROFILE_TAB_ICON_SIZE = 26;

export { PROFILE_TAB_ICON_SIZE };

export function ProfileContentTabs({
  value,
  onChange,
  tabAlerts,
}: {
  value: ProfileContentTab;
  onChange: (tab: ProfileContentTab) => void;
  /** e.g. missed check-in count on Adopted tab (public profile). */
  tabAlerts?: Partial<Record<ProfileContentTab, number>>;
}) {
  const { colors } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const [rowWidth, setRowWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;

  const activeIndex = Math.max(0, PROFILE_CONTENT_TABS.findIndex(t => t.id === value));
  const segmentW = rowWidth > 0 ? rowWidth / PROFILE_CONTENT_TABS.length : 0;
  const indicatorW = Math.max(0, segmentW - INDICATOR_INSET * 2);
  const targetX = segmentW * activeIndex + INDICATOR_INSET;

  useEffect(() => {
    if (rowWidth <= 0) return;
    Animated.timing(translateX, {
      toValue: targetX,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [targetX, rowWidth, translateX]);

  return (
    <View
      style={[
        styles.contentTabs,
        { width: windowWidth, marginLeft: -PROFILE_TAB_EDGE_INSET },
      ]}
      onLayout={e => setRowWidth(e.nativeEvent.layout.width)}
    >
      <View
        pointerEvents="none"
        style={[styles.contentTabTrack, { backgroundColor: colors.border }]}
      />
      {rowWidth > 0 && indicatorW > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.contentTabIndicator,
            {
              width: indicatorW,
              backgroundColor: colors.primary,
              transform: [{ translateX }],
            },
          ]}
        />
      )}
      {PROFILE_CONTENT_TABS.map(tab => {
        const active = value === tab.id;
        const alertCount = tabAlerts?.[tab.id] ?? 0;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            accessibilityRole="tab"
            accessibilityLabel={alertCount > 0 ? `${tab.label}, ${alertCount} overdue` : tab.label}
            accessibilityState={active ? { selected: true } : {}}
            style={styles.contentTabBtn}
          >
            <View style={styles.contentTabIconWrap}>
              <Icon
                name={tab.icon}
                size={PROFILE_TAB_ICON_SIZE}
                color={active ? colors.primary : colors.textTertiary}
                sw={active ? 2.2 : 1.7}
              />
              {alertCount > 0 ? (
                <View style={[styles.contentTabAlert, { backgroundColor: colors.warningBg }]}>
                  <Icon name="alert" size={10} color={colors.warning} sw={2.2} />
                  <Text style={[styles.contentTabAlertText, { color: colors.warning }]}>
                    {alertCount > 9 ? '9+' : alertCount}
                  </Text>
                </View>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const COMPANION_ROW_GAP = 28;
const COMPANION_MIN_CHIP = 72;
const COMPANION_MAX_COLS = 5;
const COMPANION_AVATAR_SIZE = 56;

function useCompanionChipLayout(_itemCount: number) {
  const [rowWidth, setRowWidth] = useState(0);
  return { chipWidth: COMPANION_MIN_CHIP, onRowLayout: setRowWidth };
}

function CompanionAddChip({
  onPress,
  chipWidth,
  avatarSize,
}: {
  onPress: () => void;
  chipWidth: number;
  avatarSize: number;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.companionChip, { width: chipWidth }]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Add companion"
        style={({ pressed }) => [
          styles.companionChipContent,
          pressed && { opacity: 0.75 },
        ]}
      >
        <View style={[styles.companionAvatarWrap, { width: avatarSize, height: avatarSize, alignItems: 'center', justifyContent: 'center' }]}>
          <Icon name="plus" size={28} color={colors.primary} sw={2} />
        </View>
        <View style={styles.companionChipLabels}>
          <Text style={[styles.companionChipName, { color: colors.primary }]}>Add</Text>
          <Text accessible={false} style={[styles.companionChipMeta, styles.companionChipGhost]}>·</Text>
        </View>
      </Pressable>
    </View>
  );
}

export function ProfileCompanionsSection({
  companions,
  onSelect,
  onAdd,
  onRemove,
}: {
  companions: Companion[];
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  const { colors } = useTheme();
  const [editing, setEditing] = useState(false);

  const toggleEdit = () => {
    setEditing(prev => !prev);
  };

  const handleRemove = (id: string) => {
    onRemove(id);
    if (companions.length <= 1) setEditing(false);
  };

  const itemCount = companions.length + (editing ? 0 : 1);
  const { chipWidth, onRowLayout } = useCompanionChipLayout(itemCount);
  const avatarSize = Math.min(COMPANION_AVATAR_SIZE, chipWidth - 12);

  return (
    <View style={styles.companionsSection}>
      <View style={styles.companionsHeader}>
        <Text style={[styles.companionsEyebrow, { color: colors.textTertiary }]}>Companions</Text>
        {companions.length > 0 && (
          <Pressable
            onPress={toggleEdit}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={editing ? 'Done editing companions' : 'Edit companions'}
            style={({ pressed }) => [{ opacity: pressed ? 0.65 : 1 }]}
          >
            {editing ? (
              <Text style={[styles.companionsEditDone, { color: colors.primary }]}>Done</Text>
            ) : (
              <Icon name="edit" size={18} color={colors.textSecondary} />
            )}
          </Pressable>
        )}
      </View>
      <View
        style={styles.companionsRow}
        onLayout={e => onRowLayout(e.nativeEvent.layout.width)}
      >
        {companions.map(companion => {
          const speciesLabel = companion.species === 'cat' ? 'Cat' : companion.species === 'dog' ? 'Dog' : companion.species;
          return (
            <View key={companion.id} style={[styles.companionChip, { width: chipWidth }]}>
              {editing ? (
                <View style={styles.companionChipContent}>
                  <View style={styles.companionAvatarWrap}>
                    <CompanionAvatar companion={companion} size={avatarSize} />
                    <Pressable
                      onPress={() => handleRemove(companion.id)}
                      hitSlop={6}
                      style={[styles.companionRemoveBtn, { backgroundColor: colors.danger, borderColor: colors.surface }]}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${companion.name}`}
                    >
                      <Icon name="close" size={10} color={colors.onAccent} sw={2.5} />
                    </Pressable>
                  </View>
                  <View style={styles.companionChipLabels}>
                    <Text style={[styles.companionChipName, { color: colors.text }]} numberOfLines={1}>
                      {companion.name}
                    </Text>
                    <Text style={[styles.companionChipMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                      {speciesLabel} · {companion.age}
                    </Text>
                  </View>
                </View>
              ) : (
                <Pressable
                  onPress={() => onSelect(companion.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`View ${companion.name}'s profile`}
                  style={({ pressed }) => [
                    styles.companionChipContent,
                    pressed && { opacity: 0.75 },
                  ]}
                >
                  <View style={styles.companionAvatarWrap}>
                    <CompanionAvatar companion={companion} size={avatarSize} />
                  </View>
                  <View style={styles.companionChipLabels}>
                    <Text style={[styles.companionChipName, { color: colors.text }]} numberOfLines={1}>
                      {companion.name}
                    </Text>
                    <Text style={[styles.companionChipMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                      {speciesLabel} · {companion.age}
                    </Text>
                  </View>
                </Pressable>
              )}
            </View>
          );
        })}
        {!editing && <CompanionAddChip onPress={onAdd} chipWidth={chipWidth} avatarSize={avatarSize} />}
      </View>
    </View>
  );
}

const GRID_GAP = 3;
const GRID_COLS = 3;

function getPostVisual(post: Post, fallbackTint: string) {
  const companionId = post.companionAuthorId ?? post.companions?.[0];
  const companion = companionId ? companions[companionId] : undefined;
  const owner = users[post.userId];
  return {
    tint: companion?.tint ?? owner?.tint ?? fallbackTint,
    icon: companion?.icon ?? 'paw',
    companionName: companion?.name,
  };
}

export function ProfilePostsFeed({
  posts,
  onCompanionPress,
  onToast,
  onUserPress,
  inset = false,
}: {
  posts: Post[];
  onCompanionPress?: (companionId: string) => void;
  onToast?: (t: ToastData) => void;
  onUserPress?: (userId: string) => void;
  /** True on public profile / padded containers — avoids full-bleed negative margins */
  inset?: boolean;
}) {
  const { colors } = useTheme();
  const { posts: feedPosts, setPosts, toggleSaved, addComment } = useFeedPosts();
  const { createdCircles, joinedCircles } = usePawCircles();
  const { joinedCommunities } = useCommunityGroups();
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [forwardPost, setForwardPost] = useState<Post | null>(null);
  const [localToast, setLocalToast] = useState<ToastData | null>(null);

  const commentPost = useMemo(
    () => (commentPostId ? feedPosts.find(p => p.id === commentPostId) ?? null : null),
    [commentPostId, feedPosts],
  );

  const showToast = (t: ToastData) => {
    if (onToast) onToast(t);
    else setLocalToast(t);
  };

  const togglePaw = (id: string) => {
    setPosts(ps => ps.map(p => p.id === id
      ? { ...p, reacted: !p.reacted, paws: p.reacted ? p.paws - 1 : p.paws + 1 }
      : p));
  };

  const handleSave = (id: string) => {
    const nowSaved = toggleSaved(id);
    showToast({
      msg: nowSaved ? 'Saved to your collection' : 'Removed from saved',
      icon: 'bookmark',
      tone: 'primary',
    });
  };

  const completeForward = (dests: ForwardDest[]) => {
    if (!forwardPost || dests.length === 0) return;
    setPosts(ps => ps.map(p => (
      p.id === forwardPost.id ? { ...p, forwards: p.forwards + 1 } : p
    )));
    setForwardPost(null);
    const label = dests.map(d => d.label).join(', ');
    showToast({ msg: `Shared to ${label}`, icon: 'forward', tone: 'success' });
  };

  return (
    <>
      <View style={inset ? styles.postsFeedInset : styles.postsFeed}>
        {posts.map((post, i) => {
          const live = feedPosts.find(p => p.id === post.id) ?? post;
          return (
          <View key={post.id}>
            <FeedPostCard
              post={live}
              compact={inset}
              onPaw={() => togglePaw(post.id)}
              onSave={() => handleSave(post.id)}
              onComments={() => setCommentPostId(post.id)}
              onForward={() => setForwardPost(live)}
              onUserPress={onUserPress}
              onCompanionPress={onCompanionPress}
            />
            {i < posts.length - 1 && (
              <View style={[styles.postsFeedDivider, inset && styles.postsFeedDividerInset, { backgroundColor: colors.border }]} />
            )}
          </View>
          );
        })}
      </View>

      {commentPost && (
        <FeedCommentSheet
          post={commentPost}
          createdCircles={createdCircles}
          joinedCircles={joinedCircles}
          onClose={() => setCommentPostId(null)}
          onSubmit={(text, replyToThreadIndex) =>
            addComment(commentPost.id, text, { replyToThreadIndex })
          }
          onToast={showToast}
          onAuthorPress={onUserPress}
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
          onSelect={completeForward}
        />
      )}

      {!onToast ? <Toast data={localToast} onHide={() => setLocalToast(null)} /> : null}
    </>
  );
}

function ProfileCommentActivityItem({
  comment,
  isLast,
  onPress,
}: {
  comment: UserFeedComment;
  isLast: boolean;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const postAuthor = users[comment.postAuthorId];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ opacity: pressed ? 0.82 : 1 }]}
      accessibilityRole="button"
      accessibilityLabel={`Comment on ${postAuthor?.name ?? 'post'}: ${comment.text}`}
    >
      <View style={styles.commentActivityItem}>
        <Text style={[styles.commentActivityText, { color: colors.text }]} numberOfLines={4}>
          {comment.text}
        </Text>
        <Text style={[styles.commentActivityContext, { color: colors.textSecondary }]} numberOfLines={1}>
          On {postAuthor?.name ?? 'post'}'s post · {comment.postText}
        </Text>
        <Text style={[styles.commentActivityMeta, { color: colors.textTertiary }]}>
          {comment.time}
          {comment.isReply ? ' · Reply' : ''}
        </Text>
      </View>
      {!isLast && <View style={[styles.commentActivityDivider, { backgroundColor: colors.border }]} />}
    </Pressable>
  );
}

export function ProfileCommentsFeed({
  comments,
  onOpenComment,
}: {
  comments: UserFeedComment[];
  onOpenComment?: (comment: UserFeedComment) => void;
}) {
  return (
    <View style={styles.commentActivityFeed}>
      {comments.map((comment, i) => (
        <ProfileCommentActivityItem
          key={comment.id}
          comment={comment}
          isLast={i === comments.length - 1}
          onPress={() => onOpenComment?.(comment)}
        />
      ))}
    </View>
  );
}

export type ProfileViewMode = 'owner' | 'public';

export function ProfileContentGrid({
  tab,
  posts,
  rescues,
  outgoingAdoptions,
  viewMode = 'owner',
  profileUserId = 'you',
  incomingAdopted,
  adopterTrust,
  onCompanionPress,
  onUserPress,
  onToast,
  onOpenRescue,
  onOpenOutgoingAdoption,
  onPostAsOwner,
  onOpenAdopted,
  onAdoptedUpdateSubmitted,
}: {
  tab: ProfileContentTab;
  posts: Post[];
  rescues: RescueCase[];
  outgoingAdoptions: AdoptionRecord[];
  viewMode?: ProfileViewMode;
  profileUserId?: string;
  incomingAdopted?: AdoptionRecord[];
  adopterTrust?: AdopterTrustSummary;
  onCompanionPress?: (companionId: string) => void;
  onUserPress?: (userId: string) => void;
  onToast?: (t: ToastData) => void;
  onOpenRescue: (id: string) => void;
  onOpenOutgoingAdoption: (recordId: string) => void;
  onPostAsOwner?: (recordId: string) => void;
  onOpenAdopted: (recordId: string) => void;
  onAdoptedUpdateSubmitted?: (record: AdoptionRecord) => void;
}) {
  const { width } = useWindowDimensions();
  const contentWidth = width - 32;
  const cellSize = (contentWidth - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS;

  const isPublic = viewMode === 'public';

  if (tab === 'posts') {
    if (posts.length === 0) {
      return (
        <Empty
          icon="grid"
          title="No posts yet"
          body={isPublic ? undefined : 'Your feed posts will appear here.'}
        />
      );
    }
    return (
      <ProfilePostsFeed
        posts={posts}
        inset={isPublic}
        onCompanionPress={onCompanionPress}
        onUserPress={onUserPress}
        onToast={onToast}
      />
    );
  }

  if (tab === 'rescues') {
    if (rescues.length === 0) {
      return (
        <Empty
          icon="shield"
          title="No rescues yet"
          body={isPublic ? undefined : 'Rescue cases you log will show here.'}
        />
      );
    }
    const rescueGap = 10;
    const rescueCellW = (contentWidth - rescueGap) / 2;
    return (
      <View style={styles.rescueGrid}>
        {rescues.map(item => (
          <RescueGridCell
            key={item.id}
            item={item}
            width={rescueCellW}
            onPress={() => onOpenRescue(item.id)}
          />
        ))}
      </View>
    );
  }

  if (tab === 'adoptions') {
    return null;
  }

  if (tab === 'adopted') {
    if (isPublic) {
      return (
        <ProfileAdoptedShowcase
          incoming={incomingAdopted ?? []}
          viewMode="public"
          onOpenRecord={onOpenAdopted}
        />
      );
    }
    return (
      <AdoptedRecordsPanel
        userId={profileUserId}
        onOpenRecord={onOpenAdopted}
      />
    );
  }

  return null;
}

export function ProfileAdoptedGrid({
  records,
  adopterTrust,
  updatePrompts,
  onPostUpdate,
  onOpen,
  contentWidth,
  variant = 'grid',
}: {
  records: AdoptionRecord[];
  adopterTrust: AdopterTrustSummary;
  updatePrompts?: AdoptionUpdatePrompt[];
  onPostUpdate?: (recordId: string) => void;
  onOpen: (recordId: string) => void;
  contentWidth?: number;
  /** `public` = compact highlight rows on someone else's profile */
  variant?: 'grid' | 'public';
}) {
  const { width } = useWindowDimensions();
  const rowWidth = contentWidth ?? width - 32;
  const adoptedGap = 10;
  const adoptedCellW = (rowWidth - adoptedGap) / 2;

  return (
    <View style={styles.adoptedSection}>
      {variant === 'grid' && updatePrompts?.map(prompt => (
        <AdoptionUpdatePromptBanner
          key={prompt.id}
          prompt={prompt}
          onPostUpdate={() => onPostUpdate?.(prompt.recordId)}
        />
      ))}
      {variant !== 'public' ? <ProfileAdopterTrustStrip summary={adopterTrust} /> : null}
      {variant === 'public' ? (
        <View style={styles.adoptedPublicList}>
          {records.map((record, index) => (
            <ProfileAdoptedPublicHighlight
              key={record.id}
              record={record}
              onPress={() => onOpen(record.id)}
              isLast={index === records.length - 1}
            />
          ))}
        </View>
      ) : (
        <View style={styles.adoptedGrid}>
          {records.map(record => (
            <ProfileAdoptedGridCell
              key={record.id}
              record={record}
              width={adoptedCellW}
              onPress={() => onOpen(record.id)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

/** @deprecated Use ProfileContentTab */
export type ProfileHubTab = ProfileContentTab;

export function ProfileActionLink({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={6} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
      <Text style={[styles.actionLink, { color: colors.primary }]}>{label}</Text>
    </Pressable>
  );
}

export function ProfileCompanionStrip({
  companion,
  onPress,
}: {
  companion: Companion;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const speciesLabel = companion.species === 'cat' ? 'Cat' : companion.species === 'dog' ? 'Dog' : companion.species;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`View ${companion.name}'s profile`}
      style={({ pressed }) => [styles.companionStrip, { opacity: pressed ? 0.75 : 1 }]}
    >
      <CompanionAvatar companion={companion} size={44} />
      <View style={styles.companionStripMeta}>
        <Text style={[styles.companionStripEyebrow, { color: colors.textTertiary }]}>My companion</Text>
        <Text style={[styles.companionStripName, { color: colors.text }]} numberOfLines={1}>
          {companion.name}
          <Text style={{ color: colors.textSecondary, fontWeight: '500' }}>
            {' '}· {speciesLabel} · {companion.age}
          </Text>
        </Text>
      </View>
      <Icon name="chevronRight" size={18} color={colors.textTertiary} />
    </Pressable>
  );
}

export function ProfileImpactStrip({
  rescues,
  successfulAdoptions,
  adopted,
}: {
  rescues: number;
  successfulAdoptions: number;
  adopted: number;
}) {
  const { colors } = useTheme();
  return (
    <Text style={[styles.impactStrip, { color: colors.textSecondary }]}>
      {rescues} rescues · {successfulAdoptions} adoptions · {adopted} companions adopted
    </Text>
  );
}

export function ProfileReviewsRow({
  rating,
  reviewCount,
  onPress,
}: {
  rating: number;
  reviewCount: number;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Reviews and safety"
      style={({ pressed }) => [
        styles.reviewsRow,
        { borderTopColor: colors.border, opacity: pressed ? 0.75 : 1 },
      ]}
    >
      <View style={[styles.reviewsIcon, { backgroundColor: colors.primary + '14' }]}>
        <Icon name="shield" size={18} color={colors.primary} />
      </View>
      <View style={styles.reviewsMeta}>
        <Text style={[styles.reviewsTitle, { color: colors.text }]}>Reviews & Safety</Text>
        <Text style={[styles.reviewsSub, { color: colors.textSecondary }]}>
          {rating.toFixed(1)} · {reviewCount} reviews
        </Text>
      </View>
      <Icon name="chevronRight" size={18} color={colors.textTertiary} />
    </Pressable>
  );
}

export function ProfileDivider() {
  const { colors } = useTheme();
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

// Legacy aliases — seamless variants
export function ProfileStatsCard({ items }: { items: (StatItem & { icon?: string; tint?: string; iconBg?: string })[] }) {
  return (
    <ProfileStatsRow
      items={items.map(({ value, label, onPress }) => ({ value, label, onPress }))}
    />
  );
}

export function ProfileCompanionCard(props: { companion: Companion; onPress: () => void }) {
  return <ProfileCompanionStrip {...props} />;
}

export function ProfileNavGrid(_props: { items: unknown[] }) {
  return null;
}

export function ProfileImpactCard({
  rescues,
  successfulAdoptions,
  adopted,
}: {
  rescues: number;
  successfulAdoptions: number;
  adopted: number;
  onViewAll?: () => void;
}) {
  return <ProfileImpactStrip rescues={rescues} successfulAdoptions={successfulAdoptions} adopted={adopted} />;
}

export function ImpactBanner({ body }: { body: string }) {
  const { colors } = useTheme();
  return (
    <Text style={[styles.impactBannerText, { color: colors.textSecondary }]}>{body}</Text>
  );
}

export function StatusBadge({ label, tint, bg }: { label: string; tint: string; bg: string }) {
  return (
    <View style={[styles.statusBadge, { backgroundColor: bg }]}>
      <Text style={[styles.statusBadgeText, { color: tint }]}>{label}</Text>
    </View>
  );
}

export function ProfileStatTile(props: StatItem & { icon?: string; tint?: string; iconBg?: string }) {
  return <ProfileStatsRow items={[props]} />;
}

export function ProfileNavTile(_props: { label: string; icon: string; tint: string; iconBg: string; onPress: () => void }) {
  return null;
}

export function ProfileHeroCard({
  user, trust, tagline, onEdit,
}: {
  user: User; trust: ProfileTrust; tagline?: string; onEdit: () => void; onSettings?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <>
      <ProfileUserRow user={user} trust={trust} tagline={tagline} />
      <Pressable onPress={onEdit}>
        <Text style={[styles.editLink, { color: colors.primary }]}>Edit profile</Text>
      </Pressable>
    </>
  );
}

export function CompanionHighlightRow(props: { companion: Companion; onPress: () => void }) {
  return <ProfileCompanionStrip {...props} />;
}

const styles = StyleSheet.create({
  homeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingTop: 4,
    paddingBottom: 8,
  },
  homeHeaderTitle: {
    flex: 1,
    textAlign: 'center',
    ...typography.navTitle,
  },
  trustPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  trustText: { ...typography.caption, fontFamily: typography.link.fontFamily },
  profileHero: {
    gap: 10,
    paddingTop: 4,
    paddingBottom: 0,
  },
  heroIdentityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroAvatarSlot: {
    flexShrink: 0,
  },
  heroIdentityMeta: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  heroName: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  heroHandleLine: {
    fontSize: 12,
    lineHeight: 16,
  },
  heroHandle: { fontSize: 12, fontWeight: '600' },
  heroLocation: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  heroLocationAfterBio: {
    paddingTop: spacing.xs,
  },
  heroBio: {
    fontSize: 12,
    lineHeight: 17,
  },
  heroTrustWrap: { alignSelf: 'flex-start' },
  userRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 2,
  },
  userMeta: { flex: 1, minWidth: 0, paddingTop: 2 },
  userName: { ...typography.heroName },
  userHandle: { ...typography.caption, marginTop: 1 },
  userTagline: { ...typography.small, marginTop: 3 },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  statsCellPressable: { flex: 1 },
  statsCell: { flex: 1, alignItems: 'center', gap: 2 },
  statsValue: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  statsLabel: { fontSize: 10, fontWeight: '600', textAlign: 'center' },
  actionLink: { ...typography.link, marginTop: 4 },
  contentTabs: {
    flexDirection: 'row',
    position: 'relative',
  },
  contentTabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    paddingBottom: 12 + INDICATOR_H,
  },
  contentTabIconWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentTabAlert: {
    position: 'absolute',
    top: -6,
    right: -14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 18,
  },
  contentTabAlertText: {
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 11,
  },
  contentTabTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: TAB_TRACK_H,
  },
  contentTabIndicator: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    height: INDICATOR_H,
    zIndex: 1,
  },
  companionsSection: { gap: 16, paddingTop: 10, paddingBottom: 4 },
  companionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  companionsEyebrow: {
    ...typography.sectionLabel,
    fontSize: 12,
    letterSpacing: 0.2,
    textTransform: 'none',
  },
  companionsEditDone: { ...typography.caption, fontSize: 13 },
  companionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: COMPANION_ROW_GAP },
  companionChip: { alignItems: 'center' },
  companionChipContent: { alignItems: 'center', gap: 10 },
  companionChipLabels: { alignItems: 'center', gap: 2 },
  companionAvatarWrap: { position: 'relative' },
  companionRemoveBtn: {
    position: 'absolute',
    bottom: 2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  companionChipGhost: { opacity: 0 },
  companionChipName: { ...typography.caption, fontSize: 13, fontFamily: typography.title.fontFamily },
  companionChipMeta: { fontSize: 12, lineHeight: 17, fontWeight: '500', textAlign: 'center' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  gridCell: { overflow: 'hidden', borderRadius: radius.sm },
  rescueGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  postsFeed: { marginHorizontal: -16 },
  postsFeedInset: { paddingTop: 4 },
  postsFeedDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
  postsFeedDividerInset: { marginHorizontal: 0 },
  commentActivityFeed: { paddingTop: 4 },
  commentActivityItem: { paddingVertical: 14, gap: 5 },
  commentActivityText: { ...typography.body, fontSize: 15, lineHeight: 22 },
  commentActivityContext: { ...typography.small, fontSize: 13 },
  commentActivityMeta: { ...typography.meta, fontSize: 12 },
  commentActivityDivider: { height: StyleSheet.hairlineWidth },
  trustStrip: { flexDirection: 'row', justifyContent: 'flex-start' },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  trustBadgeText: { ...typography.caption, fontSize: 11 },
  adoptedSection: { gap: 12, paddingTop: 4 },
  adoptedPublicList: { gap: 0 },
  adoptedPublicRowWrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  adoptedPublicRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 14,
  },
  adoptedPublicMain: { flex: 1, gap: 5, minWidth: 0 },
  adoptedPublicTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  adoptedPublicName: { ...typography.title, fontSize: 16, flex: 1 },
  adoptedPublicSpecies: { ...typography.meta, fontSize: 12 },
  adoptedPublicMetaLine: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  adoptedPublicMetaText: { ...typography.small, fontSize: 12, flex: 1 },
  adoptedPublicOwnerNote: {
    marginTop: 6,
    paddingLeft: 10,
    borderLeftWidth: 2,
    gap: 4,
  },
  adoptedPublicOwnerHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  adoptedPublicOwnerLabel: {
    ...typography.caption,
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  adoptedPublicRatingPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  adoptedPublicRatingPillText: { fontSize: 10.5, fontWeight: '700' },
  adoptedPublicOwnerQuote: { ...typography.small, fontSize: 13, lineHeight: 19 },
  adoptedPublicOwnerBy: { ...typography.meta, fontSize: 11 },
  adoptedPublicNoRating: { ...typography.meta, fontSize: 11.5, marginTop: 4 },
  adoptedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  adoptedCell: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  adoptedCellPhoto: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  adoptedCellBody: { gap: 4, paddingHorizontal: 10, paddingVertical: 10 },
  adoptedCellName: { ...typography.title, fontSize: 14.5 },
  adoptedCellMeta: { ...typography.meta, fontSize: 11.5 },
  adoptedCellStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    marginTop: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  adoptedCellStatusText: { ...typography.caption, fontSize: 10.5 },
  adoptedList: { gap: 0, marginHorizontal: -16 },
  adoptedStory: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  adoptedStoryBody: { gap: 6 },
  adoptedStoryHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  adoptedPetName: { ...typography.title, fontSize: 15 },
  adoptedMeta: { ...typography.meta },
  confirmRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  confirmText: { ...typography.meta, flex: 1 },
  trustChips: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  trustChip: { ...typography.caption, fontSize: 12 },
  timelineRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  timelineDot: { width: 8, height: 8, borderRadius: 4 },
  latestUpdate: { gap: 2, marginTop: 4 },
  latestCaption: { ...typography.bodySm, lineHeight: 20 },
  latestAttr: { ...typography.meta, fontSize: 11 },
  awaitingUpdate: { ...typography.meta, fontStyle: 'italic', marginTop: 4 },
  evidenceDot: { width: 8, height: 8, borderRadius: 4 },
  compactDots: { flexDirection: 'row', gap: 4, marginTop: 4 },
  miniDot: { width: 5, height: 5, borderRadius: 2.5 },
  outgoingRowWrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 10,
  },
  outgoingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  outgoingPostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginLeft: 16,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  outgoingPostText: { fontSize: 11, fontWeight: '700' },
  outgoingMeta: { flex: 1, gap: 4, minWidth: 0 },
  companionStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  companionStripMeta: { flex: 1, minWidth: 0 },
  companionStripEyebrow: {
    ...typography.sectionLabel,
    fontSize: 10,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  companionStripName: { ...typography.title, fontSize: 15 },
  impactStrip: { ...typography.small, fontFamily: typography.label.fontFamily },
  reviewsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
  reviewsIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewsMeta: { flex: 1, minWidth: 0 },
  reviewsTitle: { ...typography.title, fontSize: 15 },
  reviewsSub: { ...typography.meta, marginTop: 1 },
  divider: { height: StyleSheet.hairlineWidth, width: '100%' },
  impactBannerText: { ...typography.small, lineHeight: 20 },
  editLink: { ...typography.link },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  statusBadgeText: { ...typography.caption, fontSize: 11.5, fontFamily: typography.link.fontFamily },
});
