import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { Card } from '../../components/ui/Card';
import { Empty } from '../../components/ui/Empty';
import { ProfileSubHeader, profileFeedPosts } from '../../components/profile/ProfileChrome';
import { useFeedPosts } from '../../context/FeedPostContext';
import { useAuth } from '../../context/AuthContext';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';
import { useTabBarScrollProps } from '../../context/TabBarScrollContext';
import { formatPostTimeLocMeta } from '../../utils/postMeta';

export function ProfilePostsScreen() {
  const { colors } = useTheme();
  const tabBarPad = useTabBarScrollPadding();
  const tabBarScrollProps = useTabBarScrollProps();
  const { posts } = useFeedPosts();
  const { user } = useAuth();
  const myPosts = profileFeedPosts(
    posts.filter(p => p.userId === user?.id && !p.companionAuthorId && !p.circle),
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ProfileSubHeader title="Posts" />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: tabBarPad }]}
        showsVerticalScrollIndicator={false}
        {...tabBarScrollProps}
      >
        {myPosts.length === 0 ? (
          <Empty icon="comment" title="No posts yet" body="Your feed posts will show up here." />
        ) : (
          <View style={{ gap: 10 }}>
            {myPosts.map(p => (
              <Card key={p.id} padding={12}>
                <Text style={[styles.text, { color: colors.text }]}>{p.text}</Text>
                <Text style={[styles.meta, { color: colors.textTertiary }]}>
                  {formatPostTimeLocMeta({ time: p.time, loc: p.loc })}
                </Text>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingTop: 4, gap: 10 },
  text: { fontSize: 14.5, lineHeight: 21 },
  meta: { fontSize: 12, marginTop: 8 },
});
