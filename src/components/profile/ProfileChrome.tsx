import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, typography } from '../../theme/tokens';
import { Avatar, CompanionAvatar } from '../ui/Avatar';
import { getPetAvatarFrameSize, getPetInnerCircleSize } from '../ui/PawPadShape';
import { Icon } from '../icons/Icon';
import { IconButton } from '../ui/Button';
import { PhotoSlot } from '../ui/PhotoSlot';
import { Empty } from '../ui/Empty';
import { FeedPostCard, resolvePostTagKey } from '../feed/FeedPostCard';
import { RescueGridCell } from '../rescue/RescueCaseUI';
import { useFeedPosts } from '../../context/FeedPostContext';
import type { ToastData } from '../ui/Toast';
import { companions, users, type User, type Companion, type Post } from '../../data/mockData';
import type { ProfileTrust, RescueCase } from '../../data/profileData';
import type { AdoptionRecord, AdopterTrustSummary, AdoptionUpdatePrompt } from '../../data/adoptionRecords';
import { AdoptionUpdatePromptBanner } from '../adoption/AdoptionUpdateUI';
import {
  getAdopterUpdateCount,
  getEvidenceState,
  getLatestUpdate,
  getUserHandle,
  updateAttributionLabel,
} from '../../data/adoptionRecords';

export function ProfileHomeHeader({ onSettings }: { onSettings: () => void }) {
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
      <Text style={[styles.homeHeaderTitle, { color: colors.text }]}>My Profile</Text>
      <IconButton name="settings" size={40} tone="soft" color={colors.textSecondary} onPress={onSettings} />
    </View>
  );
}

export function ProfileSubHeader({
  title,
  rightIcon,
  onRightPress,
  onBack,
}: {
  title: string;
  rightIcon?: string;
  onRightPress?: () => void;
  onBack?: () => void;
}) {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const handleBack = onBack ?? (() => navigation.goBack());

  return (
    <View style={styles.subHeader}>
      <IconButton
        name="chevronLeft"
        size={40}
        tone="soft"
        color={colors.textSecondary}
        onPress={handleBack}
      />
      <Text style={[styles.subHeaderTitle, { color: colors.text }]}>{title}</Text>
      <View style={{ flex: 1 }} />
      {rightIcon ? (
        <IconButton name={rightIcon} size={40} tone="soft" color={colors.textSecondary} onPress={onRightPress} />
      ) : (
        <View style={{ width: 40 }} />
      )}
    </View>
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
}: {
  user: User;
  trust: ProfileTrust;
  stats: { rescues: number; rehomed: number; adopted: number };
  onStatPress?: (tab: ProfileContentTab) => void;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.profileHero}>
      {/* Tinted gradient crown */}
      <LinearGradient
        colors={[user.tint + '28', user.tint + '08', 'transparent']}
        style={styles.heroGradient}
        pointerEvents="none"
      />

      <Avatar user={user} size={88} />

      <View style={styles.heroNameRow}>
        <Text style={[styles.heroName, { color: colors.text }]}>{user.name}</Text>
        {user.verified && (
          <View style={[styles.heroVerified, { backgroundColor: colors.accent }]}>
            <Icon name="check" size={10} color="#fff" />
          </View>
        )}
      </View>
      <Text style={[styles.heroHandle, { color: colors.primary }]}>@{user.handle}</Text>

      {user.bio ? (
        <Text style={[styles.heroBio, { color: colors.textSecondary }]}>{user.bio}</Text>
      ) : null}

      {user.location ? (
        <View style={styles.heroLocRow}>
          <Icon name="mapPin" size={12} color={colors.textTertiary} />
          <Text style={[styles.heroLoc, { color: colors.textSecondary }]}>{user.location}</Text>
        </View>
      ) : null}

      <View style={{ marginTop: 2 }}>
        <ProfileTrustBadge trust={trust} />
      </View>

      <ProfileStatsRow
        items={[
          { value: stats.rescues, label: 'Rescues', onPress: () => onStatPress?.('rescues') },
          { value: stats.rehomed, label: 'Rehomed', onPress: () => onStatPress?.('adoptions') },
          { value: stats.adopted, label: 'Adopted', onPress: () => onStatPress?.('adopted') },
        ]}
      />
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

export function ProfileStatsRow({ items }: { items: StatItem[] }) {
  const { colors } = useTheme();

  return (
    <View style={styles.statsRow}>
      {items.map((item, i) => (
        <React.Fragment key={item.label}>
          {i > 0 && <View style={[styles.statsHairline, { backgroundColor: colors.border }]} />}
          <StatCell item={item} colors={colors} />
        </React.Fragment>
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
    <View style={styles.statCell}>
      <Text style={[styles.statValue, { color: colors.text }]}>{item.value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]} numberOfLines={2}>
        {item.label}
      </Text>
    </View>
  );

  if (item.onPress) {
    return (
      <Pressable onPress={item.onPress} style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.7 : 1 }]}>
        {content}
      </Pressable>
    );
  }
  return <View style={{ flex: 1 }}>{content}</View>;
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
  const filled = record.icon === 'paw' || record.icon === 'cat' || record.icon === 'dog';

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
      <LinearGradient
        colors={[record.tint + '40', record.tint + '14']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.adoptedCellPhoto, { height: photoH }]}
      >
        <Icon
          name={record.icon}
          size={34}
          color={record.tint}
          fill={filled ? record.tint : 'none'}
        />
      </LinearGradient>
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
        tint={record.tint}
        borderRadius={compact ? radius.sm : radius.md}
        label={compact ? '' : record.petName}
        icon={record.icon}
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
        <PhotoSlot height={72} tint={record.tint} borderRadius={radius.sm} label="" icon={record.icon} style={{ width: 72 }} />
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

const INDICATOR_H = 3;
const INDICATOR_INSET = 10;

export function ProfileContentTabs({
  value,
  onChange,
}: {
  value: ProfileContentTab;
  onChange: (tab: ProfileContentTab) => void;
}) {
  const { colors } = useTheme();
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
      style={styles.contentTabs}
      onLayout={e => setRowWidth(e.nativeEvent.layout.width)}
    >
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
        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            accessibilityRole="tab"
            accessibilityState={active ? { selected: true } : {}}
            style={styles.contentTabBtn}
          >
            <Icon
              name={tab.icon}
              size={17}
              color={active ? colors.primary : colors.textTertiary}
              sw={active ? 2.2 : 1.7}
            />
            <Text
              style={[
                styles.contentTabLabel,
                { color: active ? colors.primary : colors.textTertiary, fontWeight: active ? '700' : '500' },
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const COMPANION_ROW_GAP = 4;
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
        style={({ pressed }) => [{ alignItems: 'center', opacity: pressed ? 0.75 : 1 }]}
      >
        <View style={[styles.companionAvatarWrap, { width: avatarSize, height: avatarSize, alignItems: 'center', justifyContent: 'center' }]}>
          <Icon name="plus" size={28} color={colors.primary} sw={2} />
        </View>
        <Text style={[styles.companionChipName, { color: colors.primary }]}>Add</Text>
        <Text accessible={false} style={[styles.companionChipMeta, styles.companionChipGhost]}>·</Text>
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
        <Text style={[styles.companionsEyebrow, { color: colors.textTertiary }]}>COMPANIONS</Text>
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
              <Icon name="edit" size={15} color={colors.textSecondary} />
            )}
          </Pressable>
        )}
      </View>
      {editing && (
        <Text style={[styles.companionsEditHint, { color: colors.textTertiary }]}>
          Tap × to remove from your profile
        </Text>
      )}
      <View
        style={styles.companionsRow}
        onLayout={e => onRowLayout(e.nativeEvent.layout.width)}
      >
        {companions.map(companion => {
          const speciesLabel = companion.species === 'cat' ? 'Cat' : companion.species === 'dog' ? 'Dog' : companion.species;
          return (
            <View key={companion.id} style={[styles.companionChip, { width: chipWidth }]}>
              <Pressable
                onPress={() => !editing && onSelect(companion.id)}
                disabled={editing}
                accessibilityRole="button"
                accessibilityLabel={editing ? `Remove ${companion.name}` : `View ${companion.name}'s profile`}
                style={({ pressed }) => [{ opacity: !editing && pressed ? 0.75 : 1, alignItems: 'center' }]}
              >
                <View style={styles.companionAvatarWrap}>
                  <CompanionAvatar companion={companion} size={avatarSize} />
                  {editing && (
                    <Pressable
                      onPress={() => handleRemove(companion.id)}
                      hitSlop={6}
                      style={[styles.companionRemoveBtn, { backgroundColor: colors.danger, borderColor: colors.surface }]}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${companion.name}`}
                    >
                      <Icon name="close" size={10} color={colors.onAccent} sw={2.5} />
                    </Pressable>
                  )}
                </View>
                <Text style={[styles.companionChipName, { color: colors.text }]} numberOfLines={1}>
                  {companion.name}
                </Text>
                <Text style={[styles.companionChipMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                  {speciesLabel} · {companion.age}
                </Text>
              </Pressable>
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
}: {
  posts: Post[];
  onCompanionPress?: (companionId: string) => void;
  onToast?: (t: ToastData) => void;
}) {
  const { colors } = useTheme();
  const { setPosts } = useFeedPosts();

  const togglePaw = (id: string) => {
    setPosts(ps => ps.map(p => p.id === id
      ? { ...p, reacted: !p.reacted, paws: p.reacted ? p.paws - 1 : p.paws + 1 }
      : p));
  };

  const toggleSave = (id: string, wasSaved: boolean) => {
    setPosts(ps => ps.map(p => p.id === id ? { ...p, saved: !p.saved } : p));
    onToast?.({
      msg: wasSaved ? 'Removed from saved' : 'Saved to your collection',
      icon: 'bookmark',
      tone: 'primary',
    });
  };

  return (
    <View style={styles.postsFeed}>
      {posts.map((post, i) => (
        <View key={post.id}>
          <FeedPostCard
            post={post}
            onPaw={() => togglePaw(post.id)}
            onSave={() => toggleSave(post.id, post.saved)}
            onComments={() => onToast?.({ msg: 'Comments', icon: 'comment', tone: 'primary' })}
            onForward={() => onToast?.({ msg: 'Shared', icon: 'forward', tone: 'success' })}
            onCompanionPress={onCompanionPress}
          />
          {i < posts.length - 1 && (
            <View style={[styles.postsFeedDivider, { backgroundColor: colors.border }]} />
          )}
        </View>
      ))}
    </View>
  );
}

function ProfileActivityItem({
  post,
  isLast,
  onPress,
}: {
  post: Post;
  isLast: boolean;
  onPress?: () => void;
}) {
  const { colors, postTag } = useTheme();
  const { tint, companionName } = getPostVisual(post, colors.primary);
  const tag = postTag(resolvePostTagKey(post));
  const showTag = post.label != null || (post.tag != null && post.tag !== 'discussion');

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ opacity: pressed ? 0.82 : 1 }]}
      accessibilityRole="button"
      accessibilityLabel={`Activity: ${post.text}`}
    >
      <View style={styles.activityItem}>
        <View style={styles.activityRail}>
          <View style={[styles.activityDot, { backgroundColor: tint, borderColor: colors.bg }]} />
          {!isLast && <View style={[styles.activityLine, { backgroundColor: colors.border }]} />}
        </View>
        <View style={[styles.activityCard, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
          <Text style={[styles.activityText, { color: colors.text }]} numberOfLines={2}>
            {post.text}
          </Text>
          <View style={styles.activityMeta}>
            <Text style={[styles.activityMetaText, { color: colors.textTertiary }]}>
              {post.time}
              {companionName ? ` · ${companionName}` : ''}
            </Text>
            {showTag && (
              <View style={[styles.activityTag, { backgroundColor: tag.bg }]}>
                <Text style={[styles.activityTagLabel, { color: tag.text }]}>{tag.label}</Text>
              </View>
            )}
            {post.paws > 0 && (
              <View style={styles.activityStat}>
                <Icon name="paw-line" size={11} color={colors.textTertiary} />
                <Text style={[styles.activityStatLabel, { color: colors.textTertiary }]}>{post.paws}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export function ProfileActivityFeed({
  posts,
  onOpenPost,
}: {
  posts: Post[];
  onOpenPost?: (postId: string) => void;
}) {
  return (
    <View style={styles.activityFeed}>
      {posts.map((post, i) => (
        <ProfileActivityItem
          key={post.id}
          post={post}
          isLast={i === posts.length - 1}
          onPress={() => onOpenPost?.(post.id)}
        />
      ))}
    </View>
  );
}

export function ProfileContentGrid({
  tab,
  posts,
  rescues,
  outgoingAdoptions,
  incomingAdopted,
  adopterTrust,
  updatePrompts,
  onPostUpdate,
  onCompanionPress,
  onToast,
  onOpenRescue,
  onOpenOutgoingAdoption,
  onPostAsOwner,
  onOpenAdopted,
}: {
  tab: ProfileContentTab;
  posts: Post[];
  rescues: RescueCase[];
  outgoingAdoptions: AdoptionRecord[];
  incomingAdopted: AdoptionRecord[];
  adopterTrust: AdopterTrustSummary;
  updatePrompts?: AdoptionUpdatePrompt[];
  onPostUpdate?: (recordId: string) => void;
  onCompanionPress?: (companionId: string) => void;
  onToast?: (t: ToastData) => void;
  onOpenRescue: (id: string) => void;
  onOpenOutgoingAdoption: (recordId: string) => void;
  onPostAsOwner?: (recordId: string) => void;
  onOpenAdopted: (recordId: string) => void;
}) {
  const { width } = useWindowDimensions();
  const contentWidth = width - 32;
  const cellSize = (contentWidth - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS;

  if (tab === 'posts') {
    if (posts.length === 0) {
      return (
        <Empty
          icon="grid"
          title="No posts yet"
          body="Your feed posts will appear here."
        />
      );
    }
    return (
      <ProfilePostsFeed
        posts={posts}
        onCompanionPress={onCompanionPress}
        onToast={onToast}
      />
    );
  }

  if (tab === 'rescues') {
    if (rescues.length === 0) {
      return <Empty icon="shield" title="No rescues yet" body="Rescue cases you log will show here." />;
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
    if (outgoingAdoptions.length === 0) {
      return <Empty icon="adoption" title="No adoptions yet" body="Pets you rehome will appear here after confirmation." />;
    }
    return (
      <View style={styles.adoptedList}>
        {outgoingAdoptions.map(record => (
          <ProfileOutgoingAdoptionRow
            key={record.id}
            record={record}
            onPress={() => onOpenOutgoingAdoption(record.id)}
            onPostPress={onPostAsOwner ? () => onPostAsOwner(record.id) : undefined}
          />
        ))}
      </View>
    );
  }

  if (incomingAdopted.length === 0) {
    return <Empty icon="heart" title="No adopted companions" body="Confirmed adoptions you take in will appear here." />;
  }

  return (
    <ProfileAdoptedGrid
      records={incomingAdopted}
      adopterTrust={adopterTrust}
      updatePrompts={updatePrompts}
      onPostUpdate={onPostUpdate}
      onOpen={onOpenAdopted}
      contentWidth={contentWidth}
    />
  );
}

export function ProfileAdoptedGrid({
  records,
  adopterTrust,
  updatePrompts,
  onPostUpdate,
  onOpen,
  contentWidth,
}: {
  records: AdoptionRecord[];
  adopterTrust: AdopterTrustSummary;
  updatePrompts?: AdoptionUpdatePrompt[];
  onPostUpdate?: (recordId: string) => void;
  onOpen: (recordId: string) => void;
  contentWidth?: number;
}) {
  const { width } = useWindowDimensions();
  const rowWidth = contentWidth ?? width - 32;
  const adoptedGap = 10;
  const adoptedCellW = (rowWidth - adoptedGap) / 2;

  return (
    <View style={styles.adoptedSection}>
      {updatePrompts?.map(prompt => (
        <AdoptionUpdatePromptBanner
          key={prompt.id}
          prompt={prompt}
          onPostUpdate={() => onPostUpdate?.(prompt.recordId)}
        />
      ))}
      <ProfileAdopterTrustStrip summary={adopterTrust} />
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
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 4,
    paddingBottom: 6,
    gap: 4,
  },
  subHeaderTitle: { ...typography.navTitle },
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
    alignItems: 'center',
    gap: 7,
    paddingTop: 20,
    paddingBottom: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  heroGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 110,
  },
  heroNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  heroVerified: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroName: { ...typography.heroName, textAlign: 'center', letterSpacing: -0.4 },
  heroHandle: { fontSize: 14, fontWeight: '500', marginTop: -2 },
  heroBio: {
    ...typography.small,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 300,
  },
  heroLocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroLoc: { fontSize: 12.5 },
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
  statsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingVertical: 10,
    width: '100%',
    marginTop: 4,
  },
  statsHairline: { width: StyleSheet.hairlineWidth, marginVertical: 4 },
  statCell: { flex: 1, alignItems: 'center', paddingHorizontal: 2 },
  statValue: { ...typography.stat },
  statLabel: { ...typography.statLabel, textAlign: 'center', marginTop: 2 },
  actionLink: { ...typography.link, marginTop: 4 },
  contentTabs: {
    flexDirection: 'row',
    marginHorizontal: -16,
    position: 'relative',
  },
  contentTabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
    paddingTop: 11,
    paddingBottom: 11 + INDICATOR_H,
  },
  contentTabLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0,
  },
  contentTabIndicator: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    height: INDICATOR_H,
    borderRadius: INDICATOR_H,
  },
  companionsSection: { gap: 10, paddingTop: 14, paddingBottom: 4 },
  companionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  companionsEyebrow: { ...typography.sectionLabel, fontSize: 10, letterSpacing: 0.5 },
  companionsEditDone: { ...typography.caption, fontSize: 13 },
  companionsEditHint: { ...typography.meta, fontSize: 11, marginTop: -4 },
  companionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: COMPANION_ROW_GAP },
  companionChip: { alignItems: 'center', gap: 4 },
  companionAvatarWrap: { position: 'relative' },
  companionRemoveBtn: {
    position: 'absolute',
    top: -2,
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
  companionChipMeta: { ...typography.meta, fontSize: 11, textAlign: 'center' },
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
  postsFeedDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
  activityFeed: { gap: 0, paddingTop: 4 },
  activityList: { gap: 0 },
  activityItem: { flexDirection: 'row', gap: 10 },
  activityRail: { width: 14, alignItems: 'center' },
  activityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    marginTop: 14,
    zIndex: 1,
  },
  activityLine: {
    position: 'absolute',
    top: 22,
    bottom: -6,
    width: StyleSheet.hairlineWidth,
  },
  activityCard: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    gap: 6,
  },
  activityText: { fontSize: 13.5, lineHeight: 19, fontWeight: '500' },
  activityMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  activityMetaText: { fontSize: 11, fontWeight: '500' },
  activityTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  activityTagLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.2 },
  activityStat: { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 'auto' },
  activityStatLabel: { fontSize: 11, fontWeight: '600' },
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
