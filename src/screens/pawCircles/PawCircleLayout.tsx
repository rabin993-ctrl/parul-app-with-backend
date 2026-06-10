import React, { RefObject } from 'react';
import { View, Text, ScrollView, StyleSheet, ScrollViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { radius, shadows } from '../../theme/tokens';
import { Icon } from '../../components/icons/Icon';
import { PawCircle } from '../../data/pawCircles';
import { PawCircleSubHeader } from './PawCircleViews';

export function PawCircleScreenShell({
  title,
  circle,
  tabBarPad,
  children,
  scrollProps,
  scrollRef,
}: {
  title: string;
  circle?: PawCircle | null;
  tabBarPad: number;
  children: React.ReactNode;
  scrollProps?: Omit<ScrollViewProps, 'children' | 'contentContainerStyle' | 'ref'>;
  scrollRef?: RefObject<ScrollView | null>;
}) {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <PawCircleSubHeader title={title} />
      <ScrollView
        ref={scrollRef}
        {...scrollProps}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: tabBarPad }]}
      >
        <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }, shadows.sm]}>
          {circle && <CircleContextHeader circle={circle} />}
          {children}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function CircleContextHeader({ circle }: { circle: PawCircle }) {
  const { colors, iconBg } = useTheme();
  return (
    <View style={[styles.contextHeader, { borderBottomColor: colors.border }]}>
      <View style={[styles.contextIcon, { backgroundColor: iconBg(circle.iconBg) }]}>
        <Icon
          name={circle.icon}
          size={18}
          color={circle.tint}
          fill={circle.icon === 'paw' || circle.icon === 'cat' ? circle.tint : 'none'}
        />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.contextName, { color: colors.text }]} numberOfLines={1}>{circle.name}</Text>
        <View style={styles.contextMetaRow}>
          <Icon name="mapPin" size={11} color={colors.textTertiary} />
          <Text style={[styles.contextMeta, { color: colors.textSecondary }]} numberOfLines={1}>
            {circle.location} · {circle.memberCount} members
          </Text>
        </View>
      </View>
    </View>
  );
}

export function PawCircleInnerCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: object;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.innerCard, { backgroundColor: colors.bg, borderColor: colors.border }, style]}>
      {children}
    </View>
  );
}

export function PawCircleSectionTitle({ children }: { children: string }) {
  const { colors } = useTheme();
  return (
    <Text style={[styles.sectionTitle, { color: colors.text }]}>{children}</Text>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 16 },
  panel: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 10,
  },
  contextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 12,
    marginBottom: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  contextIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contextName: { fontSize: 16, fontWeight: '800' },
  contextMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  contextMeta: { fontSize: 12, flex: 1 },
  innerCard: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  sectionTitle: { fontSize: 14, fontWeight: '800', marginTop: 4 },
});
