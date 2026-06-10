import React from 'react';
import { ScrollView, Pressable, Text, View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

interface TabItem {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: TabItem[];
  active: string;
  onChange: (id: string) => void;
}

export function Tabs({ tabs, active, onChange }: TabsProps) {
  const { colors } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {tabs.map(t => {
        const on = t.id === active;
        return (
          <Pressable key={t.id} onPress={() => onChange(t.id)} style={styles.tab}>
            <Text style={[styles.label, { color: on ? colors.text : colors.textTertiary, fontWeight: on ? '700' : '600' }]}>
              {t.label}
            </Text>
            {on && <View style={[styles.indicator, { backgroundColor: colors.primary }]} />}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#00000010' },
  tab: { paddingHorizontal: 14, paddingVertical: 11, position: 'relative', alignItems: 'center' },
  label: { fontSize: 14 },
  indicator: { position: 'absolute', left: 10, right: 10, bottom: -1, height: 3, borderRadius: 3 },
});
