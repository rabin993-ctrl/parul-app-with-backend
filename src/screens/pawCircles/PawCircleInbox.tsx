import React, { useMemo, useState } from 'react';
import {
  View, Text, Pressable, ScrollView, StyleSheet, Platform, TextInput,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing, typography } from '../../theme/tokens';
import { Icon } from '../../components/icons/Icon';
import { useAdoption, type ChatThread } from '../../context/AdoptionContext';
import { useAuth } from '../../context/AuthContext';
import { groupThreads } from '../../utils/chatThreadMeta';
import { GeneralThreadRow } from '../MessagesScreen';
import { PawCircle } from '../../data/pawCircles';
import { getCirclePreview } from '../../data/pawCircleChat';
import { PawCircleSectionLabel } from './PawCircleChrome';

type InboxFilter = 'all' | 'circles' | 'unread';

const ROW_AVATAR_SIZE = 48;

type PawCircleInboxProps = {
  circles: PawCircle[];
  createdIds: Set<string>;
  onCreate: () => void;
  onExplore?: () => void;
  onOpenCircleChat: (circleId: string) => void;
  onOpenDmThread: (thread: ChatThread) => void;
};

export function PawCircleInbox({
  circles,
  createdIds,
  onCreate,
  onExplore,
  onOpenCircleChat,
  onOpenDmThread,
}: PawCircleInboxProps) {
  const { colors } = useTheme();
  const { threads, records } = useAdoption();
  const { user } = useAuth();
  const [filter, setFilter] = useState<InboxFilter>('all');
  const [query, setQuery] = useState('');

  const dmThreads = useMemo(() => {
    const grouped = groupThreads(threads, records, user?.id ?? '');
    return grouped.general;
  }, [threads, records, user?.id]);

  const unreadDmCount = useMemo(
    () => dmThreads.reduce((sum, t) => sum + t.unread, 0),
    [dmThreads],
  );

  const unreadCircleCount = useMemo(
    () => circles.reduce((sum, c) => sum + getCirclePreview(c.id).unread, 0),
    [circles],
  );

  const filterPills: { id: InboxFilter; label: string; count?: number }[] = [
    { id: 'all', label: 'All' },
    { id: 'circles', label: 'Circles' },
    {
      id: 'unread',
      label: 'Unread',
      ...((unreadDmCount + unreadCircleCount) > 0
        ? { count: unreadDmCount + unreadCircleCount }
        : {}),
    },
  ];

  const q = query.trim().toLowerCase();

  const filteredDms = useMemo(() => {
    if (filter === 'circles') return [];
    let list = dmThreads;
    if (filter === 'unread') list = list.filter(t => t.unread > 0);
    if (q) {
      list = list.filter(t => {
        const name = (t.participantName ?? t.participantId).toLowerCase();
        const handle = (t.participantHandle ?? '').toLowerCase();
        return name.includes(q) || handle.includes(q) || t.preview.toLowerCase().includes(q);
      });
    }
    return list;
  }, [dmThreads, filter, q]);

  const filteredCircles = useMemo(() => {
    if (filter === 'all' || filter === 'circles' || filter === 'unread') {
      let list = circles;
      if (filter === 'unread') {
        list = list.filter(c => getCirclePreview(c.id).unread > 0);
      }
      if (q) {
        list = list.filter(c =>
          c.name.toLowerCase().includes(q)
          || c.location.toLowerCase().includes(q)
          || getCirclePreview(c.id).lastMessage.toLowerCase().includes(q),
        );
      }
      return list;
    }
    return [];
  }, [circles, filter, q]);

  const showEmpty = filteredDms.length === 0 && filteredCircles.length === 0;

  const yoursCircles = useMemo(
    () => filteredCircles.filter(c => createdIds.has(c.id)),
    [filteredCircles, createdIds],
  );

  const joinedCircles = useMemo(
    () => filteredCircles.filter(c => !createdIds.has(c.id)),
    [filteredCircles, createdIds],
  );

  const showCircleSections = filter === 'circles'
    && yoursCircles.length > 0
    && joinedCircles.length > 0;

  const renderCircleRows = (list: PawCircle[], showRoleBadge: boolean) => list.map(circle => (
    <CircleInboxRow
      key={`circle-${circle.id}`}
      circle={circle}
      isCreated={createdIds.has(circle.id)}
      showRoleBadge={showRoleBadge}
      onOpenChat={() => onOpenCircleChat(circle.id)}
    />
  ));

  return (
    <View style={styles.wrap}>
      <View style={styles.toolbar}>
        <View style={[styles.searchBar, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
          <Icon name="search" size={18} color={colors.textTertiary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search chats"
            placeholderTextColor={colors.textTertiary}
            style={[styles.searchInput, { color: colors.text }]}
          />
        </View>

        <Pressable
          onPress={onCreate}
          accessibilityRole="button"
          accessibilityLabel="Create circle"
          style={({ pressed }) => [
            styles.createBtn,
            { opacity: pressed ? 0.55 : 1 },
            Platform.OS === 'web' && styles.createBtnWeb,
          ]}
        >
          <Icon name="plus" size={22} color={colors.primary} sw={2.2} />
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {filterPills.map(pill => {
          const active = filter === pill.id;
          return (
            <Pressable
              key={pill.id}
              onPress={() => setFilter(pill.id)}
              accessibilityRole="tab"
              accessibilityState={active ? { selected: true } : {}}
              style={[
                styles.filterPill,
                {
                  backgroundColor: active ? colors.primary + '18' : colors.bg,
                  borderColor: active ? colors.primary + '55' : colors.border,
                },
                Platform.OS === 'web' && styles.filterPillWeb,
              ]}
            >
              <Text
                style={[
                  styles.filterPillText,
                  { color: active ? colors.primary : colors.text },
                  active && styles.filterPillTextActive,
                ]}
              >
                {pill.label}
                {pill.count !== undefined ? ` ${pill.count}` : ''}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {showEmpty ? (
        <View style={styles.emptyState}>
          <Icon name="send" size={32} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {filter === 'unread' ? 'No unread chats' : 'No chats yet'}
          </Text>
          <Text style={[styles.emptyBody, { color: colors.textTertiary }]}>
            {filter === 'circles'
              ? 'Create or join a circle to start chatting.'
              : 'Direct messages and circle chats appear here.'}
          </Text>
          {onExplore && filter === 'circles' && (
            <Pressable onPress={onExplore} hitSlop={8}>
              <Text style={[styles.exploreLink, { color: colors.primary }]}>Explore circles</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <View style={styles.list}>
          {filter !== 'circles' && filteredDms.map(thread => (
            <GeneralThreadRow
              key={`dm-${thread.id}`}
              thread={thread}
              onPress={() => onOpenDmThread(thread)}
            />
          ))}

          {filter === 'circles' && showCircleSections ? (
            <>
              <View style={styles.circleSection}>
                <PawCircleSectionLabel>Yours</PawCircleSectionLabel>
                {renderCircleRows(yoursCircles, false)}
              </View>
              <View style={styles.circleSection}>
                <PawCircleSectionLabel>Joined</PawCircleSectionLabel>
                {renderCircleRows(joinedCircles, false)}
              </View>
            </>
          ) : (
            renderCircleRows(filteredCircles, filter !== 'circles')
          )}
        </View>
      )}
    </View>
  );
}

function CircleInboxRow({
  circle,
  isCreated,
  showRoleBadge,
  onOpenChat,
}: {
  circle: PawCircle;
  isCreated: boolean;
  showRoleBadge: boolean;
  onOpenChat: () => void;
}) {
  const { colors, iconBg } = useTheme();
  const preview = getCirclePreview(circle.id);
  const isUnread = preview.unread > 0;
  const filled = circle.icon === 'paw' || circle.icon === 'cat' || circle.icon === 'dog' || circle.icon === 'adoption';

  return (
    <Pressable
      onPress={onOpenChat}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: isUnread ? colors.primary + '06' : 'transparent' },
        pressed && styles.rowPressed,
      ]}
    >
      <View style={[styles.avatarWrap, { width: ROW_AVATAR_SIZE, minHeight: ROW_AVATAR_SIZE }]}>
        <View style={[styles.circleAvatar, { backgroundColor: iconBg(circle.iconBg) }]}>
          <Icon
            name={circle.icon}
            size={22}
            color={circle.tint}
            fill={filled ? circle.tint : 'none'}
          />
        </View>
      </View>

      <View style={styles.meta}>
        <View style={styles.topRow}>
          <View style={styles.titleWrap}>
            <Text
              style={[
                styles.titleLine,
                { color: colors.text, fontWeight: isUnread ? '800' : '700' },
              ]}
              numberOfLines={1}
            >
              {circle.name}
            </Text>
            {showRoleBadge && isCreated && (
              <View style={[styles.rolePill, { backgroundColor: colors.primary + '14' }]}>
                <Text style={[styles.rolePillText, { color: colors.primary }]}>Yours</Text>
              </View>
            )}
          </View>
          <View style={styles.trailing}>
            {preview.lastMessageTime ? (
              <Text style={[styles.time, { color: colors.textTertiary }]}>
                {preview.lastMessageTime}
              </Text>
            ) : null}
            {isUnread && (
              <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.unreadCount}>
                  {preview.unread > 99 ? '99+' : preview.unread}
                </Text>
              </View>
            )}
          </View>
        </View>

        <Text
          style={[
            styles.preview,
            {
              color: isUnread ? colors.text : colors.textSecondary,
              fontWeight: isUnread ? '500' : '400',
            },
          ]}
          numberOfLines={2}
        >
          {preview.lastMessage}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  createBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  createBtnWeb: { cursor: 'pointer' as const },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'web' ? 7 : 6,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  filterRow: {
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  filterPillWeb: { cursor: 'pointer' as const },
  filterPillText: { fontSize: 13.5, fontWeight: '600' },
  filterPillTextActive: { fontWeight: '700' },
  list: { paddingTop: spacing.xs },
  circleSection: { gap: spacing.xs },
  emptyState: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl2,
    paddingVertical: spacing.xl3,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2, marginTop: spacing.sm },
  emptyBody: { ...typography.small, textAlign: 'center' },
  exploreLink: { fontSize: 14, fontWeight: '700', marginTop: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowPressed: { opacity: 0.7 },
  avatarWrap: {
    justifyContent: 'flex-end',
    alignItems: 'center',
    overflow: 'visible',
    flexShrink: 0,
  },
  circleAvatar: {
    width: ROW_AVATAR_SIZE,
    height: ROW_AVATAR_SIZE,
    borderRadius: ROW_AVATAR_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: { flex: 1, gap: 3, minWidth: 0 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  titleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  titleLine: { fontSize: 16.5, letterSpacing: -0.2, flexShrink: 1 },
  rolePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.full,
    flexShrink: 0,
  },
  rolePillText: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.1 },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 0 },
  time: { ...typography.meta, fontSize: 12 },
  unreadBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadCount: { color: '#fff', fontSize: 11, fontWeight: '700', lineHeight: 13 },
  preview: { ...typography.small, fontSize: 14, lineHeight: 19, marginTop: 1 },
});
