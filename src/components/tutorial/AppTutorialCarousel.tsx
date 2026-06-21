import React, { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewToken,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { fonts } from '../../theme/fonts';
import { radius, shadows, spacing, typography } from '../../theme/tokens';
import type { lightColors } from '../../theme/tokens';
import { AppLogo } from '../ui/AppLogo';
import { Button } from '../ui/Button';
import { Icon } from '../icons/Icon';

type SlideAccent = 'primary' | 'accent' | 'success' | 'info' | 'warning';

type Slide = {
  id: string;
  eyebrow: string;
  icon?: string;
  showLogo?: boolean;
  title: string;
  body: string;
  bullets: string[];
  accent: SlideAccent;
};

const SLIDES: Slide[] = [
  {
    id: 'welcome',
    eyebrow: 'Getting started',
    showLogo: true,
    title: 'Welcome to Parul',
    body: 'Your community for pets, adoption, and rescue — all in one place.',
    bullets: [
      'Connect with pet people near you',
      'Share updates about your companions',
      'Help with adoption and rescue',
    ],
    accent: 'primary',
  },
  {
    id: 'feed',
    eyebrow: 'Home feed',
    icon: 'home',
    title: 'Your daily pet timeline',
    body: 'See what matters from people you follow and share your own moments.',
    bullets: [
      'Scroll posts from your network',
      'React with treats on updates',
      'Share photos of your pets',
    ],
    accent: 'primary',
  },
  {
    id: 'hub',
    eyebrow: 'Navigation',
    icon: 'grid',
    title: 'Switch hubs anytime',
    body: 'Use the hub menu in the feed header to jump between main areas.',
    bullets: [
      'Feed — your main timeline',
      'Communities — interest groups',
      'Adoption — browse listings',
    ],
    accent: 'info',
  },
  {
    id: 'circles',
    eyebrow: 'Paw circles',
    icon: 'circles',
    title: 'Local pet-parent circles',
    body: 'Join neighborhood groups and stay close to people who get it.',
    bullets: [
      'Discover circles near you',
      'Chat with members in real time',
      'Share tips and local alerts',
    ],
    accent: 'accent',
  },
  {
    id: 'adoption',
    eyebrow: 'Adoption',
    icon: 'adoption',
    title: 'Find a forever home',
    body: 'Browse listings, apply to adopt, and follow along with posters.',
    bullets: [
      'Explore pets ready for adoption',
      'Submit applications in-app',
      'Track status and updates',
    ],
    accent: 'success',
  },
  {
    id: 'rescue',
    eyebrow: 'Rescue & profile',
    icon: 'alert',
    title: 'Help when it counts',
    body: 'Report or respond to rescue cases, then manage everything from Profile.',
    bullets: [
      'Post or help with rescue alerts',
      'Manage your pets and settings',
      'Send beta feedback anytime',
    ],
    accent: 'warning',
  },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_MAX_WIDTH = 360;

function shade(hex: string, pct: number): string {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  const f = pct < 0 ? 0 : 255;
  const t = Math.abs(pct) / 100;
  r = Math.round((f - r) * t) + r;
  g = Math.round((f - g) * t) + g;
  b = Math.round((f - b) * t) + b;
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function getSlideAccent(
  accent: SlideAccent,
  colors: typeof lightColors,
): { main: string; soft: string; gradient: [string, string, string] } {
  switch (accent) {
    case 'accent':
      return {
        main: colors.accent,
        soft: colors.accent + (colors.accent.length === 7 ? '1A' : ''),
        gradient: [colors.accent, shade(colors.accent, -12), colors.accentDark],
      };
    case 'success':
      return {
        main: colors.success,
        soft: colors.successBg,
        gradient: [shade(colors.success, 14), colors.success, shade(colors.success, -18)],
      };
    case 'info':
      return {
        main: colors.info,
        soft: colors.infoBg,
        gradient: [colors.primaryLight, colors.primary, colors.primaryDark],
      };
    case 'warning':
      return {
        main: colors.warning,
        soft: colors.warningBg,
        gradient: [shade(colors.warning, 16), colors.warning, shade(colors.warning, -16)],
      };
    default:
      return {
        main: colors.primary,
        soft: colors.infoBg,
        gradient: [colors.primaryLight, colors.primary, colors.primaryDark],
      };
  }
}

function TutorialSlideCard({
  slide,
  slideIndex,
}: {
  slide: Slide;
  slideIndex: number;
}) {
  const { colors, isDark } = useTheme();
  const accent = getSlideAccent(slide.accent, colors);

  return (
    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
          shadows.md,
        ]}
      >
        <View style={styles.cardHeader}>
          {slide.showLogo ? (
            <View style={[styles.logoFrame, { backgroundColor: accent.soft, borderColor: colors.border }]}>
              <AppLogo size={80} showWordmark />
            </View>
          ) : (
            <LinearGradient
              colors={accent.gradient}
              start={{ x: 0.12, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconOrb}
            >
              <Icon
                name={slide.icon!}
                size={34}
                color="#fff"
                sw={2}
              />
            </LinearGradient>
          )}
          <View style={[styles.stepPill, { backgroundColor: accent.soft }]}>
            <Text style={[styles.stepPillText, { color: accent.main }]}>
              {slideIndex + 1} of {SLIDES.length}
            </Text>
          </View>
        </View>

        <Text style={[styles.eyebrow, { color: accent.main }]}>{slide.eyebrow}</Text>
        <Text style={[styles.title, { color: colors.text }]}>{slide.title}</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>{slide.body}</Text>

        <View style={[styles.bulletList, { borderTopColor: colors.border }]}>
          {slide.bullets.map(line => (
            <View key={line} style={styles.bulletRow}>
              <View style={[styles.bulletIcon, { backgroundColor: accent.soft }]}>
                <Icon name="check" size={12} color={accent.main} sw={2.2} />
              </View>
              <Text style={[styles.bulletText, { color: colors.text }]}>{line}</Text>
            </View>
          ))}
        </View>
      </View>

      {!isDark && (
        <View pointerEvents="none" style={styles.decorWrap}>
          <View style={[styles.decorOrb, styles.decorOrbPrimary, { backgroundColor: colors.primary + '14' }]} />
          <View style={[styles.decorOrb, styles.decorOrbAccent, { backgroundColor: colors.accent + '12' }]} />
        </View>
      )}
    </View>
  );
}

export function AppTutorialCarousel({ onComplete }: { onComplete: () => void }) {
  const { colors, gradients } = useTheme();
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);

  const isLast = index >= SLIDES.length - 1;
  const progress = (index + 1) / SLIDES.length;

  const finish = useCallback(() => {
    void onComplete();
  }, [onComplete]);

  const goNext = useCallback(() => {
    if (isLast) {
      finish();
      return;
    }
    listRef.current?.scrollToIndex({ index: index + 1, animated: true });
  }, [finish, index, isLast]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const next = viewableItems[0]?.index;
    if (typeof next === 'number') setIndex(next);
  }).current;

  const onMomentumScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (Number.isFinite(next)) setIndex(next);
  }, []);

  const renderSlide = useCallback(
    ({ item, index: slideIndex }: { item: Slide; index: number }) => (
      <TutorialSlideCard slide={item} slideIndex={slideIndex} />
    ),
    [],
  );

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[...gradients.background.colors]}
        locations={[...gradients.background.locations]}
        start={gradients.background.start}
        end={gradients.background.end}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={[...gradients.glow.colors]}
        locations={[...gradients.glow.locations]}
        start={gradients.glow.start}
        end={gradients.glow.end}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <View style={[styles.tourBadge, { backgroundColor: colors.infoBg, borderColor: colors.border }]}>
            <Icon name="sparkle" size={14} color={colors.primary} sw={2} />
            <Text style={[styles.tourBadgeText, { color: colors.primary }]}>Quick tour</Text>
          </View>
          <Pressable
            onPress={finish}
            hitSlop={12}
            style={({ pressed }) => [
              styles.skipBtn,
              { backgroundColor: colors.surface, borderColor: colors.border },
              pressed && { opacity: 0.72 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Skip tutorial"
          >
            <Text style={[styles.skipText, { color: colors.textSecondary }]}>Skip</Text>
          </Pressable>
        </View>

        <FlatList
          ref={listRef}
          data={SLIDES}
          keyExtractor={item => item.id}
          renderItem={renderSlide}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          onMomentumScrollEnd={onMomentumScrollEnd}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
          getItemLayout={(_, i) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * i,
            index: i,
          })}
          style={styles.list}
          contentContainerStyle={styles.listContent}
        />

        <View style={styles.footer}>
          <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
            <LinearGradient
              colors={[colors.primaryLight, colors.primary]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]}
            />
          </View>

          <View style={styles.dots}>
            {SLIDES.map((slide, i) => (
              <View
                key={slide.id}
                style={[
                  styles.dot,
                  {
                    backgroundColor: i === index ? colors.primary : colors.borderStrong,
                    width: i === index ? 20 : 7,
                    opacity: i === index ? 1 : 0.55,
                  },
                ]}
              />
            ))}
          </View>

          <Button full size="lg" onPress={goNext} iconRight={isLast ? undefined : 'arrowRight'}>
            {isLast ? 'Get started' : 'Next'}
          </Button>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  tourBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tourBadgeText: {
    ...typography.caption,
    fontSize: 12,
    letterSpacing: 0.2,
  },
  skipBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  skipText: {
    fontSize: 14,
    fontFamily: fonts.semibold,
  },
  list: { flex: 1 },
  listContent: {
    alignItems: 'center',
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    position: 'relative',
  },
  card: {
    width: '100%',
    maxWidth: CARD_MAX_WIDTH,
    alignSelf: 'center',
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.xl2,
    paddingTop: spacing.xl2,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  cardHeader: {
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  logoFrame: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconOrb: {
    width: 92,
    height: 92,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  stepPillText: {
    ...typography.caption,
    fontSize: 11,
    letterSpacing: 0.3,
  },
  eyebrow: {
    ...typography.sectionLabel,
    textAlign: 'center',
  },
  title: {
    ...typography.heroName,
    fontSize: 26,
    lineHeight: 32,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  body: {
    ...typography.bodySm,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  bulletList: {
    marginTop: spacing.xs,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  bulletIcon: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  bulletText: {
    ...typography.bodySm,
    flex: 1,
    lineHeight: 21,
  },
  decorWrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
  },
  decorOrb: {
    position: 'absolute',
    borderRadius: radius.full,
  },
  decorOrbPrimary: {
    width: 180,
    height: 180,
    top: '8%',
    right: '-18%',
  },
  decorOrbAccent: {
    width: 140,
    height: 140,
    bottom: '12%',
    left: '-16%',
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  progressTrack: {
    height: 4,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 7,
    borderRadius: radius.full,
  },
});
