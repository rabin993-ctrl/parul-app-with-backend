import React, { useMemo, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, Pressable, TextInput, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/icons/Icon';
import { Toast, ToastData } from '../../components/ui/Toast';
import { ProfileSubHeader } from '../../components/profile/ProfileChrome';
import { useCommunityGroups } from '../../context/CommunityGroupsContext';
import { useCommunityMembersWithProfiles } from '../../hooks/useCommunityMembersWithProfiles';
import type { CommunityStackParamList } from '../../navigation/CommunityNavigator';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';

type Route = RouteProp<CommunityStackParamList, 'GroupMembers'>;
type Nav = NativeStackNavigationProp<CommunityStackParamList, 'GroupMembers'>;

export function CommunityGroupMembersScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const { communityId } = useRoute<Route>().params;
  const tabBarPad = useTabBarScrollPadding();
  const {
    getCommunity,
    formatCommunityMemberLabel,
    removeCommunityMember,
    isMod,
  } = useCommunityGroups();
  const { members, isSelf } = useCommunityMembersWithProfiles(communityId);

  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState<ToastData | null>(null);

  const community = getCommunity(communityId);
  const canManage = isMod(communityId);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter(u =>
      u.name.toLowerCase().includes(q)
      || u.handle.toLowerCase().includes(q),
    );
  }, [members, query]);

  const toggleSearch = () => {
    setSearchOpen(v => {
      if (v) setQuery('');
      return !v;
    });
  };

  const openProfile = (userId: string) => {
    navigation.getParent()?.navigate('Circles', {
      screen: 'UserProfile',
      params: { userId },
    });
  };

  const handleRemove = (userId: string, name: string) => {
    if (removeCommunityMember(communityId, userId)) {
      setToast({ msg: `Removed ${name} from the group`, icon: 'close', tone: 'neutral' });
    }
  };

  if (!community) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
        <ProfileSubHeader title="Members" onBack={() => navigation.goBack()} />
        <View style={styles.missing}>
          <Text style={{ color: colors.textSecondary }}>Group not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ProfileSubHeader
        title="Members"
        rightIcon="search"
        onRightPress={toggleSearch}
        onBack={() => navigation.goBack()}
      />

      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {community.name} · {formatCommunityMemberLabel(communityId)}
      </Text>

      {searchOpen && (
        <View style={[styles.searchField, { backgroundColor: colors.surface2 }]}>
          <Icon name="search" size={15} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search members…"
            placeholderTextColor={colors.textTertiary}
            value={query}
            onChangeText={setQuery}
            autoFocus
            autoComplete="off"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Icon name="close" size={14} color={colors.textTertiary} />
            </Pressable>
          )}
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={u => u.id}
        contentContainerStyle={{ paddingBottom: tabBarPad, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.textSecondary }]}>
            {query.trim() ? 'No members match your search.' : 'No members yet.'}
          </Text>
        }
        renderItem={({ item, index }) => {
          const self = isSelf(item.id);
          const isLast = index === filtered.length - 1;
          return (
            <View
              style={[
                styles.memberRow,
                !isLast && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
              ]}
            >
              <Pressable
                onPress={() => openProfile(item.id)}
                style={({ pressed }) => [styles.memberMain, pressed && { opacity: 0.72 }]}
              >
                <Avatar user={{ id: item.id, name: item.name, tint: item.tint ?? '#F2972E' }} size={44} />
                <View style={styles.memberBody}>
                  <Text style={[styles.memberName, { color: colors.text }]} numberOfLines={1}>
                    {item.name}
                    {self ? ' (you)' : ''}
                  </Text>
                  <Text style={[styles.memberMeta, { color: colors.textTertiary }]} numberOfLines={1}>
                    @{item.handle}
                  </Text>
                </View>
              </Pressable>
              {canManage && !self && (
                <Pressable
                  onPress={() => handleRemove(item.id, item.name)}
                  hitSlop={8}
                  accessibilityLabel={`Remove ${item.name}`}
                  style={({ pressed }) => [
                    styles.removeBtn,
                    { backgroundColor: colors.surface2, opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Icon name="close" size={14} color={colors.danger} />
                </Pressable>
              )}
            </View>
          );
        }}
      />

      <Toast data={toast} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  subtitle: { fontSize: 13, paddingHorizontal: 20, paddingBottom: 10 },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.full,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
    ...Platform.select({
      web: { outlineStyle: 'none' } as object,
      default: {},
    }),
  },
  empty: { fontSize: 14, textAlign: 'center', paddingVertical: 32 },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  memberMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  memberBody: { flex: 1, gap: 2, minWidth: 0 },
  memberName: { fontSize: 15, fontWeight: '600' },
  memberMeta: { fontSize: 12.5 },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
