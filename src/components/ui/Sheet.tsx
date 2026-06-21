import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal, View, Text, Pressable, ScrollView, StyleSheet, Dimensions, Animated, Platform,
  PanResponder, KeyboardAvoidingView, Keyboard, Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { useSheetOverlay } from '../../context/SheetOverlayContext';
import { useWebViewportMetrics } from '../../hooks/useVisualViewportInset';
import { radius, shadows, sheetLayout } from '../../theme/tokens';
import { IconButton } from './Button';
import { ModalScrim, MODAL_OVERLAY_MS } from './ModalScrim';

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
  /** Stretch scroll content to the full body height (composer text areas). Requires footerExpandBody. */
  bodyFill?: boolean;
  /** Optional ref to the body ScrollView (e.g. scroll inline replies into view). */
  bodyScrollRef?: React.RefObject<ScrollView | null>;
  /** Dim the scrollable body (e.g. while an inline footer picker is open). */
  bodyDimmed?: boolean;
  /** Hide the vertical scroll indicator (beta feedback sheets). */
  hideScrollIndicator?: boolean;
  /** Footer content manages its own horizontal inset (e.g. full-bleed mention picker). */
  footerFlush?: boolean;
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
const SHEET_OPEN_MS = MODAL_OVERLAY_MS;
const SCRIM_DRAG_RANGE = SCREEN_HEIGHT * 0.55;
/** Inset above this on web means the software keyboard is open (not just browser chrome). */
const WEB_KEYBOARD_INSET_THRESHOLD = 80;

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
  bodyFill = false,
  bodyScrollRef,
  bodyDimmed = false,
  hideScrollIndicator = false,
  footerFlush = false,
}: SheetProps) {
  const { colors, scrim } = useTheme();
  const insets = useSafeAreaInsets();
  const { registerOpen, registerClose } = useSheetOverlay();
  const sheetBg = backgroundColor ?? colors.surface;
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const scrimAnim = useRef(new Animated.Value(0)).current;
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
  const webViewport = useWebViewportMetrics(modalVisible);
  const webBottomInset = Platform.OS === 'web' ? webViewport.bottomInset : 0;
  const viewportHeight = Platform.OS === 'web'
    ? webViewport.visibleHeight
    : SCREEN_HEIGHT;
  const isWebKeyboardOpen = Platform.OS === 'web' && (
    webBottomInset >= WEB_KEYBOARD_INSET_THRESHOLD
    || viewportHeight < SCREEN_HEIGHT - WEB_KEYBOARD_INSET_THRESHOLD
  );
  const webBrowserChromeInset = isWebKeyboardOpen ? 0 : webBottomInset;

  const cap = Math.min(
    maxHeight ?? viewportHeight * DEFAULT_MAX_RATIO,
    viewportHeight - sheetLayout.topInset,
  );
  const effectiveCap = Math.max(cap, 160);

  const hasFooter = footer != null;
  const footerEstimate = footerSizeEstimate ?? FOOTER_ESTIMATE;
  const chromeSize = chromeH > 0 ? chromeH : (title ? CHROME_WITH_TITLE : CHROME_HANDLE_ONLY);
  const footerSize = hasFooter ? (footerH > 0 ? footerH : footerEstimate) : 0;
  const bottomPad = footer
    ? 0
    : Math.max(insets.bottom, 12, webBrowserChromeInset) + 12;
  const footerPad = footer
    ? (keyboardOpen || isWebKeyboardOpen
      ? 8
      : Math.max(insets.bottom, 12, webBrowserChromeInset))
    : 0;

  const expandFooterBody = hasFooter && footerExpandBody;
  const fillBodyContent = expandFooterBody && bodyFill;

  const bodyMax = Math.max(effectiveCap - chromeSize - footerSize, 96);
  const isMeasured = contentH > 0;
  const overflows = isMeasured && contentH > bodyMax + 1;
  const bodyHeight = !isMeasured
    ? BODY_OPEN_ESTIMATE
    : overflows
      ? bodyMax
      : contentH;

  bodyScrollsRef.current = expandFooterBody ? true : overflows;
  const bodyScrollEnabled = expandFooterBody
    ? true
    : overflows;
  const bodyScrollLocked = bodyDimmed && Platform.OS !== 'web';
  const rawSheetHeight = expandFooterBody
    ? effectiveCap
    : Math.min(chromeSize + bodyHeight + footerSize, effectiveCap);
  const sheetHeight = Platform.OS === 'web'
    ? Math.min(rawSheetHeight, viewportHeight)
    : rawSheetHeight;

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
    const duration = velocity > 0
      ? Math.max(140, Math.min(280, SHEET_OPEN_MS - velocity * 35))
      : SHEET_OPEN_MS;
    Animated.parallel([
      Animated.timing(scrimAnim, {
        toValue: 0,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) onCloseRef.current();
    });
  }, [slideAnim, scrimAnim]);

  const snapSheetOpen = useCallback((velocity = 0) => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 14,
        velocity: Math.max(0, velocity),
      }),
      Animated.timing(scrimAnim, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, scrimAnim]);

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
        const dy = Math.max(0, g.dy);
        slideAnim.setValue(dy);
        const dragProgress = Math.min(1, dy / SCRIM_DRAG_RANGE);
        scrimAnim.setValue(1 - dragProgress);
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
    if (!expandFooterBody) {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      setContentH(0);
    }
  }, [contentKey, visible, expandFooterBody]);

  useEffect(() => {
    if (modalVisible) {
      registerOpen();
      return () => registerClose();
    }
  }, [modalVisible, registerOpen, registerClose]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !modalVisible || typeof document === 'undefined') return;

    const html = document.documentElement;
    const { body } = document;
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
    };

    // Avoid position:fixed on body — it breaks virtual keyboard focus inside modals on mobile web.
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';

    return () => {
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
    };
  }, [modalVisible]);

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      slideAnim.setValue(SCREEN_HEIGHT);
      scrimAnim.setValue(0);
      Animated.parallel([
        Animated.timing(scrimAnim, {
          toValue: 1,
          duration: SHEET_OPEN_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: SHEET_OPEN_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    if (!modalVisible) return;

    slideAnim.stopAnimation(value => {
      if (value >= SCREEN_HEIGHT * 0.92) {
        setModalVisible(false);
        scrimAnim.setValue(0);
        return;
      }
      Animated.parallel([
        Animated.timing(scrimAnim, {
          toValue: 0,
          duration: SHEET_OPEN_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: SHEET_OPEN_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setModalVisible(false);
      });
    });
  }, [visible, modalVisible, slideAnim, scrimAnim]);

  const bodyStyle = [
    styles.body,
    expandFooterBody
      ? styles.bodyFlex
      : { height: bodyHeight, maxHeight: bodyMax },
    (expandFooterBody || overflows) && styles.bodyScroll,
    bodyDimmed && styles.bodyScrollDimmed,
    hideScrollIndicator && styles.bodyScrollNoIndicator,
    Platform.OS === 'web' && styles.bodyWebTouch,
  ];

  const scrimOpacity = scrimAnim;

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      onRequestClose={() => dismissSheet()}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={[
          styles.root,
          Platform.OS === 'web' && modalVisible && {
            top: 'auto',
            bottom: 0,
            height: viewportHeight,
            maxHeight: viewportHeight,
            minHeight: undefined,
          },
        ]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : undefined}
      >
        <ModalScrim
          onPress={() => dismissSheet()}
          animatedStyle={{ opacity: scrimOpacity }}
          style={Platform.OS === 'web' ? styles.scrimWeb : undefined}
        />

        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: sheetBg,
              maxHeight: effectiveCap,
              height: sheetHeight,
              transform: [{ translateY: slideAnim }],
              ...shadows.lg,
            },
            Platform.OS === 'web' ? styles.sheetWeb : null,
            Platform.OS === 'web' && isWebKeyboardOpen && styles.sheetWebBottomAnchor,
          ]}
        >
          <View
            style={[
              styles.mainSection,
              expandFooterBody && styles.mainSectionFlex,
            ]}
          >
            <View
              style={styles.chrome}
              onLayout={e => setChromeH(e.nativeEvent.layout.height)}
            >
              <View style={styles.handleWrap} {...sheetPanResponder.panHandlers}>
                <View style={[styles.handle, { backgroundColor: colors.border }]} />
              </View>
              {title && (
                <View style={[styles.header, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                  <IconButton name="close" size={36} onPress={() => dismissSheet()} />
                </View>
              )}
            </View>

            <View style={[styles.bodyWrap, expandFooterBody && styles.bodyWrapFlex]}>
              <ScrollView
                ref={node => {
                  scrollRef.current = node;
                  if (bodyScrollRef) bodyScrollRef.current = node;
                }}
                style={bodyStyle}
                contentContainerStyle={[
                  styles.bodyInner,
                  fillBodyContent && { flexGrow: 1, minHeight: bodyMax },
                  { paddingBottom: bottomPad },
                  title ? styles.bodyInnerTitled : null,
                ]}
                onContentSizeChange={(_, h) => handleContentLayout(h)}
                onScroll={handleScroll}
                onScrollEndDrag={handleScrollEndDrag}
                scrollEventThrottle={16}
                scrollEnabled={bodyScrollEnabled && !bodyScrollLocked}
                keyboardShouldPersistTaps="always"
                keyboardDismissMode="interactive"
                showsVerticalScrollIndicator={
                  !hideScrollIndicator && bodyScrollEnabled && !bodyScrollLocked
                }
                nestedScrollEnabled
                bounces={bodyScrollEnabled && !bodyScrollLocked}
                alwaysBounceVertical={false}
                {...(bodyDimmed && Platform.OS === 'web' ? { dataSet: { sheetBodyDimmed: 'true' } } as object : {})}
              >
                <View
                  style={[
                    styles.bodyMeasure,
                    fillBodyContent && styles.bodyMeasureFill,
                    fillBodyContent && { minHeight: bodyMax },
                  ]}
                  onLayout={e => handleContentLayout(e.nativeEvent.layout.height)}
                >
                  {children}
                </View>
              </ScrollView>
            </View>
            {bodyDimmed ? (
              <View
                pointerEvents="none"
                style={[styles.bodyDimOverlay, { backgroundColor: scrim }]}
              />
            ) : null}
          </View>

          {footer != null && (
            <View
              style={[
                styles.footer,
                footerBordered && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth },
                {
                  paddingBottom: footerPad,
                  backgroundColor: sheetBg,
                  paddingHorizontal: footerFlush ? 0 : 20,
                  minHeight: footerSizeEstimate ?? FOOTER_ESTIMATE,
                },
                Platform.OS === 'web' ? styles.footerWeb : null,
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
    backgroundColor: 'transparent',
    ...Platform.select({
      web: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100dvh',
        minHeight: '100dvh',
        overflow: 'hidden',
        maxWidth: 'none',
      },
      default: {},
    }) as object,
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
  mainSection: {
    position: 'relative',
    width: '100%',
  },
  mainSectionFlex: {
    flex: 1,
    minHeight: 0,
  },
  handleWrap: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
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
    overflow: 'hidden',
  },
  bodyInner: {
    width: '100%',
    flexGrow: 0,
  },
  bodyMeasure: {
    width: '100%',
  },
  bodyMeasureFill: {
    flexGrow: 1,
  },
  bodyWrap: {
    position: 'relative',
    width: '100%',
  },
  bodyWrapFlex: {
    flex: 1,
    minHeight: 0,
  },
  bodyDimOverlay: {
    ...StyleSheet.absoluteFill,
    opacity: 0.38,
  },
  bodyInnerTitled: {
    paddingTop: 16,
  },
  bodyScroll: Platform.select({
    web: {
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
      overscrollBehavior: 'contain',
    },
    default: {},
  }) as object,
  bodyScrollDimmed: Platform.select({
    web: {
      overflowY: 'hidden',
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
    },
    default: {},
  }) as object,
  bodyScrollNoIndicator: Platform.select({
    web: {
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
    },
    default: {},
  }) as object,
  /** RN Web ScrollView pan-y touch-action blocks TextInputs — allow direct interaction. */
  bodyWebTouch: Platform.select({
    web: {
      touchAction: 'auto',
    },
    default: {},
  }) as object,
  scrimWeb: Platform.select({
    web: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100vw',
      height: '100vh',
      zIndex: 1,
    },
    default: {},
  }) as object,
  sheetWeb: Platform.select({
    web: {
      position: 'relative',
      zIndex: 2,
      width: '100%',
      maxWidth: '100%',
      alignSelf: 'stretch',
    },
    default: {},
  }) as object,
  sheetWebBottomAnchor: Platform.select({
    web: {
      marginTop: 'auto',
    },
    default: {},
  }) as object,
  footerWeb: Platform.select({
    web: {
      position: 'relative',
      zIndex: 3,
      touchAction: 'auto',
    },
    default: {},
  }) as object,
  footer: {
    flexShrink: 0,
    paddingTop: 12,
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
  },
});
