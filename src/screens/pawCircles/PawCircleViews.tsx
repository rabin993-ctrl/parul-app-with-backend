import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, shadows } from '../../theme/tokens';
import { Icon } from '../../components/icons/Icon';
import { AppSubHeader } from '../../components/ui/AppSubHeader';
import { IconButton } from '../../components/ui/Button';
import { Sheet } from '../../components/ui/Sheet';
import { PawCircle } from '../../data/pawCircles';

export function PawCircleSubHeader({
  title,
  onBack,
}: {
  title: string;
  onBack?: () => void;
}) {
  return (
    <AppSubHeader
      title={title}
      onBack={onBack}
      rightIcon="bell"
      rightCount={2}
    />
  );
}

export function CircleListCard({
  circle,
  isCreated,
  lastMessage,
  lastMessageTime,
  unread,
  onPress,
  onSettingsPress,
}: {
  circle: PawCircle;
  isCreated: boolean;
  lastMessage?: string;
  lastMessageTime?: string;
  unread?: number;
  onPress: () => void;
  onSettingsPress: () => void;
}) {
  const { colors, iconBg } = useTheme();
  return (
    <View style={[styles.circleCard, { backgroundColor: colors.surface, borderColor: colors.border }, shadows.sm]}>
      <Pressable onPress={onPress} style={styles.circleCardMain}>
      <View style={[styles.circleCardIcon, { backgroundColor: iconBg(circle.iconBg) }]}>
        <Icon
          name={circle.icon}
          size={18}
          color={circle.tint}
          fill={circle.icon === 'paw' || circle.icon === 'cat' ? circle.tint : 'none'}
        />
        {!!unread && unread > 0 && (
          <View style={[styles.unreadDot, { backgroundColor: colors.accent, borderColor: colors.surface }]} />
        )}
      </View>
      <View style={styles.circleCardMeta}>
        <View style={styles.circleCardTitleRow}>
          <Text style={[styles.circleCardName, { color: colors.text }]} numberOfLines={1}>{circle.name}</Text>
          {lastMessageTime ? (
            <Text style={[styles.circleCardTime, { color: colors.textTertiary }]}>{lastMessageTime}</Text>
          ) : null}
        </View>
        {lastMessage ? (
          <Text style={[styles.circleCardPreview, { color: colors.textSecondary }]} numberOfLines={1}>
            {lastMessage}
          </Text>
        ) : (
          <View style={styles.circleCardRow}>
            <Icon name="mapPin" size={12} color={colors.textTertiary} />
            <Text style={[styles.circleCardSub, { color: colors.textSecondary }]}>{circle.location}</Text>
          </View>
        )}
        <View style={styles.circleCardRow}>
          <Icon name="circles" size={12} color={colors.textTertiary} />
          <Text style={[styles.circleCardSub, { color: colors.textTertiary }]}>
            {circle.memberCount} members{isCreated ? ' · You created' : ''}
          </Text>
        </View>
      </View>
      </Pressable>
      <Pressable
        onPress={onSettingsPress}
        hitSlop={8}
        style={[styles.settingsBtn, { backgroundColor: colors.infoBg }]}
      >
        <Icon name="settings" size={16} color={colors.primary} />
      </Pressable>
    </View>
  );
}

export function CircleSettingsSheet({
  visible,
  circle,
  muteNotifs,
  onMuteChange,
  onClose,
  onLeave,
  isOwner,
}: {
  visible: boolean;
  circle: PawCircle | null;
  muteNotifs: boolean;
  onMuteChange: (v: boolean) => void;
  onClose: () => void;
  onLeave: () => void;
  isOwner: boolean;
}) {
  const { colors, iconBg } = useTheme();
  if (!circle) return null;

  const settings = [
    { icon: 'bell', label: 'Mute notifications', sub: 'Turn off all notifications for this circle', toggle: true },
    { icon: 'bookmark', label: 'Pinned media' },
    { icon: 'image', label: 'Shared files' },
    { icon: 'flag', label: 'Report a problem' },
  ];

  return (
    <Sheet visible={visible} onClose={onClose} title="Circle Settings">
      <View style={styles.sheetBody}>
        <View style={[styles.settingsHero, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.circleCardIcon, { backgroundColor: iconBg(circle.iconBg) }]}>
            <Icon name={circle.icon} size={20} color={circle.tint} />
          </View>
          <Text style={[styles.settingsHeroName, { color: colors.text }]}>{circle.name}</Text>
          <Text style={[styles.settingsHeroSub, { color: colors.textSecondary }]}>
            {isOwner ? 'You created this circle' : 'You are a member of this circle'}
          </Text>
          <Text style={[styles.settingsHeroMeta, { color: colors.textTertiary }]}>
            {circle.memberCount} members
          </Text>
        </View>

        {settings.map(s => (
          <Pressable
            key={s.label}
            onPress={() => s.toggle && onMuteChange(!muteNotifs)}
            style={[styles.settingRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={[styles.settingIcon, { backgroundColor: colors.infoBg }]}>
              <Icon name={s.icon} size={16} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>{s.label}</Text>
              {s.sub && <Text style={[styles.settingSub, { color: colors.textTertiary }]}>{s.sub}</Text>}
            </View>
            {s.toggle ? (
              <View style={[styles.toggle, { backgroundColor: muteNotifs ? colors.primary : colors.border }]}>
                <View style={[styles.toggleKnob, muteNotifs && styles.toggleKnobOn]} />
              </View>
            ) : (
              <Icon name="chevronRight" size={14} color={colors.textTertiary} />
            )}
          </Pressable>
        ))}

        {!isOwner && (
          <Pressable
            onPress={onLeave}
            style={[styles.leaveRow, { borderColor: colors.lostBorder, backgroundColor: colors.lostBg }]}
          >
            <Icon name="logout" size={16} color={colors.lost} />
            <Text style={[styles.leaveText, { color: colors.lost }]}>Leave Circle</Text>
            <Icon name="chevronRight" size={14} color={colors.lost} />
          </Pressable>
        )}
      </View>
    </Sheet>
  );
}

export function useCircleSettings() {
  const [settingsCircle, setSettingsCircle] = useState<PawCircle | null>(null);
  const [muteNotifs, setMuteNotifs] = useState(false);
  return { settingsCircle, setSettingsCircle, muteNotifs, setMuteNotifs };
}

const styles = StyleSheet.create({
  circleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    paddingRight: 10,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  circleCardMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  circleCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleCardMeta: { flex: 1, gap: 3, minWidth: 0 },
  circleCardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  circleCardName: { fontSize: 15, fontWeight: '700', flex: 1 },
  circleCardTime: { fontSize: 11 },
  circleCardPreview: { fontSize: 13, lineHeight: 17 },
  circleCardRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  circleCardSub: { fontSize: 12.5 },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
  settingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBody: { paddingHorizontal: 20, paddingBottom: 24, gap: 10 },
  settingsHero: {
    alignItems: 'center',
    padding: 16,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
    marginBottom: 6,
  },
  settingsHeroName: { fontSize: 17, fontWeight: '800' },
  settingsHeroSub: { fontSize: 13 },
  settingsHeroMeta: { fontSize: 12 },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  settingIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: { fontSize: 14, fontWeight: '600' },
  settingSub: { fontSize: 11.5, marginTop: 2 },
  toggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  toggleKnobOn: { alignSelf: 'flex-end' },
  leaveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
  leaveText: { flex: 1, fontSize: 14, fontWeight: '700' },
});
