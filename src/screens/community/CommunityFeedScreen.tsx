import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { Empty } from '../../components/ui/Empty';
import { Icon } from '../../components/icons/Icon';
import { radius } from '../../theme/tokens';
import { Toast, ToastData } from '../../components/ui/Toast';
import { CommunityPostCard } from '../../components/community/CommunityPostCard';
import {
  CommunityToolbar,
  CommunityCategoryRow,
} from '../../components/community/CommunityChrome';
import { useCommunityFeed } from '../../context/CommunityFeedContext';
import {
  CommunityCategory,
  CommunitySort,
  filterCommunityPosts,
  sortCommunityPosts,
} from '../../data/communityPosts';
import type { CommunityStackParamList } from '../../navigation/CommunityNavigator';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';
import { useTabBarScrollProps } from '../../context/TabBarScrollContext';

type Nav = NativeStackNavigationProp<CommunityStackParamList, 'Feed'>;

export function CommunityFeedScreen({
  embedded = false,
  scrollHeader,
}: {
  embedded?: boolean;
  scrollHeader?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const { posts, toggleHelpful, toggleSaved } = useCommunityFeed();
  const tabBarPad = useTabBarScrollPadding();
  const tabBarScrollProps = useTabBarScrollProps();

  const [sort, setSort] = useState<CommunitySort>('trending');
  const [category, setCategory] = useState<CommunityCategory | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastData | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 450);
    return () => clearTimeout(t);
  }, []);

  const shown = useMemo(
    () => sortCommunityPosts(filterCommunityPosts(posts, { category }), sort),
    [posts, category, sort],
  );

  const listHeader = (
    <View>
      {scrollHeader}
      <CommunityToolbar
        sort={sort}
        onSortChange={setSort}
        onSearch={() => navigation.navigate('Search', { category })}
        onRules={() => navigation.navigate('Rules')}
        onGroups={() => navigation.navigate('Hub')}
        onCreate={() => navigation.navigate('CreatePost', { category: category === 'all' ? 'general' : category })}
      />
      <CommunityCategoryRow active={category} onChange={setCategory} />
      <View style={[styles.pinned, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '28' }]}>
        <Icon name="megaphone" size={18} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.pinnedTitle, { color: colors.text }]}>Community meetup Saturday</Text>
          <Text style={[styles.pinnedBody, { color: colors.textSecondary }]}>
            Bandstand walk at 7am — newcomers and friendly dogs welcome.
          </Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bg }]}>
        {listHeader}
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { backgroundColor: colors.bg }]}>
      <FlatList
        data={shown}
        keyExtractor={p => p.id}
        nestedScrollEnabled={embedded}
        ListHeaderComponent={listHeader}
        contentContainerStyle={{ paddingBottom: tabBarPad, gap: 10, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        {...tabBarScrollProps}
        renderItem={({ item }) => (
          <CommunityPostCard
            post={item}
            onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
            onHelpful={() => toggleHelpful(item.id)}
            onSave={() => {
              toggleSaved(item.id);
              setToast({
                msg: item.saved ? 'Removed from saved' : 'Post saved',
                icon: 'bookmark',
                tone: 'neutral',
              });
            }}
            onShare={() => setToast({ msg: 'Link copied to clipboard', icon: 'forward', tone: 'success' })}
          />
        )}
        ListEmptyComponent={
          <Empty title="No discussions yet" icon="comment">
            Try another category or start the conversation.
          </Empty>
        }
      />
      <Toast data={toast} onHide={() => setToast(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  loading: { flex: 1 },
  pinned: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 6,
    padding: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  pinnedTitle: { fontSize: 13.5, fontWeight: '700' },
  pinnedBody: { fontSize: 12.5, marginTop: 2, lineHeight: 18 },
});
