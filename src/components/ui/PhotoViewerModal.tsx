import React, { useEffect, useRef, useState } from 'react';
import {
  Modal, View, Pressable, StyleSheet, FlatList, Text, useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../icons/Icon';

export function PhotoViewerModal({
  visible,
  images,
  initialIndex = 0,
  caption,
  onClose,
}: {
  visible: boolean;
  images: string[];
  initialIndex?: number;
  caption?: string;
  onClose: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<string>>(null);
  const [current, setCurrent] = useState(initialIndex);
  const imageHeight = Math.round(height * 0.72);

  useEffect(() => {
    if (!visible) return;
    setCurrent(initialIndex);
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index: initialIndex, animated: false });
    });
  }, [visible, initialIndex]);

  if (images.length === 0) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close photo"
        />
        <Pressable
          style={[styles.closeBtn, { top: insets.top + 12 }]}
          onPress={onClose}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <View style={styles.closePill}>
            <Icon name="close" size={18} color="#fff" />
          </View>
        </Pressable>

        <FlatList
          ref={listRef}
          data={images}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(uri, i) => `${uri}-${i}`}
          getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
          initialScrollIndex={initialIndex}
          onScrollToIndexFailed={() => {}}
          onMomentumScrollEnd={e => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / width);
            setCurrent(idx);
          }}
          renderItem={({ item }) => (
            <View style={{ width, height: imageHeight, justifyContent: 'center', alignItems: 'center' }}>
              <Image
                source={{ uri: item }}
                style={{ width, height: imageHeight }}
                contentFit="contain"
                cachePolicy="memory-disk"
              />
            </View>
          )}
          style={{ flexGrow: 0 }}
        />

        {images.length > 1 ? (
          <View style={styles.dots}>
            {images.map((_, i) => (
              <View key={i} style={[styles.dot, i === current && styles.dotActive]} />
            ))}
          </View>
        ) : null}

        {caption ? (
          <Text style={[styles.caption, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            {caption}
          </Text>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
  },
  closeBtn: {
    position: 'absolute',
    right: 16,
    zIndex: 2,
  },
  closePill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  dotActive: {
    backgroundColor: '#fff',
  },
  caption: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
  },
});
