import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal, View, Text, Pressable, ScrollView, StyleSheet, Dimensions, Animated, Platform,
  PanResponder, KeyboardAvoidingView,
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
}: SheetProps) {
  const { colors, scrim } = useTheme();
  const insets = useSafeAreaInsets();
  const { registerOpen, registerClose } = useSheetOverlay();
  const sheetBg = backgroundColor ?? colors.surface;
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const bodyScrollsRef = useRef(false);
  const [modalVisible, setModalVisible] = useState(visible);
  const [chromeH, setChromeH] = useState(0);
  const [footerH, setFooterH] = useState(0);
  const [contentH, setContentH] = useState(0);

  const cap = Math.min(
    maxHeight ?? SCREEN_HEIGHT * DEFAULT_MAX_RATIO,
    SCREEN_HEIGHT - sheetLayout.topInset,
  );

  const chromeSize = chromeH > 0 ? chromeH : (title ? CHROME_WITH_TITLE : CHROME_HANDLE_ONLY);
  const footerSize = footer ? (footerH > 0 ? footerH : FOOTER_ESTIMATE) : 0;
  const bottomPad = footer ? 0 : Math.max(insets.bottom, 12) + 12;
  const footerPad = Math.max(insets.bottom, 12);

  const bodyMax = Math.max(cap - chromeSize - footerSize, 96);
  const isMeasured = contentH > 0;
  const overflows = isMeasured && contentH > bodyMax + 1;
  const bodyHeight = !isMeasured
    ? BODY_OPEN_ESTIMATE
    : overflows
      ? bodyMax
      : contentH;

  bodyScrollsRef.current = overflows;
  const sheetHeight = Math.min(chromeSize + bodyHeight + footerSize, cap);

  const resetMeasures = useCallback(() => {
    setChromeH(0);
    setFooterH(0);
    setContentH(0);
  }, []);

  const handleContentLayout = useCallback((h: number) => {
    if (h <= 0) return;
    setContentH(prev => (Math.abs(prev - h) < 0.5 ? prev : h));
  }, []);

  const snapSheetOpen = useCallback(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 68,
      friction: 12,
    }).start();
  }, [slideAnim]);

  const sheetPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, g) => {
        const downward = g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx) * 1.1;
        if (!downward) return false;
        if (!bodyScrollsRef.current) return true;
        return scrollY.current <= 1;
      },
      onPanResponderGrant: () => {
        slideAnim.stopAnimation();
      },
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) slideAnim.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > DISMISS_DRAG || g.vy > DISMISS_VELOCITY) {
          onClose();
        } else {
          snapSheetOpen();
        }
      },
      onPanResponderTerminate: () => {
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
    if (contentOffset.y < -OVERSCROLL_DISMISS) {
      onClose();
      return;
    }
    if (contentOffset.y <= 0 && (velocity?.y ?? 0) < -DISMISS_VELOCITY) {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (!visible) {
      scrollY.current = 0;
      resetMeasures();
    }
  }, [visible, resetMeasures]);

  useEffect(() => {
    if (!visible) return;
    scrollY.current = 0;
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [contentKey, visible]);

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
        tension: 68,
        friction: 12,
      }).start();
      return;
    }

    if (!modalVisible) return;

    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setModalVisible(false);
    });
  }, [visible, modalVisible, slideAnim]);

  const bodyStyle = [
    styles.body,
    { height: bodyHeight, maxHeight: bodyMax },
    overflows && styles.bodyScroll,
  ];

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: scrim },
          ]}
        />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" />

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
          {...sheetPanResponder.panHandlers}
        >
          <View
            style={styles.chrome}
            onLayout={e => setChromeH(e.nativeEvent.layout.height)}
          >
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            {title && (
              <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                <IconButton name="close" size={36} onPress={onClose} />
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
            scrollEnabled={overflows}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={overflows}
            nestedScrollEnabled
            bounces={overflows}
            alwaysBounceVertical={false}
          >
            {children}
          </ScrollView>

          {footer != null && (
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              keyboardVerticalOffset={insets.top}
            >
              <View
                style={[
                  styles.footer,
                  footerBordered && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth },
                  { paddingBottom: footerPad },
                ]}
                onLayout={e => setFooterH(e.nativeEvent.layout.height)}
              >
                {footer}
              </View>
            </KeyboardAvoidingView>
          )}
        </Animated.View>
      </View>
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
        maxWidth: '100vw',
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
