import React, { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetCurrentUserQueryKey,
  getGetUserProfileQueryKey,
  useDeleteStudioPost,
  useUpdateStudioPost,
  type StudioPost,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';

const CAPTION_LIMIT = 5000;
type Dialog = 'options' | 'edit' | 'delete' | null;

type Props = {
  post: StudioPost;
  currentUserId?: number;
  triggerColor?: string;
  onVisibilityChange?: (visible: boolean) => void;
  onAssignCategory?: () => void;
};

/** Only the post owner sees this control; the API independently enforces ownership. */
export default function PostOwnerActions({ post, currentUserId, triggerColor, onVisibilityChange, onAssignCategory }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);
  const isOwner = currentUserId === post.userId;

  const changeDialog = (next: Dialog) => {
    setDialog(next);
    setError(null);
    onVisibilityChange?.(next !== null);
  };
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['/api/studio-posts'] });
    void queryClient.invalidateQueries({ queryKey: getGetUserProfileQueryKey(post.userId) });
    void queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
  };
  const updateMutation = useUpdateStudioPost({
    mutation: {
      onSuccess: (updated) => {
        queryClient.setQueriesData<StudioPost[]>({ queryKey: ['/api/studio-posts'] }, (existing) =>
          existing?.map((item) => item.id === updated.id ? updated : item));
        changeDialog(null);
        refresh();
      },
      onError: () => setError('Could not save. Your changes are still here. Check your connection and try again.'),
      onSettled: () => { submitting.current = false; },
    },
  });
  const deleteMutation = useDeleteStudioPost({
    mutation: {
      onSuccess: () => {
        queryClient.setQueriesData<StudioPost[]>({ queryKey: ['/api/studio-posts'] }, (existing) =>
          existing?.filter((item) => item.id !== post.id));
        changeDialog(null);
        refresh();
      },
      onError: () => {
        setError('Could not confirm deletion. Refresh your feed before trying again in case it already went through.');
        refresh();
      },
      onSettled: () => { submitting.current = false; },
    },
  });
  const busy = updateMutation.isPending || deleteMutation.isPending;
  const close = () => {
    if (!submitting.current) changeDialog(null);
  };
  const edit = () => {
    setDraft(post.caption);
    changeDialog('edit');
  };
  const save = () => {
    if (!isOwner || dialog !== 'edit' || submitting.current) return;
    const caption = draft.trim();
    if (!caption || caption.length > CAPTION_LIMIT) {
      setError('Enter a caption of 1–5,000 characters.');
      return;
    }
    if (caption === post.caption) { close(); return; }
    submitting.current = true;
    setError(null);
    updateMutation.mutate({ id: post.id, data: { caption } });
  };
  const confirmDelete = () => {
    if (!isOwner || dialog !== 'delete' || submitting.current) return;
    submitting.current = true;
    setError(null);
    deleteMutation.mutate({ id: post.id });
  };

  const s = useMemo(() => StyleSheet.create({
    trigger: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
    overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.ink + 'BB' },
    sheet: {
      backgroundColor: colors.card, padding: 20, paddingBottom: Math.max(insets.bottom, 16) + 16,
      borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '85%', gap: 14,
    },
    scroll: { flexShrink: 1 },
    content: { gap: 14 },
    handle: { width: 38, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center' },
    title: { color: colors.foreground, fontFamily: 'DMSans_700Bold', fontSize: 20 },
    detail: { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular', fontSize: 14, lineHeight: 21 },
    action: {
      minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12,
      borderWidth: 1, borderColor: colors.border, borderRadius: colors.radius, paddingHorizontal: 14,
    },
    actionText: { color: colors.foreground, fontFamily: 'DMSans_600SemiBold', fontSize: 15 },
    input: {
      height: 150, borderWidth: 1, borderColor: colors.border, borderRadius: colors.radius,
      padding: 12, color: colors.foreground, backgroundColor: colors.background,
      fontFamily: 'DMSans_400Regular', fontSize: 16, lineHeight: 23, textAlignVertical: 'top',
    },
    count: { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular', fontSize: 12, textAlign: 'right' },
    button: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: colors.radius, backgroundColor: colors.primary },
    buttonText: { color: colors.primaryForeground, fontFamily: 'DMSans_700Bold', fontSize: 15 },
    cancel: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
    cancelText: { color: colors.foreground, fontFamily: 'DMSans_600SemiBold', fontSize: 15 },
    error: { color: colors.destructive, fontFamily: 'DMSans_500Medium', fontSize: 14, lineHeight: 20 },
  }), [colors, insets.bottom]);

  if (!isOwner) return null;
  return (
    <>
      <TouchableOpacity
        style={s.trigger}
        accessibilityRole="button"
        accessibilityLabel="Options for your post"
        accessibilityHint={onAssignCategory ? 'Open post editing and category options' : 'Edit the caption or delete this post'}
        onPress={() => changeDialog('options')}
        testID={`post-options-${post.id}`}
      >
        <Feather name="more-horizontal" size={23} color={triggerColor ?? colors.foreground} />
      </TouchableOpacity>
      <Modal visible={dialog !== null} transparent animationType="slide" onRequestClose={close}>
        <KeyboardAvoidingView behavior="padding" style={s.overlay}>
          <View style={s.sheet} accessibilityViewIsModal testID={`post-actions-dialog-${post.id}`}>
            <View style={s.handle} />
            <ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
            <Text style={s.title}>{dialog === 'edit' ? 'Edit caption' : dialog === 'delete' ? 'Delete this post?' : 'Your post'}</Text>
            {dialog === 'options' && (
              <>
                {onAssignCategory && (
                  <TouchableOpacity
                    style={s.action}
                    accessibilityRole="button"
                    onPress={() => { changeDialog(null); onAssignCategory(); }}
                    testID={`assign-post-category-${post.id}`}
                  >
                    <Feather name="folder" size={18} color={colors.foreground} />
                    <Text style={s.actionText}>Change work category</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={s.action} accessibilityRole="button" onPress={edit} testID={`edit-post-${post.id}`}>
                  <Feather name="edit-2" size={18} color={colors.foreground} />
                  <Text style={s.actionText}>Edit caption</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.action} accessibilityRole="button" onPress={() => changeDialog('delete')} testID={`delete-post-${post.id}`}>
                  <Feather name="trash-2" size={18} color={colors.destructive} />
                  <Text style={[s.actionText, { color: colors.destructive }]}>Delete post</Text>
                </TouchableOpacity>
              </>
            )}
            {dialog === 'edit' && (
              <>
                <Text style={s.detail}>Your media and tags will stay unchanged.</Text>
                <TextInput
                  style={s.input} value={draft} onChangeText={setDraft} multiline autoFocus
                  maxLength={CAPTION_LIMIT} editable={!busy} accessibilityLabel="Post caption"
                  placeholder="Write your caption" placeholderTextColor={colors.mutedForeground}
                  testID={`post-caption-input-${post.id}`}
                />
                <Text style={s.count}>{draft.length.toLocaleString()} / 5,000</Text>
              </>
            )}
            {dialog === 'delete' && <Text style={s.detail}>This removes the post from your profile and the community feed. It cannot be undone.</Text>}
            {error && <Text style={s.error} accessibilityRole="alert">{error}</Text>}
            {dialog === 'edit' && (
              <TouchableOpacity
                style={[s.button, (!draft.trim() || busy) && { opacity: 0.5 }]}
                accessibilityRole="button" disabled={!draft.trim() || busy} onPress={save}
                testID={`save-post-caption-${post.id}`}
              >
                {busy ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={s.buttonText}>Save changes</Text>}
              </TouchableOpacity>
            )}
            {dialog === 'delete' && (
              <TouchableOpacity
                style={[s.button, { backgroundColor: colors.destructive, opacity: busy ? 0.5 : 1 }]}
                accessibilityRole="button" disabled={busy} onPress={confirmDelete}
                testID={`confirm-delete-post-${post.id}`}
              >
                {busy ? <ActivityIndicator color={colors.ink} /> : <Text style={[s.buttonText, { color: colors.ink }]}>Delete permanently</Text>}
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={s.cancel} accessibilityRole="button" disabled={busy} onPress={close}
              testID={`cancel-post-action-${post.id}`}
            >
              <Text style={s.cancelText}>{dialog === 'delete' ? 'Keep my post' : 'Cancel'}</Text>
            </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
