import React, { useMemo, useState } from 'react';
import { View, TextInput, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { Empty } from '../../components/ui/Empty';
import { Icon } from '../../components/icons/Icon';
import { PawCircleSubHeader } from '../pawCircles/PawCircleViews';
import { CommunityPostCard } from '../../components/community/CommunityPostCard';
import { CommunityCategoryRow } from '../../components/community/CommunityChrome';
import { useCommunityFeed } from '../../context/CommunityFeedContext';
import {
  CommunityCategory,
  filterCommunityPosts,
  sortCommunityPosts,
} from '../../data/communityPosts';
import type { CommunityStackParamList } from '../../navigation/CommunityNavigator';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';

type Route = RouteProp<CommunityStackParamList, 'Search'>;
type Nav = NativeStackNavigationProp<CommunityStackParamList, 'Search'>;

export function CommunitySearchScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const { category: initialCategory } = useRoute<Route>().params;
  const { posts, toggleHelpful, toggleSaved } = useCommunityFeed();
  const tabBarPad = useTabBarScrollPadding();

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CommunityCategory | 'all'>(initialCategory ?? 'all');

  const results = useMemo(
    () => sortCommunityPosts(filterCommunityPosts(posts, { category, query }), 'popular'),
    [posts, category, query],
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <PawCircleSubHeader title="Search" onBack={() => navigation.goBack()} />

      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Icon name="search" size={18} color={colors.textSecondary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search discussions, topics, groups…"
          placeholderTextColor={colors.textTertiary}
          style={[styles.searchInput, { color: colors.text }]}
          autoFocus
        />
      </View>

      <CommunityCategoryRow active={category} onChange={setCategory} />

      <FlatList
        data={results}
        keyExtractor={p => p.id}
        contentContainerStyle={{ paddingBottom: tabBarPad, gap: 10, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <CommunityPostCard
            post={item}
            onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
            onHelpful={() => toggleHelpful(item.id)}
            onSave={() => toggleSaved(item.id)}
            onShare={() => {}}
          />
        )}
        ListEmptyComponent={
          <Empty title={query ? 'No matches' : 'Start typing'} icon="search">
            {query ? 'Try different keywords or a broader category.' : 'Find rescue updates, tips, and local events.'}
          </Empty>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 15 },
});
