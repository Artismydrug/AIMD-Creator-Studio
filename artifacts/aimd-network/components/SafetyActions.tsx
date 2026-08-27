import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  useBlockUser,
  useCreateContentReport,
  useUnblockUser,
  type ContentReportInput,
  type ReportReason,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';

const REASONS: Array<{ value: ReportReason; label: string }> = [
  { value: 'spam', label: 'Spam or misleading' },
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'hate', label: 'Hateful content' },
  { value: 'sexual_content', label: 'Sexual content' },
  { value: 'violence', label: 'Violence or threats' },
  { value: 'scam', label: 'Scam or fraud' },
  { value: 'other', label: 'Something else' },
];

type SafetyActionsProps = {
  userId: number;
  username?: string | null;
  postId?: number;
  messageId?: number;
  blockedByMe?: boolean;
  onBlocked?: (blocked: boolean) => void;
  triggerColor?: string;
};

export default function SafetyActions({
  userId,
  username = 'this creator',
  postId,
  messageId,
  blockedByMe = false,
  onBlocked,
  triggerColor,
}: SafetyActionsProps) {
  const colors = useColors();
  const [visible, setVisible] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState<ReportReason>('other');
  const [details, setDetails] = useState('');
  const [isBlocked, setIsBlocked] = useState(blockedByMe);
  const reportMutation = useCreateContentReport();
  const blockMutation = useBlockUser();
  const unblockMutation = useUnblockUser();

  const busy = reportMutation.isPending || blockMutation.isPending || unblockMutation.isPending;
  const target = useMemo<ContentReportInput>(() => ({
    ...(postId != null ? { postId } : {}),
    ...(messageId != null ? { messageId } : {}),
    ...(!postId && !messageId ? { userId } : {}),
    reason,
    ...(details.trim() ? { details: details.trim() } : {}),
  }), [details, messageId, postId, reason, userId]);

  const close = () => {
    setVisible(false);
    setReporting(false);
    setDetails('');
    setReason('other');
  };

  const handleReport = () => {
    reportMutation.mutate(
      { data: target },
      {
        onSuccess: () => {
          close();
          Alert.alert('Report received', 'Thanks for helping keep AIMD safe. Our team will review it.');
        },
        onError: () => Alert.alert('Could not send report', 'Please try again in a moment.'),
      },
    );
  };

  const handleBlock = () => {
    if (isBlocked) {
      unblockMutation.mutate(
        { id: userId },
        {
          onSuccess: () => {
            setIsBlocked(false);
            onBlocked?.(false);
            close();
          },
          onError: () => Alert.alert('Could not unblock creator', 'Please try again in a moment.'),
        },
      );
      return;
    }

    Alert.alert(
      `Block ${username}?`,
      'You will no longer see this creator’s community posts or receive direct messages from them.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: () => blockMutation.mutate(
            { id: userId },
            {
              onSuccess: () => {
                setIsBlocked(true);
                onBlocked?.(true);
                close();
                Alert.alert('Creator blocked', 'Their posts are hidden and direct messages are disabled.');
              },
              onError: () => Alert.alert('Could not block creator', 'Please try again in a moment.'),
            },
          ),
        },
      ],
    );
  };

  const s = useMemo(() => StyleSheet.create({
    trigger: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.72)',
    },
    sheet: {
      backgroundColor: colors.card,
      padding: 20,
      paddingBottom: 32,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      gap: 12,
    },
    handle: {
      width: 38,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginBottom: 4,
    },
    title: {
      color: colors.foreground,
      fontFamily: 'DMSans_700Bold',
      fontSize: 18,
    },
    subtitle: {
      color: colors.mutedForeground,
      fontFamily: 'DMSans_400Regular',
      fontSize: 13,
      lineHeight: 19,
    },
    action: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: colors.radius,
    },
    actionText: {
      color: colors.foreground,
      fontFamily: 'DMSans_600SemiBold',
      fontSize: 15,
    },
    destructiveText: { color: colors.destructive },
    reasonList: { gap: 8 },
    reason: {
      minHeight: 42,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: colors.radius,
    },
    reasonSelected: { borderColor: colors.primary, backgroundColor: colors.primary + '18' },
    reasonText: {
      color: colors.foreground,
      fontFamily: 'DMSans_500Medium',
      fontSize: 13,
    },
    details: {
      minHeight: 76,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: colors.radius,
      padding: 12,
      color: colors.foreground,
      fontFamily: 'DMSans_400Regular',
      fontSize: 14,
      textAlignVertical: 'top',
    },
    submit: {
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      borderRadius: colors.radius,
    },
    submitText: {
      color: colors.primaryForeground,
      fontFamily: 'DMSans_700Bold',
      fontSize: 15,
    },
    cancel: { alignItems: 'center', paddingVertical: 8 },
    cancelText: {
      color: colors.mutedForeground,
      fontFamily: 'DMSans_600SemiBold',
      fontSize: 14,
    },
  }), [colors]);

  return (
    <>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`Safety options for ${username}`}
        accessibilityHint="Report content or block this creator"
        onPress={() => setVisible(true)}
        style={s.trigger}
        testID={`safety-actions-${userId}${postId ? `-post-${postId}` : ''}`}
      >
        <Feather name="more-horizontal" size={20} color={triggerColor ?? colors.mutedForeground} />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.handle} />
            {reporting ? (
              <>
                <Text style={s.title}>Report {postId ? 'post' : messageId ? 'message' : 'creator'}</Text>
                <Text style={s.subtitle}>Choose the reason that best describes the problem. Reports are reviewed by AIMD staff.</Text>
                <View style={s.reasonList}>
                  {REASONS.map((item) => (
                    <TouchableOpacity
                      key={item.value}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: reason === item.value }}
                      onPress={() => setReason(item.value)}
                      style={[s.reason, reason === item.value && s.reasonSelected]}
                    >
                      <Feather
                        name={reason === item.value ? 'check-circle' : 'circle'}
                        size={18}
                        color={reason === item.value ? colors.primary : colors.mutedForeground}
                      />
                      <Text style={s.reasonText}>{item.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  accessibilityLabel="Additional report details"
                  style={s.details}
                  value={details}
                  onChangeText={setDetails}
                  placeholder="Add context (optional)"
                  placeholderTextColor={colors.mutedForeground}
                  maxLength={1000}
                  multiline
                />
                <TouchableOpacity style={s.submit} onPress={handleReport} disabled={busy}>
                  {reportMutation.isPending ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={s.submitText}>Submit report</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={s.cancel} onPress={() => setReporting(false)} disabled={busy}>
                  <Text style={s.cancelText}>Back</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={s.title}>Safety options</Text>
                <Text style={s.subtitle}>Help keep AIMD a respectful place for creators.</Text>
                <TouchableOpacity style={s.action} onPress={() => setReporting(true)} disabled={busy}>
                  <Feather name="flag" size={18} color={colors.primary} />
                  <Text style={s.actionText}>Report {postId ? 'this post' : 'this creator'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.action} onPress={handleBlock} disabled={busy}>
                  {busy ? <ActivityIndicator size="small" color={colors.mutedForeground} /> : <Feather name={isBlocked ? 'unlock' : 'slash'} size={18} color={isBlocked ? colors.primary : colors.destructive} />}
                  <Text style={[s.actionText, !isBlocked && s.destructiveText]}>{isBlocked ? 'Unblock creator' : `Block ${username}`}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.cancel} onPress={close} disabled={busy}>
                  <Text style={s.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}