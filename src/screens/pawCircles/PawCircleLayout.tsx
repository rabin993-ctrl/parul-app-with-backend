import React, { RefObject } from 'react';
import { View, Text, ScrollView, StyleSheet, ScrollViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, typography } from '../../theme/tokens';
import { CircleAvatar } from '../../components/ui/CircleAvatar';
import { Icon } from '../../components/icons/Icon';
import { PawCircle } from '../../data/pawCircles';
import { PawCircleSubHeader } from './PawCircleViews';
import { PawCircleHairline } from './PawCircleChrome';

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
        {circle && (
          <>
            <CircleContextHeader circle={circle} />
            <PawCircleHairline />
          </>
        )}
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function CircleContextHeader({ circle }: { circle: PawCircle }) {
  const { colors } = useTheme();
  return (
    <View style={styles.contextHeader}>
      <CircleAvatar circle={circle} size={40} iconSize={20} label={circle.name} />
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
  return (
    <View style={[styles.innerCard, style]}>
      {children}
    </View>
  );
}

export function PawCircleSectionTitle({ children }: { children: string }) {
  const { colors } = useTheme();
  return (
    <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>{children}</Text>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.lg,
  },
  contextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  contextIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contextName: { ...typography.title, fontSize: 16 },
  contextMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  contextMeta: { ...typography.meta, flex: 1 },
  innerCard: {
    gap: 0,
  },
  sectionTitle: {
    ...typography.sectionLabel,
    marginLeft: 2,
    marginTop: spacing.xs,
  },
});
