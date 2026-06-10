import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal, View, Text, Pressable, ScrollView, StyleSheet, Dimensions, Animated, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { useSheetOverlay } from '../../context/SheetOverlayContext';
import { radius, shadows, modalScrim } from '../../theme/tokens';
import { IconButton } from './Button';

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Max total sheet height (cap). Content sizes naturally up to this limit. */
  maxHeight?: number;
  backgroundColor?: string;
  /** Force body to fill all space under the cap (for tall forms). */
  fillBody?: boolean;
  /** Change when inner content size changes to re-measure (e.g. list length). */
  contentKey?: string;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const DEFAULT_MAX_RATIO = 0.72;
const CHROME_WITH_TITLE = 72;
const CHROME_HANDLE_ONLY = 22;
const FOOTER_ESTIMATE = 72;

export function Sheet({
  visible,
  onClose,
  title,
  children,
  footer,
  maxHeight,
  backgroundColor,
  fillBody,
  contentKey = '',
}: SheetProps) {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const { registerOpen, registerClose } = useSheetOverlay();
  const sheetBg = backgroundColor ?? colors.surface;
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const [modalVisible, setModalVisible] = useState(visible);
  const [chromeH, setChromeH] = useState(0);
  const [footerH, setFooterH] = useState(0);
  const [contentH, setContentH] = useState(0);

  const cap = Math.min(
    maxHeight ?? SCREEN_HEIGHT * DEFAULT_MAX_RATIO,
    SCREEN_HEIGHT - 24,
  );

  const chromeSize = chromeH > 0 ? chromeH : (title ? CHROME_WITH_TITLE : CHROME_HANDLE_ONLY);
  const footerSize = footer ? (footerH > 0 ? footerH : FOOTER_ESTIMATE) : 0;
  const bottomPad = footer ? 8 : Math.max(insets.bottom, 12) + 12;
  const footerPad = Math.max(insets.bottom, 12);

  const bodyMax = Math.max(cap - chromeSize - footerSize, 96);
  const bodyNatural = contentH > 0 ? contentH + bottomPad : 0;
  const isMeasured = contentH > 0;
  const bodyScrolls = fillBody || (isMeasured && bodyNatural > bodyMax + 1);
  const bodyHeight = !isMeasured
    ? undefined
    : fillBody
      ? bodyMax
      : bodyScrolls
        ? bodyMax
        : bodyNatural;

  const sheetHeight = !isMeasured
    ? undefined
    : Math.min(chromeSize + (bodyHeight ?? 0) + footerSize, cap);

  const resetMeasures = useCallback(() => {
    setChromeH(0);
    setFooterH(0);
    setContentH(0);
  }, []);

  const handleContentLayout = useCallback((h: number) => {
    if (h > 0) setContentH(h);
  }, []);

  useEffect(() => {
    if (!visible) resetMeasures();
  }, [visible, resetMeasures]);

  useEffect(() => {
    if (visible) setContentH(0);
  }, [contentKey, visible]);

  useEffect(() => {
    if (modalVisible) {
      registerOpen();
      return () => registerClose();
    }
  }, [modalVisible, registerOpen, registerClose]);

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
    { maxHeight: bodyMax },
    bodyHeight != null && { height: bodyHeight },
    bodyScrolls && styles.bodyScroll,
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
            { backgroundColor: mode === 'dark' ? modalScrim.dark : modalScrim.light },
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
          onStartShouldSetResponder={() => true}
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

          {bodyScrolls && Platform.OS !== 'web' ? (
            <ScrollView
              style={bodyStyle}
              contentContainerStyle={[styles.bodyInner, { paddingBottom: bottomPad }]}
              onContentSizeChange={(_, h) => handleContentLayout(h)}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
              nestedScrollEnabled
            >
              {children}
            </ScrollView>
          ) : (
            <View style={bodyStyle}>
              <View
                style={[styles.bodyInner, { paddingBottom: bottomPad }]}
                onLayout={e => handleContentLayout(e.nativeEvent.layout.height)}
              >
                {children}
              </View>
            </View>
          )}

          {footer != null && (
            <View
              style={[styles.footer, { borderTopColor: colors.border, paddingBottom: footerPad }]}
              onLayout={e => setFooterH(e.nativeEvent.layout.height)}
            >
              {footer}
            </View>
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
  },
  sheet: {
    flexDirection: 'column',
    alignItems: 'stretch',
    borderTopLeftRadius: radius.xl2,
    borderTopRightRadius: radius.xl2,
    overflow: 'hidden',
    width: '100%',
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
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
