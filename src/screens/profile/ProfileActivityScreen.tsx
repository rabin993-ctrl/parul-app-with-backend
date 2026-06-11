import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { Empty } from '../../components/ui/Empty';
import { ProfileSubHeader, ProfileActivityFeed } from '../../components/profile/ProfileChrome';
import { ProfilePostDetailSheet } from '../../components/profile/ProfilePostDetailSheet';
import { users } from '../../data/mockData';
import { useCompanions } from '../../context/CompanionContext';
import { useFeedPosts } from '../../context/FeedPostContext';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';
import { useTabBarScrollProps } from '../../context/TabBarScrollContext';

export function ProfileActivityScreen() {
  const { colors } = useTheme();
  const tabBarPad = useTabBarScrollPadding();
  const tabBarScrollProps = useTabBarScrollProps();
  const me = users.you;
  const { posts: feedPosts } = useFeedPosts();
  const { getMyCompanions } = useCompanions();
  const myCompanionIds = useMemo(
    () => new Set(getMyCompanions(me.id).map(c => c.id)),
    [getMyCompanions, me.id],
  );
  const activityPosts = useMemo(
    () => feedPosts.filter(p => {
      const isOwner = p.userId === me.id || (p.companionAuthorId && myCompanionIds.has(p.companionAuthorId));
      return isOwner && !p.circle && p.images === 0;
    }),
    [feedPosts, me.id, myCompanionIds],
  );
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ProfileSubHeader title="Activity" />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: tabBarPad }]}
        showsVerticalScrollIndicator={false}
        {...tabBarScrollProps}
      >
        {activityPosts.length === 0 ? (
          <Empty
            icon="comment"
            title="No activity yet"
            body="Text updates and thoughts you share will appear here."
          />
        ) : (
          <ProfileActivityFeed posts={activityPosts} onOpenPost={setSelectedPostId} />
        )}
      </ScrollView>

      <ProfilePostDetailSheet
        post={selectedPostId ? activityPosts.find(p => p.id === selectedPostId) ?? null : null}
        visible={selectedPostId != null}
        onClose={() => setSelectedPostId(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingTop: 4 },
});
