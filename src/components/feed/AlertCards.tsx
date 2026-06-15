import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Easing } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, shadows } from '../../theme/tokens';
import { Icon } from '../icons/Icon';
import { Badge } from '../ui/Badge';
import { Button, IconButton } from '../ui/Button';
import { PhotoSlot } from '../ui/PhotoSlot';
import { PostAuthorRow } from './PostAuthorRow';
import { PostOwnerMenu } from './PostOwnerMenu';
import type { Post } from '../../data/mockData';
import type { ToastData } from '../ui/Toast';

const PULSE_RING_DURATION = 2400;

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

export function AlertDetailRow({ icon, label, value, accent }: {
  icon: string; label: string; value: string | null | undefined; accent: string;
}) {
  const { colors } = useTheme();
  if (!value) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Icon name={icon} size={16} color={accent} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 10.5, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, color: colors.textTertiary }}>{label}</Text>
        <Text style={{ fontSize: 13.5, fontWeight: '600', color: colors.text }} numberOfLines={2}>{value}</Text>
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
  saved,
  onSave,
  onMessage,
  onEdit,
  onDelete,
}: {
  post: Post;
  pulseActive?: boolean;
  onToast: (t: ToastData) => void;
  onForward: () => void;
  onUserPress: (userId: string) => void;
  saved: boolean;
  onSave: () => void;
  onMessage?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const { colors } = useTheme();
  const lost = post.lost!;

  return (
    <View style={[styles.lostCard, { backgroundColor: colors.surface, borderColor: colors.danger }]}>
      <View style={[styles.strip, { backgroundColor: colors.danger }]}>
        <PulseBeacon active={pulseActive} />
        <Text style={styles.stripText}>Lost</Text>
        <View style={{ flex: 1 }} />
        <Badge tone="neutral" icon="mapPin">Nearby</Badge>
      </View>

      <View style={{ padding: 14 }}>
        <View style={styles.postHeader}>
          <PostAuthorRow
            post={post}
            size={42}
            metaSuffix="posted an alert"
            onUserPress={onUserPress}
            trailing={(onEdit || onDelete) ? (
              <PostOwnerMenu onEdit={onEdit} onDelete={onDelete} />
            ) : undefined}
          />
        </View>

        <Text style={[styles.postText, { color: colors.text }]}>{post.text}</Text>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <PhotoSlot height={130} uri={post.mediaUrls?.[0]} imageKey={`lost-${post.id}`} label="" style={{ width: 120 }} />
          <View style={{ flex: 1, gap: 8, justifyContent: 'center' }}>
            <AlertDetailRow icon="mapPin" label="Last seen" value={lost.area} accent={colors.danger} />
            <AlertDetailRow icon="clock" label="When" value={lost.lastSeen} accent={colors.danger} />
            <AlertDetailRow icon="phone" label="Contact" value={lost.phone} accent={colors.danger} />
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
          {onMessage && (
            <Button variant="danger" icon="message" full onPress={onMessage}>
              Message owner
            </Button>
          )}
          <IconButton name="forward" size={44} tone="soft" onPress={onForward} />
          <IconButton
            name={saved ? 'bookmark' : 'bookmark-line'}
            size={44}
            tone="soft"
            color={saved ? colors.primary : undefined}
            onPress={() => { onSave(); onToast({ msg: saved ? 'Removed' : 'Saved alert', icon: 'bookmark', tone: 'primary' }); }}
          />
        </View>

        <View style={styles.footer}>
          <Icon name="forward" size={13} color={colors.textSecondary} />
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>{post.forwards} forwards · 100 alerted nearby</Text>
        </View>
      </View>
    </View>
  );
}

export function FoundCard({
  post,
  pulseActive,
  onToast,
  onForward,
  onUserPress,
  saved,
  onSave,
  onMessage,
  onEdit,
  onDelete,
}: {
  post: Post;
  pulseActive?: boolean;
  onToast: (t: ToastData) => void;
  onForward: () => void;
  onUserPress: (userId: string) => void;
  saved: boolean;
  onSave: () => void;
  onMessage?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const { colors } = useTheme();
  const found = post.found!;
  const accent = colors.success;

  return (
    <View style={[styles.foundCard, { backgroundColor: colors.surface, borderColor: accent }]}>
      <View style={[styles.strip, { backgroundColor: accent }]}>
        <PulseBeacon active={pulseActive} icon="check" />
        <Text style={styles.stripText}>Found</Text>
        <View style={{ flex: 1 }} />
        <Badge tone="neutral" icon="mapPin">Nearby</Badge>
      </View>

      <View style={{ padding: 14 }}>
        <View style={styles.postHeader}>
          <PostAuthorRow
            post={post}
            size={42}
            metaSuffix="posted a sighting"
            onUserPress={onUserPress}
            trailing={(onEdit || onDelete) ? (
              <PostOwnerMenu onEdit={onEdit} onDelete={onDelete} />
            ) : undefined}
          />
        </View>

        <Text style={[styles.postText, { color: colors.text }]}>{post.text}</Text>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <PhotoSlot height={130} uri={post.mediaUrls?.[0]} imageKey={`found-${post.id}`} label="" style={{ width: 120 }} />
          <View style={{ flex: 1, gap: 8, justifyContent: 'center' }}>
            <AlertDetailRow icon="mapPin" label="Found at" value={found.area} accent={accent} />
            <AlertDetailRow icon="clock" label="When" value={found.foundAt} accent={accent} />
            <AlertDetailRow icon="paw" label="Looks like" value={found.looksLike} accent={accent} />
            <AlertDetailRow icon="phone" label="Contact" value={found.phone} accent={accent} />
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
          {onMessage && (
            <Pressable
              onPress={onMessage}
              style={({ pressed }) => [styles.foundActionBtn, { backgroundColor: accent, opacity: pressed ? 0.85 : 1 }]}
            >
              <Icon name="message" size={18} color="#fff" />
              <Text style={styles.foundActionBtnText}>Message finder</Text>
            </Pressable>
          )}
          <IconButton name="forward" size={44} tone="soft" onPress={onForward} />
          <IconButton
            name={saved ? 'bookmark' : 'bookmark-line'}
            size={44}
            tone="soft"
            color={saved ? colors.primary : undefined}
            onPress={() => { onSave(); onToast({ msg: saved ? 'Removed' : 'Saved sighting', icon: 'bookmark', tone: 'primary' }); }}
          />
        </View>

        <View style={styles.footer}>
          <Icon name="forward" size={13} color={colors.textSecondary} />
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            {post.forwards} forwards · shared with local circles
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pulseWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  pulseRing: { position: 'absolute', top: -4, left: -4, right: -4, bottom: -4, borderWidth: 2 },
  lostCard: { borderRadius: radius.xl, overflow: 'hidden', borderWidth: 1.5, ...shadows.sm },
  foundCard: { borderRadius: radius.xl, overflow: 'hidden', borderWidth: 1.5, ...shadows.sm },
  strip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 9 },
  stripText: { color: '#fff', fontWeight: '700', fontSize: 13.5, letterSpacing: 0.1 },
  postHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, paddingBottom: 0 },
  postText: { fontSize: 15.5, lineHeight: 23, paddingTop: 10, paddingBottom: 0 },
  foundActionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, paddingHorizontal: 18, borderRadius: radius.full,
  },
  foundActionBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 10 },
  metaText: { fontSize: 12 },
});
