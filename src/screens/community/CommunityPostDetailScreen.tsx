import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { Avatar } from '../../components/ui/Avatar';
import { PhotoSlot } from '../../components/ui/PhotoSlot';
import { Toast, ToastData } from '../../components/ui/Toast';
import { Icon } from '../../components/icons/Icon';
import { PawCircleSubHeader } from '../pawCircles/PawCircleViews';
import { CommunityCategoryBadge } from '../../components/community/CommunityChrome';
import { CommunityCommentThread } from '../../components/community/CommunityCommentThread';
import { useCommunityFeed } from '../../context/CommunityFeedContext';
import { getCommunityPost } from '../../data/communityPosts';
import { users } from '../../data/mockData';
import type { CommunityStackParamList } from '../../navigation/CommunityNavigator';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';
import { useTabBarScrollProps } from '../../context/TabBarScrollContext';

type Route = RouteProp<CommunityStackParamList, 'PostDetail'>;

export function CommunityPostDetailScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { postId } = useRoute<Route>().params;
  const { posts, toggleHelpful, toggleSaved, addComment } = useCommunityFeed();
  const tabBarPad = useTabBarScrollPadding();
  const tabBarScrollProps = useTabBarScrollProps();
  const [toast, setToast] = useState<ToastData | null>(null);

  const post = useMemo(() => getCommunityPost(postId, posts), [postId, posts]);

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

  const author = users[post.authorId];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <PawCircleSubHeader title="Discussion" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: tabBarPad, gap: 16 }}
        showsVerticalScrollIndicator={false}
        {...tabBarScrollProps}
      >
        <View style={styles.authorRow}>
          <Avatar user={author} size={44} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.authorName, { color: colors.text }]}>{author.name}</Text>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              {post.communityName} · {post.time} · {post.loc}
            </Text>
          </View>
          <CommunityCategoryBadge category={post.category} />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>{post.title}</Text>
        <Text style={[styles.body, { color: colors.text }]}>{post.body}</Text>

        {post.hasImage && (
          <PhotoSlot
            height={220}
            tint={post.imageTint ?? author.tint}
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
              toggleSaved(post.id);
              setToast({
                msg: post.saved ? 'Removed from saved' : 'Post saved',
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
          threads={post.threads}
          onSubmit={text => addComment(post.id, text)}
        />
      </ScrollView>

      <Toast data={toast} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  authorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  authorName: { fontSize: 15, fontWeight: '700' },
  meta: { fontSize: 12.5, marginTop: 2 },
  title: { fontSize: 22, fontWeight: '800', lineHeight: 28 },
  body: { fontSize: 15, lineHeight: 23 },
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
