import React, { useMemo } from 'react';
import { View } from 'react-native';
import type { Post } from '../../data/mockData';
import type { ToastData } from '../ui/Toast';
import { FeedPostCard } from './FeedPostCard';
import { FeedAdoptionCard } from './FeedAdoptionCard';
import { LostCard, FoundCard } from './AlertCards';
import { useAuth } from '../../context/AuthContext';
import { useCompanions } from '../../context/CompanionContext';
import { useAdoptionFeed } from '../../context/AdoptionFeedContext';
import { isOwnFeedPost } from '../../utils/postOwnership';
import { isAdoptionTaggedPost, resolveAdoptionListingForPost } from '../../utils/adoptionPostListing';

export type FeedPostItemProps = {
  post: Post;
  onPaw: () => void;
  onSave: () => void;
  onComments: () => void;
  onForward: () => void;
  onUserPress?: (userId: string) => void;
  onCompanionPress?: (id: string) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onMessage?: (post: Post) => void;
  onToast?: (t: ToastData) => void;
  /** Override ownership detection (e.g. public profile). */
  isOwner?: boolean;
  currentUserId?: string;
  pulseActive?: boolean;
  /** Wrap lost/found alert cards with feed list padding */
  alertPadding?: boolean;
  /** Drop inner card horizontal padding when the list already insets */
  compact?: boolean;
};

export function FeedPostItem({
  post,
  onPaw,
  onSave,
  onComments,
  onForward,
  onUserPress,
  onCompanionPress,
  onEdit,
  onDelete,
  onMessage,
  onToast,
  isOwner: isOwnerProp,
  currentUserId,
  pulseActive,
  alertPadding = false,
  compact = false,
}: FeedPostItemProps) {
  const { user } = useAuth();
  const { getMyCompanions } = useCompanions();
  const { listings } = useAdoptionFeed();
  const uid = currentUserId ?? user?.id;

  const isOwner = useMemo(() => {
    if (isOwnerProp != null) return isOwnerProp;
    const companionIds = uid ? getMyCompanions(uid).map(c => c.id) : [];
    return isOwnFeedPost(post, uid, companionIds);
  }, [isOwnerProp, post, uid, getMyCompanions]);

  const adoptionListing = useMemo(
    () => resolveAdoptionListingForPost(post, listings),
    [post, listings],
  );

  const ownerMenuProps = isOwner ? { onEdit, onDelete } : {};
  const wrapAlert = (card: React.ReactNode) =>
    alertPadding ? (
      <View style={{ paddingHorizontal: 16, marginVertical: 8 }}>{card}</View>
    ) : (
      card
    );

  if (post.label === 'lost' && post.lost) {
    return wrapAlert(
      <LostCard
        post={post}
        pulseActive={pulseActive}
        onToast={onToast ?? (() => {})}
        onForward={onForward}
        onUserPress={onUserPress ?? (() => {})}
        onCompanionPress={onCompanionPress}
        saved={post.saved}
        onSave={onSave}
        onMessage={onMessage && !isOwner ? () => onMessage(post) : undefined}
        {...ownerMenuProps}
      />,
    );
  }

  if (post.label === 'found' && post.found) {
    return wrapAlert(
      <FoundCard
        post={post}
        pulseActive={pulseActive}
        onToast={onToast ?? (() => {})}
        onForward={onForward}
        onUserPress={onUserPress ?? (() => {})}
        onCompanionPress={onCompanionPress}
        saved={post.saved}
        onSave={onSave}
        onMessage={onMessage && !isOwner ? () => onMessage(post) : undefined}
        {...ownerMenuProps}
      />,
    );
  }

  if (isAdoptionTaggedPost(post) && adoptionListing) {
    const card = (
      <FeedAdoptionCard
        post={post}
        listing={adoptionListing}
        onPaw={onPaw}
        onSave={onSave}
        onComments={onComments}
        onForward={onForward}
        onEdit={onEdit}
        onDelete={onDelete}
        onToast={onToast}
        isOwner={isOwner}
        compact={compact}
      />
    );
    if (alertPadding) {
      return <View style={{ marginVertical: 8 }}>{card}</View>;
    }
    return card;
  }

  return (
    <FeedPostCard
      post={post}
      onPaw={onPaw}
      onSave={onSave}
      onComments={onComments}
      onForward={onForward}
      onUserPress={onUserPress}
      onCompanionPress={onCompanionPress}
      isOwner={isOwner}
      onEdit={onEdit}
      onDelete={onDelete}
      compact={compact}
    />
  );
}
