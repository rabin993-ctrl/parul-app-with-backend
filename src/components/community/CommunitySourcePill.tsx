import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { Icon } from '../icons/Icon';

export function CommunitySourcePill({
  communityId: _communityId,
  name,
  tint,
  icon,
  onPress,
}: {
  communityId: string;
  name: string;
  tint: string;
  icon: string;
  onPress?: () => void;
}) {
  const { iconBg } = useTheme();
  const filled = icon === 'paw' || icon === 'adoption' || icon === 'cat' || icon === 'dog';

  const pill = (
    <View style={[styles.sourcePill, { backgroundColor: iconBg(tint + '22') }]}>
      <LinearGradient
        colors={[tint, tint + 'CC']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.sourceIcon}
      >
        <Icon name={icon} size={10} color="#fff" fill={filled ? '#fff' : 'none'} />
      </LinearGradient>
      <Text style={[styles.sourceLabel, { color: tint }]} numberOfLines={1}>{name}</Text>
    </View>
  );

  if (!onPress) return pill;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}>
      {pill}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sourcePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingRight: 8,
    paddingLeft: 3,
    paddingVertical: 2,
    borderRadius: radius.full,
    maxWidth: 160,
  },
  sourceIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceLabel: { fontSize: 12, fontWeight: '700', flexShrink: 1 },
});
