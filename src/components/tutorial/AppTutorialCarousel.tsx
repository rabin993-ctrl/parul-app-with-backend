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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { fonts } from '../../theme/fonts';
import { radius, spacing } from '../../theme/tokens';
import { AppLogo } from '../ui/AppLogo';
import { Button } from '../ui/Button';
import { Icon } from '../icons/Icon';

type Slide = {
  id: string;
  icon?: string;
  showLogo?: boolean;
  title: string;
  body: string;
};

const SLIDES: Slide[] = [
  {
    id: 'welcome',
    showLogo: true,
    title: 'Welcome to Parul',
    body: 'Connect around pets, adoption, and rescue in your community. Here is a quick tour of the app.',
  },
  {
    id: 'feed',
    icon: 'home',
    title: 'Home feed',
    body: 'See posts from people you follow, share updates about your pets, and react with treats.',
  },
  {
    id: 'hub',
    icon: 'grid',
    title: 'Switch hubs',
    body: 'Use the home hub menu in the feed header to jump between Feed, Community groups, and Adoption.',
  },
  {
    id: 'circles',
    icon: 'circles',
    title: 'Paw Circles',
    body: 'Join local pet-parent circles, chat with members, and stay close to your neighborhood.',
  },
  {
    id: 'adoption',
    icon: 'adoption',
    title: 'Adoption',
    body: 'Browse listings, apply to adopt, and track updates from posters through the adoption hub.',
  },
  {
    id: 'rescue',
    icon: 'alert',
    title: 'Rescue & profile',
    body: 'Report or help with rescue cases from the feed. Manage your pets, settings, and beta feedback from Profile.',
  },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function AppTutorialCarousel({ onComplete }: { onComplete: () => void }) {
  const { colors } = useTheme();
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);

  const isLast = index >= SLIDES.length - 1;

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

  const renderSlide = useCallback(({ item }: { item: Slide }) => (
    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
      <View style={styles.slideInner}>
        {item.showLogo ? (
          <AppLogo size={72} showWordmark />
        ) : (
          <View style={[styles.iconCircle, { backgroundColor: colors.infoBg }]}>
            <Icon name={item.icon!} size={36} color={colors.primary} sw={2} />
          </View>
        )}
        <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>{item.body}</Text>
      </View>
    </View>
  ), [colors]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable
          onPress={finish}
          hitSlop={12}
          style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.7 }]}
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
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((slide, i) => (
            <View
              key={slide.id}
              style={[
                styles.dot,
                {
                  backgroundColor: i === index ? colors.primary : colors.borderStrong,
                  width: i === index ? 18 : 7,
                },
              ]}
            />
          ))}
        </View>
        <Button full size="lg" onPress={goNext}>
          {isLast ? 'Get started' : 'Next'}
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  skipBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  skipText: {
    fontSize: 15,
    fontFamily: fonts.semibold,
  },
  list: { flex: 1 },
  slide: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl2,
  },
  slideInner: {
    alignItems: 'center',
    gap: spacing.lg,
    maxWidth: 360,
    alignSelf: 'center',
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontFamily: fonts.bold,
    textAlign: 'center',
    lineHeight: 30,
  },
  body: {
    fontSize: 16,
    fontFamily: fonts.regular,
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.lg,
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
