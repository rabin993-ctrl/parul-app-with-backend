import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { radius, typography } from '../theme/tokens';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { IconButton } from '../components/ui/Button';
import { Icon } from '../components/icons/Icon';
import { users } from '../data/mockData';
import { useAdoption, type ChatThread } from '../context/AdoptionContext';
import { ChatThreadScreen } from './ChatThreadScreen';
import { useTabBarScrollPadding } from '../navigation/tabBarInsets';
import { useTabBarScrollProps } from '../context/TabBarScrollContext';
import { getThreadAdoptionMeta, getThreadDisplayPreview, groupThreads } from '../utils/chatThreadMeta';

export function MessagesScreen() {
  const { colors } = useTheme();
  const tabBarPad = useTabBarScrollPadding();
  const tabBarScrollProps = useTabBarScrollProps();
  const { threads, records } = useAdoption();
  const [activeThread, setActiveThread] = useState<ChatThread | null>(null);

  const grouped = useMemo(() => groupThreads(threads, records), [threads, records]);
  const actionCount = grouped.action.length;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Messages</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Chats with fosters, adopters, and pet parents
          </Text>
        </View>
        <IconButton name="edit" size={40} tone="soft" color={colors.textSecondary} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: tabBarPad, paddingTop: 4 }}
        showsVerticalScrollIndicator={false}
        {...tabBarScrollProps}
      >
        {actionCount > 0 && (
          <ThreadSection
            title="Needs your action"
            hint={`${actionCount} ${actionCount === 1 ? 'chat needs' : 'chats need'} a response`}
            accent={colors.warning}
          >
            {grouped.action.map(thread => (
              <ThreadRow key={thread.id} thread={thread} records={records} onPress={() => setActiveThread(thread)} />
            ))}
          </ThreadSection>
        )}

        {grouped.adoption.length > 0 && (
          <ThreadSection
            title="Adoption chats"
            hint="About a pet you're adopting or rehoming"
            accent={colors.primary}
          >
            {grouped.adoption.map(thread => (
              <ThreadRow key={thread.id} thread={thread} records={records} onPress={() => setActiveThread(thread)} />
            ))}
          </ThreadSection>
        )}

        {grouped.general.length > 0 && (
          <ThreadSection title="Other messages" hint="General conversations">
            {grouped.general.map(thread => (
              <ThreadRow key={thread.id} thread={thread} records={records} onPress={() => setActiveThread(thread)} />
            ))}
          </ThreadSection>
        )}
      </ScrollView>

      <Modal visible={!!activeThread} animationType="slide" onRequestClose={() => setActiveThread(null)}>
        {activeThread && (
          <ChatThreadScreen thread={activeThread} onClose={() => setActiveThread(null)} />
        )}
      </Modal>
    </SafeAreaView>
  );
}

function ThreadSection({
  title,
  hint,
  accent,
  children,
}: {
  title: string;
  hint?: string;
  accent?: string;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        {accent && <View style={[styles.sectionDot, { backgroundColor: accent }]} />}
        <View style={styles.sectionText}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>{title.toUpperCase()}</Text>
          {hint && (
            <Text style={[styles.sectionHint, { color: colors.textTertiary }]}>{hint}</Text>
          )}
        </View>
      </View>
      {children}
    </View>
  );
}

function ThreadRow({
  thread,
  records,
  onPress,
}: {
  thread: ChatThread;
  records: ReturnType<typeof useAdoption>['records'];
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const user = users[thread.participantId as keyof typeof users];
  const meta = getThreadAdoptionMeta(thread, records);
  const previewText = getThreadDisplayPreview(thread, records, thread.preview);
  if (!user) return null;

  const isUnread = thread.unread > 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          borderBottomColor: colors.border,
          backgroundColor: meta?.needsAction
            ? colors.warningBg + '80'
            : isUnread
              ? colors.primary + '08'
              : 'transparent',
        },
        pressed && styles.rowPressed,
      ]}
    >
      <View style={styles.avatarWrap}>
        <Avatar user={user} size={50} showBadge={false} />
        {meta?.isAdoption && (
          <View style={[styles.adoptIcon, { backgroundColor: colors.primary, borderColor: colors.bg }]}>
            <Icon name="adoption" size={10} color={colors.onPrimary} />
          </View>
        )}
      </View>

      <View style={styles.meta}>
        {meta ? (
          <>
            <View style={styles.topRow}>
              <Text style={[styles.petTitle, { color: colors.text }]} numberOfLines={1}>
                {meta.petName ?? 'Adoption'}
              </Text>
              <Text style={[styles.time, { color: colors.textTertiary }]}>{thread.time}</Text>
            </View>
            <View style={styles.identityRow}>
              <Text style={[styles.personName, { color: colors.textSecondary }]} numberOfLines={1}>
                {user.name}
              </Text>
              <Text style={[styles.handle, { color: colors.primary }]}>@{user.handle}</Text>
            </View>
            <View style={styles.badgeRow}>
              <Badge tone={meta.statusTone} icon={meta.needsAction ? 'alert' : 'adoption'}>
                {meta.statusLabel}
              </Badge>
              <Text style={[styles.roleHint, { color: colors.textTertiary }]} numberOfLines={1}>
                {meta.roleLabel}
              </Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.topRow}>
              <Text style={[styles.personName, { color: colors.text, fontWeight: '600' }]} numberOfLines={1}>
                {user.name}
              </Text>
              <Text style={[styles.time, { color: colors.textTertiary }]}>{thread.time}</Text>
            </View>
            <Text style={[styles.handle, { color: colors.primary }]}>@{user.handle}</Text>
          </>
        )}

        <Text
          style={[
            styles.preview,
            { color: isUnread ? colors.text : colors.textSecondary, fontWeight: isUnread ? '500' : '400' },
          ]}
          numberOfLines={2}
        >
          {previewText}
        </Text>

        {meta?.needsAction && meta.actionLabel && (
          <View style={[styles.actionHint, { backgroundColor: colors.warning + '18' }]}>
            <Icon name="chevronRight" size={12} color={colors.warning} />
            <Text style={[styles.actionHintText, { color: colors.warning }]}>{meta.actionLabel}</Text>
          </View>
        )}
      </View>

      {isUnread && (
        <View style={[styles.badge, { backgroundColor: colors.primary }]}>
          <Text style={[styles.badgeText, { color: colors.onPrimary }]}>{thread.unread}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
  },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { ...typography.small, marginTop: 2, maxWidth: 280 },
  section: { marginBottom: 8 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sectionDot: { width: 6, height: 6, borderRadius: 3, marginTop: 5 },
  sectionText: { flex: 1, gap: 2 },
  sectionTitle: { ...typography.sectionLabel, fontSize: 11, letterSpacing: 0.8 },
  sectionHint: { ...typography.meta, fontSize: 11 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowPressed: { opacity: 0.7 },
  avatarWrap: { position: 'relative' },
  adoptIcon: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  meta: { flex: 1, gap: 4, minWidth: 0 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  petTitle: { ...typography.label, fontSize: 16, flex: 1 },
  personName: { ...typography.small, fontSize: 13 },
  handle: { ...typography.caption, fontSize: 12 },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  roleHint: { ...typography.meta, fontSize: 11, flex: 1 },
  time: { ...typography.meta, fontSize: 12 },
  preview: { ...typography.small, fontSize: 14, lineHeight: 19, marginTop: 2 },
  actionHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    marginTop: 2,
  },
  actionHintText: { ...typography.caption, fontSize: 11, fontWeight: '600' },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginTop: 4,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
});
