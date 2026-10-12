import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useHeaderHeight } from '@react-navigation/elements';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation, useFocusEffect } from 'expo-router';
import { safeImpact } from '@/lib/haptics';
import { runExclusiveSubmission } from '@/lib/submissionLock';
import { draftAfterConfirmedSend } from '@/lib/messageDraft';
import {
  useListMessages,
  useSendMessage,
  getListConversationsQueryKey,
  getListMessagesQueryKey,
  getGetNotificationsQueryKey,
} from '@workspace/api-client-react';
import type { ConversationMessage } from '@workspace/api-client-react';
import { useGetCurrentUser } from '@workspace/api-client-react';
import SafetyActions from '@/components/SafetyActions';
import EmojiPicker from '@/components/EmojiPicker';
import { useQueryClient } from '@tanstack/react-query';

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function MessageBubble({ msg, currentUserId }: { msg: ConversationMessage; currentUserId: number | null }) {
  const colors = useColors();
  const isMe = currentUserId != null && msg.senderId === currentUserId;

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
  const headerHeight = useHeaderHeight();
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { data: user } = useGetCurrentUser();
  const convId = parseInt(id ?? '0', 10);
  const [text, setText] = useState('');
  const [localMessages, setLocalMessages] = useState<ConversationMessage[]>([]);
  const sendingRef = useRef(false);
  const [focused, setFocused] = useState(false);

  useFocusEffect(React.useCallback(() => {
    setFocused(true);
    return () => setFocused(false);
  }, []));

  React.useLayoutEffect(() => {
    navigation.setOptions({ title: name ?? 'Messages', headerBackButtonDisplayMode: 'minimal' });
  }, [navigation, name]);

  const { data: messages, isLoading, isError, refetch } = useListMessages(convId, {
    query: {
      queryKey: getListMessagesQueryKey(convId),
      enabled: focused && Number.isInteger(convId) && convId > 0,
      refetchInterval: focused ? 5000 : false,
      refetchIntervalInBackground: false,
      refetchOnMount: 'always',
    },
  });
  useEffect(() => {
    if (!messages) return;
    void queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
    void queryClient.invalidateQueries({ queryKey: getGetNotificationsQueryKey() });
  }, [messages, queryClient]);

  const allMessages = useMemo(() => {
    const remote = messages ?? [];
    const ids = new Set(remote.map((m) => m.id));
    const extra = localMessages.filter((m) => !ids.has(m.id));
    return [...remote, ...extra];
  }, [messages, localMessages]);

  const reversed = useMemo(() => [...allMessages].reverse(), [allMessages]);
  const otherParticipant = useMemo(
    () => user?.id == null ? undefined : allMessages.find((message) => message.senderId !== user.id),
    [allMessages, user?.id],
  );

  const sendMutation = useSendMessage({
    mutation: {
      onSuccess: (msg) => {
        setLocalMessages((prev) => [...prev, msg]);
        void refetch();
        void queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        void queryClient.invalidateQueries({ queryKey: getGetNotificationsQueryKey() });
        void safeImpact();
      },
    },
  });

  const handleSend = async () => {
    const sentDraft = text;
    const content = sentDraft.trim();
    if (!content || sendMutation.isPending || !Number.isInteger(convId) || convId <= 0) return;
    try {
      await runExclusiveSubmission(sendingRef, async () => {
        await sendMutation.mutateAsync({ id: convId, data: { content } });
        setText((current) => draftAfterConfirmedSend(current, sentDraft));
      });
    } catch {
      Alert.alert(
        'Could not confirm delivery',
        'Your draft is still here. Check the conversation before retrying; a slow connection can hide a successful send.',
      );
    }
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
    safetyBar: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingLeft: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.background,
    },
    safetyText: {
      color: colors.mutedForeground,
      fontFamily: 'DMSans_500Medium',
      fontSize: 12,
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
      keyboardVerticalOffset={Platform.OS === 'web' ? 0 : headerHeight}
    >
      {otherParticipant && user?.id !== otherParticipant.senderId ? (
        <View style={s.safetyBar}>
          <Text style={s.safetyText}>Something feel unsafe?</Text>
          <SafetyActions
            userId={otherParticipant.senderId}
            username={otherParticipant.senderName}
            onBlocked={() => refetch()}
          />
        </View>
      ) : null}
      <FlatList
        style={{ flex: 1 }}
        data={reversed}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <MessageBubble msg={item} currentUserId={user?.id ?? null} />}
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
        <EmojiPicker onSelect={(emoji) => setText((current) => `${current}${emoji}`)} />
        <TextInput
          style={s.input}
          value={text}
          onChangeText={setText}
          placeholder="Message..."
          placeholderTextColor={colors.mutedForeground}
          multiline
          returnKeyType="send"
          submitBehavior="submit"
          accessibilityLabel="Message"
          onSubmitEditing={handleSend}
          testID="message-input"
        />
        <TouchableOpacity
          style={[s.sendBtn, { opacity: text.trim() ? 1 : 0.4 }]}
          onPress={handleSend}
          disabled={!text.trim() || sendMutation.isPending}
          accessibilityRole="button"
          accessibilityLabel="Send message"
          accessibilityState={{ busy: sendMutation.isPending }}
          testID="send-message"
        >
          {sendMutation.isPending ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <Feather name="send" size={16} color={colors.primaryForeground} />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
