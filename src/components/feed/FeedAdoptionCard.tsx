import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import type { Post } from '../../data/mockData';
import type { AdoptionListing } from '../../data/adoptionData';
import type { ToastData } from '../ui/Toast';
import { FlipAdoptionCard } from '../adoption/FlipAdoptionCard';
import { AdoptionListingDetailModal } from '../adoption/AdoptionListingDetailModal';
import { PostOwnerMenu } from './PostOwnerMenu';
import { Icon } from '../icons/Icon';
import { isActiveAdoptionRequest, useAdoptionFeed } from '../../context/AdoptionFeedContext';
import { useAuth } from '../../context/AuthContext';
import { countFeedThreadComments } from '../../utils/postComments';

function ReactionBtn({ icon, count, active, activeColor, fill, onPress }: {
  icon: string; count: number; active?: boolean; activeColor: string; fill?: boolean; onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={styles.reactionBtn}>
      <Icon name={icon} size={20} color={active ? activeColor : colors.textSecondary} fill={fill ? activeColor : 'none'} />
      {count > 0 && (
        <Text style={[styles.reactionCount, { color: active ? activeColor : colors.textSecondary }]}>
          {count}
        </Text>
      )}
    </Pressable>
  );
}

export function FeedAdoptionCard({
  post,
  listing,
  onPaw,
  onSave,
  onComments,
  onForward,
  onEdit,
  onDelete,
  onToast,
  isOwner = false,
  compact,
}: {
  post: Post;
  listing: AdoptionListing;
  onPaw: () => void;
  onSave: () => void;
  onComments: () => void;
  onForward: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onToast?: (t: ToastData) => void;
  isOwner?: boolean;
  compact?: boolean;
}) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const {
    submitRequest,
    cancelRequest,
    getRequestForListing,
  } = useAdoptionFeed();
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const commentCount = countFeedThreadComments(post.threads);
  const myRequest = useMemo(
    () => getRequestForListing(listing.id, user?.id),
    [getRequestForListing, listing.id, user?.id],
  );
  const showOwnerMenu = isOwner && (onEdit || onDelete);

  const openEdit = () => {
    if (isOwner) {
      setEditOpen(true);
      return;
    }
    onEdit?.();
  };

  const handleRequest = () => {
    if (listing.userId === user?.id) return;
    submitRequest({
      listingId: listing.id,
      listingName: listing.name,
      posterId: listing.userId,
      message: `I'd like to adopt ${listing.name}.`,
    });
    onToast?.({ msg: `Request sent for ${listing.name}`, icon: 'adoption', tone: 'success' });
  };

  const handleCancelRequest = () => {
    if (!myRequest) return;
    cancelRequest(myRequest.id);
    onToast?.({ msg: 'Request cancelled', icon: 'check', tone: 'primary' });
  };

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      {showOwnerMenu && (
        <View style={styles.menuAnchor}>
          <PostOwnerMenu
            onEdit={openEdit}
            onDelete={onDelete}
          />
        </View>
      )}

      <FlipAdoptionCard
        listing={listing}
        myRequest={myRequest}
        onViewDetails={() => setDetailOpen(true)}
        onEditPost={isOwner ? openEdit : undefined}
        onRequest={handleRequest}
        onCancelRequest={myRequest && isActiveAdoptionRequest(myRequest) ? handleCancelRequest : undefined}
        onShare={onForward}
      />

      <View style={styles.reactionBar}>
        <ReactionBtn
          icon={post.reacted ? 'paw' : 'paw-line'}
          count={post.paws}
          active={post.reacted}
          activeColor={colors.primary}
          fill={post.reacted}
          onPress={onPaw}
        />
        <ReactionBtn icon="comment" count={commentCount} activeColor={colors.accent} onPress={onComments} />
        <ReactionBtn icon="forward" count={post.forwards} activeColor={colors.accent} onPress={onForward} />
        <View style={{ flex: 1 }} />
        {!isOwner && (
          <ReactionBtn
            icon={post.saved ? 'bookmark' : 'bookmark-line'}
            count={0}
            active={post.saved}
            activeColor={colors.primary}
            fill={post.saved}
            onPress={onSave}
          />
        )}
      </View>

      <AdoptionListingDetailModal
        listingId={listing.id}
        visible={detailOpen}
        onClose={() => setDetailOpen(false)}
      />
      <AdoptionListingDetailModal
        listingId={listing.id}
        editMode
        visible={editOpen}
        onClose={() => setEditOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  wrapCompact: {
    paddingHorizontal: 0,
  },
  menuAnchor: {
    position: 'absolute',
    top: 6,
    right: 0,
    zIndex: 4,
  },
  reactionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    paddingTop: 4,
    paddingBottom: 8,
    paddingHorizontal: 4,
  },
  reactionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6 },
  reactionCount: { fontSize: 13, fontWeight: '600' },
});
