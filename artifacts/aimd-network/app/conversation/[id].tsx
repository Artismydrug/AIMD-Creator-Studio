import React, { useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  useListMessages,
  useSendMessage,
} from '@workspace/api-client-react';
import type { ConversationMessage } from '@workspace/api-client-react';

const CURRENT_USER_ID = 1;

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function MessageBubble({ msg }: { msg: ConversationMessage }) {
  const colors = useColors();
  const isMe = msg.senderId === CURRENT_USER_ID;

  const s = useMemo(() => StyleSheet.create({
    row: {
      paddingHorizontal: 16,
      paddingVertical: 4,
      alignItems: isMe ? 'flex-end' : 'flex-start',
    },
    senderName: {
      fontFamily: 'DMSans_500Medium',
      fontSize: 11,
      color: colors.mutedForeground,
      marginBottom: 3,
      marginHorizontal: 4,
    },
    bubble: {
      maxWidth: '75%',
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: isMe ? colors.primary : colors.card,
      borderWidth: isMe ? 0 : 1,
      borderColor: colors.border,
    },
    text: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 15,
      color: isMe ? colors.primaryForeground : colors.foreground,
      lineHeight: 22,
    },
    time: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 10,
      color: isMe ? colors.primaryForeground : colors.mutedForeground,
      marginTop: 4,
      opacity: 0.7,
    },
  }), [colors, isMe]);

  return (
    <View style={s.row}>
      {!isMe && <Text style={s.senderName}>{msg.senderName}</Text>}
      <View style={s.bubble}>
        <Text style={s.text}>{msg.content}</Text>
        <Text style={s.time}>{formatTime(msg.createdAt)}</Text>
      </View>
    </View>
  );
}

export default function ConversationScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const navigation = useNavigation();
  const convId = parseInt(id ?? '0', 10);
  const [text, setText] = useState('');
  const [localMessages, setLocalMessages] = useState<ConversationMessage[]>([]);

  React.useLayoutEffect(() => {
    navigation.setOptions({ title: name ?? 'Messages' });
  }, [navigation, name]);

  const { data: messages, isLoading, isError, refetch } = useListMessages(convId);

  const allMessages = useMemo(() => {
    const remote = messages ?? [];
    const ids = new Set(remote.map((m) => m.id));
    const extra = localMessages.filter((m) => !ids.has(m.id));
    return [...remote, ...extra];
  }, [messages, localMessages]);

  const reversed = useMemo(() => [...allMessages].reverse(), [allMessages]);

  const sendMutation = useSendMessage({
    mutation: {
      onSuccess: (msg) => {
        setLocalMessages((prev) => [...prev, msg]);
        refetch();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
    },
  });

  const handleSend = () => {
    const content = text.trim();
    if (!content) return;
    setText('');
    sendMutation.mutate({ id: convId, data: { content } });
  };

  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    errorText: {
      fontFamily: 'DMSans_500Medium',
      fontSize: 15,
      color: colors.mutedForeground,
    },
    dateHeader: {
      paddingVertical: 16,
      alignItems: 'center',
    },
    dateText: {
      fontFamily: 'DMSans_500Medium',
      fontSize: 11,
      color: colors.mutedForeground,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    listContent: {
      paddingTop: 8,
    },
    inputArea: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: 12,
      paddingVertical: 8,
      paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
      gap: 10,
    },
    input: {
      flex: 1,
      fontFamily: 'DMSans_400Regular',
      fontSize: 15,
      color: colors.foreground,
      backgroundColor: colors.input,
      paddingHorizontal: 14,
      paddingVertical: Platform.OS === 'ios' ? 10 : 8,
      maxHeight: 100,
    },
    sendBtn: {
      width: 40,
      height: 40,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
  }), [colors, insets]);

  if (isLoading) {
    return (
      <View style={[s.container, s.centered]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[s.container, s.centered]}>
        <Feather name="wifi-off" size={32} color={colors.mutedForeground} />
        <Text style={s.errorText}>Failed to load messages</Text>
        <TouchableOpacity onPress={() => refetch()}>
          <Feather name="refresh-cw" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      <FlatList
        data={reversed}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <MessageBubble msg={item} />}
        inverted
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        ListFooterComponent={
          <View style={s.dateHeader}>
            <Text style={s.dateText}>Beginning of conversation</Text>
          </View>
        }
      />

      <View style={s.inputArea}>
        <TextInput
          style={s.input}
          value={text}
          onChangeText={setText}
          placeholder="Message..."
          placeholderTextColor={colors.mutedForeground}
          multiline
          returnKeyType="send"
          onSubmitEditing={handleSend}
          testID="message-input"
        />
        <TouchableOpacity
          style={[s.sendBtn, { opacity: text.trim() ? 1 : 0.4 }]}
          onPress={handleSend}
          disabled={!text.trim() || sendMutation.isPending}
          testID="send-message"
        >
          <Feather name="send" size={16} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
