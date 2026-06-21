import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Easing } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, shadows } from '../../theme/tokens';
import { Icon } from '../icons/Icon';
import { Badge } from '../ui/Badge';
import { Button, IconButton } from '../ui/Button';
import { PhotoSlot } from '../ui/PhotoSlot';
import { PhotoViewerModal } from '../ui/PhotoViewerModal';
import { PostAuthorRow } from './PostAuthorRow';
import { PostOwnerMenu } from './PostOwnerMenu';
import type { Post } from '../../data/mockData';
import type { ToastData } from '../ui/Toast';
import { getPostImageUrls } from '../../utils/postMedia';

const PULSE_RING_DURATION = 2400;

function formatShareCount(count: number): string {
  return count === 1 ? '1 share' : `${count} shares`;
}

function createPulseLoop(anim: Animated.Value) {
  return Animated.loop(
    Animated.sequence([
      Animated.timing(anim, {
        toValue: 1,
        duration: PULSE_RING_DURATION,
        easing: Easing.linear,
        useNativeDriver: true,
        isInteraction: false,
      }),
      Animated.timing(anim, {
        toValue: 0,
        duration: 0,
        useNativeDriver: true,
        isInteraction: false,
      }),
    ]),
  );
}

export function PulseBeacon({
  size = 22,
  ringColor = 'rgba(255,255,255,0.45)',
  icon = 'alert',
  active = true,
}: {
  size?: number;
  ringColor?: string;
  icon?: string;
  active?: boolean;
}) {
  const pulseA = useRef(new Animated.Value(0)).current;
  const pulseB = useRef(new Animated.Value(0)).current;
  const pulseC = useRef(new Animated.Value(0)).current;
  const loopsRef = useRef<Animated.CompositeAnimation[]>([]);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const anims = [pulseA, pulseB, pulseC];
    const stopAll = () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
      loopsRef.current.forEach(loop => loop.stop());
      loopsRef.current = [];
      anims.forEach(anim => { anim.stopAnimation(); anim.setValue(0); });
    };

    if (!active) { stopAll(); return; }

    const stagger = PULSE_RING_DURATION / 3;
    anims.forEach((anim, index) => {
      anim.setValue(0);
      const loop = createPulseLoop(anim);
      loopsRef.current.push(loop);
      const timer = setTimeout(() => loop.start(), index * stagger);
      timersRef.current.push(timer);
    });

    return stopAll;
  }, [active, pulseA, pulseB, pulseC]);

  const ringAnim = (anim: Animated.Value) => ({
    opacity: anim.interpolate({ inputRange: [0, 0.12, 0.38, 0.68, 1], outputRange: [0, 0.65, 0.75, 0.3, 0], extrapolate: 'clamp' }),
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.5], extrapolate: 'clamp' }) }],
  });

  return (
    <View style={[styles.pulseWrap, { width: size, height: size }]}>
      <Animated.View style={[styles.pulseRing, { borderColor: ringColor, borderRadius: size * 0.68 }, ringAnim(pulseA)]} />
      <Animated.View style={[styles.pulseRing, { borderColor: ringColor, borderRadius: size * 0.68 }, ringAnim(pulseB)]} />
      <Animated.View style={[styles.pulseRing, { borderColor: ringColor, borderRadius: size * 0.68 }, ringAnim(pulseC)]} />
      <Icon name={icon} size={18} color="#fff" />
    </View>
  );
}

export function AlertDetailRow({ icon, label, value, accent, emphasis, showWhenEmpty }: {
  icon: string; label: string; value: string | null | undefined; accent: string; emphasis?: boolean;
  /** Show label even when value is empty (uses em dash). */
  showWhenEmpty?: boolean;
}) {
  const { colors } = useTheme();
  const display = (value ?? '').trim();
  if (!display && !showWhenEmpty) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: emphasis ? 10 : 8 }}>
      <Icon name={icon} size={emphasis ? 18 : 16} color={accent} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{
          fontSize: emphasis ? 11 : 10.5,
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: 0.8,
          color: colors.textTertiary,
        }}>{label}</Text>
        <Text style={{
          fontSize: 13.5,
          fontWeight: '700',
          color: display ? colors.text : colors.textTertiary,
          marginTop: emphasis ? 2 : 0,
        }} numberOfLines={emphasis ? 1 : 2} ellipsizeMode="tail">{display || '—'}</Text>
      </View>
    </View>
  );
}

function ReunitedHeader({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.reunitedHeader, { backgroundColor: colors.successBg, borderBottomColor: `${colors.success}28` }]}>
      <View style={[styles.reunitedIconWrap, { backgroundColor: colors.success }]}>
        <Icon name="check" size={20} color="#fff" sw={2.5} />
      </View>
      <View style={styles.reunitedCopy}>
        <Text style={[styles.reunitedEyebrow, { color: colors.success }]}>Reunited</Text>
        <Text style={[styles.reunitedLabel, { color: colors.text }]}>{label}</Text>
      </View>
      <View style={[styles.reunitedClosedPill, { backgroundColor: `${colors.success}20` }]}>
        <Text style={[styles.reunitedClosedText, { color: colors.success }]}>Closed</Text>
      </View>
    </View>
  );
}

export function LostCard({
  post,
  pulseActive,
  onToast,
  onForward,
  onUserPress,
  onCompanionPress,
  saved,
  onSave,
  onMessage,
  onEdit,
  onDelete,
  onResolve,
  resolveLabel,
}: {
  post: Post;
  pulseActive?: boolean;
  onToast: (t: ToastData) => void;
  onForward: () => void;
  onUserPress: (userId: string) => void;
  onCompanionPress?: (companionId: string) => void;
  saved: boolean;
  onSave: () => void;
  onMessage?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onResolve?: () => void;
  resolveLabel?: string;
}) {
  const { colors } = useTheme();
  const lost = post.lost ?? { kind: 'Lost pet', area: '', lastSeen: '', alertedCount: 0 };
  const resolved = !!lost.resolved;
  const detailAccent = resolved ? colors.success : colors.danger;
  const showOwnerMenu = !resolved && (onEdit || onDelete);
  const [photoOpen, setPhotoOpen] = useState(false);
  const imageUrls = getPostImageUrls(post, `lost-${post.id}`);

  return (
    <View style={[
      styles.lostCard,
      {
        backgroundColor: resolved ? colors.successBg : colors.surface,
        borderColor: resolved ? colors.success : colors.danger,
      },
      resolved && styles.resolvedCard,
    ]}>
      {resolved ? (
        <ReunitedHeader label="Back home" />
      ) : (
        <View style={[styles.strip, { backgroundColor: colors.danger }]}>
          <PulseBeacon active={pulseActive} />
          <Text style={styles.stripText}>Lost</Text>
          <View style={{ flex: 1 }} />
          <Badge tone="neutral" icon="mapPin">Nearby</Badge>
        </View>
      )}

      <View style={[styles.cardBody, resolved && styles.resolvedBody]}>
        <View style={styles.postHeader}>
          <PostAuthorRow
            post={post}
            size={46}
            metaSuffix="posted an alert"
            onUserPress={onUserPress}
            onCompanionPress={onCompanionPress}
            trailing={showOwnerMenu ? (
              <PostOwnerMenu onEdit={onEdit} onDelete={onDelete} />
            ) : undefined}
          />
        </View>

        <Text style={[styles.postText, { color: colors.text }]}>{post.text}</Text>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <PhotoSlot
            height={130}
            uri={post.mediaUrls?.[0]}
            fallbackUri={post.mediaFallbackUrls?.[0]}
            imageKey={`lost-${post.id}`}
            label=""
            style={{ width: 120 }}
            onPress={() => setPhotoOpen(true)}
          />
          <View style={{ flex: 1, gap: 8, justifyContent: 'center' }}>
            <AlertDetailRow icon="mapPin" label="Last seen" value={lost.area} accent={detailAccent} showWhenEmpty />
            <AlertDetailRow icon="clock" label="When" value={lost.lastSeen} accent={detailAccent} showWhenEmpty />
            <AlertDetailRow icon="phone" label="Contact" value={lost.phone} accent={detailAccent} showWhenEmpty />
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
          {!resolved && onMessage ? (
            <Button variant="danger" icon="message" full onPress={onMessage}>
              Message owner
            </Button>
          ) : null}
          {!resolved ? (
            <>
              <IconButton name="forward" size={44} tone="soft" onPress={onForward} />
              <IconButton
                name={saved ? 'bookmark' : 'bookmark-line'}
                size={44}
                tone="soft"
                color={saved ? colors.primary : undefined}
                onPress={() => { onSave(); onToast({ msg: saved ? 'Removed' : 'Saved alert', icon: 'bookmark', tone: 'primary' }); }}
              />
            </>
          ) : null}
        </View>

        {!resolved && onResolve ? (
          <Pressable
            onPress={onResolve}
            style={({ pressed }) => [styles.resolveBtn, { opacity: pressed ? 0.75 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel={resolveLabel ?? 'Mark as returned home'}
          >
            <Icon name="check" size={16} color="#fff" sw={2.5} />
            <Text style={styles.resolveBtnText}>{resolveLabel ?? 'Mark as returned home'}</Text>
          </Pressable>
        ) : null}

        <View style={styles.footer}>
          <Icon name={resolved ? 'check' : 'forward'} size={13} color={colors.textSecondary} />
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            {resolved
              ? 'Alert closed · no longer active'
              : `${formatShareCount(post.forwards)} · ${post.lost?.alertedCount ?? 0} alerted nearby`}
          </Text>
        </View>
      </View>

      <PhotoViewerModal
        visible={photoOpen}
        images={imageUrls}
        caption={post.text}
        onClose={() => setPhotoOpen(false)}
      />
    </View>
  );
}

export function FoundCard({
  post,
  pulseActive,
  onToast,
  onForward,
  onUserPress,
  onCompanionPress,
  saved,
  onSave,
  onMessage,
  onEdit,
  onDelete,
  onResolve,
  resolveLabel,
}: {
  post: Post;
  pulseActive?: boolean;
  onToast: (t: ToastData) => void;
  onForward: () => void;
  onUserPress: (userId: string) => void;
  onCompanionPress?: (companionId: string) => void;
  saved: boolean;
  onSave: () => void;
  onMessage?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onResolve?: () => void;
  resolveLabel?: string;
}) {
  const { colors } = useTheme();
  const found = post.found ?? { area: '', foundAt: '', alertedCount: 0 };
  const accent = colors.success;
  const resolved = !!found.resolved;
  const detailAccent = resolved ? colors.success : accent;
  const showOwnerMenu = !resolved && (onEdit || onDelete);
  const [photoOpen, setPhotoOpen] = useState(false);
  const imageUrls = getPostImageUrls(post, `found-${post.id}`);

  return (
    <View style={[
      styles.foundCard,
      {
        backgroundColor: resolved ? colors.successBg : colors.surface,
        borderColor: resolved ? colors.success : accent,
      },
      resolved && styles.resolvedCard,
    ]}>
      {resolved ? (
        <ReunitedHeader label="Found home" />
      ) : (
        <View style={[styles.strip, { backgroundColor: accent }]}>
          <PulseBeacon active={pulseActive} icon="check" />
          <Text style={styles.stripText}>Found</Text>
          <View style={{ flex: 1 }} />
          <Badge tone="neutral" icon="mapPin">Nearby</Badge>
        </View>
      )}

      <View style={[styles.cardBody, resolved && styles.resolvedBody]}>
        <View style={styles.postHeader}>
          <PostAuthorRow
            post={post}
            size={46}
            metaSuffix="posted a sighting"
            onUserPress={onUserPress}
            onCompanionPress={onCompanionPress}
            trailing={showOwnerMenu ? (
              <PostOwnerMenu onEdit={onEdit} onDelete={onDelete} />
            ) : undefined}
          />
        </View>

        <Text style={[styles.postText, { color: colors.text }]}>{post.text}</Text>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <PhotoSlot
            height={130}
            uri={post.mediaUrls?.[0]}
            fallbackUri={post.mediaFallbackUrls?.[0]}
            imageKey={`found-${post.id}`}
            label=""
            style={{ width: 120 }}
            onPress={() => setPhotoOpen(true)}
          />
          <View style={{ flex: 1, gap: 8, justifyContent: 'center' }}>
            <AlertDetailRow icon="mapPin" label="Found at" value={found.area} accent={detailAccent} showWhenEmpty />
            <AlertDetailRow icon="clock" label="When" value={found.foundAt} accent={detailAccent} showWhenEmpty />
            <AlertDetailRow icon="paw" label="Looks like" value={found.looksLike} accent={detailAccent} showWhenEmpty />
            <AlertDetailRow icon="phone" label="Contact" value={found.phone} accent={detailAccent} showWhenEmpty />
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
          {!resolved && onMessage ? (
            <Pressable
              onPress={onMessage}
              style={({ pressed }) => [styles.foundActionBtn, { backgroundColor: accent, opacity: pressed ? 0.85 : 1 }]}
            >
              <Icon name="message" size={18} color="#fff" />
              <Text style={styles.foundActionBtnText}>Message finder</Text>
            </Pressable>
          ) : null}
          {!resolved ? (
            <>
              <IconButton name="forward" size={44} tone="soft" onPress={onForward} />
              <IconButton
                name={saved ? 'bookmark' : 'bookmark-line'}
                size={44}
                tone="soft"
                color={saved ? colors.primary : undefined}
                onPress={() => { onSave(); onToast({ msg: saved ? 'Removed' : 'Saved sighting', icon: 'bookmark', tone: 'primary' }); }}
              />
            </>
          ) : null}
        </View>

        {!resolved && onResolve ? (
          <Pressable
            onPress={onResolve}
            style={({ pressed }) => [styles.resolveBtn, { opacity: pressed ? 0.75 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel={resolveLabel ?? 'This pet found its home'}
          >
            <Icon name="check" size={16} color="#fff" sw={2.5} />
            <Text style={styles.resolveBtnText}>{resolveLabel ?? 'This pet found its home'}</Text>
          </Pressable>
        ) : null}

        <View style={styles.footer}>
          <Icon name={resolved ? 'check' : 'forward'} size={13} color={colors.textSecondary} />
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            {resolved
              ? 'Alert closed · no longer active'
              : `${formatShareCount(post.forwards)} · ${post.found?.alertedCount ?? 0} notified nearby`}
          </Text>
        </View>
      </View>

      <PhotoViewerModal
        visible={photoOpen}
        images={imageUrls}
        caption={post.text}
        onClose={() => setPhotoOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pulseWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  pulseRing: { position: 'absolute', top: -4, left: -4, right: -4, bottom: -4, borderWidth: 2 },
  lostCard: { borderRadius: radius.xl, overflow: 'hidden', borderWidth: 1.5, ...shadows.sm },
  foundCard: { borderRadius: radius.xl, overflow: 'hidden', borderWidth: 1.5, ...shadows.sm },
  resolvedCard: { borderWidth: 2 },
  strip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 9 },
  stripText: { color: '#fff', fontWeight: '700', fontSize: 13.5, letterSpacing: 0.1 },
  reunitedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  reunitedIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reunitedCopy: { flex: 1, minWidth: 0 },
  reunitedEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  reunitedLabel: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
    marginTop: 1,
  },
  reunitedClosedPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  reunitedClosedText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  cardBody: { padding: 14 },
  resolvedBody: { opacity: 0.94 },
  resolveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2FA46A',
    borderRadius: radius.full,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 10,
  },
  resolveBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  postHeader: { width: '100%', paddingBottom: 0 },
  postText: { fontSize: 15.5, lineHeight: 23, paddingTop: 10, paddingBottom: 0 },
  foundActionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, paddingHorizontal: 18, borderRadius: radius.full,
  },
  foundActionBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 10 },
  metaText: { fontSize: 12 },
});
