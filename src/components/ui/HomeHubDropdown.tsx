import React, { useRef, useState } from 'react';
import {
  View, Text, Pressable, Modal, StyleSheet, Platform,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, shadows } from '../../theme/tokens';
import { Icon } from '../icons/Icon';

export const HOME_HUB_MENU_TABS = [
  { id: 'feed', label: 'Feed' },
  { id: 'community', label: 'Community' },
  { id: 'adoption', label: 'Adoption' },
  { id: 'rescue', label: 'Rescues' },
] as const;

export type HomeHubTab = (typeof HOME_HUB_MENU_TABS)[number]['id'];

const HEADER_LABELS: Record<HomeHubTab, string> = {
  feed: 'Feed',
  community: 'Community',
  adoption: 'Adoption',
  rescue: 'Rescues',
};

const MENU_WIDTH = 176;

export function HomeHubDropdown({
  value,
  onChange,
}: {
  value: HomeHubTab;
  onChange: (tab: HomeHubTab) => void;
}) {
  const { colors, scrim } = useTheme();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<View>(null);
  const [anchor, setAnchor] = useState({ x: 0, top: 0 });

  const openMenu = () => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({
        x: x + width / 2 - MENU_WIDTH / 2,
        top: y + height + 6,
      });
      setOpen(true);
    });
  };

  const select = (id: HomeHubTab) => {
    setOpen(false);
    onChange(id);
  };

  return (
    <>
      <Pressable
        ref={triggerRef}
        onPress={openMenu}
        style={({ pressed }) => [
          styles.trigger,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: pressed ? 0.88 : 1,
          },
          Platform.OS === 'web' && styles.triggerWeb,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Section: ${HEADER_LABELS[value]}`}
      >
        <Text style={[styles.triggerLabel, { color: colors.text }]}>
          {HEADER_LABELS[value]}
        </Text>
        <Icon name="chevronDown" size={11} color={colors.textTertiary} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: scrim }]}
          onPress={() => setOpen(false)}
        />
        <View
          style={[
            styles.menu,
            {
              top: anchor.top,
              left: anchor.x,
              width: MENU_WIDTH,
              backgroundColor: colors.surface,
              borderColor: colors.border,
              ...shadows.md,
            },
          ]}
        >
          {HOME_HUB_MENU_TABS.map(item => {
            const active = value === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => select(item.id)}
                style={({ pressed }) => [
                  styles.menuItem,
                  {
                    backgroundColor: active
                      ? colors.primary + '12'
                      : pressed
                        ? colors.surface2
                        : 'transparent',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.menuItemLabel,
                    {
                      color: active ? colors.primary : colors.text,
                      fontWeight: active ? '700' : '600',
                    },
                  ]}
                >
                  {item.label}
                </Text>
                {active ? <Icon name="check" size={14} color={colors.primary} /> : null}
              </Pressable>
            );
          })}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    flexShrink: 0,
  },
  triggerWeb: { cursor: 'pointer' as const },
  triggerLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  menu: {
    position: 'absolute',
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.md,
  },
  menuItemLabel: {
    fontSize: 14,
    letterSpacing: -0.1,
  },
});
