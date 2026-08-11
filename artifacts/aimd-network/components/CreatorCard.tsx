import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import type { DirectoryCreator } from '@workspace/api-client-react';

const TIER_COLORS: Record<string, string> = {
  pro: '#a855f7',
  workshop: '#f59e0b',
  free: '#6b7280',
};

interface CreatorCardProps {
  creator: DirectoryCreator;
  onPress?: () => void;
}

export default function CreatorCard({ creator, onPress }: CreatorCardProps) {
  const colors = useColors();
  const tierColor = TIER_COLORS[creator.tier] ?? colors.mutedForeground;
  const initials = creator.username.slice(0, 2).toUpperCase();

  const s = useMemo(() => StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    avatar: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: colors.muted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 16,
      color: colors.primary,
    },
    info: { flex: 1 },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 3,
    },
    username: {
      fontFamily: 'DMSans_600SemiBold',
      fontSize: 15,
      color: colors.foreground,
    },
    tierBadge: {
      paddingHorizontal: 6,
      paddingVertical: 1,
      backgroundColor: colors.muted,
    },
    tierText: {
      fontFamily: 'DMSans_500Medium',
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    meta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    discipline: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 13,
      color: colors.mutedForeground,
    },
    statRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    statText: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 12,
      color: colors.mutedForeground,
    },
    openBadge: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
    },
  }), [colors]);

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.7} testID={`creator-${creator.id}`}>
      <View style={s.avatar}>
        <Text style={s.avatarText}>{initials}</Text>
      </View>
      <View style={s.info}>
        <View style={s.nameRow}>
          <Text style={s.username}>{creator.username}</Text>
          <View style={s.tierBadge}>
            <Text style={[s.tierText, { color: tierColor }]}>{creator.tier}</Text>
          </View>
          {creator.bookingOpen && <View style={s.openBadge} />}
        </View>
        <View style={s.meta}>
          {creator.discipline && (
            <Text style={s.discipline}>{creator.discipline}</Text>
          )}
          <View style={s.statRow}>
            <Feather name="award" size={11} color={colors.mutedForeground} />
            <Text style={s.statText}>{creator.badgeCount}</Text>
          </View>
          {creator.location && (
            <View style={s.statRow}>
              <Feather name="map-pin" size={11} color={colors.mutedForeground} />
              <Text style={s.statText}>{creator.location}</Text>
            </View>
          )}
        </View>
      </View>
      <Feather name="chevron-right" size={16} color={colors.border} />
    </TouchableOpacity>
  );
}
