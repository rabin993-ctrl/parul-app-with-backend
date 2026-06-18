import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/tokens';
import { Icon } from '../icons/Icon';
import { Button } from '../ui/Button';
import type { AdoptionRecord } from '../../data/adoptionRecords';
import type { AdoptionListing } from '../../data/adoptionData';
import type { AdoptionRequest } from '../../context/AdoptionFeedContext';
import type { ChatThread } from '../../context/AdoptionContext';
import {
  chatSublineAccentColor,
  groupAdoptionChatThreads,
  resolveAdoptionChatStatus,
  type AdoptionChatGroup,
} from '../../utils/chatThreadMeta';
import { useAuth } from '../../context/AuthContext';

type Props = {
  thread: ChatThread;
  records: AdoptionRecord[];
  listings: AdoptionListing[];
  requests: AdoptionRequest[];
  onMarkAdopted: () => void;
  onPostUpdate: () => void;
  onRelist?: () => void;
  onAcceptRequest?: () => void;
  backgroundColor?: string;
  posterHasMessaged?: boolean;
};

function statusIcon(label?: string): 'check-circle' | 'adoption' | 'clock' | 'alert' {
  if (label === 'Adopted' || label === 'Rehomed') return 'check-circle';
  if (label === 'Post home update' || label === 'Update requested') return 'alert';
  if (label === 'Check-in due') return 'clock';
  return 'adoption';
}

export function ChatAdoptionPanel({
  thread,
  records,
  listings,
  requests,
  onMarkAdopted,
  onPostUpdate,
  onRelist,
  onAcceptRequest,
  backgroundColor,
  posterHasMessaged = true,
}: Props) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const currentUserId = user?.id ?? '';

  const group: AdoptionChatGroup = (() => {
    const groups = groupAdoptionChatThreads([thread], records, listings, currentUserId);
    return groups[0] ?? {
      key: thread.id,
      listingId: thread.adoptionPostId ?? null,
      petName: 'Adoption',
      petVisual: null,
      isMyListing: false,
      threads: [thread],
      totalUnread: thread.unread,
    };
  })();

  const status = resolveAdoptionChatStatus(thread, records, listings, requests, group, currentUserId);
  if (!status) return null;

  const barStyle = [
    styles.bar,
    {
      backgroundColor: backgroundColor ?? colors.bg,
    },
  ];

  if (status.panelKind === 'relist' && onRelist) {
    const chipLabel = status.panelStatusLabel ?? 'Adopted';
    const chipColor = chatSublineAccentColor(status.panelStatusTone ?? 'success', colors);
    return (
      <View style={barStyle}>
        <View style={styles.statusRow}>
          <Icon name="check-circle" size={16} color={chipColor} />
          <Text style={[styles.statusText, { color: chipColor }]}>{chipLabel}</Text>
        </View>
        {status.panelHint ? (
          <Text style={[styles.hint, { color: colors.textSecondary }]} numberOfLines={2}>
            {status.panelHint}
          </Text>
        ) : null}
        <Button
          size="sm"
          variant="outline"
          icon="adoption"
          full
          onPress={onRelist}
        >
          {status.panelButtonLabel ?? 'Re-list for adoption'}
        </Button>
      </View>
    );
  }

  if (status.panelKind === 'mark_adopted') {
    return (
      <View style={barStyle}>
        <Button
          size="sm"
          variant="primary"
          icon="adoption"
          full
          onPress={onMarkAdopted}
          disabled={!posterHasMessaged}
        >
          {status.panelButtonLabel ?? 'Mark as adopted'}
        </Button>
      </View>
    );
  }

  if (status.panelKind === 'check_in') {
    return (
      <View style={barStyle}>
        <Text style={styles.subline} numberOfLines={2}>
          <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>{status.petName}</Text>
          <Text style={{ color: colors.textTertiary }}> · </Text>
          <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>{status.panelMilestone}</Text>
          {status.panelDueLabel ? (
            <>
              <Text style={{ color: colors.textTertiary }}> · </Text>
              <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>{status.panelDueLabel}</Text>
            </>
          ) : null}
        </Text>
        <Button
          size="sm"
          variant="primary"
          icon="camera"
          full
          onPress={onPostUpdate}
        >
          {status.panelButtonLabel ?? 'Post home update'}
        </Button>
      </View>
    );
  }

  const chipLabel = status.panelStatusLabel ?? status.sublineAccent;
  const chipTone = status.panelStatusTone ?? status.sublineTone;
  const chipColor = chatSublineAccentColor(chipTone, colors);

  if (status.panelKind === 'status' && status.sublineAccent === 'New request' && status.isPoster && onAcceptRequest) {
    return (
      <View style={barStyle}>
        {status.panelHint ? (
          <Text style={[styles.hint, { color: colors.textSecondary }]} numberOfLines={2}>
            {status.panelHint}
          </Text>
        ) : null}
        <Button
          size="sm"
          variant="primary"
          icon="comment"
          full
          onPress={onAcceptRequest}
        >
          Accept request
        </Button>
      </View>
    );
  }

  return (
    <View style={barStyle}>
      {chipLabel ? (
        <View style={styles.statusRow}>
          <Icon name={statusIcon(chipLabel)} size={16} color={chipColor} />
          <Text style={[styles.statusText, { color: chipColor }]}>{chipLabel}</Text>
        </View>
      ) : null}
      {status.panelHint ? (
        <Text style={[styles.hint, { color: colors.textSecondary }]} numberOfLines={2}>
          {status.panelHint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexShrink: 0,
    gap: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  subline: {
    ...typography.caption,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  hint: {
    ...typography.caption,
    fontSize: 12.5,
    lineHeight: 17,
    textAlign: 'center',
  },
});
