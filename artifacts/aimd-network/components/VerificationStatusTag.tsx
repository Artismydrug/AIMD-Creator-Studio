import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

export type VerificationStatus =
  | 'pending_review'
  | 'verified_authentic'
  | 'instructor_approved';

const STATUS_COPY: Record<
  VerificationStatus,
  { label: string; icon: 'clock' | 'shield' | 'award' }
> = {
  pending_review: { label: 'Pending Review', icon: 'clock' },
  verified_authentic: { label: 'Verified Authentic', icon: 'shield' },
  instructor_approved: { label: 'Instructor Approved', icon: 'award' },
};

export default function VerificationStatusTag({
  status,
}: {
  status: VerificationStatus;
}) {
  const colors = useColors();
  const copy = STATUS_COPY[status] ?? STATUS_COPY.pending_review;
  const approved = status === 'instructor_approved';
  const verified = status === 'verified_authentic';

  const styles = useMemo(
    () =>
      StyleSheet.create({
        tag: {
          alignSelf: 'flex-start',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 5,
          paddingHorizontal: 8,
          paddingVertical: 5,
          borderWidth: 1,
          borderColor: approved || verified ? colors.primary : colors.border,
          backgroundColor: approved ? colors.primary : colors.muted,
        },
        label: {
          color: approved
            ? colors.primaryForeground
            : approved || verified
              ? colors.primary
              : colors.mutedForeground,
          fontFamily: 'DMSans_600SemiBold',
          fontSize: 11,
        },
      }),
    [approved, colors, verified],
  );

  return (
    <View style={styles.tag}>
      <Feather
        name={copy.icon}
        size={12}
        color={
          approved
            ? colors.primaryForeground
            : approved || verified
              ? colors.primary
              : colors.mutedForeground
        }
      />
      <Text style={styles.label}>{copy.label}</Text>
    </View>
  );
}