import React, { useMemo, useState } from 'react';
import {
  View, Text, FlatList, TextInput, Pressable, KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/icons/Icon';
import { Avatar } from '../../components/ui/Avatar';
import { PawCircleSubHeader } from '../pawCircles/PawCircleViews';
import { ConsultStatusBanner } from '../../components/vet/VetChrome';
import { useVetConsult } from '../../context/VetConsultContext';
import { getVetById } from '../../data/vetData';
import { useCurrentUserProfile } from '../../context/CurrentUserProfileContext';
import type { VetStackParamList } from '../../navigation/VetNavigator';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';

type Route = RouteProp<VetStackParamList, 'Chat'>;
type Nav = NativeStackNavigationProp<VetStackParamList, 'Chat'>;

export function VetChatScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const { consultId } = useRoute<Route>().params;
  const { getConsult, addMessage, completeSession, startSession } = useVetConsult();
  const { me } = useCurrentUserProfile();
  const tabBarPad = useTabBarScrollPadding();
  const consult = getConsult(consultId);
  const vet = useMemo(() => (consult?.vetId ? getVetById(consult.vetId) : null), [consult?.vetId]);
  const [text, setText] = useState('');

  if (!consult) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
        <PawCircleSubHeader title="Consultation" />
      </SafeAreaView>
    );
  }

  const send = () => {
    if (!text.trim()) return;
    if (consult.status === 'session_ready') startSession(consultId);
    addMessage(consultId, text);
    setText('');
  };

  const status = consult.status === 'session_ready' ? 'active' : consult.status;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <PawCircleSubHeader title="Consultation" onBack={() => navigation.goBack()} />

      {vet && (
        <View style={[styles.vetBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.vetDot, { backgroundColor: vet.tint + '22' }]}>
            <Icon name="medical" size={18} color={vet.tint} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.vetName, { color: colors.text }]}>{vet.name}</Text>
            <Text style={[styles.vetSpec, { color: colors.textSecondary }]}>{vet.specialization}</Text>
          </View>
          <ConsultStatusBanner status={status} />
        </View>
      )}

      <FlatList
        data={consult.messages}
        keyExtractor={m => m.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 12, gap: 10, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          if (item.sender === 'system') {
            return (
              <View style={[styles.systemBubble, { backgroundColor: colors.surface2 }]}>
                <Text style={[styles.systemText, { color: colors.textSecondary }]}>{item.text}</Text>
              </View>
            );
          }
          const isYou = item.sender === 'you';
          return (
            <View style={[styles.msgRow, isYou && styles.msgRowYou]}>
              {!isYou && (
                <View style={[styles.msgAvatar, { backgroundColor: vet?.tint + '22' }]}>
                  <Icon name="medical" size={14} color={vet?.tint ?? colors.primary} />
                </View>
              )}
              <View style={[
                styles.bubble,
                { backgroundColor: isYou ? colors.primary + '14' : colors.surface, borderColor: colors.border },
              ]}>
                <Text style={[styles.bubbleText, { color: colors.text }]}>{item.text}</Text>
                <Text style={[styles.bubbleTime, { color: colors.textTertiary }]}>{item.time}</Text>
              </View>
              {isYou && me && <Avatar user={me} size={28} />}
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.textSecondary }]}>
            Your consultation will appear here once the session starts.
          </Text>
        }
      />

      {consult.status !== 'completed' && consult.status !== 'cancelled' && (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.inputBar, { backgroundColor: colors.surface, borderColor: colors.border, paddingBottom: tabBarPad }]}>
            <Pressable style={styles.attachBtn}>
              <Icon name="image" size={20} color={colors.primary} />
            </Pressable>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Message your vet…"
              placeholderTextColor={colors.textTertiary}
              style={[styles.input, { color: colors.text, backgroundColor: colors.surface2 }]}
              multiline
            />
            <Pressable onPress={send} style={[styles.sendBtn, { backgroundColor: colors.primary }]}>
              <Icon name="send" size={16} color="#fff" />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}

      {consult.status === 'active' && (
        <View style={[styles.endBar, { paddingBottom: tabBarPad }]}>
          <Button
            variant="outline"
            full
            onPress={() => {
              completeSession(consultId);
              navigation.navigate('Receipt', { consultId });
            }}
          >
            End consultation
          </Button>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  vetBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  vetDot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  vetName: { fontSize: 14, fontWeight: '700' },
  vetSpec: { fontSize: 11.5 },
  systemBubble: { alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.full, maxWidth: '90%' },
  systemText: { fontSize: 12, textAlign: 'center', lineHeight: 17 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgRowYou: { justifyContent: 'flex-end' },
  msgAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  bubble: { maxWidth: '78%', padding: 10, borderRadius: radius.lg, borderWidth: 1, gap: 4 },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTime: { fontSize: 10 },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 14 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  attachBtn: { padding: 8 },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endBar: { paddingHorizontal: 16, paddingTop: 8 },
});
