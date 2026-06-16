import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Pressable, Modal, StyleSheet, Platform, Animated, Easing,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, shadows } from '../../theme/tokens';
import { Icon } from '../icons/Icon';
import { ModalPresent } from './ModalScrim';

export const HOME_HUB_MENU_TABS = [
  { id: 'feed', label: 'Feed' },
  { id: 'adoption', label: 'Adoption' },
  { id: 'rescue', label: 'Rescues' },
] as const;

export type HomeHubTab = (typeof HOME_HUB_MENU_TABS)[number]['id'];

export const HOME_SECTION_TABS = HOME_HUB_MENU_TABS.filter(t => t.id !== 'feed');

export type HomeSectionTab = Exclude<HomeHubTab, 'feed'>;

export const HOME_HUB_HEADER_LABELS: Record<HomeHubTab, string> = {
  feed: 'Feed',
  adoption: 'Adoption',
  rescue: 'Rescues',
};

const HEADER_LABELS = HOME_HUB_HEADER_LABELS;

const MENU_WIDTH = 176;
const MENU_ITEM_HEIGHT = 44;
const menuEstimatedHeight = HOME_SECTION_TABS.length * MENU_ITEM_HEIGHT + 8;

const SECTION_BELT_LABELS = ['Adoption', 'Rescues'] as const;
const SECTION_BELT_LINE_HEIGHT = 18;
const SECTION_BELT_HOLD_MS = 3200;
const SECTION_BELT_SCROLL_MS = 700;

function SectionLabelBelt({
  color,
  muted,
}: {
  color: string;
  muted?: boolean;
}) {
  const translateY = useRef(new Animated.Value(0)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    const step = -SECTION_BELT_LINE_HEIGHT;

    const runCycle = () => {
      loopRef.current = Animated.sequence([
        Animated.delay(SECTION_BELT_HOLD_MS),
        Animated.timing(translateY, {
          toValue: step,
          duration: SECTION_BELT_SCROLL_MS,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.delay(SECTION_BELT_HOLD_MS),
        Animated.timing(translateY, {
          toValue: step * 2,
          duration: SECTION_BELT_SCROLL_MS,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]);
      loopRef.current.start(({ finished }) => {
        if (!finished) return;
        translateY.setValue(0);
        runCycle();
      });
    };

    translateY.setValue(0);
    runCycle();
    return () => {
      loopRef.current?.stop();
      translateY.stopAnimation();
    };
  }, [translateY]);

  return (
    <View style={styles.beltClip}>
      <Animated.View style={{ transform: [{ translateY }] }}>
        {[...SECTION_BELT_LABELS, SECTION_BELT_LABELS[0]].map((label, index) => (
          <Text
            key={`${label}-${index}`}
            style={[
              styles.triggerLabel,
              styles.beltLine,
              { color },
              muted && styles.triggerLabelMuted,
            ]}
          >
            {label}
          </Text>
        ))}
      </Animated.View>
    </View>
  );
}

export function HomeSectionsDropdown({
  value,
  onChange,
  placement = 'below',
}: {
  value: HomeHubTab;
  onChange: (tab: HomeSectionTab) => void;
  placement?: 'above' | 'below';
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<View>(null);
  const [anchor, setAnchor] = useState({ x: 0, top: 0 });

  const triggerLabel = value === 'rescue' ? 'Rescues' : 'Adoption';
  const triggerMuted = value === 'feed';

  const openMenu = () => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({
        x: x + width - MENU_WIDTH,
        top: placement === 'above'
          ? y - menuEstimatedHeight - 6
          : y + height + 6,
      });
      setOpen(true);
    });
  };

  const select = (id: HomeSectionTab) => {
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
          value !== 'feed' && { borderColor: colors.primary + '55' },
          Platform.OS === 'web' && styles.triggerWeb,
        ]}
        accessibilityRole="button"
        accessibilityLabel={
          triggerMuted
            ? 'Section menu, Adoption or Rescues'
            : `Section: ${triggerLabel}`
        }
      >
        {triggerMuted ? (
          <SectionLabelBelt color={colors.textTertiary} muted />
        ) : (
          <Text
            style={[
              styles.triggerLabel,
              { color: colors.primary },
            ]}
          >
            {triggerLabel}
          </Text>
        )}
        <Icon name="chevronDown" size={11} color={colors.textTertiary} />
      </Pressable>

      <Modal visible={open} transparent animationType="none" onRequestClose={() => setOpen(false)}>
        <ModalPresent onDismiss={() => setOpen(false)} animatedScale={false}>
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
          {HOME_SECTION_TABS.map(item => {
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
        </ModalPresent>
      </Modal>
    </>
  );
}

export function HomeHubDropdown({
  value,
  onChange,
}: {
  value: HomeHubTab;
  onChange: (tab: HomeHubTab) => void;
}) {
  const { colors } = useTheme();
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

      <Modal visible={open} transparent animationType="none" onRequestClose={() => setOpen(false)}>
        <ModalPresent onDismiss={() => setOpen(false)} animatedScale={false}>
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
        </ModalPresent>
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
  triggerLabelMuted: {
    fontWeight: '600',
  },
  beltClip: {
    height: SECTION_BELT_LINE_HEIGHT,
    minWidth: 52,
    overflow: 'hidden',
  },
  beltLine: {
    height: SECTION_BELT_LINE_HEIGHT,
    lineHeight: SECTION_BELT_LINE_HEIGHT,
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
