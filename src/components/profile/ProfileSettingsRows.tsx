import React, { useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Switch, Modal, Platform, Dimensions } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, shadows } from '../../theme/tokens';
import { Icon } from '../icons/Icon';
import { ModalPresent } from '../ui/ModalScrim';
export const profileMenuStyles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: 4 },
  intro: { fontSize: 14, lineHeight: 21, marginBottom: 8 },
  menuSection: { marginTop: 24 },
  menuSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
    paddingVertical: 10,
  },
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  kickerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  kicker: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  linkStack: { gap: 16 },
  menuLinkBody: { flex: 1, gap: 2 },
  menuLinkLabel: { fontSize: 14, fontWeight: '600', lineHeight: 19, letterSpacing: -0.1 },
  menuLinkHint: { fontSize: 12.5, lineHeight: 17 },
  railRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  railBar: {
    width: 2,
    borderRadius: 1,
    alignSelf: 'stretch',
    minHeight: 40,
  },
  toggleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minWidth: 0,
  },
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pickerTriggerLabel: { fontSize: 12.5, fontWeight: '700' },
  pickerMenu: {
    position: 'absolute',
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  pickerMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pickerMenuItemLabel: { fontSize: 13.5, lineHeight: 18 },
  sectionRule: { height: StyleSheet.hairlineWidth },
  sectionRuleWrap: { paddingVertical: 10 },
  menuDividerGroup: { gap: 8, paddingTop: 8 },
  accordion: { marginTop: 20 },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  accordionTitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  accordionBody: {
    paddingTop: 4,
    paddingBottom: 14,
  },
  accordionRule: { height: StyleSheet.hairlineWidth },
  subsectionTitle: { paddingVertical: 10 },
});

const PICKER_MENU_MIN_WIDTH = 120;
const PICKER_MENU_EDGE_PAD = 16;

export type ProfileMenuAccordionItem = {
  id: string;
  title: string;
  content: React.ReactNode;
};

export function ProfileMenuAccordion({ items }: { items: ProfileMenuAccordionItem[] }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const toggle = (id: string) => {
    setOpen(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <View style={profileMenuStyles.accordion}>
      {items.map((item, index) => {
        const isOpen = !!open[item.id];
        const isLast = index === items.length - 1;
        return (
          <View key={item.id}>
            <Pressable
              onPress={() => toggle(item.id)}
              accessibilityRole="button"
              accessibilityState={{ expanded: isOpen }}
              style={({ pressed }) => [
                profileMenuStyles.accordionHeader,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={[profileMenuStyles.accordionTitle, { color: colors.textTertiary }]}>
                {item.title}
              </Text>
              <View style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }}>
                <Icon name="chevronDown" size={16} color={colors.textTertiary} />
              </View>
            </Pressable>
            {isOpen ? <View style={profileMenuStyles.accordionBody}>{item.content}</View> : null}
            {!isLast ? (
              <View style={[profileMenuStyles.accordionRule, { backgroundColor: colors.border }]} />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

export function ProfileMenuIntro({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <Text style={[profileMenuStyles.intro, { color: colors.textSecondary }]}>
      {children}
    </Text>
  );
}

export function ProfileMenuSection({
  title,
  children,
  first,
  kicker,
  bare,
}: {
  title: string;
  children: React.ReactNode;
  first?: boolean;
  kicker?: boolean;
  /** Skip linkStack wrapper — for nested subsections inside a kicker block. */
  bare?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={[profileMenuStyles.menuSection, first && { marginTop: 8 }]}>
      {kicker ? (
        <View style={profileMenuStyles.kickerRow}>
          <View style={[profileMenuStyles.kickerLine, { backgroundColor: colors.border }]} />
          <Text style={[profileMenuStyles.kicker, { color: colors.textTertiary }]}>{title}</Text>
          <View style={[profileMenuStyles.kickerLine, { backgroundColor: colors.border }]} />
        </View>
      ) : (
        <Text style={[profileMenuStyles.menuSectionTitle, { color: colors.textTertiary }]}>
          {title}
        </Text>
      )}
      {bare ? children : <View style={profileMenuStyles.linkStack}>{children}</View>}
    </View>
  );
}

/** Always-visible block with accordion-style label and optional hairline below. */
export function ProfileMenuSubsection({
  title,
  children,
  showRule = true,
}: {
  title: string;
  children: React.ReactNode;
  showRule?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View>
      <Text style={[profileMenuStyles.accordionTitle, profileMenuStyles.subsectionTitle, { color: colors.textTertiary }]}>
        {title}
      </Text>
      <View style={[profileMenuStyles.accordionBody, profileMenuStyles.linkStack]}>
        {children}
      </View>
      {showRule ? (
        <View style={[profileMenuStyles.accordionRule, { backgroundColor: colors.border }]} />
      ) : null}
    </View>
  );
}

function ProfileMenuRailWrap({
  barTint,
  children,
}: {
  barTint?: string;
  children: React.ReactNode;
}) {
  if (!barTint) return <>{children}</>;
  return (
    <View style={profileMenuStyles.railRow}>
      <View style={[profileMenuStyles.railBar, { backgroundColor: barTint }]} />
      {children}
    </View>
  );
}

export function ProfileMenuToggleRow({
  icon,
  label,
  hint,
  tint,
  barTint,
  value,
  onValueChange,
}: {
  icon: string;
  label: string;
  hint?: string;
  tint?: string;
  barTint?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  const { colors } = useTheme();
  const accent = tint ?? barTint ?? colors.primary;
  return (
    <ProfileMenuRailWrap barTint={barTint}>
      <View style={profileMenuStyles.toggleRow}>
        <Icon name={icon} size={20} color={accent} sw={2} />
        <View style={profileMenuStyles.menuLinkBody}>
          <Text style={[profileMenuStyles.menuLinkLabel, { color: colors.text }]}>{label}</Text>
          {hint ? (
            <Text style={[profileMenuStyles.menuLinkHint, { color: colors.textTertiary }]}>{hint}</Text>
          ) : null}
        </View>
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: colors.border, true: accent + '88' }}
          thumbColor="#fff"
        />
      </View>
    </ProfileMenuRailWrap>
  );
}

export function ProfileMenuPickerRow({
  icon,
  label,
  hint,
  tint,
  barTint,
  value,
  options,
  onChange,
}: {
  icon: string;
  label: string;
  hint?: string;
  tint?: string;
  barTint?: string;
  value: string;
  options: { id: string; label: string }[];
  onChange: (id: string) => void;
}) {
  const { colors } = useTheme();
  const accent = tint ?? barTint ?? colors.primary;
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<View>(null);
  const [anchor, setAnchor] = useState({ left: 0, top: 0, width: PICKER_MENU_MIN_WIDTH });
  const current = options.find(o => o.id === value)?.label ?? value;

  const toggleMenu = () => {
    if (open) {
      setOpen(false);
      return;
    }
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      const menuWidth = Math.max(width, PICKER_MENU_MIN_WIDTH);
      const screenWidth = Dimensions.get('window').width;
      const idealLeft = x + width - menuWidth;
      const left = Math.max(
        PICKER_MENU_EDGE_PAD,
        Math.min(idealLeft, screenWidth - menuWidth - PICKER_MENU_EDGE_PAD),
      );
      setAnchor({ left, top: y + height + 6, width: menuWidth });
      setOpen(true);
    });
  };

  const pick = (id: string) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <>
      <ProfileMenuRailWrap barTint={barTint}>
        <View style={profileMenuStyles.toggleRow}>
          <Icon name={icon} size={20} color={accent} sw={2} />
          <View style={profileMenuStyles.menuLinkBody}>
            <Text style={[profileMenuStyles.menuLinkLabel, { color: colors.text }]}>{label}</Text>
            {hint ? (
              <Text style={[profileMenuStyles.menuLinkHint, { color: colors.textTertiary }]}>{hint}</Text>
            ) : null}
          </View>
          <Pressable
            ref={triggerRef}
            onPress={toggleMenu}
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            accessibilityLabel={`${label}: ${current}`}
            style={({ pressed }) => [
              profileMenuStyles.pickerTrigger,
              {
                borderColor: accent + '44',
                backgroundColor: accent + '10',
                opacity: pressed ? 0.82 : 1,
              },
              Platform.OS === 'web' && { cursor: 'pointer' as const },
            ]}
          >
            <Text style={[profileMenuStyles.pickerTriggerLabel, { color: accent }]}>{current}</Text>
            <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
              <Icon name="chevronDown" size={14} color={accent} />
            </View>
          </Pressable>
        </View>
      </ProfileMenuRailWrap>

      <Modal visible={open} transparent animationType="none" onRequestClose={() => setOpen(false)}>
        <ModalPresent onDismiss={() => setOpen(false)} animatedScale={false}>
          <View
            style={[
              profileMenuStyles.pickerMenu,
              {
                top: anchor.top,
                left: anchor.left,
                width: anchor.width,
                backgroundColor: colors.surface,
                borderColor: colors.border,
                ...shadows.md,
              },
            ]}
          >
            {options.map(opt => {
              const selected = opt.id === value;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => pick(opt.id)}
                  style={({ pressed }) => [
                    profileMenuStyles.pickerMenuItem,
                    {
                      backgroundColor: selected
                        ? accent + '12'
                        : pressed
                          ? colors.surface2
                          : 'transparent',
                    },
                  ]}
                >
                  <Text
                    style={[
                      profileMenuStyles.pickerMenuItemLabel,
                      {
                        color: selected ? accent : colors.text,
                        fontWeight: selected ? '700' : '600',
                      },
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {selected ? <Icon name="check" size={16} color={accent} /> : null}
                </Pressable>
              );
            })}
          </View>
        </ModalPresent>
      </Modal>
    </>
  );
}

export function ProfileMenuLink({
  icon,
  label,
  hint,
  tint,
  onPress,
  danger,
}: {
  icon: string;
  label: string;
  hint?: string;
  tint?: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  const { colors } = useTheme();
  const iconColor = danger ? colors.danger : (tint ?? colors.primary);

  const content = (
    <View style={profileMenuStyles.toggleRow}>
      <Icon name={icon} size={20} color={iconColor} sw={2} />
      <View style={profileMenuStyles.menuLinkBody}>
        <Text style={[profileMenuStyles.menuLinkLabel, { color: danger ? colors.danger : colors.text }]}>
          {label}
        </Text>
        {hint ? (
          <Text style={[profileMenuStyles.menuLinkHint, { color: colors.textTertiary }]}>{hint}</Text>
        ) : null}
      </View>
      {onPress ? <Icon name="chevronRight" size={15} color={colors.textTertiary} /> : null}
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
      {content}
    </Pressable>
  );
}

export function ProfileMenuSectionRule({ compact }: { compact?: boolean } = {}) {
  const { colors } = useTheme();
  const line = (
    <View style={[profileMenuStyles.sectionRule, { backgroundColor: colors.border }]} />
  );
  if (compact) return line;
  return <View style={profileMenuStyles.sectionRuleWrap}>{line}</View>;
}

export function ProfileMenuGroupRail({
  tint,
  icon,
  name,
  meta,
  onPress,
  trailing,
}: {
  tint: string;
  icon: string;
  name: string;
  meta?: string;
  onPress?: () => void;
  trailing?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const content = (
    <ProfileMenuRailWrap barTint={tint}>
      <View style={profileMenuStyles.toggleRow}>
        <Icon name={icon} size={20} color={tint} sw={2} />
        <View style={profileMenuStyles.menuLinkBody}>
          <Text style={[profileMenuStyles.menuLinkLabel, { color: colors.text }]} numberOfLines={1}>
            {name}
          </Text>
          {meta ? (
            <Text style={[profileMenuStyles.menuLinkHint, { color: colors.textTertiary }]}>{meta}</Text>
          ) : null}
        </View>
        {trailing ?? (onPress ? (
          <Icon name="chevronRight" size={15} color={colors.textTertiary} />
        ) : null)}
      </View>
    </ProfileMenuRailWrap>
  );
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.72 : 1 }]}>
      {content}
    </Pressable>
  );
}

export function ProfileMenuTextAction({
  label,
  tint,
  onPress,
}: {
  label: string;
  tint?: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={8} style={({ pressed }) => [{ opacity: pressed ? 0.65 : 1 }]}>
      <Text style={[profileMenuStyles.pickerTriggerLabel, { color: tint ?? colors.primary, fontSize: 13 }]}>
        {label}
      </Text>
    </Pressable>
  );
}
