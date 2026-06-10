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
  maxHeight?: number;
  backgroundColor?: string;
  /** Expand body to fill remaining space under the max height cap */
  fillBody?: boolean;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const DEFAULT_MAX_RATIO = 0.7;
const CHROME_WITH_TITLE = 72;
const CHROME_HANDLE_ONLY = 22;
const FOOTER_ESTIMATE = 68;

function SheetBody({
  maxBodyHeight,
  contentPad,
  fillBody,
  contentKey,
  onContentHeight,
  children,
}: {
  maxBodyHeight: number;
  contentPad: number;
  fillBody?: boolean;
  contentKey: string;
  onContentHeight: (h: number) => void;
  children: React.ReactNode;
}) {
  const [contentH, setContentH] = useState(0);

  useEffect(() => {
    setContentH(0);
    onContentHeight(0);
  }, [contentKey, onContentHeight]);

  const record = useCallback((h: number) => {
    if (h <= 0) return;
    setContentH(prev => {
      const next = h > prev ? h : prev;
      onContentHeight(next);
      return next;
    });
  }, [onContentHeight]);

  const naturalH = contentH + contentPad;
  const scrolls = fillBody || naturalH > maxBodyHeight + 1;
  const viewportH = fillBody
    ? maxBodyHeight
    : contentH > 0
      ? (scrolls ? maxBodyHeight : naturalH)
      : undefined;

  const scrollerStyle = [
    styles.scroller,
    { maxHeight: maxBodyHeight },
    viewportH != null && { height: viewportH },
    scrolls && styles.scrollerScroll,
  ];

  if (Platform.OS === 'web') {
    return (
      <View style={scrollerStyle}>
        <View
          style={[styles.scrollerInner, { paddingBottom: contentPad }]}
          onLayout={e => record(e.nativeEvent.layout.height)}
        >
          {children}
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      scrollEnabled={scrolls}
      showsVerticalScrollIndicator={scrolls}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
      onContentSizeChange={(_, h) => record(h)}
      style={scrollerStyle}
      contentContainerStyle={[styles.scrollerInner, { paddingBottom: contentPad }]}
    >
      {children}
    </ScrollView>
  );
}

export function Sheet({
  visible,
  onClose,
  title,
  children,
  footer,
  maxHeight,
  backgroundColor,
  fillBody,
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

  const effectiveMax = Math.min(
    maxHeight ?? SCREEN_HEIGHT * DEFAULT_MAX_RATIO,
    SCREEN_HEIGHT - 24,
  );

  const chromeUsed = chromeH > 0 ? chromeH : (title ? CHROME_WITH_TITLE : CHROME_HANDLE_ONLY);
  const footerUsed = footer ? (footerH > 0 ? footerH : FOOTER_ESTIMATE) : 0;
  const contentPad = footer ? 8 : Math.max(insets.bottom, 12) + 12;
  const footerPad = Math.max(insets.bottom, 12);

  const maxBodyHeight = Math.max(
    effectiveMax - chromeUsed - footerUsed,
    120,
  );

  const naturalBodyH = contentH > 0 ? contentH + contentPad : 0;
  const isMeasured = naturalBodyH > 0;
  const bodyScrolls = fillBody || (isMeasured && naturalBodyH > maxBodyHeight + 1);
  const bodyHeight = fillBody
    ? maxBodyHeight
    : isMeasured
      ? (bodyScrolls ? maxBodyHeight : naturalBodyH)
      : maxBodyHeight;

  const sheetHeight = fillBody
    ? effectiveMax
    : isMeasured
      ? Math.min(chromeUsed + bodyHeight + footerUsed, effectiveMax)
      : effectiveMax;

  const handleContentHeight = useCallback((h: number) => {
    setContentH(h);
  }, []);

  useEffect(() => {
    if (!visible) {
      setChromeH(0);
      setFooterH(0);
      setContentH(0);
    }
  }, [visible]);

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
              maxHeight: effectiveMax,
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

          <SheetBody
            maxBodyHeight={maxBodyHeight}
            contentPad={contentPad}
            fillBody={fillBody}
            contentKey={`${visible}-${title ?? ''}`}
            onContentHeight={handleContentHeight}
          >
            {children}
          </SheetBody>

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
  scroller: {
    flexGrow: 0,
    flexShrink: 0,
    width: '100%',
  },
  scrollerInner: {
    flexGrow: 0,
    flexShrink: 0,
    width: '100%',
  },
  scrollerScroll: {
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    overscrollBehavior: 'contain',
  } as object,
  footer: {
    flexShrink: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
