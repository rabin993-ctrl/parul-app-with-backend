import React, { useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { Avatar } from '../../components/ui/Avatar';
import { PawCircleSubHeader } from '../pawCircles/PawCircleViews';
import { useCommunityGroups } from '../../context/CommunityGroupsContext';
import { users } from '../../data/mockData';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';

export function CommunityMembersScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const tabBarPad = useTabBarScrollPadding();
  const { joinedCommunities } = useCommunityGroups();

  const members = useMemo(() => {
    const seen = new Set<string>();
    return Object.values(users).filter(u => {
      if (seen.has(u.id)) return false;
      seen.add(u.id);
      return true;
    });
  }, []);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <PawCircleSubHeader title="Members" onBack={() => navigation.goBack()} />

      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Across {joinedCommunities.length} joined group{joinedCommunities.length !== 1 ? 's' : ''}
      </Text>

      <FlatList
        data={members}
        keyExtractor={u => u.id}
        contentContainerStyle={{ paddingBottom: tabBarPad, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => {
              (navigation as any).getParent()?.navigate('Circles', {
                screen: 'UserProfile',
                params: { userId: item.id },
              });
            }}
            style={({ pressed }) => pressed && { opacity: 0.7 }}
          >
            <View style={[styles.row, { borderBottomColor: colors.border }]}>
              <Avatar user={item} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
                <Text style={[styles.meta, { color: colors.textSecondary }]}>@{item.handle} · {item.loc}</Text>
              </View>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  subtitle: { fontSize: 13, paddingHorizontal: 16, paddingBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  name: { fontSize: 15, fontWeight: '700' },
  meta: { fontSize: 12.5, marginTop: 2 },
});
