import React, { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
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

type Slide = {
  id: string;
  showLogo?: boolean;
  image?: number;
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
    image: require('../../../assets/tutorial/feed.png'),
    title: 'Home feed',
    body: 'See posts from people you follow, share updates about your pets, and react with treats.',
  },
  {
    id: 'hub',
    image: require('../../../assets/tutorial/hubs.png'),
    title: 'Switch hubs',
    body: 'Use the home hub menu in the feed header to jump between Feed, Community groups, and Adoption.',
  },
  {
    id: 'circles',
    image: require('../../../assets/tutorial/circles.png'),
    title: 'Paw Circles',
    body: 'Join local pet-parent circles, chat with members, and stay close to your neighborhood.',
  },
  {
    id: 'adoption',
    image: require('../../../assets/tutorial/adoption.png'),
    title: 'Adoption',
    body: 'Browse listings, apply to adopt, and track updates from posters through the adoption hub.',
  },
  {
    id: 'rescue',
    image: require('../../../assets/tutorial/rescue.png'),
    title: 'Rescue',
    body: 'Report or help with rescue cases from the feed and coordinate with others nearby.',
  },
  {
    id: 'profile',
    image: require('../../../assets/tutorial/profile.png'),
    title: 'Your profile',
    body: 'Manage your pets, settings, and send beta feedback with the megaphone icon on the feed header.',
  },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SHOT_WIDTH = Math.min(SCREEN_WIDTH - spacing.xl2 * 2, 280);

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
      <ScrollView
        contentContainerStyle={styles.slideScroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.slideInner}>
          {item.showLogo ? (
            <AppLogo size={72} showWordmark />
          ) : item.image ? (
            <View style={[styles.shotFrame, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Image
                source={item.image}
                style={styles.shot}
                resizeMode="cover"
                accessibilityLabel={item.title}
              />
            </View>
          ) : null}
          <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>{item.body}</Text>
        </View>
      </ScrollView>
    </View>
  ), [colors]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Text style={[styles.stepText, { color: colors.textTertiary }]}>
          {index + 1} / {SLIDES.length}
        </Text>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  stepText: {
    fontSize: 14,
    fontFamily: fonts.semibold,
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
  slide: { flex: 1 },
  slideScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl2,
    paddingVertical: spacing.md,
  },
  slideInner: {
    alignItems: 'center',
    gap: spacing.md,
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
  },
  shotFrame: {
    width: SHOT_WIDTH,
    aspectRatio: 9 / 19.5,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  shot: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 22,
    fontFamily: fonts.bold,
    textAlign: 'center',
    lineHeight: 28,
  },
  body: {
    fontSize: 15,
    fontFamily: fonts.regular,
    textAlign: 'center',
    lineHeight: 22,
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
