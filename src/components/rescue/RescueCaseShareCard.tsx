import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { PhotoSlot } from '../ui/PhotoSlot';
import { Icon } from '../icons/Icon';
import { ChatAttachmentCard, ChatAttachmentOpenLink } from '../chat/ChatAttachmentCard';
import { RescueStatusPill } from './RescueCaseUI';
import { RESCUE_STATUS_META, type RescueCase, type RescueStatus } from '../../data/profileData';
import type { RescueCaseSharePreview } from '../../utils/shareRescueCase';

const THUMB_SIZE = 96;

type Props = {
  caseId: string;
  item?: RescueCase | null;
  preview?: RescueCaseSharePreview;
  tint: string;
  onPress?: () => void;
  maxWidth?: number;
};

function statusFromLabel(label?: string): RescueStatus {
  if (!label) return 'active';
  const entry = Object.entries(RESCUE_STATUS_META).find(
    ([, meta]) => meta.label === label || meta.shortLabel === label,
  );
  return (entry?.[0] as RescueStatus) ?? 'active';
}

export function RescueCaseShareCard({
  caseId,
  item,
  preview,
  tint,
  onPress,
  maxWidth,
}: Props) {
  const { colors } = useTheme();

  const status = item?.status ?? statusFromLabel(preview?.statusLabel);
  const statusMeta = RESCUE_STATUS_META[status];
  const cardTint = item?.tint ?? statusMeta.tint ?? tint;
  const name = item?.name ?? preview?.headline ?? 'Rescue case';
  const caseCode = item?.caseId ?? preview?.caseCode;
  const location = item?.location?.trim() || preview?.location || 'Location not listed';
  const storySnippet = (
    item?.headline?.trim()
    || item?.story?.trim()
    || preview?.storySnippet
    || ''
  ).slice(0, 100);

  return (
    <View style={[styles.wrap, maxWidth ? { width: maxWidth } : null]}>
      <ChatAttachmentCard
        label="Rescue case"
        onPress={onPress}
        accessibilityLabel="Open rescue case"
        maxWidth={maxWidth}
        footer={onPress ? <ChatAttachmentOpenLink label="Open case" tint={cardTint} /> : null}
      >
        <View style={styles.row}>
          <View style={styles.thumbWrap}>
            <PhotoSlot
              height={THUMB_SIZE}
              imageKey={caseId}
              imageIndex={item?.species === 'cat' ? 1 : 0}
              borderRadius={radius.md}
              label=""
              resizeMode="cover"
              style={styles.thumb}
            />
            <View style={styles.thumbOverlay}>
              <RescueStatusPill status={status} size="sm" />
            </View>
          </View>

          <View style={styles.body}>
            <View style={styles.titleRow}>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                {name}
              </Text>
              {caseCode ? (
                <View style={[styles.codeChip, { backgroundColor: cardTint + '18' }]}>
                  <Text style={[styles.codeText, { color: cardTint }]}>{caseCode}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.metaRow}>
              <Icon name="mapPin" size={12} color={cardTint} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]} numberOfLines={1}>
                {location}
              </Text>
            </View>

            {storySnippet ? (
              <Text style={[styles.story, { color: colors.textSecondary }]} numberOfLines={2}>
                {storySnippet}
              </Text>
            ) : null}
          </View>
        </View>
      </ChatAttachmentCard>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
  },
  thumbWrap: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    position: 'relative',
    flexShrink: 0,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
  },
  thumbOverlay: {
    position: 'absolute',
    top: 6,
    left: 6,
    maxWidth: THUMB_SIZE - 12,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 6,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  codeChip: {
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexShrink: 0,
  },
  codeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
  },
  story: {
    fontSize: 12.5,
    lineHeight: 17,
  },
});
