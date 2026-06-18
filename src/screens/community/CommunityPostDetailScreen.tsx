import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { CommunityPostAuthorRow } from '../../components/community/CommunityPostAuthorRow';
import { CompanionProfileOverlay } from '../../components/CompanionProfileOverlay';
import { PhotoSlot } from '../../components/ui/PhotoSlot';
import { Toast, ToastData } from '../../components/ui/Toast';
import { Icon } from '../../components/icons/Icon';
import { PawCircleSubHeader } from '../pawCircles/PawCircleViews';
import { CommunityPostLabelBadge } from '../../components/community/CommunityChrome';
import { CommunityCommentThread } from '../../components/community/CommunityCommentThread';
import { useCommunityFeed } from '../../context/CommunityFeedContext';
import { useCommunityGroups } from '../../context/CommunityGroupsContext';
import { getCommunityPost } from '../../data/communityPosts';
import type { CommunityStackParamList } from '../../navigation/CommunityNavigator';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';
import { useTabBarScrollProps } from '../../context/TabBarScrollContext';

type Route = RouteProp<CommunityStackParamList, 'PostDetail'>;
type Nav = NativeStackNavigationProp<CommunityStackParamList, 'PostDetail'>;

export function CommunityPostDetailScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const { postId } = useRoute<Route>().params;
  const { posts, toggleHelpful, toggleSaved, addComment, loadPostThreads } = useCommunityFeed();
  const { getCommunity } = useCommunityGroups();
  const tabBarPad = useTabBarScrollPadding();
  const tabBarScrollProps = useTabBarScrollProps();
  const [toast, setToast] = useState<ToastData | null>(null);
  const [selectedCompanionId, setSelectedCompanionId] = useState<string | null>(null);

  const post = useMemo(() => getCommunityPost(postId, posts), [postId, posts]);

  useEffect(() => {
    if (post && (post.threads ?? []).length === 0) {
      loadPostThreads(post.id);
    }
  }, [post?.id]);

  if (!post) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
        <PawCircleSubHeader title="Discussion" />
        <View style={styles.missing}>
          <Text style={{ color: colors.textSecondary }}>This post is no longer available.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const group = getCommunity(post.communityId);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <PawCircleSubHeader title="Discussion" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: tabBarPad, gap: 12 }}
        showsVerticalScrollIndicator={false}
        {...tabBarScrollProps}
      >
        <CommunityPostAuthorRow
          post={post}
          communityTint={group?.tint ?? '#7C5CBF'}
          communityIcon={group?.icon ?? 'communities'}
          onCommunityPress={() => navigation.navigate('Group', { communityId: post.communityId })}
          onCompanionPress={setSelectedCompanionId}
          onAuthorPress={userId => {
            navigation.getParent()?.navigate('Circles', {
              screen: 'UserProfile',
              params: { userId },
            });
          }}
        />

        <CommunityPostLabelBadge post={post} />

        <Text style={[styles.title, { color: colors.text }]}>{post.title}</Text>
        <Text style={[styles.body, { color: colors.text }]}>{post.body}</Text>

        {post.alertMeta && (
          <View style={[styles.alertCard, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
            <Text style={[styles.alertLine, { color: colors.text }]}>
              {post.alertMeta.kind === 'lost' ? 'Last seen' : 'Found at'}: {post.alertMeta.area}
            </Text>
            <Text style={[styles.alertLine, { color: colors.textSecondary }]}>When: {post.alertMeta.when}</Text>
            {post.alertMeta.looksLike ? (
              <Text style={[styles.alertLine, { color: colors.textSecondary }]}>
                Looks like: {post.alertMeta.looksLike}
              </Text>
            ) : null}
            {post.alertMeta.contact ? (
              <Text style={[styles.alertLine, { color: colors.textSecondary }]}>
                Contact: {post.alertMeta.contact}
              </Text>
            ) : null}
          </View>
        )}

        {post.hasImage && (
          <PhotoSlot
            height={220}
            imageKey={post.id}
            label=""
            borderRadius={radius.lg}
          />
        )}

        <View style={styles.actionRow}>
          <Pressable
            onPress={() => toggleHelpful(post.id)}
            style={({ pressed }) => [
              styles.helpfulPill,
              {
                backgroundColor: post.helpfulByMe ? colors.primary + '14' : colors.surface2,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Icon
              name={post.helpfulByMe ? 'paw' : 'paw-line'}
              size={18}
              color={post.helpfulByMe ? colors.primary : colors.textSecondary}
              fill={post.helpfulByMe ? colors.primary : 'none'}
            />
            <Text style={[styles.helpfulText, { color: post.helpfulByMe ? colors.primary : colors.text }]}>
              {post.helpful} Helpful
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              const nowSaved = toggleSaved(post.id);
              setToast({
                msg: nowSaved ? 'Post saved' : 'Removed from saved',
                icon: 'bookmark',
                tone: 'neutral',
              });
            }}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          >
            <Icon
              name="bookmark"
              size={20}
              color={post.saved ? colors.primary : colors.textSecondary}
              fill={post.saved ? colors.primary : 'none'}
            />
          </Pressable>

          <Pressable
            onPress={() => setToast({ msg: 'Link copied', icon: 'forward', tone: 'success' })}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          >
            <Icon name="forward" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <CommunityCommentThread
          threads={post.threads ?? []}
          onSubmit={(text, replyToThreadId) => addComment(post.id, text, { replyToThreadId })}
          onAuthorPress={userId => {
            navigation.getParent()?.navigate('Circles', {
              screen: 'UserProfile',
              params: { userId },
            });
          }}
        />
      </ScrollView>

      <CompanionProfileOverlay
        companionId={selectedCompanionId}
        onCompanionIdChange={setSelectedCompanionId}
        onOwnerPress={userId => {
          navigation.getParent()?.navigate('Circles', {
            screen: 'UserProfile',
            params: { userId },
          });
        }}
        onToast={setToast}
      />

      <Toast data={toast} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', lineHeight: 28, paddingTop: 8 },
  body: { fontSize: 15, lineHeight: 23 },
  alertCard: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 12,
    gap: 4,
  },
  alertLine: { fontSize: 14, lineHeight: 20 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  helpfulPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  helpfulText: { fontSize: 14, fontWeight: '700' },
  divider: { height: 1 },
});
