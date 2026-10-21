import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRsvpToEvent } from '@workspace/api-client-react';
import type { CommunityEvent } from '@workspace/api-client-react';

const CATEGORY_ICONS: Record<string, string> = {
  workshop: 'book-open',
  'pop-up': 'map-pin',
  gallery: 'image',
  activation: 'zap',
  community: 'users',
};

function formatEventDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatEventTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

interface EventCardProps {
  event: CommunityEvent;
  onRsvpChange?: () => void;
}

export default function EventCard({ event, onRsvpChange }: EventCardProps) {
  const colors = useColors();
  const [rsvped, setRsvped] = useState(event.hasRsvped ?? false);
  const [rsvpCount, setRsvpCount] = useState(event.rsvpCount ?? 0);
  const ticketPriceReady = event.eventType !== 'ticketed' || typeof event.priceCents === 'number';
  const iconName = (CATEGORY_ICONS[event.category] ?? 'calendar') as any;

  const rsvpMutation = useRsvpToEvent({
    mutation: {
      onSuccess: (updated) => {
        setRsvped(updated.hasRsvped ?? !rsvped);
        setRsvpCount(updated.rsvpCount ?? rsvpCount);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onRsvpChange?.();
      },
    },
  });

  const handleRsvp = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    rsvpMutation.mutate({ id: event.id });
  };

  const s = useMemo(() => StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderWidth: 1.5,
      borderColor: colors.foreground,
      borderRadius: 22,
      marginHorizontal: 16,
      marginBottom: 10,
      padding: 14,
      shadowColor: colors.studioShadow,
      shadowOffset: { width: 2, height: 3 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 2,
    },
    featuredBorder: {
      borderColor: colors.primary,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      marginBottom: 8,
    },
    iconBox: {
      width: 48,
      height: 48,
      backgroundColor: colors.studioLavender,
      borderWidth: 1,
      borderColor: colors.foreground,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    eventInfo: { flex: 1 },
    title: {
      fontFamily: 'DMSans_600SemiBold',
      fontSize: 15,
      color: colors.foreground,
      marginBottom: 3,
    },
    categoryBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 7,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: colors.ink,
      borderRadius: 8,
      backgroundColor: colors.studioYellow,
      marginBottom: 6,
    },
    categoryText: {
      fontFamily: 'DMSans_500Medium',
      fontSize: 11,
      color: colors.ink,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metaText: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 12,
      color: colors.mutedForeground,
    },
    ticketText: {
      fontFamily: 'DMSans_600SemiBold',
      fontSize: 12,
      color: colors.primary,
    },
    bottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    rsvpCount: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 13,
      color: colors.mutedForeground,
    },
    rsvpBtn: {
      paddingHorizontal: 16,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      borderWidth: 1.5,
      borderRadius: 15,
      borderColor: colors.foreground,
      shadowColor: colors.studioShadow,
      shadowOffset: { width: 2, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 2,
    },
    rsvpBtnText: {
      fontFamily: 'DMSans_600SemiBold',
      fontSize: 13,
    },
  }), [colors]);

  return (
    <View style={[s.card, event.isFeatured && s.featuredBorder]}>
      <View style={s.topRow}>
        <View style={s.iconBox}>
          <Feather name={iconName} size={20} color={colors.primary} />
        </View>
        <View style={s.eventInfo}>
          <Text style={s.title}>{event.title}</Text>
          <View style={s.categoryBadge}>
            <Text style={s.categoryText}>{event.category}</Text>
          </View>
          <View style={s.metaRow}>
            <View style={s.metaItem}>
              <Feather name="calendar" size={12} color={colors.mutedForeground} />
              <Text style={s.metaText}>{formatEventDate(event.startsAt)}</Text>
            </View>
            <View style={s.metaItem}>
              <Feather name="clock" size={12} color={colors.mutedForeground} />
              <Text style={s.metaText}>{formatEventTime(event.startsAt)}</Text>
            </View>
            <View style={s.metaItem}>
              <Feather name="map-pin" size={12} color={colors.mutedForeground} />
              <Text style={s.metaText}>{event.location}</Text>
            </View>
            {event.eventType === 'ticketed' && (
              <View style={s.metaItem}>
                <Feather name="tag" size={12} color={colors.primary} />
                <Text style={s.ticketText}>
                  {typeof event.priceCents === 'number'
                    ? `$${(event.priceCents / 100).toFixed(2)}`
                    : 'Price before checkout'}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={s.bottomRow}>
        <Text style={s.rsvpCount}>{rsvpCount} going</Text>
        <TouchableOpacity
          style={[s.rsvpBtn, {
            borderColor: rsvped ? colors.primary : colors.border,
            backgroundColor: rsvped ? colors.primary : 'transparent',
          }]}
          onPress={handleRsvp}
          disabled={rsvpMutation.isPending || !ticketPriceReady}
          testID={`rsvp-event-${event.id}`}
        >
          <Text style={[s.rsvpBtnText, { color: rsvped ? colors.primaryForeground : colors.foreground }]}>
            {!ticketPriceReady ? 'Price Pending' : rsvped ? 'Going' : 'RSVP'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
