import React from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, typography } from '../../theme/tokens';
import { Avatar, CompanionAvatar } from '../ui/Avatar';
import { Icon } from '../icons/Icon';
import { IconButton } from '../ui/Button';
import { PhotoSlot } from '../ui/PhotoSlot';
import { Empty } from '../ui/Empty';
import { companions, users, type User, type Companion, type Post } from '../../data/mockData';
import type { ProfileTrust, RescueCase } from '../../data/profileData';
import type { AdoptionRecord, AdopterTrustSummary } from '../../data/adoptionRecords';
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
}: {
  title: string;
  rightIcon?: string;
  onRightPress?: () => void;
}) {
  const { colors } = useTheme();
  const navigation = useNavigation();

  return (
    <View style={styles.subHeader}>
      <IconButton
        name="chevronLeft"
        size={40}
        tone="soft"
        color={colors.textSecondary}
        onPress={() => navigation.goBack()}
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

const PROFILE_CONTENT_TABS: { id: ProfileContentTab; icon: string }[] = [
  { id: 'posts', icon: 'grid' },
  { id: 'rescues', icon: 'play-square' },
  { id: 'adoptions', icon: 'repeat' },
  { id: 'adopted', icon: 'heart' },
];

export function ProfileAdopterTrustStrip({ summary }: { summary: AdopterTrustSummary }) {
  const { colors } = useTheme();
  const badgeColors = {
    trusted: { bg: colors.successBg, text: colors.success },
    active: { bg: colors.infoBg, text: colors.primary },
    new: { bg: colors.neutralBg, text: colors.textSecondary },
    update_pending: { bg: colors.warningBg, text: colors.warning },
  }[summary.badge];

  return (
    <View style={styles.trustStrip}>
      <Text style={[styles.trustStripText, { color: colors.textSecondary }]}>
        {summary.total} adopted · {summary.confirmed} confirmed · {summary.withRecentUpdate} with recent updates
      </Text>
      <View style={[styles.trustBadge, { backgroundColor: badgeColors.bg }]}>
        <Text style={[styles.trustBadgeText, { color: badgeColors.text }]}>{summary.badgeLabel}</Text>
      </View>
    </View>
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
          <Avatar user={adopter ?? { name: 'Adopter', tint: record.tint }} size={22} showBadge={false} />
          <Icon name="check" size={12} color={colors.success} />
          <Avatar user={poster ?? { name: 'Foster', tint: colors.primary }} size={22} showBadge={false} />
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

            {record.updates.length > 0 && (
              <View style={styles.timelineRow}>
                {record.updates.slice(0, 4).map((u, i) => (
                  <View
                    key={u.id}
                    style={[
                      styles.timelineDot,
                      {
                        backgroundColor: u.type === 'adopter_home' ? colors.primary : colors.textTertiary,
                        opacity: i === record.updates.length - 1 ? 1 : 0.55,
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
}: {
  record: AdoptionRecord;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const adopter = users[record.adopterId as keyof typeof users];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.outgoingRow,
        { borderBottomColor: colors.border, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <PhotoSlot height={72} tint={record.tint} borderRadius={radius.sm} label="" icon={record.icon} style={{ width: 72 }} />
      <View style={styles.outgoingMeta}>
        <Text style={[styles.adoptedPetName, { color: colors.text }]}>{record.petName}</Text>
        <StatusBadge label="Adopted" tint={colors.success} bg={colors.successBg} />
        <Text style={[styles.adoptedMeta, { color: colors.textSecondary }]}>
          {record.confirmedAt} · {record.newHome ?? `With @${getUserHandle(record.adopterId)}`}
        </Text>
        {adopter && (
          <View style={styles.confirmRow}>
            <Avatar user={adopter} size={20} showBadge={false} />
            <Text style={[styles.confirmText, { color: colors.textTertiary }]}>@{adopter.handle}</Text>
          </View>
        )}
      </View>
      <Icon name="chevronRight" size={18} color={colors.textTertiary} />
    </Pressable>
  );
}

export function ProfileContentTabs({
  value,
  onChange,
}: {
  value: ProfileContentTab;
  onChange: (tab: ProfileContentTab) => void;
}) {
  const { colors } = useTheme();

  return (
    <View style={[styles.contentTabs, { borderTopColor: colors.border }]}>
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
              size={22}
              color={active ? colors.text : colors.textTertiary}
              sw={active ? 2 : 1.7}
            />
            {active && <View style={[styles.contentTabIndicator, { backgroundColor: colors.text }]} />}
          </Pressable>
        );
      })}
    </View>
  );
}

export function ProfileCompanionsSection({
  companions,
  onSelect,
}: {
  companions: Companion[];
  onSelect: (id: string) => void;
}) {
  const { colors } = useTheme();

  if (companions.length === 0) {
    return (
      <View style={styles.companionsSection}>
        <Text style={[styles.companionsEyebrow, { color: colors.textTertiary }]}>My companions</Text>
        <Empty icon="paw" title="No companion yet" body="Add your first companion to showcase them here." />
      </View>
    );
  }

  return (
    <View style={styles.companionsSection}>
      <Text style={[styles.companionsEyebrow, { color: colors.textTertiary }]}>My companions</Text>
      <View style={styles.companionsRow}>
        {companions.map(companion => {
          const speciesLabel = companion.species === 'cat' ? 'Cat' : companion.species === 'dog' ? 'Dog' : companion.species;
          return (
            <Pressable
              key={companion.id}
              onPress={() => onSelect(companion.id)}
              accessibilityRole="button"
              accessibilityLabel={`View ${companion.name}'s profile`}
              style={({ pressed }) => [styles.companionChip, { opacity: pressed ? 0.75 : 1 }]}
            >
              <CompanionAvatar companion={companion} size={56} />
              <Text style={[styles.companionChipName, { color: colors.text }]} numberOfLines={1}>
                {companion.name}
              </Text>
              <Text style={[styles.companionChipMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                {speciesLabel} · {companion.age}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const GRID_GAP = 2;
const GRID_COLS = 3;

export function ProfileContentGrid({
  tab,
  posts,
  rescues,
  outgoingAdoptions,
  incomingAdopted,
  adopterTrust,
  onOpenPost,
  onOpenRescue,
  onOpenOutgoingAdoption,
  onOpenAdopted,
}: {
  tab: ProfileContentTab;
  posts: Post[];
  rescues: RescueCase[];
  outgoingAdoptions: AdoptionRecord[];
  incomingAdopted: AdoptionRecord[];
  adopterTrust: AdopterTrustSummary;
  onOpenPost?: () => void;
  onOpenRescue: (id: string) => void;
  onOpenOutgoingAdoption: (recordId: string) => void;
  onOpenAdopted: (recordId: string) => void;
}) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const contentWidth = width - 32;
  const cellSize = (contentWidth - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS;

  if (tab === 'posts') {
    if (posts.length === 0) {
      return <Empty icon="grid" title="No posts yet" body="Your paw posts will appear here." />;
    }
    return (
      <View style={styles.grid}>
        {posts.map(post => {
          const companionId = post.companionAuthorId ?? post.companions?.[0];
          const tint = companionId ? (companions[companionId]?.tint ?? colors.primary) : colors.primary;
          const icon = companionId ? (companions[companionId]?.icon ?? 'paw') : 'paw';
          return (
            <Pressable
              key={post.id}
              onPress={onOpenPost}
              style={[styles.gridCell, { width: cellSize, height: cellSize }]}
            >
              <PhotoSlot height={cellSize} tint={tint} borderRadius={0} label="" icon={icon} style={{ width: cellSize }} />
            </Pressable>
          );
        })}
      </View>
    );
  }

  if (tab === 'rescues') {
    if (rescues.length === 0) {
      return <Empty icon="shield" title="No rescues yet" body="Rescue cases you log will show here." />;
    }
    return (
      <View style={styles.grid}>
        {rescues.map(item => (
          <Pressable
            key={item.id}
            onPress={() => onOpenRescue(item.id)}
            style={[styles.gridCell, { width: cellSize, height: cellSize }]}
          >
            <PhotoSlot
              height={cellSize}
              tint={item.tint}
              borderRadius={0}
              label={item.name}
              icon={item.icon}
              style={{ width: cellSize }}
            />
          </Pressable>
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
          />
        ))}
      </View>
    );
  }

  if (incomingAdopted.length === 0) {
    return <Empty icon="heart" title="No adopted companions" body="Confirmed adoptions you take in will appear here." />;
  }

  return (
    <View style={styles.adoptedList}>
      <ProfileAdopterTrustStrip summary={adopterTrust} />
      {incomingAdopted.map(record => (
        <ProfileAdoptedStoryCard
          key={record.id}
          record={record}
          onPress={() => onOpenAdopted(record.id)}
        />
      ))}
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
  },
  statsHairline: { width: StyleSheet.hairlineWidth, marginVertical: 4 },
  statCell: { flex: 1, alignItems: 'center', paddingHorizontal: 2 },
  statValue: { ...typography.stat },
  statLabel: { ...typography.statLabel, textAlign: 'center', marginTop: 2 },
  actionLink: { ...typography.link, marginTop: 4 },
  contentTabs: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    marginHorizontal: -16,
  },
  contentTabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  contentTabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '12%',
    right: '12%',
    height: 2,
    borderRadius: 1,
  },
  companionsSection: { gap: 10, paddingVertical: 4 },
  companionsEyebrow: { ...typography.sectionLabel, fontSize: 10, letterSpacing: 0.5 },
  companionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  companionChip: { alignItems: 'center', width: 88, gap: 4 },
  companionChipName: { ...typography.caption, fontSize: 13, fontFamily: typography.title.fontFamily },
  companionChipMeta: { ...typography.meta, fontSize: 11, textAlign: 'center' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  gridCell: { overflow: 'hidden', borderRadius: 2 },
  trustStrip: { gap: 8, paddingBottom: 4 },
  trustStripText: { ...typography.small },
  trustBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  trustBadgeText: { ...typography.caption, fontSize: 11 },
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
  outgoingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
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
