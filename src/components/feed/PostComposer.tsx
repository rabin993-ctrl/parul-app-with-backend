import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, Pressable, Image, TextInput, Modal, StyleSheet, ScrollView, Platform, InteractionManager, Keyboard,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, shadows, sheetLayout } from '../../theme/tokens';
import { webNoOutline } from '../../theme/webInput';
import { Avatar, CompanionAvatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Sheet } from '../ui/Sheet';
import { ModalPresent } from '../ui/ModalScrim';
import { PhotoSlot } from '../ui/PhotoSlot';
import { Icon } from '../icons/Icon';
import { ToastData } from '../ui/Toast';
import { usePawCircles } from '../../context/PawCircleContext';
import {
  MentionPicker, insertMentionToken, extractActiveMentionQuery,
} from '../MentionPicker';
import type { Post, PostTag, Companion, Community } from '../../data/mockData';
import { useCommunityGroups } from '../../context/CommunityGroupsContext';
import { useCompanions } from '../../context/CompanionContext';
import { useAuth } from '../../context/AuthContext';
import { useCurrentUserProfile } from '../../context/CurrentUserProfileContext';
import { GALLERY_CAPTION_MAX } from '../../utils/companionPostContent';
import {
  loadDefaultCompanionId,
  persistDefaultCompanionId,
  resolveDefaultCompanionId,
} from '../../lib/defaultCompanionStore';
import { useCommunityFeed } from '../../context/CommunityFeedContext';
import { useMediaPicker, type PickedAsset } from '../../hooks/useMediaPicker';
import { getDeviceCoordinates } from '../../lib/geolocation';
import type { GeoPoint } from '../../lib/geocode';
import {
  buildCommunityPostFromComposer,
  type CommunityComposerLabel,
} from '../../data/communityPosts';
import {
  type FeedPostDestination,
  toggleFeedDestination,
  formatFeedDestinationsLabel,
  splitComposerText,
} from '../../utils/composerDestinations';

const CATEGORY_LABEL_MAP: Record<string, string | null> = {
  rescue: 'rescue',
  adoption: 'adoption',
  lost: 'lost',
  found: 'found',
  discussion: 'discussion',
  meme: 'meme',
};

const TAG_MAP: Record<string, PostTag> = {
  discussion: 'discussion',
  adoption: 'adoption',
  rescue: 'rescue',
  lost: 'lost-found',
  found: 'lost-found',
  meme: 'meme',
};

const POST_TAG_OPTIONS: { id: string; label: string; icon: string; filled?: boolean }[] = [
  { id: 'discussion', label: 'Discussion', icon: 'comment' },
  { id: 'lost', label: 'Lost', icon: 'alert' },
  { id: 'found', label: 'Found', icon: 'check', filled: true },
  { id: 'rescue', label: 'Rescue', icon: 'shield' },
  { id: 'adoption', label: 'Adoption', icon: 'adoption', filled: true },
  { id: 'meme', label: 'Meme', icon: 'sparkle' },
];

/** Composer tag row — adoption opens the dedicated listing sheet and auto-tags the feed post. */
const COMPOSER_TAG_OPTIONS = POST_TAG_OPTIONS;

function PostDestinationModal({
  visible,
  selected,
  joinedCommunities,
  onClose,
  onApply,
}: {
  visible: boolean;
  selected: FeedPostDestination[];
  joinedCommunities: Community[];
  onClose: () => void;
  onApply: (dests: FeedPostDestination[]) => void;
}) {
  const { colors } = useTheme();
  const [draft, setDraft] = useState<FeedPostDestination[]>(selected);

  useEffect(() => {
    if (visible) setDraft(selected);
  }, [visible, selected]);

  const isSelected = (dest: FeedPostDestination) => (
    draft.some(d => (d.type === 'feed' && dest.type === 'feed') || (d.type === 'community' && dest.type === 'community' && d.id === dest.id))
  );

  const renderOption = ({
    key,
    icon,
    tint,
    title,
    subtitle,
    on,
    onPress,
  }: {
    key: string;
    icon: string;
    tint: string;
    title: string;
    subtitle: string;
    on: boolean;
    onPress: () => void;
  }) => (
    <View key={key}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.destOption, { opacity: pressed ? 0.7 : 1 }]}
      >
        <View style={[styles.destOptionIcon, { backgroundColor: tint + '18' }]}>
          <Icon name={icon} size={16} color={tint} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={[
              styles.destOptionTitle,
              { color: on ? tint : colors.text, fontWeight: on ? '700' : '600' },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text style={[styles.destOptionSub, { color: colors.textTertiary }]} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        {on && <Icon name="check" size={16} color={tint} />}
      </Pressable>
      <View style={[styles.destDivider, { backgroundColor: colors.border }]} />
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <ModalPresent onDismiss={onClose} style={styles.popupOverlay} animatedScale={false}>
        <View style={[styles.destModalCard, { backgroundColor: colors.surface }, shadows.md]}>
          <Text style={[styles.destModalTitle, { color: colors.text }]}>Post to</Text>
          <Text style={[styles.destModalSub, { color: colors.textSecondary }]}>
            Select one or more places
          </Text>

          <ScrollView style={styles.destList} showsVerticalScrollIndicator={false}>
            {renderOption({
              key: 'feed',
              icon: 'home',
              tint: colors.primary,
              title: 'Feed',
              subtitle: 'Visible on the main feed',
              on: isSelected({ type: 'feed' }),
              onPress: () => setDraft(prev => toggleFeedDestination(prev, { type: 'feed' })),
            })}

            {joinedCommunities.length > 0 && (
              <>
                <Text style={[styles.destSectionLabel, { color: colors.textTertiary }]}>Community</Text>
                {joinedCommunities.map(c => renderOption({
                  key: c.id,
                  icon: c.icon,
                  tint: c.tint,
                  title: c.name,
                  subtitle: `${c.members} members`,
                  on: isSelected({
                    type: 'community',
                    id: c.id,
                    label: c.name,
                    icon: c.icon,
                    tint: c.tint,
                  }),
                  onPress: () => setDraft(prev => toggleFeedDestination(prev, {
                    type: 'community',
                    id: c.id,
                    label: c.name,
                    icon: c.icon,
                    tint: c.tint,
                  })),
                }))}
              </>
            )}
          </ScrollView>

          <Button variant="primary" onPress={() => { onApply(draft); onClose(); }} style={{ marginTop: 8 }}>
            Done
          </Button>
        </View>
      </ModalPresent>
    </Modal>
  );
}

export type PostComposerOptions = {
  initialCompanionIds?: string[];
  initialCategory?: string | null;
  /** Post as this companion (e.g. opened from companion profile). */
  postAsCompanionId?: string;
  /** Companion profile: text update vs photo gallery. */
  companionContentMode?: 'update' | 'gallery';
  initialDestinations?: FeedPostDestination[];
  /** When set, prefer a community group over the main feed on open. */
  defaultDestination?: 'feed' | 'community';
  preferredCommunityGroupId?: string;
  /** Edit an existing feed post instead of creating a new one. */
  editPost?: Post;
  /** Called after a feed post is submitted (e.g. refresh companion profile grid). */
  onSuccess?: () => void;
};

const COMPOSER_TAG_ICON_SIZE = 16;
const MAX_FEED_PHOTOS = 2;
const PREVIEW_THUMB = 72;

const CompanionPicker = memo(function CompanionPicker({
  companions,
  tags,
  onToggle,
}: {
  companions: Companion[];
  tags: string[];
  onToggle: (id: string) => void;
}) {
  const { colors } = useTheme();
  if (companions.length === 0) return null;
  return (
    <View style={styles.sideLabelSection}>
      <Text style={[styles.sideLabel, styles.sideLabelWith, { color: colors.textTertiary }]}>With</Text>
      <View style={styles.companionPickRow}>
        {companions.map(c => {
          const on = tags.includes(c.id);
          return (
            <Pressable
              key={c.id}
              onPress={() => onToggle(c.id)}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={({ pressed }) => [
                styles.companionPick,
                Platform.OS === 'web' && styles.companionPickWeb,
                { opacity: pressed ? 0.75 : on ? 1 : 0.55 },
              ]}
            >
              <View style={styles.companionPickAvatar}>
                <CompanionAvatar pet={c} size={36} />
                {on && (
                  <View style={[styles.companionPickCheck, { backgroundColor: colors.primary }]}>
                    <Icon name="check" size={9} color={colors.onPrimary} sw={2.5} />
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.companionPickName,
                  { color: on ? colors.text : colors.textTertiary, fontWeight: on ? '700' : '500' },
                ]}
                numberOfLines={1}
              >
                {c.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
});

const TagPicker = memo(function TagPicker({
  activeLabel,
  onSelect,
  onOpenAdoptionListing,
}: {
  activeLabel: string;
  onSelect: (id: string) => void;
  onOpenAdoptionListing?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.sideLabelSection, { marginBottom: 14 }]}>
      <Text style={[styles.sideLabel, { color: colors.textTertiary }]}>Tag</Text>
      <View style={styles.tagPickRow}>
        {COMPOSER_TAG_OPTIONS.map(tag => {
          const selected = activeLabel === tag.id;
          return (
            <Pressable
              key={tag.id}
              onPress={() => {
                if (tag.id === 'adoption') {
                  onOpenAdoptionListing?.();
                  return;
                }
                onSelect(tag.id);
              }}
              style={[
                styles.labelChip,
                {
                  backgroundColor: selected ? colors.text : colors.surface2,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.labelChipIcon}>
                <Icon
                  name={tag.icon}
                  size={COMPOSER_TAG_ICON_SIZE}
                  sw={2}
                  color={selected ? colors.bg : colors.textSecondary}
                  fill={tag.filled || tag.icon === 'adoption'
                    ? (selected ? colors.bg : colors.textSecondary)
                    : 'none'}
                />
              </View>
              <Text
                style={[
                  styles.labelChipText,
                  { color: selected ? colors.bg : colors.textSecondary },
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {tag.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
});

function communityToDestination(group: Community): FeedPostDestination {
  return {
    type: 'community',
    id: group.id,
    label: group.name,
    icon: group.icon,
    tint: group.tint,
  };
}

function resolveInitialDestinations(
  options: PostComposerOptions,
  joinedCommunities: Community[],
  getCommunity: (id: string) => Community | undefined,
): FeedPostDestination[] {
  if (options.initialDestinations?.length) return options.initialDestinations;

  if (options.defaultDestination === 'community') {
    const preferred = options.preferredCommunityGroupId
      ? getCommunity(options.preferredCommunityGroupId)
      : undefined;
    const group = preferred ?? joinedCommunities[0];
    if (group) return [communityToDestination(group)];
  }

  return [{ type: 'feed' }];
}

function buildPost(params: {
  text: string;
  tags: string[];
  hasPhoto: boolean;
  imageCount?: number;
  destination: FeedPostDestination;
  postAsCompanionId?: string;
  label?: string | null;
  lostArea?: string;
  lostWhen?: string;
  lostContact?: string;
  alertLat?: number;
  alertLng?: number;
  companionLookup?: (id: string) => Companion | undefined;
  loc?: string;
  companionContentStyle?: 'update' | 'gallery';
}): Post {
  const lookup = params.companionLookup ?? (() => undefined);
  const pet = params.postAsCompanionId ? (lookup(params.postAsCompanionId) ?? null) : null;
  const taggedCompanions = pet ? [pet.id] : params.tags;
  const taggedNames = taggedCompanions.map(id => lookup(id)?.name).filter((n): n is string => !!n);
  const companionName = !pet && taggedNames.length > 0 ? taggedNames[0] : undefined;
  const companionSnapshots = !pet && taggedCompanions.length > 0
    ? taggedCompanions.map((id, i) => {
      const c = lookup(id);
      return {
        id,
        name: c?.name ?? taggedNames[i] ?? 'Pet',
        tint: c?.tint,
        avatarUrl: c?.avatarUrl,
        avatarFallbackUrl: c?.avatarFallbackUrl,
        avatarOriginalUrl: c?.avatarOriginalUrl,
      };
    })
    : undefined;
  const post: Post = {
    id: `p-${Date.now()}`,
    author: 'you',
    userId: 'you',
    companionAuthorId: pet?.id,
    companionAuthorName: pet?.name,
    companionAuthorTint: pet?.tint,
    companionAuthorAvatarUrl: pet?.avatarUrl,
    companions: taggedCompanions,
    companionName,
    companionNames: !pet && taggedNames.length > 0 ? taggedNames : undefined,
    companionSnapshots,
    time: 'Just now',
    loc: params.loc ?? 'Dhaka',
    circle: params.destination.type === 'community',
    text: params.text.trim(),
    images: params.imageCount ?? (params.hasPhoto ? 1 : 0),
    label: pet ? null : (params.label ?? null),
    tag: pet ? 'paw-posting' : (params.label ? (TAG_MAP[params.label] ?? 'discussion') : 'discussion'),
    paws: 0,
    reacted: false,
    comments: 0,
    forwards: 0,
    saved: false,
    threads: [],
  };

  if (params.companionContentStyle) {
    post.companionContentStyle = params.companionContentStyle;
  }

  if (!pet && params.label === 'lost') {
    post.lost = {
      kind: 'Lost pet',
      lastSeen: params.lostWhen?.trim() ?? '',
      area: params.lostArea?.trim() ?? '',
      phone: params.lostContact?.trim() || undefined,
      lat: params.alertLat,
      lng: params.alertLng,
      alertedCount: 0,
    };
  }

  if (!pet && params.label === 'found') {
    post.found = {
      area: params.lostArea?.trim() ?? '',
      foundAt: params.lostWhen?.trim() ?? '',
      phone: params.lostContact?.trim() || undefined,
      lat: params.alertLat,
      lng: params.alertLng,
      alertedCount: 0,
    };
  }

  return post;
}

export function PostComposer({
  visible,
  options,
  onClose,
  onSubmit,
  onUpdate,
  onToast,
  onOpenAdoptionListing,
}: {
  visible: boolean;
  options: PostComposerOptions;
  onClose: () => void;
  onSubmit: (post: Post) => void;
  onUpdate?: (postId: string, post: Post) => void;
  onToast: (t: ToastData) => void;
  onOpenAdoptionListing?: () => void;
}) {
  const { colors } = useTheme();
  const { createdCircles, joinedCircles } = usePawCircles();
  const { joinedCommunities, getCommunity } = useCommunityGroups();
  const { addPost: addCommunityPost } = useCommunityFeed();
  const { user } = useAuth();
  const { getMyCompanions } = useCompanions();
  const { me } = useCurrentUserProfile();
  const [text, setText] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const activeMentionQuery = useMemo(() => extractActiveMentionQuery(text), [text]);
  const mentionPickerOpen = activeMentionQuery !== null;
  const { pickImage, pickImages, takePhoto } = useMediaPicker();
  const [selectedPhotos, setSelectedPhotos] = useState<PickedAsset[]>([]);
  const [label, setLabel] = useState<string | null>(null);
  const [lostArea, setLostArea] = useState('');
  const [lostWhen, setLostWhen] = useState('');
  const [lostContact, setLostContact] = useState('');
  const [alertCoords, setAlertCoords] = useState<GeoPoint | null>(null);
  const [alertCoordsLoading, setAlertCoordsLoading] = useState(false);
  const [destinations, setDestinations] = useState<FeedPostDestination[]>([{ type: 'feed' }]);
  const [destinationPickerOpen, setDestinationPickerOpen] = useState(false);
  const inputRef = useRef<TextInput>(null);


  const myDbCompanions = useMemo(() => {
    const list = user ? getMyCompanions(user.id) : [];
    const seen = new Set<string>();
    return list.filter(c => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  }, [getMyCompanions, user?.id]);

  const myCompanionIds = useMemo(
    () => myDbCompanions.map(c => c.id),
    [myDbCompanions],
  );

  const companionLookup = useMemo(
    () => (id: string): Companion | undefined => myDbCompanions.find(c => c.id === id),
    [myDbCompanions],
  );

  const initialCompanionIds = options.initialCompanionIds;
  const initialCategory = options.initialCategory;
  const postAsCompanionId = options.postAsCompanionId;
  const companionContentMode = options.companionContentMode;
  const editingPost = options.editPost;
  const isEditing = !!editingPost;
  const postingAs = postAsCompanionId ? (companionLookup(postAsCompanionId) ?? null) : null;
  const isGalleryMode = !!postingAs && companionContentMode === 'gallery';
  const isCompanionUpdateMode = !!postingAs && companionContentMode !== 'gallery';
  const maxPhotos = isGalleryMode ? 1 : MAX_FEED_PHOTOS;
  const hasPhoto = selectedPhotos.length > 0;
  const canAddPhoto = selectedPhotos.length < maxPhotos;
  const clearPhotos = useCallback(() => setSelectedPhotos([]), []);
  const removePhotoAt = useCallback((index: number) => {
    setSelectedPhotos(prev => prev.filter((_, i) => i !== index));
  }, []);
  const addPhotoFromLibrary = useCallback(async () => {
    const remaining = maxPhotos - selectedPhotos.length;
    if (remaining <= 0) return;
    if (remaining > 1 && !isGalleryMode) {
      const assets = await pickImages({ limit: remaining });
      if (assets.length > 0) {
        setSelectedPhotos(prev => [...prev, ...assets].slice(0, maxPhotos));
      }
      return;
    }
    const asset = await pickImage();
    if (asset) {
      setSelectedPhotos(prev => [...prev, asset].slice(0, maxPhotos));
    }
  }, [isGalleryMode, maxPhotos, pickImage, pickImages, selectedPhotos.length]);
  const addPhotoFromCamera = useCallback(async () => {
    if (selectedPhotos.length >= maxPhotos) return;
    const asset = await takePhoto();
    if (asset) {
      setSelectedPhotos(prev => [...prev, asset].slice(0, maxPhotos));
    }
  }, [maxPhotos, selectedPhotos.length, takePhoto]);
  const authorDisplayName = postingAs
    ? postingAs.name
    : (me.name || me.handle || '');

  useEffect(() => {
    let cancelled = false;

    if (visible && initialCategory === 'adoption' && !isEditing) {
      onClose();
      onOpenAdoptionListing?.();
      return () => { cancelled = true; };
    }
    if (visible && editingPost) {
      setText(editingPost.text);
      if (editingPost.companionAuthorId) {
        setTags([editingPost.companionAuthorId]);
      } else {
        const fromPost = editingPost.companions.filter(id => myCompanionIds.includes(id)).slice(0, 1);
        if (fromPost.length > 0) {
          setTags(fromPost);
        } else if (myCompanionIds.length > 0) {
          const fallback = resolveDefaultCompanionId(null, myCompanionIds);
          setTags(fallback ? [fallback] : [myCompanionIds[0]]);
        } else {
          setTags([]);
        }
      }
      setLabel(editingPost.label ?? (editingPost.tag === 'paw-posting' ? null : 'discussion'));
      if (editingPost.found) {
        setLostArea(editingPost.found.area ?? '');
        setLostWhen(editingPost.found.foundAt ?? '');
        setLostContact(editingPost.found.phone ?? '');
      } else if (editingPost.lost) {
        setLostArea(editingPost.lost.area ?? '');
        setLostWhen(editingPost.lost.lastSeen ?? '');
        setLostContact(editingPost.lost.phone ?? '');
      } else {
        setLostArea('');
        setLostWhen('');
        setLostContact('');
      }
      setDestinations([{ type: 'feed' }]);
      clearPhotos();
      return () => { cancelled = true; };
    }
    if (visible) {
      const isAlert = initialCategory === 'lost' || initialCategory === 'found';
      if (postAsCompanionId) {
        setTags([postAsCompanionId]);
      } else if (isAlert) {
        if (myCompanionIds.length > 0) {
          const optimistic = resolveDefaultCompanionId(null, myCompanionIds);
          setTags(optimistic ? [optimistic] : [myCompanionIds[0]]);
          if (user?.id) {
            void loadDefaultCompanionId(user.id).then(saved => {
              if (cancelled) return;
              const resolved = resolveDefaultCompanionId(saved, myCompanionIds);
              setTags(resolved ? [resolved] : [myCompanionIds[0]]);
            });
          }
        } else {
          setTags([]);
        }
      } else if (initialCompanionIds?.length) {
        setTags(initialCompanionIds.filter(id => myCompanionIds.includes(id)).slice(0, 1));
      } else if (myCompanionIds.length > 0) {
        const optimistic = resolveDefaultCompanionId(null, myCompanionIds);
        setTags(optimistic ? [optimistic] : []);
        if (user?.id) {
          void loadDefaultCompanionId(user.id).then(saved => {
            if (cancelled) return;
            const resolved = resolveDefaultCompanionId(saved, myCompanionIds);
            setTags(resolved ? [resolved] : []);
          });
        }
      } else {
        setTags([]);
      }
      if (postAsCompanionId) {
        setDestinations([{ type: 'feed' }]);
      } else {
        setDestinations(resolveInitialDestinations(options, joinedCommunities, getCommunity));
      }
      if (!postAsCompanionId) {
        const category = initialCategory ?? 'discussion';
        setLabel(CATEGORY_LABEL_MAP[category] ?? 'discussion');
      }
    } else {
      setText('');
      setTags([]);
      clearPhotos();
      setLabel(null);
      setLostArea('');
      setLostWhen('');
      setLostContact('');
      setAlertCoords(null);
      setAlertCoordsLoading(false);
      setDestinations([{ type: 'feed' }]);
      setDestinationPickerOpen(false);
      Keyboard.dismiss();
    }

    return () => { cancelled = true; };
  }, [visible, options, initialCategory, initialCompanionIds, postAsCompanionId, myCompanionIds, joinedCommunities, getCommunity, user?.id, onClose, onOpenAdoptionListing, editingPost, isEditing, clearPhotos]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const task = InteractionManager.runAfterInteractions(() => {
      if (cancelled) return;
      const delay = Platform.OS === 'web' ? 0 : 320;
      timer = setTimeout(() => {
        if (!cancelled) inputRef.current?.focus();
      }, delay);
    });
    return () => {
      cancelled = true;
      task.cancel();
      if (timer) clearTimeout(timer);
    };
  }, [visible]);

  const destLabel = formatFeedDestinationsLabel(destinations);
  const primaryDest = destinations[0] ?? { type: 'feed' as const };
  const destIcon = primaryDest.type === 'feed' ? 'home' : primaryDest.icon;
  const destTint = primaryDest.type === 'feed' ? colors.primary : primaryDest.tint;
  const hasCommunityDest = destinations.some(d => d.type === 'community');

  const isLost = !postingAs && label === 'lost';
  const isFound = !postingAs && label === 'found';
  const needsAlertFields = isLost || isFound;
  const activeLabel = label ?? 'discussion';
  const requiresCompanion = !postAsCompanionId && myCompanionIds.length > 0;
  const hasRequiredCompanion = !requiresCompanion || tags.length > 0;
  const hasContent = !!text.trim() || hasPhoto;
  const canSubmit = destinations.length > 0 && hasRequiredCompanion && (
    isGalleryMode
      ? hasPhoto
      : isCompanionUpdateMode
        ? hasContent
        : hasContent && (!needsAlertFields || (lostArea.trim() && lostWhen.trim()))
  );

  useEffect(() => {
    if (!visible || !needsAlertFields) {
      setAlertCoords(null);
      setAlertCoordsLoading(false);
      return;
    }
    let cancelled = false;
    setAlertCoordsLoading(true);
    getDeviceCoordinates({ requestPermission: true }).then(coords => {
      if (cancelled) return;
      setAlertCoords(coords);
      setAlertCoordsLoading(false);
    });
    return () => { cancelled = true; };
  }, [visible, needsAlertFields, label]);

  const galleryPickerOpened = useRef(false);
  useEffect(() => {
    if (!visible) {
      galleryPickerOpened.current = false;
      return;
    }
    if (isGalleryMode && !isEditing && !galleryPickerOpened.current) {
      galleryPickerOpened.current = true;
      void pickImage().then(asset => {
        if (asset) setSelectedPhotos([asset]);
      });
    }
  }, [visible, isGalleryMode, isEditing, pickImage]);

  const handleTextChange = useCallback((next: string) => {
    const capped = isGalleryMode ? next.slice(0, GALLERY_CAPTION_MAX) : next;
    setText(capped);
  }, [isGalleryMode]);

  const onMentionSelect = useCallback((token: string) => {
    setText(t => insertMentionToken(t, token));
  }, []);

  const toggleTag = useCallback((id: string) => {
    if (postAsCompanionId) return;
    setTags(t => {
      if (t.includes(id)) {
        if (myCompanionIds.length > 0) return t;
        return [];
      }
      const next = [id];
      if (user?.id) void persistDefaultCompanionId(user.id, id);
      return next;
    });
  }, [postAsCompanionId, user?.id, myCompanionIds.length]);

  const submit = () => {
    if (!canSubmit) return;

    if (isEditing && editingPost && onUpdate) {
      const updated = buildPost({
        text,
        tags,
        hasPhoto: !!editingPost.mediaUrls?.length,
        destination: { type: 'feed' },
        postAsCompanionId: editingPost.companionAuthorId,
        label: postingAs ? null : label,
        lostArea,
        lostWhen,
        lostContact,
        alertLat: alertCoords?.lat,
        alertLng: alertCoords?.lng,
        companionLookup,
        loc: editingPost.loc || me.loc || 'Dhaka',
      });
      onUpdate(editingPost.id, {
        ...editingPost,
        ...updated,
        id: editingPost.id,
        mediaUrls: editingPost.mediaUrls,
        images: editingPost.images,
      });
      onClose();
      onToast({ msg: 'Post updated', icon: 'check', tone: 'success' });
      return;
    }

    const ts = Date.now();
    const companionNames = tags.map(id => companionLookup(id)?.name).filter(Boolean).join(' & ');
    const composerLabel = (label ?? 'discussion') as CommunityComposerLabel;

    destinations.forEach((dest, index) => {
      if (dest.type === 'feed') {
        const post = buildPost({
          text,
          tags,
          hasPhoto,
          imageCount: selectedPhotos.length,
          destination: dest,
          postAsCompanionId,
          label: postingAs ? null : label,
          lostArea,
          lostWhen,
          lostContact,
          alertLat: alertCoords?.lat,
          alertLng: alertCoords?.lng,
          companionLookup,
          loc: me.loc ?? 'Dhaka',
          companionContentStyle: postingAs && companionContentMode
            ? companionContentMode
            : undefined,
        });
        post.id = (typeof crypto !== 'undefined' && crypto.randomUUID)
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        if (selectedPhotos.length > 0) {
          post._pendingMedias = selectedPhotos;
          post.mediaUrls = selectedPhotos.map(photo => photo.uri);
        }
        onSubmit(post);
      } else {
        const { title, body } = splitComposerText(text);
        const communityPost = buildCommunityPostFromComposer({
          title,
          body,
          label: composerLabel,
          destination: { id: dest.id, name: dest.label },
          authorId: user?.id ?? 'you',
          loc: me.loc ?? 'Dhanmondi',
          companionIds: tags.length ? tags : undefined,
          companionNames: tags.length
            ? tags.map(id => companionLookup(id)?.name).filter((n): n is string => !!n)
            : undefined,
          hasPhoto,
          imageTint: me.tint,
          alertMeta: needsAlertFields
            ? {
                kind: isLost ? 'lost' : 'found',
                area: lostArea.trim(),
                when: lostWhen.trim(),
                contact: lostContact.trim() || undefined,
              }
            : undefined,
        });
        addCommunityPost({ ...communityPost, id: `cp-${ts}-${dest.id}` });
      }
    });

    onClose();
    if (postAsCompanionId) {
      options.onSuccess?.();
    }
    const destName = formatFeedDestinationsLabel(destinations);
    const msg = postingAs
      ? `${postingAs.name} posted to ${destName} 🐾`
      : companionNames
        ? `Posted with ${companionNames} to ${destName} 🐾`
        : `Posted to ${destName} 🐾`;
    onToast({
      msg,
      icon: hasCommunityDest ? 'communities' : 'check',
      tone: 'success',
    });
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={
        isEditing
          ? 'Edit post'
          : isGalleryMode && postingAs
            ? `${postingAs.name}'s photo`
            : postingAs
              ? `${postingAs.name}'s post`
              : 'New post'
      }
      contentKey={`${isEditing ? editingPost?.id : 'open'}-${postingAs?.id ?? 'me'}-${companionContentMode ?? 'none'}-${myDbCompanions.length}`}
    >
      <View style={styles.composerBody}>
          <View style={styles.authorRow}>
            {postingAs ? (
              <CompanionAvatar companion={postingAs} size={40} />
            ) : (
              <Avatar user={me} size={40} />
            )}
            <View style={{ flex: 1 }}>
              {authorDisplayName ? (
                <Text style={[styles.authorName, styles.authorLine, { color: colors.text }]} numberOfLines={1}>
                  {authorDisplayName}
                </Text>
              ) : null}
              {postingAs || isEditing ? (
                <View style={[styles.audienceBtn, styles.audienceBtnFrozen, {
                  backgroundColor: colors.surface2,
                  borderColor: colors.border,
                }]}>
                  <Icon name="home" size={13} color={colors.primary} />
                  <Text style={[styles.audienceTxt, { color: colors.textSecondary }]} numberOfLines={1}>
                    Feed
                  </Text>
                </View>
              ) : (
                <Pressable
                  onPress={() => setDestinationPickerOpen(true)}
                  style={[styles.audienceBtn, {
                    backgroundColor: colors.surface2,
                    borderColor: hasCommunityDest ? destTint + '44' : colors.border,
                  }]}
                >
                  <Icon name={destIcon} size={13} color={destTint} />
                  <Text style={[styles.audienceTxt, { color: colors.textSecondary }]} numberOfLines={1}>
                    {destLabel}
                  </Text>
                  <Icon name="chevronDown" size={13} color={colors.textSecondary} />
                </Pressable>
              )}
            </View>
          </View>

          <View style={styles.composerInputShell}>
            <TextInput
              ref={inputRef}
              style={[
                styles.composerInput,
                { color: colors.text },
              ]}
              placeholder={
                isGalleryMode && postingAs
                  ? 'Add a caption…'
                  : postingAs
                    ? `What is ${postingAs.name} up to?`
                    : 'What are your companions up to?'
              }
              placeholderTextColor={colors.textTertiary}
              multiline
              maxLength={isGalleryMode ? GALLERY_CAPTION_MAX : undefined}
              value={text}
              onChangeText={handleTextChange}
            />

            {!isEditing && canAddPhoto ? (
              <View style={styles.composerMediaActions}>
                <Pressable
                  onPress={() => { void addPhotoFromLibrary(); }}
                  accessibilityRole="button"
                  accessibilityLabel="Add photo from library"
                  style={({ pressed }) => [
                    styles.composerMediaBtn,
                    Platform.OS === 'web' && styles.composerMediaBtnWeb,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Icon name="image" size={22} color={colors.textSecondary} />
                </Pressable>
                <Pressable
                  onPress={() => { void addPhotoFromCamera(); }}
                  accessibilityRole="button"
                  accessibilityLabel="Take photo"
                  style={({ pressed }) => [
                    styles.composerMediaBtn,
                    Platform.OS === 'web' && styles.composerMediaBtnWeb,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Icon name="camera" size={22} color={colors.textSecondary} />
                </Pressable>
              </View>
            ) : null}
          </View>

          {hasPhoto ? (
            <View style={styles.photoPreviewRow}>
              {selectedPhotos.map((photo, index) => (
                <View key={`${photo.uri}-${index}`} style={styles.photoPreviewThumb}>
                  <Image source={{ uri: photo.uri }} style={styles.photoPreviewImage} resizeMode="cover" />
                  <Pressable
                    onPress={() => removePhotoAt(index)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove photo ${index + 1}`}
                    style={styles.photoPreviewRemove}
                  >
                    <Icon name="close" size={12} color="#fff" />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}

          {needsAlertFields && (
            <View style={[styles.alertLocationRow, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
              <Icon name="mapPin" size={14} color={colors.primary} />
              <Text style={[styles.alertLocationText, { color: colors.textSecondary }]}>
                {alertCoordsLoading
                  ? 'Getting GPS location for nearby alerts…'
                  : alertCoords
                    ? `Alert pin set · ${alertCoords.lat.toFixed(4)}, ${alertCoords.lng.toFixed(4)}`
                    : 'GPS unavailable — area will be geocoded when posted'}
              </Text>
            </View>
          )}

          {isLost && (
            <View style={{ gap: 10, marginBottom: 12 }}>
              <View>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>LAST SEEN</Text>
                <TextInput
                  style={[styles.composerField, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface2 }]}
                  placeholder="Where were they last seen?"
                  placeholderTextColor={colors.textTertiary}
                  value={lostArea}
                  onChangeText={setLostArea}
                />
              </View>
              <View>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>WHEN</Text>
                <TextInput
                  style={[styles.composerField, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface2 }]}
                  placeholder="e.g. Today · 6:10 PM"
                  placeholderTextColor={colors.textTertiary}
                  value={lostWhen}
                  onChangeText={setLostWhen}
                />
              </View>
              <View>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>CONTACT (OPTIONAL)</Text>
                <TextInput
                  style={[styles.composerField, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface2 }]}
                  placeholder="Phone or other contact"
                  placeholderTextColor={colors.textTertiary}
                  value={lostContact}
                  onChangeText={setLostContact}
                  keyboardType="phone-pad"
                />
              </View>
            </View>
          )}

          {isFound && (
            <View style={{ gap: 10, marginBottom: 12 }}>
              <View>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>FOUND AT</Text>
                <TextInput
                  style={[styles.composerField, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface2 }]}
                  placeholder="Where did you find them?"
                  placeholderTextColor={colors.textTertiary}
                  value={lostArea}
                  onChangeText={setLostArea}
                />
              </View>
              <View>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>WHEN</Text>
                <TextInput
                  style={[styles.composerField, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface2 }]}
                  placeholder="e.g. Today · 4:30 PM"
                  placeholderTextColor={colors.textTertiary}
                  value={lostWhen}
                  onChangeText={setLostWhen}
                />
              </View>
              <View>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>CONTACT (OPTIONAL)</Text>
                <TextInput
                  style={[styles.composerField, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface2 }]}
                  placeholder="Phone or other contact"
                  placeholderTextColor={colors.textTertiary}
                  value={lostContact}
                  onChangeText={setLostContact}
                  keyboardType="phone-pad"
                />
              </View>
            </View>
          )}

          {!postAsCompanionId && !postingAs && (
            <CompanionPicker companions={myDbCompanions} tags={tags} onToggle={toggleTag} />
          )}

          {!postingAs && !(isEditing && editingPost?.label === 'adoption') && (
            <TagPicker
              activeLabel={activeLabel}
              onSelect={setLabel}
              onOpenAdoptionListing={() => { onClose(); onOpenAdoptionListing?.(); }}
            />
          )}

          {postingAs && (
            <View style={[styles.pawPostingTag, { backgroundColor: colors.infoBg, borderColor: colors.border }]}>
              <Icon name={isGalleryMode ? 'grid' : 'paw'} size={14} color={colors.primary} />
              <Text style={[styles.pawPostingTagText, { color: colors.textSecondary }]}>
                {isGalleryMode
                  ? `Photo for ${postingAs.name}'s gallery`
                  : `Posting as ${postingAs.name}`}
              </Text>
            </View>
          )}

          <View style={styles.composerToolbar}>
            <Button size="sm" disabled={!canSubmit} onPress={submit} icon={isEditing ? 'check' : 'paw'} full>
              {isEditing ? 'Save' : 'Post'}
            </Button>
          </View>

          <MentionPicker
            visible={mentionPickerOpen}
            typeaheadQuery={activeMentionQuery ?? undefined}
            createdCircles={createdCircles}
            joinedCircles={joinedCircles}
            onClose={() => {}}
            onSelect={onMentionSelect}
          />

          {!postingAs && (
            <PostDestinationModal
              visible={destinationPickerOpen}
              selected={destinations}
              joinedCommunities={joinedCommunities}
              onClose={() => setDestinationPickerOpen(false)}
              onApply={setDestinations}
            />
          )}

        </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  popupOverlay: { flex: 1, position: 'relative' },
  composerBody: {
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  composerInputShell: {
    marginTop: 12,
    marginBottom: 8,
  },
  authorRow: { flexDirection: 'row', gap: 11, alignItems: 'flex-start' },
  authorLine: { fontSize: 15.5, lineHeight: 20, marginBottom: 2 },
  authorName: { fontWeight: '700' },
  audienceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    marginTop: 8,
    alignSelf: 'flex-start',
    maxWidth: 220,
  },
  audienceBtnFrozen: {
    opacity: 0.85,
  },
  audienceTxt: { fontSize: 12, fontWeight: '600', flexShrink: 1 },
  destModalCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 32,
    borderRadius: radius.xl,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 10,
    maxHeight: `${Math.round(sheetLayout.maxHeightRatio * 100)}%`,
  },
  destModalTitle: { fontSize: 17, fontWeight: '800' },
  destModalSub: { fontSize: 13, lineHeight: 18, marginBottom: 12 },
  destList: { marginTop: 2 },
  destOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
  },
  destOptionIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destOptionTitle: { fontSize: 15 },
  destOptionSub: { fontSize: 12, marginTop: 2 },
  destDivider: { height: StyleSheet.hairlineWidth, marginLeft: 46 },
  destSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 10,
    marginBottom: 2,
    paddingTop: 4,
  },
  composerInput: {
    fontSize: 15.5,
    lineHeight: 23,
    minHeight: 150,
    textAlignVertical: 'top',
    ...webNoOutline,
  },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 7 },
  alertLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  alertLocationText: { flex: 1, fontSize: 12.5, lineHeight: 18 },
  composerField: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    ...webNoOutline,
  },
  labelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  labelChipIcon: {
    width: COMPOSER_TAG_ICON_SIZE,
    height: COMPOSER_TAG_ICON_SIZE,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelChipText: { fontSize: 12.5, fontWeight: '600' },
  sideLabelSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
    minWidth: 0,
    width: '100%',
  },
  sideLabel: {
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 0,
    minWidth: 32,
  },
  sideLabelWith: { marginTop: 28 },
  companionPickRow: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  tagPickRow: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'center',
    paddingTop: 1,
    minWidth: 0,
  },
  companionPick: {
    alignItems: 'center',
    gap: 3,
    minWidth: 52,
    maxWidth: 72,
    minHeight: 44,
    justifyContent: 'center',
  },
  companionPickWeb: {
    cursor: 'pointer',
  } as object,
  companionPickAvatar: { position: 'relative' },
  companionPickCheck: {
    position: 'absolute',
    right: -2,
    bottom: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  companionPickName: { fontSize: 12, textAlign: 'center' },
  pawPostingTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    marginBottom: 14,
  },
  pawPostingTagText: { fontSize: 12.5, fontWeight: '700' },
  composerToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  composerMediaActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: 8,
  },
  composerMediaBtn: {
    width: 40,
    height: 40,
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  composerMediaBtnWeb: {
    padding: 0,
    borderWidth: 0,
    boxSizing: 'border-box',
    appearance: 'none',
    WebkitAppearance: 'none',
    cursor: 'pointer',
  } as object,
  photoPreviewRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  photoPreviewThumb: {
    width: PREVIEW_THUMB,
    height: PREVIEW_THUMB,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  photoPreviewImage: {
    width: '100%',
    height: '100%',
  },
  photoPreviewRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
