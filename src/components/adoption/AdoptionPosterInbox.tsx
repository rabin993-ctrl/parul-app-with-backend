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
import { IconButton } from '../ui/Button';
import { AdoptionListing } from '../../data/adoptionData';
import type { AdoptionRequest } from '../../context/AdoptionFeedContext';
import { users } from '../../data/mockData';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const POPUP_MAX_H = Math.min(
  SCREEN_HEIGHT * sheetLayout.drawerMaxHeightRatio,
  sheetLayout.drawerMaxHeightCap,
);
const HEADER_H = 52;

export function AdoptionPosterInbox({
  visible,
  listing,
  requests,
  onClose,
  onReject,
  onOpenChat,
}: {
  visible: boolean;
  listing: AdoptionListing | null;
  requests: AdoptionRequest[];
  onClose: () => void;
  onReject: (requestId: string) => void;
  onOpenChat: (request: AdoptionRequest) => void;
}) {
  const { colors, scrim } = useTheme();
  const [contentH, setContentH] = useState(0);

  const resetMeasures = useCallback(() => setContentH(0), []);

  const applicants = requests.filter(r => r.status !== 'rejected');

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
      animationType="fade"
      onRequestClose={onClose}
      onShow={resetMeasures}
    >
      <View style={styles.overlay}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: scrim }]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
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
                {applicants.map((req, index) => {
                  const user = users[req.requesterId as keyof typeof users];
                  const isNew = req.status === 'submitted';
                  const adopted = req.status === 'adopted';

                  return (
                    <View key={req.id}>
                      {index > 0 && (
                        <View style={[styles.divider, { backgroundColor: colors.border }]} />
                      )}
                      <View style={styles.actionRow}>
                        <Pressable
                          onPress={() => !adopted && onOpenChat(req)}
                          disabled={adopted}
                          style={({ pressed }) => [
                            styles.mainTap,
                            Platform.OS === 'web' && styles.mainTapWeb,
                            pressed && !adopted && styles.mainTapPressed,
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={`Message ${req.requesterName}`}
                        >
                          {user && <Avatar user={user} size={44} />}
                          <View style={styles.personMeta}>
                            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                              {req.requesterName}
                            </Text>
                            <Text style={[styles.sub, { color: isNew ? colors.primary : colors.textTertiary }]}>
                              {adopted ? 'Adopted' : isNew ? 'New request' : 'In chat'}
                            </Text>
                          </View>
                          {!adopted ? (
                            <View style={styles.trailing}>
                              {isNew ? (
                                <View style={[styles.newDot, { backgroundColor: colors.primary }]} />
                              ) : null}
                              <Icon name="comment" size={18} color={colors.primary} />
                            </View>
                          ) : (
                            <Icon name="adoption" size={18} color={colors.success} />
                          )}
                        </Pressable>

                        {isNew ? (
                          <IconButton
                            name="close"
                            size={36}
                            iconSize={16}
                            tone="ghost"
                            color={colors.textTertiary}
                            onPress={() => onReject(req.id)}
                          />
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </View>
      </View>
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
  sub: { fontSize: 12.5, fontWeight: '600' },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  newDot: { width: 8, height: 8, borderRadius: 4 },
});
