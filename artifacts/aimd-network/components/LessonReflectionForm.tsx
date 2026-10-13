import React, { useState } from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { getListAssignmentsQueryKey, useSubmitLessonReflection } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';

type Props = {
  workshopId: number;
  moduleId: number;
  onDirtyChange: (dirty: boolean) => void;
};

export default function LessonReflectionForm({ workshopId, moduleId, onDirtyChange }: Props) {
  const colors = useColors();
  const queryClient = useQueryClient();
  const [response, setResponse] = useState<string>('');
  const [saved, setSaved] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const submit = useSubmitLessonReflection({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: getListAssignmentsQueryKey() });
        setResponse('');
        setSaved(true);
        setError(null);
        onDirtyChange(false);
      },
      onError: () => setError('Reflection not saved. Your response is still here. Check your connection and workshop access, then try again.'),
    },
  });
  return (
    <View style={{ padding: 16, gap: 10, borderRadius: colors.radius, borderColor: colors.border, borderWidth: 1, backgroundColor: colors.card }} testID="lesson-reflection-form">
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <Feather name="edit-3" size={18} color={colors.electricMagenta} />
        <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 16, color: colors.foreground }}>Reflect on this lesson</Text>
      </View>
      <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, lineHeight: 21, color: colors.foreground }}>
        What did you try from this lesson, and what will you practice next?
      </Text>
      <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, lineHeight: 18, color: colors.mutedForeground }}>
        No clip needed. Saved to your private learning portfolio for instructor review—not your public profile.
      </Text>
      <TextInput
        accessibilityLabel="Lesson reflection response"
        testID="lesson-reflection-response"
        value={response}
        editable={!submit.isPending}
        onChangeText={(text) => { setResponse(text); setSaved(false); setError(null); onDirtyChange(!!text.trim()); }}
        multiline
        maxLength={1500}
        placeholder="A technique, creative choice, or next step…"
        placeholderTextColor={colors.mutedForeground}
        style={{ minHeight: 105, padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: colors.radius, backgroundColor: colors.background, color: colors.foreground, fontFamily: 'DMSans_400Regular', textAlignVertical: 'top' }}
      />
      <Text style={{ fontSize: 11, color: colors.mutedForeground }}>{response.length}/1500</Text>
      {!!error && <Text accessibilityLiveRegion="polite" testID="lesson-reflection-error" style={{ fontSize: 13, lineHeight: 19, color: colors.destructive }}>{error}</Text>}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Save lesson reflection"
        testID="save-lesson-reflection"
        disabled={!response.trim() || submit.isPending}
        onPress={() => submit.mutate({ data: { workshopId, moduleId, responseText: response.trim() } })}
        style={{ minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.electricMagenta, borderRadius: colors.radius, opacity: !response.trim() || submit.isPending ? 0.5 : 1 }}
      >
        {submit.isPending ? <ActivityIndicator color={colors.primaryForeground} /> : <Feather name="check" size={17} color={colors.primaryForeground} />}
        <Text style={{ fontFamily: 'DMSans_700Bold', color: colors.primaryForeground }}>Save reflection</Text>
      </TouchableOpacity>
      {saved && (
        <View accessibilityLiveRegion="polite" testID="lesson-reflection-saved" style={{ padding: 14, gap: 7, borderRadius: colors.radius, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Feather name="check-circle" size={20} color={colors.foreground} />
            <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 15, color: colors.foreground }}>Reflection received</Text>
          </View>
          <Text style={{ fontSize: 13, lineHeight: 19, color: colors.foreground }}>Saved to your private learning portfolio. Your instructor can now review it.</Text>
        </View>
      )}
    </View>
  );
}
