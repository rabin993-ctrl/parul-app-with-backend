import React, { useEffect, useState } from 'react';
import {
  Modal, View, Pressable, StyleSheet, ActivityIndicator, Text, useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../icons/Icon';
import { resolveCircleMediaSignedUrl } from '../../lib/circleChatMedia';

export function ChatPhotoViewer({
  visible,
  mediaUrl,
  caption,
  onClose,
}: {
  visible: boolean;
  mediaUrl: string;
  caption?: string;
  onClose: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [uri, setUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const imageHeight = Math.round(height * 0.72);

  useEffect(() => {
    if (!visible) {
      setUri(null);
      setLoading(true);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void resolveCircleMediaSignedUrl(mediaUrl).then(next => {
      if (cancelled) return;
      setUri(next);
      setLoading(false);
    }).catch(() => {
      if (cancelled) return;
      setUri(mediaUrl);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [visible, mediaUrl]);

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
        <View style={[styles.imageWrap, { height: imageHeight }]}>
          {loading || !uri ? (
            <ActivityIndicator color="#fff" size="large" />
          ) : (
            <Image
              source={{ uri }}
              style={{ width, height: imageHeight }}
              contentFit="contain"
              cachePolicy="memory-disk"
            />
          )}
        </View>
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
  imageWrap: {
    alignItems: 'center',
    justifyContent: 'center',
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
