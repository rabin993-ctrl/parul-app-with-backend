import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, Pressable, Image, StyleSheet, ScrollView, TextInput, Switch, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing, typography } from '../../theme/tokens';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/icons/Icon';
import { Sheet } from '../../components/ui/Sheet';
import { Toast, ToastData } from '../../components/ui/Toast';
import { usePawCircles } from '../../context/PawCircleContext';
import type { CirclesStackParamList } from '../../navigation/CirclesNavigator';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';
import {
  countJoinRequests, getPinnedMessages, getSharedMedia,
} from '../../data/pawCircleChat';
import { users } from '../../data/mockData';
import { CircleHeroCard, EditCircleSheet } from './CircleHeroCard';
import {
  CircleSettingsRow,
  CircleSettingsSection,
  PawCirclePageHeader,
  pawCircleStyles,
} from './PawCircleChrome';

type Route = RouteProp<CirclesStackParamList, 'CircleSettings'>;
type Nav = NativeStackNavigationProp<CirclesStackParamList, 'CircleSettings'>;

const MUTE_KEY = (id: string) => `parul:circleMute:${id}`;

const REPORT_REASONS = [
  'Spam or misleading content',
  'Harassment or bullying',
  'Inappropriate media',
  'Circle safety concern',
  'Other',
];

const SETTINGS_ROW_INSET = 56;
const MEDIA_PEEK_COLS = 3;

function StatItem({
  value,
  label,
  showDivider,
}: {
  value: string;
  label: string;
  showDivider?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <>
      <View style={styles.statItem}>
        <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
        <Text style={[styles.statLabel, { color: colors.textTertiary }]}>{label}</Text>
      </View>
      {showDivider ? (
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
      ) : null}
    </>
  );
}

function QuickLink({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.quickLink,
        pressed && styles.quickLinkPressed,
        Platform.OS === 'web' && styles.quickLinkWeb,
      ]}
    >
      <Icon name={icon} size={16} color={colors.textSecondary} sw={1.9} />
      <Text style={[styles.quickLinkLabel, { color: colors.text }]}>{label}</Text>
    </Pressable>
  );
}

export function CircleSettingsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { circleId } = route.params;
  const { getCircle, createdCircles, leaveCircle, updateCircle } = usePawCircles();
  const circle = getCircle(circleId);
  const [muteNotifs, setMuteNotifs] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [reportReason, setReportReason] = useState<string | null>(null);
  const [reportNote, setReportNote] = useState('');
  const tabBarPad = useTabBarScrollPadding();

  useEffect(() => {
    AsyncStorage.getItem(MUTE_KEY(circleId)).then(v => {
      if (v === '1') setMuteNotifs(true);
    });
  }, [circleId]);

  const toggleMute = useCallback(async (next: boolean) => {
    setMuteNotifs(next);
    await AsyncStorage.setItem(MUTE_KEY(circleId), next ? '1' : '0');
    setToast({
      msg: next ? 'Notifications muted for this circle' : 'Notifications enabled',
      icon: 'bell',
      tone: 'neutral',
    });
  }, [circleId]);

  if (!circle) return null;

  const isOwner = createdCircles.some(c => c.id === circleId);
  const sharedMedia = getSharedMedia(circleId);
  const photos = sharedMedia.filter(m => m.type === 'photo');
  const files = sharedMedia.filter(m => m.type === 'file');
  const pinnedMessages = getPinnedMessages(circleId);
  const role = isOwner ? 'You created this circle' : 'You are a member';
  const displayBio = circle.bio ?? circle.tagline ?? '';
  const pendingRequests = isOwner ? countJoinRequests(circleId) : 0;

  const saveEdit = async (name: string, bio: string) => {
    if (!name.trim()) return;
    setSavingEdit(true);
    await updateCircle(circleId, { name, bio });
    setSavingEdit(false);
    setEditOpen(false);
    setToast({ msg: 'Circle updated', icon: 'check', tone: 'success' });
  };

  const submitReport = () => {
    if (!reportReason) return;
    setReportOpen(false);
    setReportReason(null);
    setReportNote('');
    setToast({
      msg: 'Report submitted — we\'ll review shortly',
      icon: 'check',
      tone: 'success',
    });
  };

  const handleLeave = async () => {
    if (!confirmLeave) {
      setConfirmLeave(true);
      return;
    }
    await leaveCircle(circleId);
    setToast({ msg: `Left ${circle.name}`, icon: 'check', tone: 'neutral' });
    navigation.navigate('Hub');
  };

  const sharedMediaHint = sharedMedia.length === 0
    ? 'Photos and files from circle chat'
    : [
        photos.length > 0 ? `${photos.length} photo${photos.length === 1 ? '' : 's'}` : null,
        files.length > 0 ? `${files.length} file${files.length === 1 ? '' : 's'}` : null,
      ].filter(Boolean).join(' · ');

  const chevron = <Icon name="chevronRight" size={15} color={colors.textTertiary} />;
  const membersTrailing = pendingRequests > 0 ? (
    <View style={styles.rowTrailingGroup}>
      <View style={[styles.requestCountPill, { backgroundColor: colors.danger }]}>
        <Text style={styles.requestCountText}>{pendingRequests}</Text>
      </View>
      {chevron}
    </View>
  ) : chevron;

  return (
    <>
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
        <PawCirclePageHeader title="Circle settings" />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[pawCircleStyles.detailScroll, { paddingBottom: tabBarPad }]}
        >
          <CircleHeroCard
            circle={circle}
            bio={displayBio}
            role={role}
            canEdit={isOwner}
            onEdit={() => setEditOpen(true)}
          />

          <View style={styles.statStrip}>
            <StatItem value={String(circle.memberCount)} label="Members" showDivider />
            <StatItem value={String(sharedMedia.length)} label="Shared" showDivider />
            <StatItem value={String(pinnedMessages.length)} label="Pinned" />
          </View>

          <View style={styles.quickActions}>
            <QuickLink
              label="Chat"
              icon="comment"
              onPress={() => navigation.navigate('CircleChat', { circleId })}
            />
            <QuickLink
              label="Members"
              icon="circles"
              onPress={() => navigation.navigate('CircleMembers', { circleId })}
            />
            {isOwner && (
              <QuickLink
                label="Admin"
                icon="shield"
                onPress={() => navigation.navigate('CircleAdmin', { circleId })}
              />
            )}
          </View>

          <CircleSettingsSection title="Manage">
            {isOwner && (
              <CircleSettingsRow
                icon="shield"
                label="Admin controls"
                hint="Privacy, members, and circle details"
                tint={colors.warning}
                onPress={() => navigation.navigate('CircleAdmin', { circleId })}
                trailing={chevron}
                showDivider
              />
            )}
            <CircleSettingsRow
              icon="circles"
              label="Members"
              hint={
                pendingRequests > 0
                  ? `${pendingRequests} pending join request${pendingRequests === 1 ? '' : 's'}`
                  : `${circle.memberCount} people in this circle`
              }
              tint={colors.success}
              onPress={() => navigation.navigate('CircleMembers', { circleId })}
              trailing={membersTrailing}
              showDivider
            />
            <CircleSettingsRow
              icon="bell"
              label="Mute notifications"
              hint={muteNotifs ? 'Alerts are paused for this circle' : 'Get alerts for new activity'}
              tint={colors.primary}
              trailing={
                <Switch
                  value={muteNotifs}
                  onValueChange={toggleMute}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#fff"
                  ios_backgroundColor={colors.border}
                />
              }
            />
          </CircleSettingsSection>

          <CircleSettingsSection
            title="Content"
            action={sharedMedia.length > 0 ? (
              <Pressable
                onPress={() => setMediaOpen(true)}
                accessibilityRole="button"
                accessibilityLabel={`See all shared media, ${sharedMedia.length} items`}
                style={({ pressed }) => [styles.sectionAction, pressed && styles.rowPressed]}
              >
                <Text style={[styles.sectionActionText, { color: colors.primary }]}>
                  See all · {sharedMedia.length}
                </Text>
              </Pressable>
            ) : null}
          >
            <CircleSettingsRow
              icon="bookmark"
              label="Pinned messages"
              hint={
                pinnedMessages.length > 0
                  ? `${pinnedMessages.length} saved in this circle`
                  : 'Nothing pinned yet'
              }
              tint={colors.primary}
              onPress={() => setPinnedOpen(true)}
              trailing={chevron}
              showDivider
            />
            <CircleSettingsRow
              icon="image"
              label="Shared media"
              hint={sharedMediaHint}
              tint={colors.primary}
              onPress={() => setMediaOpen(true)}
              trailing={chevron}
              showDivider={false}
            />
            {photos.length > 0 ? (
              <Pressable
                onPress={() => setMediaOpen(true)}
                accessibilityRole="button"
                accessibilityLabel={`See all shared media, ${sharedMedia.length} items`}
                style={({ pressed }) => [
                  styles.mediaPeek,
                  pressed && styles.rowPressed,
                  Platform.OS === 'web' && styles.mediaPeekWeb,
                ]}
              >
                <View style={styles.mediaPeekRow}>
                  {photos.slice(0, MEDIA_PEEK_COLS).map((item, index, slice) => {
                    const showSeeAll = index === slice.length - 1 && sharedMedia.length > MEDIA_PEEK_COLS;
                    return (
                      <View key={item.id} style={styles.mediaPeekCell}>
                        {item.uri ? (
                          <Image source={{ uri: item.uri }} style={styles.mediaImg} resizeMode="cover" />
                        ) : (
                          <View style={[styles.mediaPeekFallback, { backgroundColor: colors.primary + '10' }]}>
                            <Icon name="image" size={20} color={colors.primary} />
                          </View>
                        )}
                        {showSeeAll ? (
                          <View style={styles.mediaPeekOverlay}>
                            <Text style={styles.mediaPeekSeeAll}>See all</Text>
                            <Text style={styles.mediaPeekCount}>{sharedMedia.length}</Text>
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              </Pressable>
            ) : null}
          </CircleSettingsSection>

          <CircleSettingsSection title="Support">
            <CircleSettingsRow
              icon="flag"
              label="Report a problem"
              hint="Help us keep this circle safe"
              tint={colors.textSecondary}
              onPress={() => setReportOpen(true)}
              trailing={chevron}
            />
          </CircleSettingsSection>

          {!isOwner && (
            <Pressable
              onPress={handleLeave}
              style={({ pressed }) => [
                styles.leavePill,
                {
                  backgroundColor: colors.lostBg,
                  borderColor: colors.lostBorder,
                  opacity: pressed ? 0.78 : 1,
                },
              ]}
            >
              <Icon name="logout" size={16} color={colors.lost} />
              <Text style={[styles.leavePillText, { color: colors.lost }]}>
                {confirmLeave ? 'Tap again to confirm leave' : 'Leave circle'}
              </Text>
            </Pressable>
          )}
        </ScrollView>
      </SafeAreaView>

      <EditCircleSheet
        visible={editOpen}
        circle={circle}
        onClose={() => setEditOpen(false)}
        onSave={saveEdit}
        saving={savingEdit}
      />

      <Sheet visible={mediaOpen} onClose={() => setMediaOpen(false)} title="Shared media">
        <View style={styles.sheetBody}>
          {photos.length > 0 && (
            <>
              <Text style={[styles.sheetFolderLabel, { color: colors.textTertiary }]}>Photos</Text>
              <View style={styles.mediaSheetGrid}>
                {photos.map(item => (
                  <Pressable
                    key={item.id}
                    style={styles.mediaSheetCell}
                    onPress={() => setToast({ msg: `Opened ${item.name}`, icon: 'image', tone: 'neutral' })}
                  >
                    {item.uri && <Image source={{ uri: item.uri }} style={styles.mediaImg} />}
                  </Pressable>
                ))}
              </View>
            </>
          )}
          {files.length > 0 && (
            <>
              <Text style={[styles.sheetFolderLabel, { color: colors.textTertiary }]}>Files</Text>
              {files.map((item, index) => (
                <View key={item.id}>
                  <Pressable
                    onPress={() => setToast({ msg: `Opened ${item.name}`, icon: 'bookmark', tone: 'neutral' })}
                    style={({ pressed }) => [styles.fileRow, pressed && styles.rowPressed]}
                  >
                    <View style={[styles.fileIconWell, { backgroundColor: colors.primary + '14' }]}>
                      <Icon name="bookmark" size={16} color={colors.primary} />
                    </View>
                    <View style={styles.fileMeta}>
                      <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={[styles.fileSub, { color: colors.textTertiary }]}>
                        {[item.size, item.time].filter(Boolean).join(' · ')}
                      </Text>
                    </View>
                    <Icon name="chevronRight" size={14} color={colors.textTertiary} />
                  </Pressable>
                  {index < files.length - 1 && (
                    <View style={[styles.fileDivider, { backgroundColor: colors.border }]} />
                  )}
                </View>
              ))}
            </>
          )}
          {sharedMedia.length === 0 && (
            <View style={styles.sheetEmpty}>
              <Icon name="image" size={28} color={colors.textTertiary} />
              <Text style={[styles.sheetEmptyText, { color: colors.textSecondary }]}>
                No shared media in this circle yet.
              </Text>
            </View>
          )}
        </View>
      </Sheet>

      <Sheet visible={pinnedOpen} onClose={() => setPinnedOpen(false)} title="Pinned messages">
        <View style={styles.sheetBody}>
          {pinnedMessages.length === 0 ? (
            <View style={styles.sheetEmpty}>
              <Icon name="bookmark" size={28} color={colors.textTertiary} />
              <Text style={[styles.sheetEmptyText, { color: colors.textSecondary }]}>
                No pinned messages in this circle yet.
              </Text>
            </View>
          ) : (
            pinnedMessages.map((msg, i) => {
              const author = users[msg.userId];
              return (
                <View key={msg.id}>
                  <Pressable
                    onPress={() => {
                      setPinnedOpen(false);
                      navigation.navigate('CircleChat', { circleId });
                    }}
                    style={({ pressed }) => [styles.pinnedRow, pressed && styles.rowPressed]}
                  >
                    <View style={[styles.pinnedIconWell, { backgroundColor: colors.primary + '14' }]}>
                      <Icon name="bookmark" size={16} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.pinnedAuthor, { color: colors.text }]}>
                        {author?.name ?? 'Member'}
                      </Text>
                      <Text style={[styles.pinnedText, { color: colors.textSecondary }]} numberOfLines={2}>
                        {msg.text}
                      </Text>
                      <Text style={[styles.pinnedTime, { color: colors.textTertiary }]}>{msg.time}</Text>
                    </View>
                    <Icon name="chevronRight" size={14} color={colors.textTertiary} />
                  </Pressable>
                  {i < pinnedMessages.length - 1 && (
                    <View style={[styles.fileDivider, { backgroundColor: colors.border }]} />
                  )}
                </View>
              );
            })
          )}
        </View>
      </Sheet>

      <Sheet
        visible={reportOpen}
        onClose={() => { setReportOpen(false); setReportReason(null); setReportNote(''); }}
        title="Report a problem"
        footer={
          <Button
            full
            variant="primary"
            disabled={!reportReason}
            onPress={submitReport}
          >
            Submit report
          </Button>
        }
      >
        <View style={styles.sheetBody}>
          <Text style={[styles.reportLead, { color: colors.textSecondary }]}>
            What would you like to report about {circle.name}?
          </Text>
          {REPORT_REASONS.map(reason => {
            const active = reportReason === reason;
            return (
              <Pressable
                key={reason}
                onPress={() => setReportReason(reason)}
                style={[
                  styles.reportOption,
                  { backgroundColor: active ? colors.primary + '14' : 'transparent' },
                ]}
              >
                <Text style={[styles.reportOptionText, { color: active ? colors.primary : colors.text }]}>
                  {reason}
                </Text>
                {active && <Icon name="check" size={14} color={colors.primary} />}
              </Pressable>
            );
          })}
          <TextInput
            style={[
              styles.reportInput,
              { color: colors.text, borderBottomColor: colors.border },
            ]}
            placeholder="Add details (optional)"
            placeholderTextColor={colors.textTertiary}
            value={reportNote}
            onChangeText={setReportNote}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>
      </Sheet>

      <Toast data={toast} onHide={() => setToast(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  statStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    paddingVertical: spacing.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    marginVertical: 2,
  },
  statValue: {
    ...typography.title,
    fontSize: 18,
    letterSpacing: -0.3,
  },
  statLabel: {
    ...typography.meta,
    fontSize: 11,
    letterSpacing: 0.1,
  },
  quickActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.xs,
  },
  quickLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.xs,
  },
  quickLinkPressed: { opacity: 0.62 },
  quickLinkWeb: { cursor: 'pointer' as const },
  quickLinkLabel: {
    ...typography.label,
    fontSize: 14,
    letterSpacing: -0.1,
  },
  rowTrailingGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requestCountPill: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  requestCountText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  sectionAction: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  sectionActionText: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '700',
  },
  mediaPeek: {
    marginTop: spacing.xs,
    paddingLeft: SETTINGS_ROW_INSET,
    alignSelf: 'stretch',
    alignItems: 'flex-start',
  },
  mediaPeekWeb: {
    cursor: 'pointer' as const,
    width: '100%',
  },
  mediaPeekRow: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    width: '100%',
    gap: spacing.sm,
  },
  mediaPeekCell: {
    flex: 1,
    aspectRatio: 1,
    minWidth: 0,
    borderRadius: radius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  mediaPeekFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaPeekOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.52)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  mediaPeekSeeAll: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.1,
    textAlign: 'center',
  },
  mediaPeekCount: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  mediaImg: { width: '100%', height: '100%' },
  leavePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.xs,
    ...Platform.select({
      web: { cursor: 'pointer' as const },
      default: {},
    }),
  },
  leavePillText: {
    ...typography.label,
    fontSize: 15,
  },
  rowPressed: { opacity: 0.68 },
  sheetBody: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.sm, gap: spacing.sm },
  sheetFolderLabel: {
    ...typography.sectionLabel,
    marginBottom: spacing.xs,
  },
  mediaSheetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  mediaSheetCell: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md - 2,
    paddingVertical: spacing.sm + 2,
  },
  fileIconWell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileMeta: { flex: 1, gap: 2, minWidth: 0 },
  fileName: { ...typography.label, fontSize: 14 },
  fileSub: { ...typography.meta },
  fileDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 48,
  },
  sheetEmpty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl2 },
  sheetEmptyText: { ...typography.small, textAlign: 'center', lineHeight: 20 },
  pinnedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md - 2,
    paddingVertical: spacing.sm + 2,
  },
  pinnedIconWell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinnedAuthor: { ...typography.caption, fontWeight: '700' },
  pinnedText: { ...typography.small, lineHeight: 18, marginTop: 2 },
  pinnedTime: { ...typography.meta, marginTop: 4 },
  reportLead: { ...typography.small, lineHeight: 18, marginBottom: spacing.xs },
  reportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
  },
  reportOptionText: { ...typography.label, fontSize: 14, flex: 1 },
  reportInput: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 0,
    paddingVertical: spacing.sm + 2,
    fontSize: 14,
    minHeight: 80,
    marginTop: spacing.xs,
  },
});
