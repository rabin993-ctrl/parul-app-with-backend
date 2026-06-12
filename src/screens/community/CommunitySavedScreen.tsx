import React, { useMemo, useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { Empty } from '../../components/ui/Empty';
import { Toast, ToastData } from '../../components/ui/Toast';
import { CommunityFeedPost } from '../../components/community/CommunityFeedPost';
import { PawCircleSubHeader } from '../pawCircles/PawCircleViews';
import { useCommunityFeed } from '../../context/CommunityFeedContext';
import { useCommunityGroups } from '../../context/CommunityGroupsContext';
import type { CommunityStackParamList } from '../../navigation/CommunityNavigator';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';
import { useTabBarScrollProps } from '../../context/TabBarScrollContext';

type Nav = NativeStackNavigationProp<CommunityStackParamList, 'Saved'>;

export function CommunitySavedScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const tabBarPad = useTabBarScrollPadding();
  const tabBarScrollProps = useTabBarScrollProps();
  const { savedPosts, toggleHelpful, toggleSaved } = useCommunityFeed();
  const { getCommunity } = useCommunityGroups();
  const [toast, setToast] = useState<ToastData | null>(null);

  const items = useMemo(() => savedPosts, [savedPosts]);

  const openUserProfile = (userId: string) => {
    navigation.getParent()?.navigate('Circles', {
      screen: 'UserProfile',
      params: { userId },
    });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <PawCircleSubHeader title="Saved discussions" onBack={() => navigation.goBack()} />

      <FlatList
        data={items}
        keyExtractor={p => p.id}
        contentContainerStyle={[styles.list, { paddingBottom: tabBarPad }]}
        showsVerticalScrollIndicator={false}
        {...tabBarScrollProps}
        ItemSeparatorComponent={() => (
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
        )}
        renderItem={({ item }) => {
          const group = getCommunity(item.communityId);
          return (
            <CommunityFeedPost
              post={item}
              communityTint={group?.tint ?? '#7C5CBF'}
              communityIcon={group?.icon ?? 'communities'}
              onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
              onComments={() => navigation.navigate('PostDetail', { postId: item.id })}
              onCommunityPress={() => navigation.navigate('Group', { communityId: item.communityId })}
              onAuthorPress={openUserProfile}
              onHelpful={() => toggleHelpful(item.id)}
              onSave={() => {
                const nowSaved = toggleSaved(item.id);
                setToast({
                  msg: nowSaved ? 'Post saved' : 'Removed from saved',
                  icon: 'bookmark',
                  tone: 'neutral',
                });
              }}
              onShare={() => navigation.navigate('PostDetail', { postId: item.id })}
            />
          );
        }}
        ListEmptyComponent={
          <Empty title="Nothing saved yet" icon="bookmark">
            Tap the bookmark on any community post to save it here.
          </Empty>
        }
      />

      <Toast data={toast} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  list: { flexGrow: 1, paddingTop: 4 },
  divider: { height: StyleSheet.hairlineWidth },
});
