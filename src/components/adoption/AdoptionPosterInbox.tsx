import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, shadows, sheetLayout } from '../../theme/tokens';
import { Avatar } from '../ui/Avatar';
import { Icon } from '../icons/Icon';
import { Button, IconButton } from '../ui/Button';
import { ModalPresent } from '../ui/ModalScrim';
import { AdoptionListing } from '../../data/adoptionData';
import type { AdoptionRequest } from '../../context/AdoptionFeedContext';
import { isActiveAdoptionRequest } from '../../context/AdoptionFeedContext';
import { useUserProfile } from '../../hooks/useUserProfile';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const POPUP_MAX_H = Math.min(
  SCREEN_HEIGHT * sheetLayout.drawerMaxHeightRatio,
  sheetLayout.drawerMaxHeightCap,
);
const HEADER_H = 52;

function ApplicantRow({
  req,
  showDivider,
  onAccept,
  onOpenChat,
  onReject,
  accepting,
}: {
  req: AdoptionRequest;
  showDivider: boolean;
  onAccept: (req: AdoptionRequest) => void;
  onOpenChat: (req: AdoptionRequest) => void;
  onReject: (id: string) => void;
  accepting: boolean;
}) {
  const { colors } = useTheme();
  const profile = useUserProfile(req.requesterId);
  const displayName = req.requesterName || profile?.name || profile?.handle || 'Applicant';
  const avatarUser = profile ?? { id: req.requesterId, name: displayName, tint: '#888888' };
  const isNew = req.status === 'submitted';
  const inChat = req.status === 'approved';
  const adopted = req.status === 'adopted';

  return (
    <View>
      {showDivider && (
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
      )}
      <View style={styles.actionRow}>
        <Pressable
          onPress={() => inChat && onOpenChat(req)}
          disabled={!inChat || adopted}
          style={({ pressed }) => [
            styles.mainTap,
            Platform.OS === 'web' && styles.mainTapWeb,
            pressed && inChat && styles.mainTapPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={
            isNew
              ? `Review request from ${displayName}`
              : inChat
                ? `Message ${displayName}`
                : `${displayName}, adopted`
          }
        >
          <Avatar user={avatarUser} size={44} />
          <View style={styles.personMeta}>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
              {displayName}
            </Text>
            {req.message ? (
              <Text style={[styles.message, { color: colors.textSecondary }]} numberOfLines={2}>
                {req.message}
              </Text>
            ) : null}
            <Text style={[styles.sub, { color: isNew ? colors.primary : colors.textTertiary }]}>
              {adopted ? 'Adopted' : isNew ? 'New request' : 'In chat'}
            </Text>
          </View>
          {inChat ? (
            <View style={styles.trailing}>
              <Icon name="comment" size={18} color={colors.primary} />
            </View>
          ) : adopted ? (
            <Icon name="adoption" size={18} color={colors.success} />
          ) : (
            <View style={[styles.newDot, { backgroundColor: colors.primary }]} />
          )}
        </Pressable>

        {isNew ? (
          <View style={styles.actions}>
            <Button
              size="sm"
              variant="primary"
              onPress={() => onAccept(req)}
              disabled={accepting}
            >
              Accept
            </Button>
            <IconButton
              name="close"
              size={36}
              iconSize={16}
              tone="ghost"
              color={colors.textTertiary}
              onPress={() => onReject(req.id)}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}

export function AdoptionPosterInbox({
  visible,
  listing,
  requests,
  onClose,
  onReject,
  onAccept,
  onOpenChat,
}: {
  visible: boolean;
  listing: AdoptionListing | null;
  requests: AdoptionRequest[];
  onClose: () => void;
  onReject: (requestId: string) => void;
  onAccept: (request: AdoptionRequest) => void | Promise<void>;
  onOpenChat: (request: AdoptionRequest) => void | Promise<void>;
}) {
  const { colors } = useTheme();
  const [contentH, setContentH] = useState(0);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const resetMeasures = useCallback(() => setContentH(0), []);

  const handleAccept = async (req: AdoptionRequest) => {
    setAcceptingId(req.id);
    try {
      await onAccept(req);
    } finally {
      setAcceptingId(null);
    }
  };

  const applicants = requests.filter(isActiveAdoptionRequest);

  useEffect(() => {
    if (visible) resetMeasures();
  }, [visible, applicants.length, resetMeasures]);

  if (!listing) return null;
  const bodyMax = Math.max(POPUP_MAX_H - HEADER_H, 120);
  const overflows = contentH > bodyMax + 1;
  const bodyH = contentH > 0
    ? (overflows ? bodyMax : contentH)
    : undefined;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      onShow={resetMeasures}
    >
      <ModalPresent onDismiss={onClose} style={styles.overlay} accessibilityLabel="Close">
        <View
          style={[
            styles.popup,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              maxHeight: POPUP_MAX_H,
              ...shadows.lg,
            },
          ]}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              Interested in {listing.name}
            </Text>
            <IconButton
              name="close"
              size={36}
              iconSize={18}
              tone="ghost"
              color={colors.textSecondary}
              onPress={onClose}
            />
          </View>

          {applicants.length === 0 ? (
            <Text style={[styles.empty, { color: colors.textTertiary }]}>
              No requests yet
            </Text>
          ) : (
            <ScrollView
              style={bodyH != null ? { height: bodyH } : styles.bodyGrow}
              contentContainerStyle={styles.scrollContent}
              scrollEnabled={overflows}
              showsVerticalScrollIndicator={overflows}
              bounces={overflows}
              keyboardShouldPersistTaps="handled"
            >
              <View
                onLayout={e => {
                  const h = e.nativeEvent.layout.height;
                  if (h > 0) setContentH(h);
                }}
              >
                {applicants.map((req, index) => (
                  <ApplicantRow
                    key={req.id}
                    req={req}
                    showDivider={index > 0}
                    onAccept={handleAccept}
                    onOpenChat={onOpenChat}
                    onReject={onReject}
                    accepting={acceptingId === req.id}
                  />
                ))}
              </View>
            </ScrollView>
          )}
        </View>
      </ModalPresent>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  popup: {
    width: '100%',
    maxWidth: 440,
    borderRadius: radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 18,
    paddingRight: 8,
    paddingVertical: 8,
    minHeight: HEADER_H,
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  bodyGrow: {
    flexGrow: 0,
    flexShrink: 1,
  },
  scrollContent: {
    flexGrow: 0,
    paddingBottom: 4,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: 32,
    paddingHorizontal: 18,
    fontSize: 14,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 68,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mainTap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    minWidth: 0,
  },
  mainTapWeb: { cursor: 'pointer' as const },
  mainTapPressed: { opacity: 0.72 },
  personMeta: { flex: 1, gap: 2, minWidth: 0 },
  name: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  message: { fontSize: 13, lineHeight: 18 },
  sub: { fontSize: 12.5, fontWeight: '600' },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingRight: 8,
    flexShrink: 0,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  newDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
});
