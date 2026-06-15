import React, { useCallback, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { Empty } from '../../components/ui/Empty';
import { Toast, ToastData } from '../../components/ui/Toast';
import { ProfileSubHeader } from '../../components/profile/ProfileChrome';
import { FeedPostItem } from '../../components/feed/FeedPostItem';
import { useFeedPosts } from '../../context/FeedPostContext';
import type { ProfileStackParamList } from '../../navigation/ProfileNavigator';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';
import { useTabBarScrollProps } from '../../context/TabBarScrollContext';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'Saved'>;

export function ProfileSavedScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const tabBarPad = useTabBarScrollPadding();
  const tabBarScrollProps = useTabBarScrollProps();
  const { savedPosts, toggleSaved, togglePaw } = useFeedPosts();
  const [toast, setToast] = useState<ToastData | null>(null);

  const openUserProfile = useCallback((userId: string) => {
    navigation.getParent()?.navigate('Circles', {
      screen: 'UserProfile',
      params: { userId },
    });
  }, [navigation]);

  const handleSave = (id: string) => {
    const nowSaved = toggleSaved(id);
    setToast({
      msg: nowSaved ? 'Saved to your collection' : 'Removed from saved',
      icon: 'bookmark',
      tone: 'primary',
    });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ProfileSubHeader title="Saved posts" />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: tabBarPad }]}
        showsVerticalScrollIndicator={false}
        {...tabBarScrollProps}
      >
        {savedPosts.length === 0 ? (
          <Empty
            icon="bookmark"
            title="Nothing saved yet"
            body="Tap the bookmark on any feed post to save it here."
          />
        ) : (
          savedPosts.map((post, i) => (
            <View key={post.id}>
              <FeedPostItem
                post={post}
                compact
                onPaw={() => togglePaw(post.id)}
                onSave={() => handleSave(post.id)}
                onComments={() => setToast({ msg: 'Open from feed to comment', icon: 'comment', tone: 'neutral' })}
                onForward={() => setToast({ msg: 'Open from feed to share', icon: 'forward', tone: 'neutral' })}
                onUserPress={openUserProfile}
                onToast={setToast}
              />
              {i < savedPosts.length - 1 && (
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
              )}
            </View>
          ))
        )}
      </ScrollView>

      <Toast data={toast} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingTop: 4, gap: 8 },
  divider: { height: StyleSheet.hairlineWidth },
});
