import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, Pressable, StyleSheet, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { radius } from '../theme/tokens';
import { Empty } from '../components/ui/Empty';
import { Icon } from '../components/icons/Icon';
import { Avatar } from '../components/ui/Avatar';
import { PawCircleSubHeader } from './pawCircles/PawCircleViews';
import { AdoptionListingRow } from '../components/adoption/AdoptionListingRow';
import { useAdoptionFeed } from '../context/AdoptionFeedContext';
import { useFeedPosts } from '../context/FeedPostContext';
import { usePawCircles } from '../context/PawCircleContext';
import { useCommunityGroups } from '../context/CommunityGroupsContext';
import { RescueFeedProvider, useRescueFeed } from '../context/RescueFeedContext';
import type { FeedStackParamList } from '../navigation/feedHubNavigation';
import { mergeAdoptionHubListings } from '../utils/adoptionPostListing';
import {
  collectUsersFromPosts,
  filterAdoptionListingsByQuery,
  filterFeedPostsByQuery,
  filterRescueCasesByQuery,
  filterUsersByQuery,
  searchCirclesByQuery,
  searchCommunitiesByQuery,
  type SearchUserResult,
} from '../utils/feedSearch';
import { parseSearchTokens, escapeIlikePattern } from '../utils/textSearch';
import { formatFeedSearchPostMeta } from '../utils/postMeta';
import { supabase } from '../lib/supabase';
import { useTabBarScrollPadding } from '../navigation/tabBarInsets';
import { shortCircleName } from '../utils/destinationSearch';
import { CirclePrivacyLockIcon } from './pawCircles/PawCircleChrome';

type Nav = NativeStackNavigationProp<FeedStackParamList, 'Search'>;

function FeedSearchBody() {
  const { colors, iconBg } = useTheme();
  const navigation = useNavigation<Nav>();
  const tabBarPad = useTabBarScrollPadding();
  const { posts: feedPosts } = useFeedPosts();
  const { listings, isSaved, toggleSaved } = useAdoptionFeed();
  const { cases } = useRescueFeed();
  const { createdCircles, joinedCircles } = usePawCircles();
  const { joinedCommunities } = useCommunityGroups();

  const [query, setQuery] = useState('');
  const [remoteUsers, setRemoteUsers] = useState<SearchUserResult[]>([]);

  const circles = useMemo(() => {
    const seen = new Set<string>();
    const all = [...createdCircles, ...joinedCircles];
    return all.filter(c => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  }, [createdCircles, joinedCircles]);

  const hubListings = useMemo(
    () => mergeAdoptionHubListings(listings, feedPosts),
    [listings, feedPosts],
  );

  const postAuthors = useMemo(() => collectUsersFromPosts(feedPosts), [feedPosts]);

  useEffect(() => {
    const tokens = parseSearchTokens(query);
    if (tokens.length === 0) {
      setRemoteUsers([]);
      return;
    }

    let cancelled = false;
    const primary = escapeIlikePattern(tokens[0]);
    void supabase
      .rpc('search_discoverable_users', { p_query: primary, p_limit: 40 })
      .then(({ data }) => {
        if (cancelled) return;
        const rows = (data ?? []).map(row => ({
          id: row.id,
          name: row.name ?? row.handle ?? row.id.slice(0, 8),
          handle: row.handle ?? undefined,
          tint: row.tint ?? undefined,
        }));
        setRemoteUsers(filterUsersByQuery(rows, query));
      });

    return () => {
      cancelled = true;
    };
  }, [query]);

  const userResults = useMemo(() => {
    const merged = filterUsersByQuery([...postAuthors, ...remoteUsers], query);
    const seen = new Set<string>();
    return merged.filter(user => {
      if (seen.has(user.id)) return false;
      seen.add(user.id);
      return true;
    });
  }, [postAuthors, remoteUsers, query]);

  const postResults = useMemo(
    () => filterFeedPostsByQuery(feedPosts, query),
    [feedPosts, query],
  );
  const adoptionResults = useMemo(
    () => filterAdoptionListingsByQuery(hubListings, query),
    [hubListings, query],
  );
  const rescueResults = useMemo(
    () => filterRescueCasesByQuery(cases, query),
    [cases, query],
  );
  const circleResults = useMemo(
    () => searchCirclesByQuery(circles, query),
    [circles, query],
  );
  const communityResults = useMemo(
    () => searchCommunitiesByQuery(joinedCommunities, query),
    [joinedCommunities, query],
  );

  const hasQuery = query.trim().length > 0;
  const hasResults = userResults.length + postResults.length + adoptionResults.length
    + rescueResults.length + circleResults.length + communityResults.length > 0;

  const openPost = (postId: string) => {
    navigation.getParent()?.navigate('Profile', {
      screen: 'FeedPostDetail',
      params: { postId },
    });
  };

  const openUser = (userId: string) => {
    navigation.getParent()?.navigate('Circles', {
      screen: 'UserProfile',
      params: { userId },
    });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <PawCircleSubHeader title="Search" onBack={() => navigation.goBack()} />

      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Icon name="search" size={18} color={colors.textSecondary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="People, @username, posts, pets…"
          placeholderTextColor={colors.textTertiary}
          style={[styles.searchInput, { color: colors.text }]}
          autoFocus
          autoCorrect={false}
          autoCapitalize="none"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} hitSlop={6}>
            <Icon name="close" size={14} color={colors.textTertiary} />
          </Pressable>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: tabBarPad }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {!hasQuery ? (
          <Empty
            icon="search"
            title="Search Parul"
            body="Try a name, @username, place, breed, or any word from a post."
          />
        ) : !hasResults ? (
          <Empty icon="search" title="No matches" body="Try another name, handle, or keyword." />
        ) : (
          <>
            {userResults.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>People</Text>
                {userResults.map(user => {
                  const avatarUser = {
                    id: user.id,
                    name: user.name,
                    handle: user.handle ?? user.name,
                    tint: user.tint ?? colors.primary,
                    loc: '',
                    verified: false,
                  };
                  return (
                    <Pressable
                      key={user.id}
                      onPress={() => openUser(user.id)}
                      style={({ pressed }) => [
                        styles.personRow,
                        { borderColor: colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.88 : 1 },
                      ]}
                    >
                      <Avatar user={avatarUser} size={40} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={[styles.personName, { color: colors.text }]} numberOfLines={1}>
                          {user.name}
                        </Text>
                        {user.handle ? (
                          <Text style={[styles.personMeta, { color: colors.textTertiary }]} numberOfLines={1}>
                            @{user.handle}
                          </Text>
                        ) : null}
                      </View>
                      <Icon name="chevronRight" size={14} color={colors.textTertiary} />
                    </Pressable>
                  );
                })}
              </View>
            )}

            {postResults.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>Posts</Text>
                {postResults.map(post => (
                  <Pressable
                    key={post.id}
                    onPress={() => openPost(post.id)}
                    style={({ pressed }) => [
                      styles.postRow,
                      { borderColor: colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.88 : 1 },
                    ]}
                  >
                    <Text style={[styles.postText, { color: colors.text }]} numberOfLines={2}>{post.text}</Text>
                    <Text style={[styles.postMeta, { color: colors.textTertiary }]} numberOfLines={1}>
                      {formatFeedSearchPostMeta(post)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {adoptionResults.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>Adoption</Text>
                {adoptionResults.map(item => (
                  <AdoptionListingRow
                    key={item.id}
                    listing={item}
                    saved={isSaved(item.id)}
                    onPress={() => navigation.navigate('AdoptionHub', {
                      screen: 'Detail',
                      params: {
                        listingId: item.id,
                        returnTo: { tab: 'Feed', screen: 'Search' },
                      },
                    })}
                    onSave={() => toggleSaved(item.id)}
                  />
                ))}
              </View>
            )}

            {rescueResults.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>Rescue</Text>
                {rescueResults.map(item => (
                  <Pressable
                    key={item.id}
                    onPress={() => navigation.navigate('RescueHub', {
                      screen: 'Detail',
                      params: { caseId: item.id },
                    })}
                    style={({ pressed }) => [
                      styles.rescueRow,
                      { borderColor: colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.88 : 1 },
                    ]}
                  >
                    <View style={[styles.rescueIcon, { backgroundColor: item.tint + '22' }]}>
                      <Icon name={item.icon} size={16} color={item.tint} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.rescueName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                      <Text style={[styles.rescueMeta, { color: colors.textTertiary }]} numberOfLines={1}>
                        {item.location} · {item.status}
                      </Text>
                    </View>
                    <Icon name="chevronRight" size={14} color={colors.textTertiary} />
                  </Pressable>
                ))}
              </View>
            )}

            {circleResults.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>Paw Circles</Text>
                {circleResults.map(circle => (
                  <Pressable
                    key={circle.id}
                    onPress={() => navigation.getParent()?.navigate('Circles', {
                      screen: 'CircleChat',
                      params: { circleId: circle.id },
                    })}
                    style={({ pressed }) => [
                      styles.rescueRow,
                      { borderColor: colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.88 : 1 },
                    ]}
                  >
                    <View style={[styles.rescueIcon, { backgroundColor: iconBg(circle.iconBg) }]}>
                      <Icon name={circle.icon} size={16} color={circle.tint} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={styles.circleNameRow}>
                        <Text style={[styles.rescueName, { color: colors.text }]} numberOfLines={1}>
                          {shortCircleName(circle.name)}
                        </Text>
                        <CirclePrivacyLockIcon privacy={circle.privacy} size={13} />
                      </View>
                      <Text style={[styles.rescueMeta, { color: colors.textTertiary }]} numberOfLines={1}>
                        {circle.location} · {circle.memberCount} members
                      </Text>
                    </View>
                    <Icon name="chevronRight" size={14} color={colors.textTertiary} />
                  </Pressable>
                ))}
              </View>
            )}

            {communityResults.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>Communities</Text>
                {communityResults.map(community => (
                  <Pressable
                    key={community.id}
                    onPress={() => navigation.getParent()?.navigate('Community', {
                      screen: 'Group',
                      params: { communityId: community.id },
                    })}
                    style={({ pressed }) => [
                      styles.rescueRow,
                      { borderColor: colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.88 : 1 },
                    ]}
                  >
                    <View style={[styles.rescueIcon, { backgroundColor: community.tint + '22' }]}>
                      <Icon name={community.icon} size={16} color={community.tint} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.rescueName, { color: colors.text }]} numberOfLines={1}>
                        {community.name}
                      </Text>
                      <Text style={[styles.rescueMeta, { color: colors.textTertiary }]} numberOfLines={1}>
                        {community.members} members
                      </Text>
                    </View>
                    <Icon name="chevronRight" size={14} color={colors.textTertiary} />
                  </Pressable>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export function FeedSearchScreen() {
  return (
    <RescueFeedProvider>
      <FeedSearchBody />
    </RescueFeedProvider>
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
    paddingVertical: Platform.OS === 'ios' ? 11 : 8,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
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
  scroll: { paddingHorizontal: 16, flexGrow: 1 },
  section: { marginBottom: 18 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 8,
  },
  personName: { fontSize: 14.5, fontWeight: '600' },
  personMeta: { fontSize: 12, marginTop: 2 },
  postRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 8,
  },
  postText: { fontSize: 14.5, lineHeight: 20, fontWeight: '500' },
  postMeta: { fontSize: 12, marginTop: 4 },
  rescueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 8,
  },
  rescueIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rescueName: { fontSize: 14.5, fontWeight: '600', flexShrink: 1 },
  circleNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 0 },
  rescueMeta: { fontSize: 12, marginTop: 2 },
});
