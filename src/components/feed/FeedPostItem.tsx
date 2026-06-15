import React from 'react';
import { View } from 'react-native';
import type { Post } from '../../data/mockData';
import type { ToastData } from '../ui/Toast';
import { FeedPostCard } from './FeedPostCard';
import { LostCard, FoundCard } from './AlertCards';

export type FeedPostItemProps = {
  post: Post;
  onPaw: () => void;
  onSave: () => void;
  onComments: () => void;
  onForward: () => void;
  onUserPress?: (userId: string) => void;
  onCompanionPress?: (id: string) => void;
  onDelete?: () => void;
  onMessage?: (userId: string) => void;
  onToast?: (t: ToastData) => void;
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
  onDelete,
  onMessage,
  onToast,
  currentUserId,
  pulseActive,
  alertPadding = false,
  compact = false,
}: FeedPostItemProps) {
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
        saved={post.saved}
        onSave={onSave}
        onMessage={onMessage ? () => onMessage(post.userId) : undefined}
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
        saved={post.saved}
        onSave={onSave}
        onMessage={onMessage ? () => onMessage(post.userId) : undefined}
      />,
    );
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
      onDelete={onDelete}
      currentUserId={currentUserId}
      compact={compact}
    />
  );
}
