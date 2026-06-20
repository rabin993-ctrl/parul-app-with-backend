import React, { useEffect, useState } from 'react';
import { Text, type TextProps, type StyleProp, type TextStyle } from 'react-native';
import { formatRelativeTime } from '../../utils/time';

/** Relative timestamp that re-renders as time passes (e.g. "just now" → "1m ago"). */
export function RelativeTime({
  iso,
  style,
  ...rest
}: { iso: string; style?: StyleProp<TextStyle> } & Omit<TextProps, 'children' | 'style'>) {
  const [, tick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => tick(n => n + 1), 30_000);
    return () => clearInterval(id);
  }, [iso]);

  return (
    <Text style={style} {...rest}>
      {formatRelativeTime(iso)}
    </Text>
  );
}
