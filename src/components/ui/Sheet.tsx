import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal, View, Text, Pressable, ScrollView, StyleSheet, Dimensions, Animated, Platform,
  PanResponder, KeyboardAvoidingView, Keyboard, Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { useSheetOverlay } from '../../context/SheetOverlayContext';
import { radius, shadows, sheetLayout } from '../../theme/tokens';
import { IconButton } from './Button';

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Show a hairline border above the footer. Default true. */
  footerBordered?: boolean;
  /** Max total sheet height (cap). Content sizes naturally up to this limit. */
  maxHeight?: number;
  backgroundColor?: string;
  /**
   * @deprecated No longer stretches the sheet — body always shrink-wraps up to the cap.
   * Kept for call-site compatibility.
   */
  fillBody?: boolean;
  /** Change when inner content size changes to re-measure (e.g. list length). */
  contentKey?: string;
  /** Expected footer height before layout — pass a larger value when footer expands (e.g. mention picker). */
  footerSizeEstimate?: number;
  /** Fill to max height so the body scrolls (comment threads). Default false — shrink-wrap to content. */
  footerExpandBody?: boolean;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const DEFAULT_MAX_RATIO = sheetLayout.maxHeightRatio;
const CHROME_WITH_TITLE = 72;
const CHROME_HANDLE_ONLY = 22;
const FOOTER_ESTIMATE = 72;
/** Opening estimate before first layout — kept modest to avoid a tall-then-shrink flash. */
const BODY_OPEN_ESTIMATE = 220;
const DISMISS_DRAG = 72;
const DISMISS_VELOCITY = 0.85;
const OVERSCROLL_DISMISS = 36;

export function Sheet({
  visible,
  onClose,
  title,
  children,
  footer,
  footerBordered = true,
  maxHeight,
  backgroundColor,
  contentKey = '',
  footerSizeEstimate,
  footerExpandBody = false,
}: SheetProps) {
  const { colors, scrim } = useTheme();
  const insets = useSafeAreaInsets();
  const { registerOpen, registerClose } = useSheetOverlay();
  const sheetBg = backgroundColor ?? colors.surface;
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const bodyScrollsRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [modalVisible, setModalVisible] = useState(visible);
  const [chromeH, setChromeH] = useState(0);
  const [footerH, setFooterH] = useState(0);
  const [contentH, setContentH] = useState(0);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  const cap = Math.min(
    maxHeight ?? SCREEN_HEIGHT * DEFAULT_MAX_RATIO,
    SCREEN_HEIGHT - sheetLayout.topInset,
  );

  const hasFooter = footer != null;
  const footerEstimate = footerSizeEstimate ?? FOOTER_ESTIMATE;
  const chromeSize = chromeH > 0 ? chromeH : (title ? CHROME_WITH_TITLE : CHROME_HANDLE_ONLY);
  const footerSize = hasFooter ? (footerH > 0 ? footerH : footerEstimate) : 0;
  const bottomPad = footer ? 0 : Math.max(insets.bottom, 12) + 12;
  const footerPad = footer
    ? (keyboardOpen ? 8 : Math.max(insets.bottom, 12))
    : 0;

  const expandFooterBody = hasFooter && footerExpandBody;

  const bodyMax = Math.max(cap - chromeSize - footerSize, 96);
  const isMeasured = contentH > 0;
  const overflows = isMeasured && contentH > bodyMax + 1;
  const bodyHeight = !isMeasured
    ? (expandFooterBody ? BODY_OPEN_ESTIMATE : Math.min(BODY_OPEN_ESTIMATE, 120))
    : overflows
      ? bodyMax
      : contentH;

  bodyScrollsRef.current = expandFooterBody ? true : overflows;
  const sheetHeight = expandFooterBody
    ? cap
    : Math.min(chromeSize + bodyHeight + footerSize, cap);

  const resetMeasures = useCallback(() => {
    setChromeH(0);
    setFooterH(0);
    setContentH(0);
  }, []);

  const handleContentLayout = useCallback((h: number) => {
    if (h <= 0) return;
    setContentH(prev => (Math.abs(prev - h) < 0.5 ? prev : h));
  }, []);

  const dismissSheet = useCallback((velocity = 0) => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: velocity > 0
        ? Math.max(140, Math.min(280, 260 - velocity * 35))
        : 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onCloseRef.current();
    });
  }, [slideAnim]);

  const snapSheetOpen = useCallback((velocity = 0) => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 14,
      velocity: Math.max(0, velocity),
    }).start();
  }, [slideAnim]);

  const sheetPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, g) => {
        const downward = g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx) * 1.05;
        if (!downward) return false;
        if (!bodyScrollsRef.current) return true;
        return scrollY.current <= 1;
      },
      onPanResponderGrant: () => {
        slideAnim.stopAnimation(value => {
          slideAnim.setOffset(value);
          slideAnim.setValue(0);
        });
      },
      onPanResponderMove: (_, g) => {
        slideAnim.setValue(Math.max(0, g.dy));
      },
      onPanResponderRelease: (_, g) => {
        slideAnim.flattenOffset();
        if (g.dy > DISMISS_DRAG || g.vy > DISMISS_VELOCITY) {
          dismissSheet(g.vy);
        } else {
          snapSheetOpen(g.vy);
        }
      },
      onPanResponderTerminate: () => {
        slideAnim.flattenOffset();
        snapSheetOpen();
      },
    }),
  ).current;

  const handleScroll = useCallback((e: { nativeEvent: { contentOffset: { y: number } } }) => {
    scrollY.current = e.nativeEvent.contentOffset.y;
  }, []);

  const handleScrollEndDrag = useCallback((e: {
    nativeEvent: { contentOffset: { y: number }; velocity?: { y: number } };
  }) => {
    const { contentOffset, velocity } = e.nativeEvent;
    const flickUp = velocity?.y ?? 0;
    if (contentOffset.y < -OVERSCROLL_DISMISS) {
      dismissSheet(Math.abs(flickUp));
      return;
    }
    if (contentOffset.y <= 0 && flickUp < -DISMISS_VELOCITY) {
      dismissSheet(Math.abs(flickUp));
    }
  }, [dismissSheet]);

  useEffect(() => {
    if (!footer) {
      setKeyboardOpen(false);
      return;
    }
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardOpen(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardOpen(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [footer]);

  useEffect(() => {
    if (!visible) {
      scrollY.current = 0;
      resetMeasures();
      setKeyboardOpen(false);
    }
  }, [visible, resetMeasures]);

  useEffect(() => {
    if (!visible) return;
    scrollY.current = 0;
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    if (expandFooterBody) setFooterH(0);
  }, [contentKey, visible, expandFooterBody]);

  useEffect(() => {
    if (modalVisible) {
      registerOpen();
      return () => registerClose();
    }
  }, [modalVisible, registerOpen, registerClose]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !modalVisible || typeof document === 'undefined') return;

    const scrollY = window.scrollY;
    const { body } = document;
    const prev = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    };

    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';

    return () => {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.left = prev.left;
      body.style.right = prev.right;
      body.style.width = prev.width;
      body.style.overflow = prev.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [modalVisible]);

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      slideAnim.setValue(SCREEN_HEIGHT);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 72,
        friction: 13,
      }).start();
      return;
    }

    if (!modalVisible) return;

    slideAnim.stopAnimation(value => {
      if (value >= SCREEN_HEIGHT * 0.92) {
        setModalVisible(false);
        return;
      }
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setModalVisible(false);
      });
    });
  }, [visible, modalVisible, slideAnim]);

  const bodyStyle = [
    styles.body,
    expandFooterBody
      ? styles.bodyFlex
      : { height: bodyHeight, maxHeight: bodyMax },
    (expandFooterBody || overflows) && styles.bodyScroll,
  ];
  const bodyScrollEnabled = expandFooterBody ? true : overflows;

  const scrimOpacity = slideAnim.interpolate({
    inputRange: [0, SCREEN_HEIGHT * 0.75],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      onRequestClose={() => dismissSheet()}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: scrim, opacity: scrimOpacity },
          ]}
        />
        <Pressable style={StyleSheet.absoluteFill} onPress={() => dismissSheet()} accessibilityRole="button" />

        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: sheetBg,
              maxHeight: cap,
              height: sheetHeight,
              transform: [{ translateY: slideAnim }],
              ...shadows.lg,
            },
          ]}
        >
          <View
            style={styles.chrome}
            onLayout={e => setChromeH(e.nativeEvent.layout.height)}
            {...sheetPanResponder.panHandlers}
          >
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            {title && (
              <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                <IconButton name="close" size={36} onPress={() => dismissSheet()} />
              </View>
            )}
          </View>

          <ScrollView
            ref={scrollRef}
            style={bodyStyle}
            contentContainerStyle={[styles.bodyInner, { paddingBottom: bottomPad }]}
            onContentSizeChange={(_, h) => handleContentLayout(h)}
            onScroll={handleScroll}
            onScrollEndDrag={handleScrollEndDrag}
            scrollEventThrottle={16}
            scrollEnabled={bodyScrollEnabled}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={bodyScrollEnabled}
            nestedScrollEnabled
            bounces={bodyScrollEnabled}
            alwaysBounceVertical={false}
          >
            {children}
          </ScrollView>

          {footer != null && (
            <View
              style={[
                styles.footer,
                footerBordered && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth },
                { paddingBottom: footerPad, backgroundColor: sheetBg },
              ]}
              onLayout={e => setFooterH(e.nativeEvent.layout.height)}
            >
              {footer}
            </View>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
    ...Platform.select({
      web: {
        overflow: 'hidden',
        maxWidth: '100%',
      },
      default: {},
    }),
  },
  sheet: {
    flexDirection: 'column',
    alignItems: 'stretch',
    borderTopLeftRadius: radius.xl2,
    borderTopRightRadius: radius.xl2,
    overflow: 'hidden',
    width: '100%',
    ...Platform.select({
      web: {
        maxWidth: '100%' as const,
      },
      default: {},
    }),
  },
  chrome: {
    flexShrink: 0,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  body: {
    flexShrink: 0,
    width: '100%',
  },
  bodyFlex: {
    flex: 1,
    minHeight: 0,
    flexShrink: 1,
  },
  bodyInner: {
    width: '100%',
    flexGrow: 0,
  },
  bodyScroll: Platform.select({
    web: {
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
      overscrollBehavior: 'contain',
    },
    default: {},
  }) as object,
  footer: {
    flexShrink: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
  },
});
