import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  Platform,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Icon } from '../icons/Icon';
import { radius, shadows } from '../../theme/tokens';
import { ModalPresent } from '../ui/ModalScrim';
import { requestConfirmDialog } from '../ui/ConfirmDialog';

const MENU_WIDTH = 216;
const MENU_EDGE = 12;

export function confirmDeletePost(
  onConfirm: () => void,
  options?: { title?: string; message?: string; webMessage?: string },
) {
  const title = options?.title ?? 'Delete post?';
  const message = options?.message ?? 'This cannot be undone.';
  const webMessage = options?.webMessage ?? `${title} ${message}`;
  if (Platform.OS === 'web') {
    const shown = requestConfirmDialog({
      title,
      body: message,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      destructive: true,
      onConfirm,
    });
    if (shown) return;
    if (typeof window !== 'undefined' && window.confirm(webMessage)) {
      onConfirm();
    }
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onConfirm },
  ]);
}

type MenuAction = {
  key: string;
  icon: string;
  label: string;
  tone: 'default' | 'danger';
  onPress: () => void;
};

export function PostOwnerMenu({
  onEdit,
  onDelete,
}: {
  onEdit?: () => void;
  onDelete?: () => void;
  /** @deprecated positioning is handled via modal overlay */
  align?: 'right' | 'inline';
}) {
  const { colors } = useTheme();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<View>(null);
  const [anchor, setAnchor] = useState({ x: 0, top: 0 });

  if (!onEdit && !onDelete) return null;

  const actions: MenuAction[] = [];
  if (onEdit) {
    actions.push({
      key: 'edit',
      icon: 'edit',
      label: 'Edit post',
      tone: 'default',
      onPress: () => {
        setOpen(false);
        onEdit();
      },
    });
  }
  if (onDelete) {
    actions.push({
      key: 'delete',
      icon: 'trash',
      label: 'Delete post',
      tone: 'danger',
      onPress: () => {
        setOpen(false);
        confirmDeletePost(onDelete);
      },
    });
  }

  const menuHeight = actions.length * 52 + 12;

  const openMenu = () => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      let left = x + width - MENU_WIDTH;
      left = Math.max(MENU_EDGE, Math.min(left, windowWidth - MENU_WIDTH - MENU_EDGE));

      const belowTop = y + height + 8;
      const aboveTop = y - menuHeight - 8;
      const top = belowTop + menuHeight > windowHeight - MENU_EDGE && aboveTop >= MENU_EDGE
        ? aboveTop
        : belowTop;

      setAnchor({ x: left, top });
      setOpen(true);
    });
  };

  return (
    <>
      <View style={styles.wrap} ref={triggerRef} collapsable={false}>
        <Pressable
          onPress={openMenu}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Post options"
          style={({ pressed }) => [styles.trigger, { opacity: pressed ? 0.65 : 1 }]}
        >
          <View style={[styles.triggerDot, { backgroundColor: colors.neutralBg }]}>
            <Icon name="more" size={18} color={colors.textSecondary} />
          </View>
        </Pressable>
      </View>

      <Modal visible={open} transparent animationType="none" onRequestClose={() => setOpen(false)}>
        <ModalPresent
          onDismiss={() => setOpen(false)}
          accessibilityLabel="Close menu"
          animatedScale={false}
        >
          <View
            style={[
              styles.menu,
              {
                top: anchor.top,
                left: anchor.x,
                width: MENU_WIDTH,
                backgroundColor: colors.surface,
                ...shadows.lg,
              },
            ]}
          >
          {actions.map(action => {
            const danger = action.tone === 'danger';
            const iconBg = danger ? colors.dangerBg : colors.infoBg;
            const iconColor = danger ? colors.danger : colors.primary;
            const labelColor = danger ? colors.danger : colors.text;

            return (
              <Pressable
                key={action.key}
                onPress={action.onPress}
                style={({ pressed }) => [
                  styles.row,
                  { backgroundColor: pressed ? colors.surface2 : 'transparent' },
                ]}
                accessibilityRole="menuitem"
                accessibilityLabel={action.label}
              >
                <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
                  <Icon name={action.icon} size={16} color={iconColor} sw={2} />
                </View>
                <Text style={[styles.label, { color: labelColor }]} numberOfLines={1}>
                  {action.label}
                </Text>
              </Pressable>
            );
          })}
          </View>
        </ModalPresent>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'flex-start',
    flexShrink: 0,
    marginLeft: 'auto',
  },
  trigger: {
    paddingVertical: 2,
    paddingLeft: 8,
  },
  triggerDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menu: {
    position: 'absolute',
    borderRadius: radius.lg,
    paddingVertical: 6,
    paddingHorizontal: 6,
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: radius.md,
    minHeight: 48,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  label: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.15,
  },
});
