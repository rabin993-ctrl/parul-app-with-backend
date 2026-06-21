import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, useWindowDimensions, Animated, Easing, ActivityIndicator,
  TextInput, Platform, ScrollView, type ViewStyle, type ScrollViewProps,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, shadows, spacing, typography } from '../../theme/tokens';
import {
  profileOwnerLightColors,
  profileOwnerLightGradients,
  profileOwnerScreenBg,
} from '../../theme/profileCanvasTheme';
import { Avatar, CompanionAvatar } from '../ui/Avatar';
import { Icon } from '../icons/Icon';
import { AppSubHeader, AppCenteredHeader, AppHeaderIconButton, APP_HEADER_BACK_SIZE, APP_HEADER_PADDING_BOTTOM, APP_HEADER_PADDING_H, APP_HEADER_PADDING_TOP } from '../ui/AppSubHeader';
import { PhotoSlot } from '../ui/PhotoSlot';
import { Empty } from '../ui/Empty';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { FeedPostItem } from '../feed/FeedPostItem';
import { LostCard, FoundCard } from '../feed/AlertCards';
import { FeedCommentSheet } from '../feed/FeedCommentSheet';
import { ForwardSheet, type ForwardDest } from '../ForwardSheet';
import { RescueGridCell } from '../rescue/RescueCaseUI';
import { useFeedPosts } from '../../context/FeedPostContext';
import { usePawCircles } from '../../context/PawCircleContext';
import { useCommunityGroups } from '../../context/CommunityGroupsContext';
import { Toast, type ToastData } from '../ui/Toast';
import type { UserFeedComment } from '../../utils/postComments';
import { type User, type Companion, type Post } from '../../data/mockData';
import { useUserProfile } from '../../hooks/useUserProfile';
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
  updateAttributionLabel,
} from '../../data/adoptionRecords';
import { formatDueLabel, getNextUpdateSummary } from '../../utils/adoptionUpdateSchedule';
import { UserNameWithAdoptionFlag } from '../ui/UserNameWithAdoptionFlag';
import { ProfileIdentityRail } from './ProfileIdentityRail';
import { ProfileSettingsEditForm } from './ProfileSettingsEditForm';
import {
  PROFILE_HERO_AVATAR_SIZE,
  PROFILE_HERO_AVATAR_TEXT_GAP,
  PROFILE_HERO_IDENTITY_GAP,
} from './profileHeroTokens';
import { adoptionOverdueOuterSize } from '../ui/AdoptionOverdueRing';
import { useAdopterUpdateRequested } from '../../hooks/useAdopterPublicFlags';
import { TreatWalletHint, TreatWalletStatCell, ProfilePublicTreatsStatCell } from '../TreatWalletPill';
import { ProfileAdoptedShowcase } from './ProfileAdoptionPanel';
import { isAdoptionTaggedPost } from '../../utils/adoptionPostListing';

export type ProfileContentTab = 'posts' | 'rescues' | 'adoptions' | 'adopted' | 'lost';

const PROFILE_DRAWER_EDGE_INSET = 16;
const PROFILE_PAGE_GUTTER = spacing.lg;
const PROFILE_HERO_BAND_NUDGE_H = -(PROFILE_PAGE_GUTTER - APP_HEADER_PADDING_H);
const PROFILE_DRAWER_ARC_STROKE = 1;

const ProfileOwnerCanvasContext = React.createContext(false);

function useProfileOwnerCanvasBg(): string {
  const inOwnerCanvas = useContext(ProfileOwnerCanvasContext);
  const { colors, isDark } = useTheme();
  if (inOwnerCanvas && !isDark) return profileOwnerLightColors.bg;
  return colors.bg;
}

const profileDrawerLightElevation = Platform.select<ViewStyle>({
  ios: shadows.md,
  android: shadows.md,
  web: { boxShadow: '0 -6px 28px rgba(0, 0, 0, 0.06)' },
  default: {},
});

/** Soft gradient canvas for owner profile + settings — light mode only. */
export function ProfileScreenCanvas({ children }: { children: React.ReactNode }) {
  const { colors, gradients, isDark } = useTheme();
  const canvasBg = profileOwnerScreenBg(isDark, colors);
  const ownerGradients = isDark ? gradients : profileOwnerLightGradients;

  return (
    <ProfileOwnerCanvasContext.Provider value={true}>
      <View style={[styles.profileScreenCanvas, { backgroundColor: canvasBg }]}>
        <LinearGradient
          colors={[...ownerGradients.background.colors]}
          locations={[...ownerGradients.background.locations]}
          start={ownerGradients.background.start}
          end={ownerGradients.background.end}
          style={[StyleSheet.absoluteFill, styles.profileScreenCanvasGradient]}
          pointerEvents="none"
        />
        {!isDark ? (
          <LinearGradient
            colors={[...profileOwnerLightGradients.glow.colors]}
            locations={[...profileOwnerLightGradients.glow.locations]}
            start={profileOwnerLightGradients.glow.start}
            end={profileOwnerLightGradients.glow.end}
            style={styles.profileScreenGlow}
            pointerEvents="none"
          />
        ) : null}
        <View style={styles.profileScreenCanvasContent}>
          {children}
        </View>
      </View>
    </ProfileOwnerCanvasContext.Provider>
  );
}

/** Rounded surface panel below profile hero — fixed profile chrome, not Sheet/sheetLayout. */
export function ProfileContentDrawer({
  children,
  bottomInset = 0,
  fill = false,
  scrollable = false,
  scrollProps,
}: {
  children: React.ReactNode;
  /** Extra bottom padding inside the surface (e.g. tab bar scroll inset). */
  bottomInset?: number;
  /** Stretch the panel to fill remaining screen height (requires flex parent). */
  fill?: boolean;
  /** Scroll drawer body only when content overflows the panel. */
  scrollable?: boolean;
  scrollProps?: ScrollViewProps;
}) {
  const { colors, isDark } = useTheme();
  const inOwnerCanvas = useContext(ProfileOwnerCanvasContext);
  const ownerLightPanel = inOwnerCanvas && !isDark;
  const [viewportH, setViewportH] = useState(0);
  const [contentH, setContentH] = useState(0);
  const scrollEnabled = scrollable && contentH > viewportH + 1;
  const innerStyle = [
    styles.contentDrawerInner,
    { paddingBottom: spacing.xs + bottomInset },
  ];

  return (
    <View
      style={[
        styles.contentDrawer,
        fill && styles.contentDrawerFillParent,
        {
          backgroundColor: ownerLightPanel ? profileOwnerLightColors.surface : colors.surface,
          borderTopColor: isDark
            ? colors.borderStrong
            : ownerLightPanel
              ? colors.border
              : colors.textTertiary,
          borderTopWidth: isDark || !ownerLightPanel ? PROFILE_DRAWER_ARC_STROKE : 0,
        },
        ownerLightPanel && profileDrawerLightElevation,
      ]}
    >
      {scrollable ? (
        <ScrollView
          style={styles.contentDrawerScroll}
          contentContainerStyle={innerStyle}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={scrollEnabled}
          bounces={scrollEnabled}
          alwaysBounceVertical={false}
          onLayout={e => setViewportH(e.nativeEvent.layout.height)}
          onContentSizeChange={(_, height) => setContentH(height)}
          {...scrollProps}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={innerStyle}>
          {children}
        </View>
      )}
    </View>
  );
}

export function ProfileHomeHeader({
  user,
  onSettings,
  onBack,
}: {
  user: User;
  onSettings: () => void;
  onBack?: () => void;
}) {
  return (
    <View style={styles.profileHomeHeader}>
      <AppCenteredHeader
        title={`@${user.handle}`}
        onBack={onBack}
        trailing={(
          <AppHeaderIconButton
            name="menu"
            onPress={onSettings}
            accessibilityLabel="Settings"
          />
        )}
      />
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
  onAvatarPress,
  showTrustBadge,
  showTreatBalance,
  showHandle = true,
  showName = true,
}: {
  user: User;
  trust: ProfileTrust;
  onAvatarPress?: () => void;
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
          {onAvatarPress ? (
            <Pressable
              onPress={onAvatarPress}
              accessibilityRole="button"
              accessibilityLabel="Change profile photo"
              style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
            >
              <Avatar user={user} size={88} />
            </Pressable>
          ) : (
            <Avatar user={user} size={88} />
          )}
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
            <View
              style={[
                styles.heroLocationRow,
                user.bio && styles.heroLocationAfterBio,
              ]}
            >
              <Icon name="mapPin" size={15} color={colors.textSecondary} sw={2.2} />
              <Text
                style={[styles.heroLocation, { color: colors.textSecondary }]}
                numberOfLines={2}
              >
                {user.location}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {showTreatBalance ? <TreatWalletHint align="start" /> : null}

      {showTrustBadge ? (
        <View style={styles.heroTrustWrap}>
          <ProfileTrustBadge trust={trust} />
        </View>
      ) : null}
    </View>
  );
}

type OwnerStatId = 'posts' | 'following';

const ADD_COMPANION_BTN_SIZE = 26;
const PROFILE_HERO_AVATAR_SIZE_COMPACT = PROFILE_HERO_AVATAR_SIZE;
type ProfileHeroIdentitySize = 'default' | 'compact';

function formatProfileCount(n: number): string {
  if (n >= 10000) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(n);
}

export function ProfileHeroAvatar({
  user,
  size,
  onPress,
  showAddBadge = false,
  uploading = false,
  showOnlineIndicator = false,
}: {
  user: User;
  size: number;
  onPress?: () => void;
  showAddBadge?: boolean;
  uploading?: boolean;
  showOnlineIndicator?: boolean;
}) {
  const { colors } = useTheme();
  const canvasBg = useProfileOwnerCanvasBg();
  const updateRequested = useAdopterUpdateRequested(user.id);
  const outer = adoptionOverdueOuterSize(size, updateRequested);
  const badgeSize = ADD_COMPANION_BTN_SIZE;
  const badgeIcon = Math.max(12, Math.round(badgeSize * 0.46));
  const showBadge = showAddBadge && onPress;

  const avatar = <Avatar user={user} size={size} adoptionUpdateAlert showOnlineIndicator={showOnlineIndicator} />;

  const content = showBadge ? (
    <View style={[styles.avatarHeroWrap, { width: outer, height: outer }]}>
      {avatar}
      <View
        style={[
          styles.avatarAddBadge,
          {
            width: badgeSize,
            height: badgeSize,
            borderRadius: badgeSize / 2,
            backgroundColor: colors.primary,
            borderColor: canvasBg,
          },
        ]}
      >
        {uploading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Icon name="plus" size={badgeIcon} color="#fff" sw={2.5} />
        )}
      </View>
    </View>
  ) : avatar;

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        disabled={uploading}
        accessibilityRole="button"
        accessibilityLabel="Change profile photo"
        style={({ pressed }) => [{ opacity: pressed || uploading ? 0.82 : 1 }]}
      >
        <View pointerEvents="none">
          {content}
        </View>
      </Pressable>
    );
  }
  return content;
}

/** @deprecated use ProfileHeroAvatar */
export const AvatarGradientRing = ProfileHeroAvatar;

function ProfileOwnerStatsBar({
  items,
  value,
  onChange,
  endSlot,
  compact = false,
}: {
  items: {
    id: OwnerStatId;
    value: number;
    label: string;
  }[];
  value?: OwnerStatId;
  onChange: (id: OwnerStatId) => void;
  endSlot?: React.ReactNode;
  compact?: boolean;
}) {
  const { colors } = useTheme();

  return (
    <View style={[styles.ownerStatsOpen, compact && styles.ownerStatsOpenHeroBand]}>
      {items.map(item => (
          <Pressable
            key={item.id}
            onPress={() => onChange(item.id)}
            style={({ pressed }) => [
              styles.ownerStatsCell,
              compact && styles.ownerStatsCellHeroBand,
              pressed && { opacity: 0.72 },
            ]}
            accessibilityRole="button"
            accessibilityState={value === item.id ? { selected: true } : {}}
            accessibilityLabel={`${item.label}, ${formatProfileCount(item.value)}`}
          >
            <Text style={[
              styles.ownerStatsValue,
              compact && styles.ownerStatsValueHeroBand,
              { color: colors.text },
            ]}>
              {formatProfileCount(item.value)}
            </Text>
            <Text style={[
              styles.ownerStatsLabel,
              compact && styles.ownerStatsLabelHeroBand,
              { color: colors.textTertiary },
            ]} numberOfLines={compact ? 2 : 1}>
              {item.label}
            </Text>
          </Pressable>
      ))}
      {endSlot}
    </View>
  );
}

function ProfileOwnerSecondaryStats({
  rescues,
  rehomed,
  adopted,
  adoptedMissedCount = 0,
  activeTab,
  onPressRescues,
  onPressRehomed,
  onPressAdopted,
  alignEnd = false,
  alignStart = false,
  heroBand = false,
}: {
  rescues: number;
  rehomed: number;
  adopted: number;
  adoptedMissedCount?: number;
  activeTab: ProfileContentTab;
  onPressRescues: () => void;
  onPressRehomed: () => void;
  onPressAdopted: () => void;
  alignEnd?: boolean;
  alignStart?: boolean;
  heroBand?: boolean;
}) {
  const { colors } = useTheme();
  const adoptedBadge = adoptedMissedCount > 0
    ? (adoptedMissedCount > 99 ? '99+' : String(adoptedMissedCount))
    : null;

  const statTextStyle = (tab: ProfileContentTab) => {
    const selected = activeTab === tab;
    return [
      styles.ownerSecondaryStatText,
      {
        color: selected ? colors.text : colors.textSecondary,
        fontWeight: selected ? '700' as const : '600' as const,
      },
    ];
  };

  const valueStyle = (tab: ProfileContentTab) => {
    const selected = activeTab === tab;
    return [
      styles.ownerSecondaryStatValue,
      { color: selected ? colors.text : colors.textSecondary },
    ];
  };

  return (
    <View style={[
      styles.ownerSecondaryStatsRow,
      alignEnd && styles.ownerSecondaryStatsRowEnd,
      alignStart && styles.ownerSecondaryStatsRowStart,
      heroBand && styles.ownerSecondaryStatsRowHeroBand,
    ]}>
      <Pressable
        onPress={onPressRescues}
        accessibilityRole="button"
        accessibilityState={activeTab === 'rescues' ? { selected: true } : {}}
        accessibilityLabel={`${formatProfileCount(rescues)} rescues`}
        style={({ pressed }) => [styles.ownerSecondaryStatPress, pressed && { opacity: 0.72 }]}
      >
        <Text style={statTextStyle('rescues')}>
          <Text style={valueStyle('rescues')}>{formatProfileCount(rescues)}</Text>
          {' Rescues'}
        </Text>
      </Pressable>
      <Text style={[styles.ownerSecondaryStatDot, { color: colors.textTertiary }]}>·</Text>
      <Pressable
        onPress={onPressRehomed}
        accessibilityRole="button"
        accessibilityState={activeTab === 'adoptions' ? { selected: true } : {}}
        accessibilityLabel={`${formatProfileCount(rehomed)} rehomed`}
        style={({ pressed }) => [styles.ownerSecondaryStatPress, pressed && { opacity: 0.72 }]}
      >
        <Text style={statTextStyle('adoptions')}>
          <Text style={valueStyle('adoptions')}>{formatProfileCount(rehomed)}</Text>
          {' Rehomed'}
        </Text>
      </Pressable>
      <Text style={[styles.ownerSecondaryStatDot, { color: colors.textTertiary }]}>·</Text>
      <Pressable
        onPress={onPressAdopted}
        accessibilityRole="button"
        accessibilityState={activeTab === 'adopted' ? { selected: true } : {}}
        accessibilityLabel={
          adoptedBadge
            ? `${formatProfileCount(adopted)} adopted, ${adoptedBadge} check-ins due`
            : `${formatProfileCount(adopted)} adopted`
        }
        style={({ pressed }) => [styles.ownerSecondaryStatPress, pressed && { opacity: 0.72 }]}
      >
        <View style={styles.ownerSecondaryStatRow}>
          <Text style={statTextStyle('adopted')}>
            <Text style={valueStyle('adopted')}>{formatProfileCount(adopted)}</Text>
            {' Adopted'}
          </Text>
          {adoptedBadge ? (
            <View style={[styles.adoptedAlertChip, { backgroundColor: colors.warningBg }]}>
              <Icon name="alert" size={10} color={colors.warning} sw={2.2} />
              <Text style={[styles.adoptedAlertChipText, { color: colors.warning }]}>
                {adoptedBadge}
              </Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    </View>
  );
}

function ProfileOwnerStatsBlock({
  postsCount,
  stats,
  contentTab,
  onStatPress,
  onFollowingPress,
  adoptedMissedCount = 0,
  endSlot,
}: {
  postsCount: number;
  stats: ProfileImpactStats;
  contentTab: ProfileContentTab;
  onStatPress: (tab: ProfileContentTab) => void;
  onFollowingPress?: () => void;
  adoptedMissedCount?: number;
  endSlot: React.ReactNode;
}) {
  const ownerStatValue: OwnerStatId | undefined = contentTab === 'posts' ? 'posts' : undefined;

  const statItems = useMemo(
    () => [
      { id: 'posts' as const, value: postsCount, label: 'Posts' },
      { id: 'following' as const, value: stats.following, label: 'Following' },
    ],
    [postsCount, stats.following],
  );

  const handleStatChange = (id: OwnerStatId) => {
    if (id === 'following') onFollowingPress?.();
    else if (id === 'posts') onStatPress('posts');
  };

  return (
    <View style={styles.ownerStatsSection}>
      <ProfileOwnerStatsBar
        items={statItems}
        value={ownerStatValue}
        onChange={handleStatChange}
        endSlot={endSlot}
        compact={false}
      />

      <View style={styles.ownerHeroFooter}>
        <ProfileOwnerSecondaryStats
          rescues={stats.rescues}
          rehomed={stats.rehomed}
          adopted={stats.adopted}
          adoptedMissedCount={adoptedMissedCount}
          activeTab={contentTab}
          onPressRescues={() => onStatPress('rescues')}
          onPressRehomed={() => onStatPress('adoptions')}
          onPressAdopted={() => onStatPress('adopted')}
        />
      </View>
    </View>
  );
}

function ProfileHeroPrimaryRow({
  user,
  onAvatarPress,
  showAddBadge = false,
  avatarUploading = false,
  trustBadge,
  postsCount,
  stats,
  contentTab,
  onStatPress,
  onFollowingPress,
  adoptedMissedCount = 0,
  treatSlot,
  identitySize = 'default',
  showOnlineIndicator = false,
}: {
  user: User;
  onAvatarPress?: () => void;
  showAddBadge?: boolean;
  avatarUploading?: boolean;
  trustBadge?: React.ReactNode;
  postsCount: number;
  stats: ProfileImpactStats;
  contentTab: ProfileContentTab;
  onStatPress: (tab: ProfileContentTab) => void;
  onFollowingPress?: () => void;
  adoptedMissedCount?: number;
  treatSlot: React.ReactNode;
  identitySize?: ProfileHeroIdentitySize;
  showOnlineIndicator?: boolean;
}) {
  const compact = identitySize === 'compact';
  const avatarSize = compact ? PROFILE_HERO_AVATAR_SIZE_COMPACT : PROFILE_HERO_AVATAR_SIZE;
  const ownerStatValue: OwnerStatId | undefined = contentTab === 'posts' ? 'posts' : undefined;

  const statItems = useMemo(
    () => [
      { id: 'posts' as const, value: postsCount, label: 'Posts' },
      { id: 'following' as const, value: stats.following, label: 'Following' },
    ],
    [postsCount, stats.following],
  );

  const handleStatChange = (id: OwnerStatId) => {
    if (id === 'following') onFollowingPress?.();
    else if (id === 'posts') onStatPress('posts');
  };

  return (
    <View style={[styles.profileHeroIdentityColumn, compact && styles.profileHeroIdentityColumnCompact]}>
      <View style={styles.profileHeroTopRow}>
        <ProfileIdentityRail
          mode="avatarOnly"
          avatarSlot={(
            <ProfileHeroAvatar
              user={user}
              size={avatarSize}
              onPress={onAvatarPress}
              showAddBadge={showAddBadge}
              uploading={avatarUploading}
              showOnlineIndicator={showOnlineIndicator}
            />
          )}
        />
        <View style={styles.profileHeroMetaWithStats}>
          <View style={styles.profileHeroStatsStack}>
            <ProfileOwnerStatsBar
              items={statItems}
              value={ownerStatValue}
              onChange={handleStatChange}
              endSlot={treatSlot}
              compact
            />
            <ProfileOwnerSecondaryStats
              rescues={stats.rescues}
              rehomed={stats.rehomed}
              adopted={stats.adopted}
              adoptedMissedCount={adoptedMissedCount}
              activeTab={contentTab}
              onPressRescues={() => onStatPress('rescues')}
              onPressRehomed={() => onStatPress('adoptions')}
              onPressAdopted={() => onStatPress('adopted')}
              heroBand
            />
          </View>
          {trustBadge}
        </View>
      </View>
      <ProfileIdentityRail
        mode="textOnly"
        name={user.name}
        userId={user.id}
        bio={user.bio}
        location={user.location}
      />
    </View>
  );
}

function ProfileHeroIdentity({
  user,
  onAvatarPress,
  showAddBadge = false,
  avatarUploading = false,
  trustBadge,
  showAvatar = true,
  identitySize = 'default',
}: {
  user: User;
  onAvatarPress?: () => void;
  showAddBadge?: boolean;
  avatarUploading?: boolean;
  trustBadge?: React.ReactNode;
  showAvatar?: boolean;
  identitySize?: ProfileHeroIdentitySize;
}) {
  const compact = identitySize === 'compact';
  const avatarSize = compact ? PROFILE_HERO_AVATAR_SIZE_COMPACT : PROFILE_HERO_AVATAR_SIZE;

  const meta = (
    <View
      style={[
        styles.profileHeroIdentityMeta,
        showAvatar ? styles.profileHeroIdentityMetaBesideAvatar : styles.profileHeroIdentityMetaOnly,
        compact && showAvatar && styles.profileHeroIdentityMetaCompact,
        showAvatar && {
          justifyContent: 'center',
          ...(trustBadge
            ? { minHeight: avatarSize }
            : { height: avatarSize }),
        },
      ]}
    >
      <UserNameWithAdoptionFlag
        userId={user.id}
        name={user.name}
        nameStyle={[
          compact ? styles.profileHeroBandNameCompact : styles.profileHeroBandName,
          showAvatar && styles.profileHeroBandNameBesideAvatar,
        ]}
        style={[
          styles.profileHeroBandNameRow,
          showAvatar && styles.profileHeroBandNameRowBesideAvatar,
        ]}
        numberOfLines={2}
      />
      {trustBadge}
    </View>
  );

  if (!showAvatar) {
    return <View style={styles.profileHeroIdentityColumnMetaOnly}>{meta}</View>;
  }

  return (
    <View style={[styles.profileHeroIdentityColumn, compact && styles.profileHeroIdentityColumnCompact]}>
      <View style={styles.profileHeroAvatarSlot}>
        <ProfileHeroAvatar
          user={user}
          size={avatarSize}
          onPress={onAvatarPress}
          showAddBadge={showAddBadge}
          uploading={avatarUploading}
        />
      </View>
      {meta}
    </View>
  );
}

/** Public profile header — centered @handle with back and optional more menu. */
export function ProfilePublicHeader({
  handle,
  onBack,
  onMore,
}: {
  handle: string;
  onBack: () => void;
  onMore?: () => void;
}) {
  return (
    <View style={styles.profileHomeHeader}>
      <AppCenteredHeader
        title={`@${handle}`}
        onBack={onBack}
        trailing={onMore ? (
          <AppHeaderIconButton name="more" onPress={onMore} accessibilityLabel="More options" />
        ) : undefined}
      />
    </View>
  );
}

/** Public profile hero — read-only avatar ring, name, bio, location, trust badges. */
export function ProfilePublicHero({
  user,
  trust,
}: {
  user: User;
  trust: ProfileTrust;
}) {
  const showTrust = trust.status !== 'good';

  return (
    <View style={styles.profileOwnerHero}>
      <ProfileHeroIdentity
        user={user}
        trustBadge={showTrust ? (
          <View style={styles.publicHeroBadgesBand}>
            <ProfileTrustBadge trust={trust} />
          </View>
        ) : null}
      />
    </View>
  );
}

/** Public profile hero band — identity left, stats right (above drawer). */
export function ProfilePublicHeroBand({
  user,
  trust,
  ownerId,
  postsCount,
  stats,
  contentTab,
  onStatPress,
  onFollowingPress,
  adoptedMissedCount = 0,
}: {
  user: User;
  trust: ProfileTrust;
  ownerId: string;
  postsCount: number;
  stats: ProfileImpactStats;
  contentTab: ProfileContentTab;
  onStatPress: (tab: ProfileContentTab) => void;
  onFollowingPress?: () => void;
  adoptedMissedCount?: number;
}) {
  const showTrust = trust.status !== 'good';

  return (
    <View style={styles.profileHeroBand}>
      <ProfileHeroPrimaryRow
        user={user}
        trustBadge={showTrust ? (
          <View style={styles.publicHeroBadgesBandInline}>
            <ProfileTrustBadge trust={trust} />
          </View>
        ) : undefined}
        postsCount={postsCount}
        stats={stats}
        contentTab={contentTab}
        onStatPress={onStatPress}
        onFollowingPress={onFollowingPress}
        adoptedMissedCount={adoptedMissedCount}
        treatSlot={<ProfilePublicTreatsStatCell ownerId={ownerId} compact />}
        showOnlineIndicator
      />
    </View>
  );
}

/** Public profile stats — Posts / Following primary row + impact secondary stats. */
export function ProfilePublicStatsSection({
  ownerId,
  postsCount,
  stats,
  contentTab,
  onStatPress,
  onFollowingPress,
  adoptedMissedCount = 0,
}: {
  ownerId: string;
  postsCount: number;
  stats: ProfileImpactStats;
  contentTab: ProfileContentTab;
  onStatPress: (tab: ProfileContentTab) => void;
  onFollowingPress?: () => void;
  adoptedMissedCount?: number;
}) {
  return (
    <ProfileOwnerStatsBlock
      postsCount={postsCount}
      stats={stats}
      contentTab={contentTab}
      onStatPress={onStatPress}
      onFollowingPress={onFollowingPress}
      adoptedMissedCount={adoptedMissedCount}
      endSlot={<ProfilePublicTreatsStatCell ownerId={ownerId} />}
    />
  );
}

/** Public profile action buttons — message and add to circle. */
export function ProfilePublicActions({
  onMessage,
  onAddToCircle,
  messageLoading = false,
  showAddToCircle = true,
}: {
  onMessage: () => void;
  onAddToCircle: () => void;
  messageLoading?: boolean;
  showAddToCircle?: boolean;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.publicActions}>
      <Pressable
        onPress={onMessage}
        disabled={messageLoading}
        style={({ pressed }) => [
          styles.publicActionBtn,
          styles.publicActionBtnPrimary,
          { backgroundColor: colors.primary, opacity: pressed || messageLoading ? 0.7 : 1 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={messageLoading ? 'Opening message' : 'Send message'}
      >
        <Icon name="send" size={15} color="#fff" />
        <Text style={styles.publicActionBtnLabelPrimary}>
          {messageLoading ? 'Opening…' : 'Message'}
        </Text>
      </Pressable>
      {showAddToCircle ? (
      <Pressable
        onPress={onAddToCircle}
        style={({ pressed }) => [
          styles.publicActionBtn,
          styles.publicActionBtnSoft,
          {
            backgroundColor: colors.surface2,
            borderColor: colors.border,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Add to circle"
      >
        <Icon name="plus" size={15} color={colors.text} />
        <Text style={[styles.publicActionBtnLabelSoft, { color: colors.text }]}>Add to circle</Text>
      </Pressable>
      ) : null}
    </View>
  );
}


/** My Profile hero — avatar and identity. */
export function ProfileOwnerHero({
  user,
  onAvatarPress,
}: {
  user: User;
  onAvatarPress?: () => void;
}) {
  return (
    <View style={styles.profileOwnerHero}>
      <ProfileHeroIdentity
        user={user}
        onAvatarPress={onAvatarPress}
        showAddBadge={!!onAvatarPress}
        identitySize="compact"
      />
    </View>
  );
}

/** My Profile hero band — identity left, stats right (above drawer). */
export function ProfileOwnerHeroBand({
  user,
  onAvatarPress,
  postsCount,
  stats,
  contentTab,
  onStatPress,
  onFollowingPress,
  adoptedMissedCount = 0,
}: {
  user: User;
  onAvatarPress?: () => void;
  postsCount: number;
  stats: ProfileImpactStats;
  contentTab: ProfileContentTab;
  onStatPress: (tab: ProfileContentTab) => void;
  onFollowingPress: () => void;
  adoptedMissedCount?: number;
}) {
  return (
    <View style={styles.profileHeroBand}>
      <ProfileHeroPrimaryRow
        user={user}
        onAvatarPress={onAvatarPress}
        showAddBadge={!!onAvatarPress}
        identitySize="compact"
        postsCount={postsCount}
        stats={stats}
        contentTab={contentTab}
        onStatPress={onStatPress}
        onFollowingPress={onFollowingPress}
        adoptedMissedCount={adoptedMissedCount}
        treatSlot={<TreatWalletStatCell compact />}
      />
    </View>
  );
}

/** My Profile stats — Posts / Following / Adopted inside the drawer panel. */
export function ProfileOwnerStatsSection({
  postsCount,
  stats,
  contentTab,
  onStatPress,
  onFollowingPress,
  adoptedMissedCount = 0,
}: {
  postsCount: number;
  stats: ProfileImpactStats;
  contentTab: ProfileContentTab;
  onStatPress: (tab: ProfileContentTab) => void;
  onFollowingPress: () => void;
  adoptedMissedCount?: number;
}) {
  return (
    <ProfileOwnerStatsBlock
      postsCount={postsCount}
      stats={stats}
      contentTab={contentTab}
      onStatPress={onStatPress}
      onFollowingPress={onFollowingPress}
      adoptedMissedCount={adoptedMissedCount}
      endSlot={<TreatWalletStatCell />}
    />
  );
}

const webInputOutline = Platform.select({ web: { outlineStyle: 'none' } as object, default: {} });

function ProfileHeroLocationLine({
  location,
  placeholder = 'City or neighbourhood',
  editing = false,
  onLocationChange,
  align = 'center',
}: {
  location: string;
  placeholder?: string;
  editing?: boolean;
  onLocationChange?: (v: string) => void;
  align?: 'center' | 'start';
}) {
  const { colors } = useTheme();
  const display = location.trim();
  const textColor = display ? colors.textSecondary : colors.textTertiary;

  return (
    <View style={[
      styles.heroLocationBlock,
      align === 'start' && styles.heroLocationBlockStart,
    ]}>
      <Icon name="mapPin" size={12} color={colors.textSecondary} sw={2.2} />
      {editing && onLocationChange ? (
        <TextInput
          value={location}
          onChangeText={onLocationChange}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          style={[
            styles.heroLocationText,
            { color: colors.text, flex: 1 },
            webInputOutline,
          ]}
        />
      ) : (
        <Text
          style={[styles.heroLocationText, { color: textColor }]}
          numberOfLines={1}
        >
          {display || 'Your city or neighbourhood'}
        </Text>
      )}
    </View>
  );
}

/** Settings hero — identity rail (view) or avatar + edit form (edit). */
export function ProfileSettingsHero({
  user,
  name,
  handle,
  bio,
  location,
  editing,
  onToggleEdit,
  onNameChange,
  onHandleChange,
  onBioChange,
  onLocationChange,
  onAvatarPress,
  avatarUploading = false,
}: {
  user: User;
  name: string;
  handle: string;
  bio: string;
  location: string;
  editing: boolean;
  onToggleEdit: () => void;
  onNameChange: (v: string) => void;
  onHandleChange: (v: string) => void;
  onBioChange: (v: string) => void;
  onLocationChange: (v: string) => void;
  onAvatarPress: () => void;
  avatarUploading?: boolean;
}) {
  const { colors } = useTheme();
  const locationPlaceholder = 'City or neighbourhood';

  const avatarSlot = (
    <ProfileHeroAvatar
      user={user}
      size={PROFILE_HERO_AVATAR_SIZE}
      onPress={onAvatarPress}
      showAddBadge
      uploading={avatarUploading}
    />
  );

  return (
    <View style={[styles.profileSettingsHero, editing && styles.profileSettingsHeroEditing]}>
      <Pressable
        onPress={onToggleEdit}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={editing ? 'Done editing profile' : 'Edit profile'}
        style={({ pressed }) => [
          styles.settingsHeroEditBtn,
          pressed && { opacity: 0.65 },
        ]}
      >
        {editing ? (
          <Text style={[styles.settingsHeroEditDone, { color: colors.primary }]}>Done</Text>
        ) : (
          <Icon name="edit" size={22} color={colors.textSecondary} sw={2.2} />
        )}
      </Pressable>

      <View style={styles.settingsHeroBody}>
        {editing ? (
          <>
            <ProfileIdentityRail mode="avatarOnly" avatarSlot={avatarSlot} />
            <ProfileSettingsEditForm
              name={name}
              handle={handle}
              bio={bio}
              location={location}
              locationPlaceholder={locationPlaceholder}
              onNameChange={onNameChange}
              onHandleChange={onHandleChange}
              onBioChange={onBioChange}
              onLocationChange={onLocationChange}
            />
          </>
        ) : (
          <ProfileIdentityRail
            mode="display"
            name={user.name}
            userId={user.id}
            bio={bio}
            location={location}
            avatarSlot={avatarSlot}
          />
        )}
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

export function buildProfileStatRowItems(
  stats: ProfileImpactStats,
  onStatPress?: (tab: ProfileContentTab) => void,
  onFollowingPress?: () => void,
): StatItem[] {
  const items: StatItem[] = [
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
  if (onFollowingPress) {
    items.push({
      value: stats.following,
      label: 'Following',
      onPress: onFollowingPress,
    });
  }
  return items;
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

const BASE_PROFILE_CONTENT_TABS: { id: ProfileContentTab; icon: string; label: string }[] = [
  { id: 'posts', icon: 'grid', label: 'Posts' },
  { id: 'rescues', icon: 'shield', label: 'Rescues' },
  { id: 'adoptions', icon: 'repeat', label: 'Rehomed' },
  { id: 'adopted', icon: 'heart', label: 'Adopted' },
];

const LOST_TAB = { id: 'lost' as ProfileContentTab, icon: 'flag', label: 'Lost' };

export function ProfileAdopterTrustStrip({ summary }: { summary: AdopterTrustSummary }) {
  const { colors } = useTheme();

  if (summary.badge === 'new') return null;

  const badgeColors = {
    trusted: { bg: colors.successBg, text: colors.success, icon: 'shield' as const },
    active: { bg: colors.infoBg, text: colors.primary, icon: 'heart' as const },
    new: { bg: colors.neutralBg, text: colors.textSecondary, icon: 'paw' as const },
    update_pending: { bg: colors.warningBg, text: colors.warning, icon: 'alert' as const },
    recommended: { bg: colors.successBg, text: colors.success, icon: 'heart' as const },
    not_recommended: { bg: colors.dangerBg, text: colors.danger, icon: 'alert' as const },
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
  const posterProfile = useUserProfile(record.posterId);
  const speciesLabel = record.species === 'cat' ? 'Cat' : record.species === 'dog' ? 'Dog' : record.species;
  const update = publicUpdateLine(record);
  const endorsementUpdate = getLatestPosterEndorsementUpdate(record);
  const recommendation = getPosterRecommendation(record);
  const posterHandle = posterProfile?.handle ?? record.posterId.slice(0, 8);
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
  const posterProfile = useUserProfile(record.posterId);
  const adopterProfile = useUserProfile(record.adopterId);
  const poster = posterProfile ?? { id: record.posterId, name: 'Poster', tint: colors.primary };
  const adopter = adopterProfile ?? { id: record.adopterId, name: 'Adopter', tint: record.tint };
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
          <Avatar user={poster ?? { name: 'Poster', tint: colors.primary }} size={22} />
          <Text style={[styles.confirmText, { color: colors.textSecondary }]}>
            Confirmed with @{posterProfile?.handle ?? record.posterId.slice(0, 8)}
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
  const adopterProfile = useUserProfile(record.adopterId);
  const adopter = adopterProfile ?? { id: record.adopterId, name: 'Adopter', tint: record.tint };

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
            {record.confirmedAt} · @{adopterProfile?.handle ?? record.adopterId.slice(0, 8)}
          </Text>
          <View style={styles.confirmRow}>
            <Avatar user={adopter} size={20} />
            <Text style={[styles.confirmText, { color: colors.textTertiary }]}>{record.newHome ?? 'In new home'}</Text>
          </View>
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
const PROFILE_TAB_ICON_SIZE = 28;

export { PROFILE_TAB_ICON_SIZE };

export function ProfileContentTabs({
  value,
  onChange,
  tabAlerts,
  showLostTab,
}: {
  value: ProfileContentTab;
  onChange: (tab: ProfileContentTab) => void;
  /** e.g. missed check-in count on Adopted tab (public profile). */
  tabAlerts?: Partial<Record<ProfileContentTab, number>>;
  showLostTab?: boolean;
}) {
  const { colors } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const [rowWidth, setRowWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;

  const PROFILE_CONTENT_TABS = showLostTab
    ? [...BASE_PROFILE_CONTENT_TABS, LOST_TAB]
    : BASE_PROFILE_CONTENT_TABS;

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
            accessibilityLabel={alertCount > 0 ? `${tab.label}, ${alertCount} check-ins due` : tab.label}
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

/** Icon-only underline tabs for My Profile content — Posts, Rescues, Rehomed, Adopted. */
export function ProfileOwnerContentTabs({
  value,
  onChange,
  tabAlerts,
  showLostTab,
  alertsTabLabel,
}: {
  value: ProfileContentTab;
  onChange: (tab: ProfileContentTab) => void;
  tabAlerts?: Partial<Record<ProfileContentTab, number>>;
  showLostTab?: boolean;
  /** Label for the flagged lost/found tab (defaults to Lost). */
  alertsTabLabel?: string;
}) {
  const { colors } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const [rowWidth, setRowWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;

  const tabs = useMemo(() => {
    const alertTab = alertsTabLabel
      ? { ...LOST_TAB, label: alertsTabLabel }
      : LOST_TAB;
    const list = showLostTab
      ? [...BASE_PROFILE_CONTENT_TABS, alertTab]
      : BASE_PROFILE_CONTENT_TABS;
    return list;
  }, [showLostTab, alertsTabLabel]);

  const activeIndex = Math.max(0, tabs.findIndex(t => t.id === value));
  const segmentW = rowWidth > 0 ? rowWidth / tabs.length : 0;
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
        styles.ownerContentTabs,
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
      {tabs.map(tab => {
        const active = value === tab.id;
        const alertCount = tabAlerts?.[tab.id] ?? 0;
        const tone = active ? colors.primary : colors.textTertiary;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            accessibilityRole="tab"
            accessibilityLabel={alertCount > 0 ? `${tab.label}, ${alertCount} check-ins due` : tab.label}
            accessibilityState={active ? { selected: true } : {}}
            style={styles.ownerContentTabBtn}
          >
            <View style={styles.contentTabIconWrap}>
              <Icon
                name={tab.icon}
                size={PROFILE_TAB_ICON_SIZE}
                color={tone}
                sw={active ? 2.2 : 1.7}
                fill={tab.id === 'adopted' && active ? tone : 'none'}
              />
              {alertCount > 0 ? (
                <View style={[styles.ownerContentTabBadge, { backgroundColor: colors.warning }]}>
                  <Text style={styles.ownerContentTabBadgeText}>
                    {alertCount > 9 ? '9+' : alertCount}
                  </Text>
                </View>
              ) : tab.id === 'lost' && showLostTab ? (
                <View style={[styles.ownerContentTabDot, { backgroundColor: colors.warning }]} />
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const COMPANION_CHIP_WIDTH = 72;
const COMPANION_AVATAR_SIZE = 56;
const COMPANION_HEADER_ADD_SIZE = 18;

/** Read-only companions strip for public profiles. */
export function ProfilePublicCompanionsSection({
  companions,
  onSelect,
}: {
  companions: Companion[];
  onSelect: (id: string) => void;
}) {
  const { colors } = useTheme();

  if (companions.length === 0) return null;

  return (
    <View style={styles.companionsSection}>
      <View style={styles.companionsInlineRow}>
        <Text style={[styles.companionsSectionLabel, { color: colors.textTertiary }]}>
          Companions
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.companionsChipsScroll}
          contentContainerStyle={styles.companionsChipsScrollContent}
        >
          {companions.map(companion => (
            <View
              key={companion.id}
              style={[styles.companionChip, { width: COMPANION_CHIP_WIDTH }]}
            >
              <Pressable
                onPress={() => onSelect(companion.id)}
                accessibilityRole="button"
                accessibilityLabel={`View ${companion.name}'s profile`}
                style={({ pressed }) => [
                  styles.companionChipContent,
                  pressed && { opacity: 0.75 },
                ]}
              >
                <CompanionAvatar companion={companion} size={COMPANION_AVATAR_SIZE} />
                <Text style={[styles.companionChipName, { color: colors.text }]} numberOfLines={1}>
                  {companion.name}
                </Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

function CompanionHeaderAddButton({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();
  const size = COMPANION_HEADER_ADD_SIZE;
  const iconSize = 10;

  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel="Add pet"
      style={({ pressed }) => [
        styles.companionsHeaderAddBtn,
        pressed && { opacity: 0.75 },
      ]}
    >
      <View
        style={[
          styles.companionsHeaderAddCircle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors.primary,
          },
        ]}
      >
        <Icon name="plus" size={iconSize} color="#fff" sw={2.8} />
      </View>
    </Pressable>
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
  const [removeTarget, setRemoveTarget] = useState<Companion | null>(null);

  const toggleEdit = () => {
    setEditing(prev => !prev);
  };

  const confirmRemove = () => {
    if (!removeTarget) return;
    onRemove(removeTarget.id);
    setRemoveTarget(null);
    if (companions.length <= 1) setEditing(false);
  };

  return (
    <View style={styles.companionsSection}>
      <ConfirmDialog
        visible={!!removeTarget}
        title={removeTarget ? `Remove ${removeTarget.name}?` : ''}
        body={removeTarget
          ? `${removeTarget.name}'s companion page will be deleted from your profile, along with any posts on their page. This can't be undone.`
          : ''}
        confirmLabel="Remove"
        cancelLabel="Keep"
        destructive
        onConfirm={confirmRemove}
        onCancel={() => setRemoveTarget(null)}
      />
      <View style={styles.companionsInlineRow}>
        <Text style={[styles.companionsSectionLabel, { color: colors.textTertiary }]}>
          Companions
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.companionsChipsScroll}
          contentContainerStyle={styles.companionsChipsScrollContent}
        >
          {companions.map(companion => (
            <View
              key={companion.id}
              style={[styles.companionChip, { width: COMPANION_CHIP_WIDTH }]}
            >
              {editing ? (
                <View style={styles.companionChipContent}>
                  <View style={styles.companionAvatarWrap}>
                    <CompanionAvatar companion={companion} size={COMPANION_AVATAR_SIZE} />
                    <Pressable
                      onPress={() => setRemoveTarget(companion)}
                      hitSlop={6}
                      style={[styles.companionRemoveBtn, { backgroundColor: colors.danger, borderColor: colors.surface }]}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${companion.name}`}
                    >
                      <Icon name="close" size={9} color={colors.onAccent} sw={2.5} />
                    </Pressable>
                  </View>
                  <Text style={[styles.companionChipName, { color: colors.text }]} numberOfLines={1}>
                    {companion.name}
                  </Text>
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
                  <CompanionAvatar companion={companion} size={COMPANION_AVATAR_SIZE} />
                  <Text style={[styles.companionChipName, { color: colors.text }]} numberOfLines={1}>
                    {companion.name}
                  </Text>
                </Pressable>
              )}
            </View>
          ))}
          {!editing ? (
            <View style={styles.companionAddInline}>
              <CompanionHeaderAddButton onPress={onAdd} />
            </View>
          ) : null}
        </ScrollView>
        {companions.length > 0 ? (
          <Pressable
            onPress={toggleEdit}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={editing ? 'Done editing companions' : 'Edit companions'}
            style={({ pressed }) => [
              styles.companionsEditBtn,
              pressed && { opacity: 0.65 },
            ]}
          >
            {editing ? (
              <Text style={[styles.companionsEditDone, { color: colors.primary }]}>Done</Text>
            ) : (
              <Icon name="edit" size={20} color={colors.textSecondary} sw={2.2} />
            )}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const GRID_GAP = 3;
const GRID_COLS = 3;

/** Lost/found alerts use the flag tab; adoption listings live in Adoption hub / Rehomed. */
export function profileFeedPosts(posts: Post[]): Post[] {
  return posts.filter(p =>
    !p.companionAuthorId
    && p.label !== 'lost'
    && p.label !== 'found'
    && !isAdoptionTaggedPost(p),
  );
}

export function ProfilePostsFeed({
  posts,
  onCompanionPress,
  onToast,
  onUserPress,
  inset = false,
  emptyBody,
}: {
  posts: Post[];
  onCompanionPress?: (companionId: string) => void;
  onToast?: (t: ToastData) => void;
  onUserPress?: (userId: string) => void;
  /** True on public profile / padded containers — avoids full-bleed negative margins */
  inset?: boolean;
  /** Shown when every post is a lost/found alert (filtered out of this feed). */
  emptyBody?: string;
}) {
  const { colors } = useTheme();
  const { posts: feedPosts, setPosts, toggleSaved, togglePaw, persistForward, pawComment, addComment, deletePost, openComposerForEdit } = useFeedPosts();
  const { createdCircles, joinedCircles } = usePawCircles();
  const { joinedCommunities } = useCommunityGroups();
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [forwardPost, setForwardPost] = useState<Post | null>(null);
  const [localToast, setLocalToast] = useState<ToastData | null>(null);

  const commentPost = useMemo(
    () => (commentPostId ? feedPosts.find(p => p.id === commentPostId) ?? null : null),
    [commentPostId, feedPosts],
  );
  const latchedCommentPostRef = useRef<Post | null>(null);
  if (commentPost) latchedCommentPostRef.current = commentPost;
  const commentSheetPost = commentPost ?? latchedCommentPostRef.current;

  const handleCommentAuthorPress = useCallback((userId: string) => {
    onUserPress?.(userId);
  }, [onUserPress]);

  const showToast = (t: ToastData) => {
    if (onToast) onToast(t);
    else setLocalToast(t);
  };

  const handleSave = (id: string) => {
    const nowSaved = toggleSaved(id);
    showToast({
      msg: nowSaved ? 'Saved to your collection' : 'Removed from saved',
      icon: 'bookmark',
      tone: 'primary',
    });
  };

  const completeForward = (dests: ForwardDest[], note?: string) => {
    if (!forwardPost || dests.length === 0) return;
    setPosts(ps => ps.map(p => (
      p.id === forwardPost.id ? { ...p, forwards: p.forwards + dests.length } : p
    )));
    persistForward(forwardPost.id, dests, forwardPost.text, forwardPost.label, note);
    setForwardPost(null);
    const label = dests.map(d => d.label).join(', ');
    showToast({ msg: `Shared to ${label}`, icon: 'forward', tone: 'success' });
  };

  const visiblePosts = profileFeedPosts(posts);

  if (visiblePosts.length === 0) {
    return (
      <Empty
        icon="grid"
        title="No posts yet"
        body={emptyBody}
      />
    );
  }

  return (
    <>
      <View style={inset ? styles.postsFeedInset : styles.postsFeed}>
        {visiblePosts.map((post, i) => {
          const live = feedPosts.find(p => p.id === post.id) ?? post;
          const isAlert = false;
          return (
          <View key={post.id}>
            <FeedPostItem
              post={live}
              compact={inset}
              isOwner
              onPaw={() => togglePaw(post.id)}
              onSave={() => handleSave(post.id)}
              onComments={() => setCommentPostId(post.id)}
              onForward={() => setForwardPost(live)}
              onUserPress={onUserPress}
              onCompanionPress={onCompanionPress}
              onEdit={() => openComposerForEdit(live)}
              onDelete={() => {
                deletePost(live.id);
                showToast({ msg: 'Post deleted', icon: 'check', tone: 'success' });
              }}
              onToast={showToast}
            />
            {i < visiblePosts.length - 1 && (
              <View style={[styles.postsFeedDivider, inset && styles.postsFeedDividerInset, { backgroundColor: colors.border }]} />
            )}
          </View>
          );
        })}
      </View>

      {commentSheetPost && (
        <FeedCommentSheet
          visible={!!commentPostId}
          post={commentSheetPost}
          createdCircles={createdCircles}
          joinedCircles={joinedCircles}
          onClose={() => setCommentPostId(null)}
          onSubmit={(text, replyToThreadIndex) =>
            addComment(commentSheetPost.id, text, { replyToThreadIndex })
          }
          onCommentPaw={threadIndex => pawComment(commentSheetPost.id, threadIndex)}
          onToast={showToast}
          onAuthorPress={handleCommentAuthorPress}
        />
      )}

      {forwardPost && (
        <ForwardSheet
          visible
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
  const postAuthorProfile = useUserProfile(comment.postAuthorId);
  const postAuthorName = postAuthorProfile?.name ?? 'their';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ opacity: pressed ? 0.82 : 1 }]}
      accessibilityRole="button"
      accessibilityLabel={`Open ${postAuthorName}'s post. Your comment: ${comment.text}`}
    >
      <View style={styles.commentActivityItem}>
        <View style={styles.commentActivityRailRow}>
          <View style={[styles.commentActivityRailBar, { backgroundColor: colors.primary }]} />
          <View style={styles.commentActivityBody}>
            <View style={styles.commentActivityHeader}>
              <Text
                style={[styles.commentActivityKicker, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {postAuthorName}&apos;s post
              </Text>
              <View style={styles.commentActivityHeaderEnd}>
                <Text style={[styles.commentActivityTime, { color: colors.textTertiary }]}>
                  {comment.time}
                </Text>
                <Icon name="chevronRight" size={14} color={colors.textTertiary} sw={2} />
              </View>
            </View>
            <Text
              style={[styles.commentActivityPostPreview, { color: colors.text }]}
              numberOfLines={2}
            >
              {comment.postText}
            </Text>
            <View style={styles.commentActivityReplyRow}>
              <Text style={[styles.commentActivityYouLabel, { color: colors.primary }]}>You</Text>
              <Text style={[styles.commentActivityReplyDot, { color: colors.textTertiary }]}>·</Text>
              <Text
                style={[styles.commentActivityText, { color: colors.textSecondary }]}
                numberOfLines={2}
              >
                {comment.text}
              </Text>
              {comment.isReply ? (
                <Text style={[styles.commentActivityReplyTag, { color: colors.textTertiary }]}>
                  Reply
                </Text>
              ) : null}
            </View>
          </View>
        </View>
      </View>
      {!isLast && <View style={[styles.commentActivityDivider, { backgroundColor: colors.border }]} />}
    </Pressable>
  );
}

export function ProfileCommentsFeed({
  comments,
  onOpenPost,
}: {
  comments: UserFeedComment[];
  onOpenPost?: (comment: UserFeedComment) => void;
}) {
  return (
    <View style={styles.commentActivityFeed}>
      {comments.map((comment, i) => (
        <ProfileCommentActivityItem
          key={comment.id}
          comment={comment}
          isLast={i === comments.length - 1}
          onPress={() => onOpenPost?.(comment)}
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
  onOpenListing,
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
  onOpenListing?: (listingId: string) => void;
  onAdoptedUpdateSubmitted?: (record: AdoptionRecord) => void;
}) {
  const { width } = useWindowDimensions();
  const contentWidth = width - 32;
  const cellSize = (contentWidth - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS;

  const isPublic = viewMode === 'public';

  if (tab === 'posts') {
    const feedPosts = profileFeedPosts(posts);
    if (feedPosts.length === 0) {
      return (
        <Empty
          icon="grid"
          title="No posts yet"
          body={
            isPublic
              ? undefined
              : 'Share updates from the feed. Lost & found alerts appear under the flag tab.'
          }
        />
      );
    }
    return (
      <ProfilePostsFeed
        posts={feedPosts}
        inset={isPublic}
        onCompanionPress={onCompanionPress}
        onUserPress={onUserPress}
        onToast={onToast}
        emptyBody={
          isPublic
            ? undefined
            : 'Share updates from the feed. Lost & found alerts appear under the flag tab.'
        }
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

  if (tab === 'adoptions' || tab === 'lost') {
    return null;
  }

  if (tab === 'adopted') {
    if (isPublic) {
      return (
        <ProfileAdoptedShowcase
          incoming={incomingAdopted ?? []}
          viewMode="public"
          onOpenRecord={onOpenAdopted}
          onOpenListing={onOpenListing}
        />
      );
    }
    return (
      <AdoptedRecordsPanel
        userId={profileUserId}
        onOpenRecord={onOpenAdopted}
        onOpenListing={onOpenListing}
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

export const PROFILE_HANDLE_HEADER_ROW_MIN_HEIGHT =
  APP_HEADER_PADDING_TOP + APP_HEADER_BACK_SIZE + APP_HEADER_PADDING_BOTTOM;

export { PROFILE_DRAWER_EDGE_INSET };

const styles = StyleSheet.create({
  profileScreenCanvas: {
    flex: 1,
    flexDirection: 'column',
    alignSelf: 'stretch',
    width: '100%',
  },
  profileScreenCanvasGradient: {
    zIndex: 0,
  },
  profileScreenCanvasContent: {
    flex: 1,
    zIndex: 1,
    width: '100%',
  },
  profileScreenGlow: {
    ...StyleSheet.absoluteFill,
    height: '48%',
    zIndex: 0,
  },
  profileHomeHeader: {
    alignSelf: 'stretch',
    backgroundColor: 'transparent',
  },
  contentDrawer: {
    marginTop: spacing.md,
    marginHorizontal: -PROFILE_DRAWER_EDGE_INSET,
    alignSelf: 'stretch',
    borderTopLeftRadius: radius.xl2,
    borderTopRightRadius: radius.xl2,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    overflow: 'hidden',
  },
  contentDrawerFillParent: {
    flex: 1,
  },
  contentDrawerScroll: Platform.select({
    web: {
      flex: 1,
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
    },
    default: {
      flex: 1,
    },
  }),
  contentDrawerInner: {
    paddingHorizontal: PROFILE_DRAWER_EDGE_INSET,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  bellBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    pointerEvents: 'none',
  },
  bellBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
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
    paddingBottom: spacing.xs,
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
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  heroLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroLocationAfterBio: {
    paddingTop: spacing.xs,
  },
  heroBio: {
    fontSize: 12,
    lineHeight: 17,
  },
  heroTrustWrap: { alignSelf: 'flex-start' },
  profileOwnerHero: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: 4,
    paddingBottom: spacing.xs,
  },
  profileOwnerHeroLight: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  profileHeroBand: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: spacing.xs,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    marginHorizontal: PROFILE_HERO_BAND_NUDGE_H,
    width: '100%',
  },
  profileHeroIdentityColumn: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    alignSelf: 'stretch',
    gap: PROFILE_HERO_AVATAR_TEXT_GAP,
    maxWidth: '100%',
    minWidth: 0,
  },
  profileHeroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    alignSelf: 'stretch',
    gap: PROFILE_HERO_IDENTITY_GAP,
    maxWidth: '100%',
    minWidth: 0,
  },
  profileHeroIdentityColumnCompact: {
    gap: spacing.sm,
  },
  profileHeroIdentityColumnMetaOnly: {
    alignItems: 'center',
    alignSelf: 'center',
    maxWidth: '100%',
    width: '100%',
  },
  profileHeroIdentityMetaOnly: {
    alignItems: 'center',
  },
  profileHeroAvatarSlot: {
    flexShrink: 0,
  },
  profileHeroIdentityMeta: {
    flexShrink: 1,
    gap: spacing.xs,
    minWidth: 0,
    alignItems: 'center',
    paddingTop: 0,
  },
  profileHeroIdentityMetaBesideAvatar: {
    alignItems: 'flex-start',
  },
  profileHeroIdentityMetaCompact: {
    gap: 2,
  },
  profileHeroMetaWithStats: {
    flex: 1,
    minWidth: 0,
    alignItems: 'stretch',
    gap: spacing.xs,
  },
  profileHeroStatsStack: {
    height: PROFILE_HERO_AVATAR_SIZE,
    justifyContent: 'center',
    alignItems: 'stretch',
    gap: spacing.sm,
  },
  profileHeroBandName: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    textAlign: 'center',
    flexShrink: 1,
  },
  profileHeroBandNameCompact: {
    ...typography.heroName,
    textAlign: 'left',
    flexShrink: 1,
  },
  profileHeroBandNameRow: {
    alignSelf: 'center',
    justifyContent: 'center',
    maxWidth: '100%',
  },
  profileHeroBandNameBesideAvatar: {
    textAlign: 'left',
  },
  profileHeroBandNameRowBesideAvatar: {
    alignSelf: 'flex-start',
    justifyContent: 'flex-start',
  },
  publicHeroBadgesBand: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  publicHeroBadgesBandInline: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: spacing.xs,
    alignSelf: 'flex-start',
  },
  ownerStatsSection: {
    alignItems: 'center',
    gap: spacing.xs,
    width: '100%',
    paddingBottom: spacing.sm,
  },
  ownerHeroIdentityDetails: {
    alignItems: 'center',
    gap: spacing.xs,
    width: '100%',
    paddingHorizontal: spacing.sm,
    marginTop: spacing.sm,
  },
  ownerHeroName: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.45,
    textAlign: 'center',
  },
  ownerHeroNameRow: {
    alignSelf: 'center',
    justifyContent: 'center',
  },
  ownerHeroBio: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 320,
    alignSelf: 'center',
    width: '100%',
  },
  publicHeroBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.xs,
  },
  publicActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: spacing.xs,
  },
  publicActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radius.full,
  },
  publicActionBtnPrimary: {},
  publicActionBtnSoft: { borderWidth: StyleSheet.hairlineWidth },
  publicActionBtnLabelPrimary: { fontSize: 14, fontWeight: '700', color: '#fff' },
  publicActionBtnLabelSoft: { fontSize: 14, fontWeight: '700' },
  heroLocationBlock: {
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginLeft: -6,
  },
  heroLocationBlockStart: {
    alignSelf: 'flex-start',
    justifyContent: 'flex-start',
    maxWidth: '100%',
  },
  heroLocationText: {
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    paddingVertical: 0,
    paddingHorizontal: 0,
    ...(Platform.OS === 'web'
      ? { borderWidth: 0, backgroundColor: 'transparent' }
      : null),
  },
  ownerHeroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 4,
    width: '100%',
    paddingHorizontal: spacing.xs,
    marginTop: spacing.sm,
  },
  profileSettingsHero: {
    alignSelf: 'stretch',
    alignItems: 'flex-start',
    width: '100%',
    position: 'relative',
    marginHorizontal: PROFILE_HERO_BAND_NUDGE_H,
    paddingTop: spacing.xs,
    paddingBottom: 0,
  },
  profileSettingsHeroEditing: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  settingsHeroBody: {
    alignSelf: 'stretch',
    width: '100%',
    gap: spacing.md,
  },
  settingsHeroEditBtn: {
    position: 'absolute',
    right: 0,
    top: 0,
    paddingVertical: 4,
    paddingLeft: 8,
    zIndex: 1,
  },
  settingsHeroEditDone: {
    fontSize: 14,
    fontWeight: '700',
  },
  avatarHeroWrap: {
    position: 'relative',
    flexShrink: 0,
  },
  avatarAddBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
  },
  ownerStatsOpen: {
    flexDirection: 'row',
    alignItems: 'stretch',
    width: '100%',
    maxWidth: 340,
    paddingVertical: 0,
  },
  ownerStatsOpenHeroBand: {
    alignSelf: 'stretch',
    width: '100%',
    maxWidth: '100%',
    justifyContent: 'flex-start',
    gap: spacing.sm,
  },
  ownerStatsCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  ownerStatsCellHeroBand: {
    flex: 1,
    minWidth: 44,
    paddingHorizontal: 0,
    paddingVertical: 0,
    alignItems: 'center',
  },
  ownerStatsValue: {
    ...typography.stat,
    fontSize: 20,
    letterSpacing: -0.35,
    fontWeight: '700',
  },
  ownerStatsValueHeroBand: {
    fontSize: 20,
    letterSpacing: -0.35,
    textAlign: 'center',
    alignSelf: 'stretch',
  },
  ownerStatsLabel: {
    ...typography.statLabel,
    fontSize: 12,
    letterSpacing: 0.15,
    textTransform: 'uppercase',
  },
  ownerStatsLabelHeroBand: {
    fontSize: 12,
    letterSpacing: 0.1,
    lineHeight: 15,
    textAlign: 'center',
    alignSelf: 'stretch',
    textTransform: 'none',
  },
  ownerSecondaryStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    gap: 6,
  },
  ownerSecondaryStatsRowStart: {
    justifyContent: 'flex-start',
  },
  ownerSecondaryStatsRowHeroBand: {
    justifyContent: 'center',
    alignSelf: 'stretch',
    width: '100%',
  },
  ownerSecondaryStatsRowEnd: {
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
  },
  ownerSecondaryStatPress: {
    flexShrink: 0,
  },
  ownerSecondaryStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  adoptedAlertChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  adoptedAlertChipText: {
    fontSize: 10.5,
    fontWeight: '700',
    lineHeight: 13,
  },
  ownerSecondaryStatText: {
    fontSize: 12.5,
    fontWeight: '500',
    lineHeight: 17,
    letterSpacing: -0.1,
  },
  ownerSecondaryStatValue: {
    fontWeight: '700',
  },
  ownerSecondaryStatDot: {
    fontSize: 12.5,
    fontWeight: '700',
    lineHeight: 17,
  },
  ownerContentTabs: {
    flexDirection: 'row',
    position: 'relative',
  },
  ownerContentTabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    paddingBottom: 12 + INDICATOR_H,
    minWidth: 0,
  },
  ownerContentTabBadge: {
    position: 'absolute',
    top: -5,
    right: -10,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  ownerContentTabBadgeText: {
    color: '#fff',
    fontSize: 8.5,
    fontWeight: '800',
    lineHeight: 10,
  },
  ownerContentTabDot: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
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
  companionsSection: {
    paddingTop: spacing.xs,
    paddingBottom: 0,
  },
  companionsInlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 12,
  },
  companionsChipsScroll: {
    flex: 1,
    minWidth: 0,
  },
  companionsChipsScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingRight: 2,
  },
  companionsHeaderAddBtn: {
    flexShrink: 0,
  },
  companionsHeaderAddCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  companionAddInline: {
    flexShrink: 0,
    height: COMPANION_AVATAR_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -4,
  },
  companionsSectionLabel: {
    ...typography.statLabel,
    fontSize: 11,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
    textAlign: 'left',
    flexShrink: 0,
  },
  companionsEditBtn: {
    flexShrink: 0,
    paddingVertical: 0,
    paddingLeft: 4,
  },
  companionsEditDone: { ...typography.caption, fontSize: 12, fontWeight: '600' },
  companionChip: { alignItems: 'center', flexShrink: 0, gap: 5 },
  companionChipContent: { alignItems: 'center', gap: 5, width: '100%' },
  companionAvatarWrap: { position: 'relative' },
  companionRemoveBtn: {
    position: 'absolute',
    bottom: 0,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  companionChipName: {
    ...typography.caption,
    fontSize: 12,
    lineHeight: 15,
    fontFamily: typography.title.fontFamily,
    textAlign: 'center',
    width: '100%',
  },
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
  commentActivityItem: { paddingVertical: 14 },
  commentActivityRailRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
  },
  commentActivityRailBar: {
    width: 2,
    borderRadius: 1,
    minHeight: 56,
  },
  commentActivityBody: {
    flex: 1,
    gap: 6,
  },
  commentActivityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  commentActivityHeaderEnd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
  },
  commentActivityKicker: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  commentActivityTime: {
    fontSize: 12,
    fontWeight: '500',
  },
  commentActivityPostPreview: {
    fontSize: 14.5,
    lineHeight: 21,
    fontWeight: '600',
    letterSpacing: -0.15,
  },
  commentActivityReplyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
  },
  commentActivityYouLabel: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  commentActivityReplyDot: {
    fontSize: 12,
    fontWeight: '700',
  },
  commentActivityText: {
    flexShrink: 1,
    fontSize: 13.5,
    lineHeight: 19,
    fontWeight: '500',
  },
  commentActivityReplyTag: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
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
