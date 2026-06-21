import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, Pressable, Image, StyleSheet, ScrollView, TextInput, Platform, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, StackActions } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing, typography } from '../../theme/tokens';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/icons/Icon';
import { Sheet } from '../../components/ui/Sheet';
import { Toast, ToastData } from '../../components/ui/Toast';
import { ProfileSubHeader } from '../../components/profile/ProfileChrome';
import {
  ProfileMenuLink,
  ProfileMenuPickerRow,
  ProfileMenuSection,
  ProfileMenuSectionRule,
  ProfileMenuToggleRow,
  profileMenuStyles,
} from '../../components/profile/ProfileSettingsRows';
import { usePawCircles } from '../../context/PawCircleContext';
import { CirclePrivacy, PawCircle } from '../../data/pawCircles';
import { useMediaPicker } from '../../hooks/useMediaPicker';
import { useAuth } from '../../context/AuthContext';
import { CIRCLE_USERNAME_UNAVAILABLE } from '../../lib/circleSlug';
import { supabase } from '../../lib/supabase';
import { resolveCircleMediaSignedUrl } from '../../lib/circleChatMedia';
import type { CirclesStackParamList } from '../../navigation/CirclesNavigator';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';
import { CircleHeroCard, CircleHeroSavePayload } from './CircleHeroCard';

type Route = RouteProp<CirclesStackParamList, 'CircleSettings'>;
type Nav = NativeStackNavigationProp<CirclesStackParamList, 'CircleSettings'>;

type PinnedMsg = { id: string; text: string; time: string };
type SharedItem = {
  id: string;
  name: string;
  size: string;
  type: 'photo' | 'file';
  uri?: string;
  mediaUrl?: string;
  time?: string;
};

function formatItemTime(iso: string): string {
  const d = new Date(iso);
  const diffH = (Date.now() - d.getTime()) / 3600000;
  if (diffH < 24) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (diffH < 48) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

const REPORT_REASONS = [
  'Spam or misleading content',
  'Harassment or bullying',
  'Inappropriate media',
  'Circle safety concern',
  'Other',
];

const MEDIA_PEEK_COLS = 3;

const PRIVACY_OPTIONS = [
  { id: 'open', label: 'Open' },
  { id: 'request', label: 'Request' },
];

export function CircleSettingsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { circleId } = route.params;
  const {
    ready, getCircle, createdCircles, leaveCircle, updateCircle, updateCircleAvatar, deleteCircle,
    getDbId, getCircleMuted, toggleCircleMute,
  } = usePawCircles();
  const { pickImage } = useMediaPicker();
  const { user } = useAuth();
  const circleLive = getCircle(circleId);
  const circleSnapshot = useRef<PawCircle | null>(null);
  if (circleLive) circleSnapshot.current = circleLive;
  const circle = circleSnapshot.current;
  const circleDbId = getDbId(circleId) ?? circleId;
  const [muteNotifs, setMuteNotifs] = useState(false);
  const [privacy, setPrivacy] = useState<CirclePrivacy>(circle?.privacy ?? 'open');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [reportReason, setReportReason] = useState<string | null>(null);
  const [reportNote, setReportNote] = useState('');
  const [pinnedMessages, setPinnedMessages] = useState<PinnedMsg[]>([]);
  const [sharedMedia, setSharedMedia] = useState<SharedItem[]>([]);
  const tabBarPad = useTabBarScrollPadding();

  const exitToHub = useCallback(() => {
    // Pop settings off the stack so Hub (already mounted below) is visible immediately.
    // navigate/reset alone left this screen on top returning null → white screen.
    if (navigation.canGoBack()) {
      navigation.dispatch(StackActions.popToTop());
    } else {
      navigation.navigate('Hub');
    }
  }, [navigation]);

  useEffect(() => {
    if (ready && !circleLive && !circleSnapshot.current) {
      exitToHub();
    }
  }, [ready, circleLive, exitToHub]);

  useEffect(() => {
    setMuteNotifs(getCircleMuted(circleId));
  }, [circleId, getCircleMuted]);

  useEffect(() => {
    if (!circle) return;
    setPrivacy(circle.privacy ?? 'open');
  }, [circleId, circle?.privacy, circle]);

  useEffect(() => {
    if (!circleDbId) return;
    supabase
      .from('circle_messages')
      .select('id, text, created_at')
      .eq('circle_id', circleDbId)
      .eq('pinned', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) {
          setPinnedMessages((data as { id: string; text: string | null; created_at: string }[]).map(row => ({
            id: row.id,
            text: row.text ?? '',
            time: formatItemTime(row.created_at),
          })));
        }
      });
  }, [circleDbId]);

  useEffect(() => {
    if (!circleDbId) return;
    let cancelled = false;
    supabase
      .from('circle_message_media')
      .select('id, type, name, size, created_at, media_assets (url, thumb_url)')
      .eq('circle_id', circleDbId)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(async ({ data }) => {
        if (!data || cancelled) return;
        const rows = data as {
          id: string;
          type: string;
          name: string | null;
          size: string | null;
          created_at: string;
          media_assets: { url: string; thumb_url: string | null } | { url: string; thumb_url: string | null }[] | null;
        }[];
        const items = await Promise.all(rows.map(async row => {
          const asset = Array.isArray(row.media_assets) ? row.media_assets[0] : row.media_assets;
          const storedUrl = asset?.url ?? '';
          const previewStored = row.type === 'photo'
            ? (asset?.thumb_url ?? asset?.url ?? '')
            : storedUrl;
          const mediaKind = row.type === 'photo' ? 'photo' : 'file';
          let uri: string | undefined;
          if (previewStored) {
            try {
              uri = await resolveCircleMediaSignedUrl(previewStored);
            } catch {
              uri = previewStored;
            }
          }
          return {
            id: row.id,
            name: row.name ?? 'File',
            size: row.size ?? '',
            type: mediaKind,
            uri,
            mediaUrl: storedUrl || undefined,
            time: formatItemTime(row.created_at),
          } satisfies SharedItem;
        }));
        if (!cancelled) setSharedMedia(items);
      });
    return () => { cancelled = true; };
  }, [circleDbId]);

  const toggleMute = useCallback(async (next: boolean) => {
    setMuteNotifs(next);
    await toggleCircleMute(circleId, next);
    setToast({
      msg: next ? 'Notifications muted for this circle' : 'Notifications enabled',
      icon: 'bell',
      tone: 'neutral',
    });
  }, [circleId, toggleCircleMute]);

  if (!circle) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']} />
    );
  }

  const isOwner = createdCircles.some(c => c.id === circleId);
  const photos = sharedMedia.filter(m => m.type === 'photo');
  const files = sharedMedia.filter(m => m.type === 'file');
  const role = isOwner ? 'You created this circle' : 'You are a member';
  const displayBio = circle.bio ?? circle.tagline ?? '';
  const circleTint = circle.tint ?? colors.primary;
  const privacyHint = privacy === 'open'
    ? 'Anyone nearby can find and join this circle.'
    : 'New members must be approved before they can join.';

  const sharedMediaHint = sharedMedia.length === 0
    ? 'Photos and files from circle chat'
    : [
        photos.length > 0 ? `${photos.length} photo${photos.length === 1 ? '' : 's'}` : null,
        files.length > 0 ? `${files.length} attachment${files.length === 1 ? '' : 's'}` : null,
      ].filter(Boolean).join(' · ');

  const openSharedItem = useCallback(async (item: SharedItem) => {
    const url = item.mediaUrl
      ? await resolveCircleMediaSignedUrl(item.mediaUrl)
      : item.uri;
    if (!url) {
      setToast({ msg: 'Could not open attachment', icon: 'close', tone: 'neutral' });
      return;
    }
    void Linking.openURL(url);
  }, []);

  const saveEdit = async ({ name, bio, slug, location: nextLocation }: CircleHeroSavePayload) => {
    if (!name.trim()) return;
    setSavingEdit(true);
    try {
      const newId = await updateCircle(circleId, {
        name,
        bio,
        slug,
        location: nextLocation.trim(),
      });
      if (newId !== circleId) {
        navigation.setParams({ circleId: newId });
      }
      setToast({ msg: 'Circle updated', icon: 'check', tone: 'success' });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setToast({
        msg: msg.includes('already taken') || msg.includes('unique')
          ? CIRCLE_USERNAME_UNAVAILABLE
          : 'Could not save changes. Try again.',
        icon: 'close',
        tone: 'neutral',
      });
      throw e;
    } finally {
      setSavingEdit(false);
    }
  };

  const handlePhotoPress = async () => {
    const asset = await pickImage({ squareCrop: true });
    if (!asset) return;
    setPhotoUploading(true);
    try {
      await updateCircleAvatar(circleId, asset);
      setToast({ msg: 'Circle photo updated', icon: 'check', tone: 'success' });
    } catch {
      setToast({ msg: 'Could not update photo. Try again.', icon: 'close', tone: 'neutral' });
    } finally {
      setPhotoUploading(false);
    }
  };

  const submitReport = async () => {
    if (!reportReason) return;
    if (circleDbId && user) {
      await supabase.from('reports').insert({
        reporter_user_id: user.id,
        target_type: 'circle',
        target_id: circleDbId,
        reason: reportReason,
        details: reportNote.trim() || null,
      });
    }
    setReportOpen(false);
    setReportReason(null);
    setReportNote('');
    setToast({
      msg: 'Report submitted — we\'ll review shortly',
      icon: 'check',
      tone: 'success',
    });
  };

  const handleLeave = () => {
    if (!confirmLeave) {
      setConfirmLeave(true);
      return;
    }
    setConfirmLeave(false);
    exitToHub();
    void leaveCircle(circleId).catch(() => {});
  };

  const handlePrivacyChange = async (id: string) => {
    const next = id as CirclePrivacy;
    const prev = privacy;
    setPrivacy(next);
    try {
      await updateCircle(circleId, { privacy: next });
      setToast({ msg: 'Join privacy updated', icon: 'check', tone: 'success' });
    } catch {
      setPrivacy(prev);
      setToast({ msg: 'Could not save changes. Try again.', icon: 'close', tone: 'neutral' });
    }
  };

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setConfirmDelete(false);
    exitToHub();
    void deleteCircle(circleId).catch(() => {});
  };

  return (
    <>
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
        <ProfileSubHeader title="Circle settings" onBack={() => navigation.goBack()} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[profileMenuStyles.scroll, { paddingBottom: tabBarPad + 56 }]}
        >
          <CircleHeroCard
            circle={circle}
            bio={displayBio}
            role={role}
            canEdit={isOwner}
            onSave={saveEdit}
            onPhotoPress={isOwner ? handlePhotoPress : undefined}
            photoUploading={photoUploading}
            saving={savingEdit}
          />

          {isOwner && (
            <ProfileMenuSection title="circle details" kicker bare first>
              <View style={profileMenuStyles.linkStack}>
                <ProfileMenuPickerRow
                  icon="shield"
                  label="Join privacy"
                  hint={privacyHint}
                  barTint={colors.warning}
                  value={privacy}
                  options={[...PRIVACY_OPTIONS]}
                  onChange={handlePrivacyChange}
                />
              </View>
            </ProfileMenuSection>
          )}

          <ProfileMenuSection title="alerts" kicker first={!isOwner}>
            <ProfileMenuToggleRow
              icon="bell"
              label="Mute notifications"
              hint={muteNotifs ? 'Alerts are paused for this circle' : 'Get alerts for new activity'}
              barTint={circleTint}
              value={muteNotifs}
              onValueChange={toggleMute}
            />
          </ProfileMenuSection>

          <ProfileMenuSection title="content" kicker>
            <ProfileMenuLink
              icon="bookmark"
              label="Pinned messages"
              hint={
                pinnedMessages.length > 0
                  ? `${pinnedMessages.length} saved in this circle`
                  : 'Nothing pinned yet'
              }
              tint={circleTint}
              onPress={() => setPinnedOpen(true)}
            />
            <ProfileMenuLink
              icon="image"
              label="Shared media"
              hint={sharedMediaHint}
              tint={circleTint}
              onPress={() => setMediaOpen(true)}
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
                          <View style={[styles.mediaPeekFallback, { backgroundColor: circleTint + '10' }]}>
                            <Icon name="image" size={20} color={circleTint} />
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
          </ProfileMenuSection>

          <ProfileMenuSection title="support" kicker>
            <ProfileMenuLink
              icon="flag"
              label="Report a problem"
              hint="Help us keep this circle safe"
              tint={colors.textSecondary}
              onPress={() => setReportOpen(true)}
            />
            {!isOwner && (
              <View style={profileMenuStyles.menuDividerGroup}>
                <ProfileMenuSectionRule compact />
                <ProfileMenuLink
                  icon="logout"
                  label={confirmLeave ? 'Tap again to confirm leave' : 'Leave circle'}
                  danger
                  onPress={handleLeave}
                />
              </View>
            )}
          </ProfileMenuSection>

          {isOwner && (
            <ProfileMenuSection title="danger zone" kicker>
              <ProfileMenuLink
                icon="circles"
                label="Transfer ownership"
                hint="Hand this circle off to another member"
                tint={colors.textSecondary}
                onPress={() => setToast({ msg: 'Transfer ownership — coming soon', icon: 'circles', tone: 'neutral' })}
              />
              <View style={profileMenuStyles.menuDividerGroup}>
                <ProfileMenuSectionRule compact />
                <ProfileMenuLink
                  icon="trash"
                  label={confirmDelete ? 'Tap again to delete circle permanently' : 'Delete circle'}
                  danger
                  onPress={handleDelete}
                />
              </View>
            </ProfileMenuSection>
          )}
        </ScrollView>
      </SafeAreaView>

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
                    onPress={() => { void openSharedItem(item); }}
                  >
                    {item.uri ? <Image source={{ uri: item.uri }} style={styles.mediaImg} /> : null}
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
                    onPress={() => { void openSharedItem(item); }}
                    style={({ pressed }) => [styles.fileRow, pressed && styles.rowPressed]}
                  >
                    <View style={[styles.fileIconWell, { backgroundColor: colors.primary + '14' }]}>
                      <Icon
                        name={item.type === 'photo' ? 'image' : 'paperclip'}
                        size={16}
                        color={colors.primary}
                      />
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
                        Member
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
  fieldBlock: { gap: spacing.xs },
  fieldLabel: { ...typography.caption },
  fieldInput: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 0,
    paddingVertical: 11,
    fontSize: 15,
    fontWeight: '600',
  },
  mediaPeek: {
    marginTop: 4,
    alignSelf: 'stretch',
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
  rowPressed: { opacity: 0.68 },
  sheetBody: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.sm, gap: spacing.sm },
  sheetFolderLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
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
  fileName: { fontSize: 14, fontWeight: '600', lineHeight: 19 },
  fileSub: { fontSize: 12.5, lineHeight: 17 },
  fileDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 48,
  },
  sheetEmpty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl2 },
  sheetEmptyText: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
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
  pinnedAuthor: { fontSize: 12.5, fontWeight: '700' },
  pinnedText: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  pinnedTime: { fontSize: 12.5, lineHeight: 17, marginTop: 4 },
  reportLead: { fontSize: 13, lineHeight: 18, marginBottom: spacing.xs },
  reportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
  },
  reportOptionText: { fontSize: 14, fontWeight: '600', flex: 1 },
  reportInput: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 0,
    paddingVertical: spacing.sm + 2,
    fontSize: 14,
    minHeight: 80,
    marginTop: spacing.xs,
  },
});
