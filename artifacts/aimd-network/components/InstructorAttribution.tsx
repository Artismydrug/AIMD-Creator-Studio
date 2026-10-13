import React from 'react';
import { Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

export default function InstructorAttribution({ name }: { name?: string | null }) {
  const colors = useColors();
  const instructor = name?.trim();
  return (
    <View
      testID="workshop-instructor-attribution"
      style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: colors.radius, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, maxWidth: '100%' }}
    >
      <Feather name="user" size={14} color={colors.foreground} />
      <Text style={{ flexShrink: 1, color: colors.foreground, fontFamily: 'DMSans_600SemiBold', fontSize: 12, lineHeight: 18 }}>
        {instructor ? `Taught by ${instructor}` : 'Instructor to be announced'}
      </Text>
    </View>
  );
}
