import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, Pressable, Image, StyleSheet, ScrollView, TextInput, Switch, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { IconButton, Button } from '../../components/ui/Button';
import { Icon } from '../../components/icons/Icon';
import { Sheet } from '../../components/ui/Sheet';
import { Toast, ToastData } from '../../components/ui/Toast';
import { usePawCircles } from '../../context/PawCircleContext';
import type { CirclesStackParamList } from '../../navigation/CirclesNavigator';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';
import {
  countJoinRequests, getPinnedMedia, getPinnedMessages, getSharedMedia,
} from '../../data/pawCircleChat';
import { users } from '../../data/mockData';
import { CircleHeroCard, EditCircleSheet } from './CircleHeroCard';

type Route = RouteProp<CirclesStackParamList, 'CircleSettings'>;
type Nav = NativeStackNavigationProp<CirclesStackParamList, 'CircleSettings'>;

const MUTE_KEY = (id: string) => `parul:circleMute:${id}`;
const DIVIDER_INSET = 52;

const REPORT_REASONS = [
  'Spam or misleading content',
  'Harassment or bullying',
  'Inappropriate media',
  'Circle safety concern',
  'Other',
];

function SettingsGroup({
  children,
  surface,
}: {
  children: React.ReactNode;
  surface: string;
}) {
  return (
    <View style={[styles.group, { backgroundColor: surface }]}>
      {children}
    </View>
  );
}

function SettingsRow({
  icon,
  label,
  onPress,
  trailing,
  showDivider,
  dividerColor,
  textColor,
  iconColor,
}: {
  icon: string;
  label: string;
  onPress?: () => void;
  trailing?: React.ReactNode;
  showDivider?: boolean;
  dividerColor: string;
  textColor: string;
  iconColor: string;
}) {
  const inner = (
    <>
      <Icon name={icon} size={22} color={iconColor} />
      <Text style={[styles.rowLabel, { color: textColor }]}>{label}</Text>
      <View style={styles.rowTrailing}>{trailing}</View>
    </>
  );

  return (
    <View>
      {onPress ? (
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        >
          {inner}
        </Pressable>
      ) : (
        <View style={styles.row}>{inner}</View>
      )}
      {showDivider && (
        <View style={[styles.rowDivider, { backgroundColor: dividerColor }]} />
      )}
    </View>
  );
}

export function CircleSettingsScreen() {
  const { colors, groupedBg } = useTheme();
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
  const pinned = getPinnedMedia(circleId);
  const sharedMedia = getSharedMedia(circleId);
  const photos = sharedMedia.filter(m => m.type === 'photo');
  const files = sharedMedia.filter(m => m.type === 'file');
  const pinnedMessages = getPinnedMessages(circleId);
  const role = isOwner ? 'You created this circle' : 'You are a member';
  const displayBio = circle.bio ?? circle.tagline ?? '';

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

  const pendingRequests = isOwner ? countJoinRequests(circleId) : 0;
  const chevron = <Icon name="chevronRight" size={16} color={colors.textTertiary} />;
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
      <SafeAreaView style={[styles.safe, { backgroundColor: groupedBg }]} edges={['top']}>
        <View style={styles.pageHeader}>
          <IconButton
            name="chevronLeft"
            size={40}
            tone="ghost"
            color={colors.text}
            onPress={() => navigation.goBack()}
          />
          <Text style={[styles.pageTitle, { color: colors.text }]}>Circle Settings</Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { paddingBottom: tabBarPad }]}
          style={{ backgroundColor: groupedBg }}
        >
          <CircleHeroCard
            circle={circle}
            bio={displayBio}
            role={role}
            canEdit={isOwner}
            onEdit={() => setEditOpen(true)}
          />

          {isOwner && (
            <SettingsGroup surface={colors.surface}>
              <SettingsRow
                icon="shield"
                label="Admin controls"
                onPress={() => navigation.navigate('CircleAdmin', { circleId })}
                trailing={chevron}
                dividerColor={colors.border}
                textColor={colors.text}
                iconColor={colors.text}
              />
            </SettingsGroup>
          )}

          <SettingsGroup surface={colors.surface}>
            <SettingsRow
              icon="circles"
              label="Members"
              onPress={() => navigation.navigate('CircleMembers', { circleId })}
              trailing={membersTrailing}
              showDivider
              dividerColor={colors.border}
              textColor={colors.text}
              iconColor={colors.text}
            />
            <SettingsRow
              icon="bell"
              label="Mute notifications"
              trailing={
                <Switch
                  value={muteNotifs}
                  onValueChange={toggleMute}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#fff"
                  ios_backgroundColor={colors.border}
                />
              }
              dividerColor={colors.border}
              textColor={colors.text}
              iconColor={colors.text}
            />
          </SettingsGroup>

          <SettingsGroup surface={colors.surface}>
            <SettingsRow
              icon="bookmark"
              label="Pinned messages"
              onPress={() => setPinnedOpen(true)}
              trailing={chevron}
              showDivider
              dividerColor={colors.border}
              textColor={colors.text}
              iconColor={colors.text}
            />
            <SettingsRow
              icon="image"
              label="Shared media"
              onPress={() => setMediaOpen(true)}
              trailing={chevron}
              dividerColor={colors.border}
              textColor={colors.text}
              iconColor={colors.text}
            />
          </SettingsGroup>

          <SettingsGroup surface={colors.surface}>
            <SettingsRow
              icon="flag"
              label="Report a problem"
              onPress={() => setReportOpen(true)}
              trailing={chevron}
              dividerColor={colors.border}
              textColor={colors.text}
              iconColor={colors.text}
            />
          </SettingsGroup>

          <View>
            <Pressable
              onPress={() => setMediaOpen(true)}
              style={({ pressed }) => [styles.mediaSectionHead, pressed && styles.rowPressed]}
            >
              <Text style={[styles.sectionLabel, { color: colors.textTertiary, marginBottom: 0 }]}>
                SHARED MEDIA
              </Text>
              <View style={styles.mediaSeeAll}>
                <Text style={[styles.mediaSeeAllText, { color: colors.primary }]}>
                  See all ({sharedMedia.length})
                </Text>
                <Icon name="chevronRight" size={14} color={colors.primary} />
              </View>
            </Pressable>
            <View style={[styles.mediaGroup, { backgroundColor: colors.surface }]}>
              {pinned.length > 0 ? (
                <View style={styles.mediaGrid}>
                  {pinned.map((uri, i) => (
                    <Pressable
                      key={i}
                      style={styles.mediaCell}
                      onPress={() => setMediaOpen(true)}
                    >
                      <Image source={{ uri }} style={styles.mediaImg} />
                    </Pressable>
                  ))}
                </View>
              ) : (
                <Pressable onPress={() => setMediaOpen(true)} style={styles.mediaEmpty}>
                  <Icon name="image" size={22} color={colors.textTertiary} />
                  <Text style={[styles.mediaEmptyText, { color: colors.textTertiary }]}>
                    No shared media yet
                  </Text>
                </Pressable>
              )}
            </View>
          </View>

          {!isOwner && (
            <SettingsGroup surface={colors.surface}>
              <Pressable
                onPress={handleLeave}
                style={({ pressed }) => [styles.destructiveRow, pressed && styles.rowPressed]}
              >
                <Text style={[styles.destructiveLabel, { color: colors.lost }]}>
                  {confirmLeave ? 'Tap again to confirm leave' : 'Leave circle'}
                </Text>
              </Pressable>
            </SettingsGroup>
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
              <Text style={[styles.mediaFolderLabel, { color: colors.textTertiary }]}>PHOTOS</Text>
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
              <Text style={[styles.mediaFolderLabel, { color: colors.textTertiary }]}>FILES</Text>
              <View style={[styles.filesGroup, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                {files.map((item, index) => (
                  <View key={item.id}>
                    <Pressable
                      onPress={() => setToast({ msg: `Opened ${item.name}`, icon: 'bookmark', tone: 'neutral' })}
                      style={({ pressed }) => [styles.fileRow, pressed && styles.rowPressed]}
                    >
                      <Icon name="bookmark" size={20} color={colors.primary} />
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
              </View>
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
                <Pressable
                  key={msg.id}
                  onPress={() => {
                    setPinnedOpen(false);
                    navigation.navigate('CircleChat', { circleId });
                  }}
                  style={[
                    styles.pinnedRow,
                    { backgroundColor: colors.bg, borderColor: colors.border },
                    i < pinnedMessages.length - 1 && { marginBottom: 8 },
                  ]}
                >
                  <Icon name="bookmark" size={18} color={colors.text} />
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
                  {
                    backgroundColor: active ? colors.primary + '14' : colors.bg,
                    borderColor: active ? colors.primary : colors.border,
                  },
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
              { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg },
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
  pageHeader: {
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 2,
    gap: 2,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  scroll: {
    paddingHorizontal: 16,
    gap: 22,
    paddingTop: 4,
  },
  group: {
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 52,
    ...Platform.select({
      web: { cursor: 'pointer' as const },
      default: {},
    }),
  },
  rowPressed: { opacity: 0.55 },
  rowLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: -0.2,
  },
  rowTrailing: {
    marginLeft: 'auto',
    flexShrink: 0,
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
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: DIVIDER_INSET,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
    marginBottom: 8,
    marginLeft: 4,
  },
  mediaSectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingRight: 4,
    ...Platform.select({
      web: { cursor: 'pointer' as const },
      default: {},
    }),
  },
  mediaSeeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  mediaSeeAllText: { fontSize: 13, fontWeight: '600' },
  mediaSheetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  mediaSheetCell: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  mediaFolderLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  filesGroup: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  fileMeta: { flex: 1, gap: 2, minWidth: 0 },
  fileName: { fontSize: 15, fontWeight: '500' },
  fileSub: { fontSize: 12 },
  fileDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 46,
  },
  mediaGroup: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    padding: 12,
  },
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  mediaCell: {
    width: '23%',
    aspectRatio: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  mediaImg: { width: '100%', height: '100%' },
  mediaEmpty: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 24,
  },
  mediaEmptyText: { fontSize: 13 },
  destructiveRow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    minHeight: 52,
    ...Platform.select({
      web: { cursor: 'pointer' as const },
      default: {},
    }),
  },
  destructiveLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  sheetBody: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, gap: 8 },
  sheetEmpty: { alignItems: 'center', gap: 10, paddingVertical: 28 },
  sheetEmptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  pinnedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pinnedAuthor: { fontSize: 13, fontWeight: '700' },
  pinnedText: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  pinnedTime: { fontSize: 11, marginTop: 4 },
  reportLead: { fontSize: 13, lineHeight: 18, marginBottom: 4 },
  reportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  reportOptionText: { fontSize: 14, fontWeight: '600', flex: 1 },
  reportInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    marginTop: 4,
  },
});
