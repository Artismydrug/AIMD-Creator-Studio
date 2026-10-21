import React, { useMemo } from 'react';
import { Alert, Linking, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { getBaseUrl, type DirectoryCreator } from '@workspace/api-client-react';
import { getStudioInquiryLink } from '@/lib/studioInquiry';

interface CreatorCardProps {
  creator: DirectoryCreator;
  onOpenProfile?: () => void;
  onMessage?: () => void;
  messagingLoading?: boolean;
}

export default function CreatorCard({ creator, onOpenProfile, onMessage, messagingLoading }: CreatorCardProps) {
  const colors = useColors();
  const initials = creator.username.slice(0, 2).toUpperCase();
  const details = [creator.discipline, creator.location].filter(Boolean).join(' · ');
  const avatarUrl = creator.avatarUrl
    ? (/^https?:\/\//i.test(creator.avatarUrl) ? creator.avatarUrl : `${getBaseUrl() ?? ''}${creator.avatarUrl}`)
    : null;
  const inquiryLink = getStudioInquiryLink(creator);
  const openInquiry = async () => {
    if (!inquiryLink) return;
    try { await Linking.openURL(inquiryLink); }
    catch { Alert.alert('Could not open inquiry link', 'Try messaging this creator instead.'); }
  };

  const s = useMemo(() => StyleSheet.create({
    card: {
      flexDirection: 'row', alignItems: 'center', gap: 14,
      marginHorizontal: 16, marginTop: 10, minHeight: 72,
      paddingVertical: 12, paddingLeft: 14, paddingRight: 8,
      borderWidth: 1.5, borderColor: colors.studioInk, borderRadius: 18,
      backgroundColor: colors.card,
      shadowColor: colors.studioShadow, shadowOffset: { width: 2, height: 2 },
      shadowOpacity: 1, shadowRadius: 0, elevation: 2,
    },
    avatar: {
      width: 46, height: 46, borderRadius: 23, backgroundColor: colors.studioLavender,
      alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.studioInk,
      overflow: 'hidden',
    },
    avatarText: { fontFamily: 'DMSans_700Bold', fontSize: 16, color: colors.ink },
    info: { flex: 1, minWidth: 0, gap: 3 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 },
    username: { flexShrink: 1, fontFamily: 'DMSans_700Bold', fontSize: 16, color: colors.foreground },
    openDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
    details: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.mutedForeground },
    msgBtn: {
      width: 44, height: 44, borderRadius: 22, backgroundColor: colors.studioMint,
      borderWidth: 1.5, borderColor: colors.studioInk, alignItems: 'center', justifyContent: 'center',
    },
  }), [colors]);

  return (
    <View style={s.card} testID={`creator-${creator.id}`}>
      {onOpenProfile ? (
        <TouchableOpacity
          onPress={onOpenProfile}
          accessibilityRole="button"
          accessibilityLabel={`Open ${creator.username}'s studio`}
          testID={`open-creator-profile-${creator.id}`}
          activeOpacity={0.75}
        >
          <View style={s.avatar}>
            {avatarUrl ? <Image source={{ uri: avatarUrl }} style={{ width: 44, height: 44 }} contentFit="cover" /> : (
              <Text style={s.avatarText}>{initials}</Text>
            )}
          </View>
        </TouchableOpacity>
      ) : (
        <View style={s.avatar}>
          {avatarUrl ? <Image source={{ uri: avatarUrl }} style={{ width: 44, height: 44 }} contentFit="cover" /> : (
            <Text style={s.avatarText}>{initials}</Text>
          )}
        </View>
      )}
      <View style={s.info}>
        <View style={s.nameRow}>
          {onOpenProfile ? (
            <TouchableOpacity
              onPress={onOpenProfile}
              accessibilityRole="button"
              accessibilityLabel={`Open ${creator.username}'s studio`}
              testID={`open-creator-name-${creator.id}`}
              activeOpacity={0.75}
              style={{ minHeight: 30, justifyContent: 'center', flexShrink: 1 }}
            >
              <Text style={s.username} numberOfLines={1} ellipsizeMode="tail">{creator.username}</Text>
            </TouchableOpacity>
          ) : (
            <Text style={s.username} numberOfLines={1} ellipsizeMode="tail">{creator.username}</Text>
          )}
          {inquiryLink && <View style={s.openDot} accessibilityLabel="Open for inquiries" />}
          {onOpenProfile && <Feather name="chevron-right" size={15} color={colors.mutedForeground} accessibilityLabel="Open creator studio" />}
        </View>
        {details ? <Text style={s.details} numberOfLines={1}>{details}</Text> : null}
        {creator.badgeCount > 0 && (
          <Text style={s.details} numberOfLines={1}>
            <Feather name="award" size={11} color={colors.mutedForeground} /> {creator.badgeCount} {creator.badgeCount === 1 ? 'badge' : 'badges'}
          </Text>
        )}
        {inquiryLink ? (
          <TouchableOpacity onPress={openInquiry}
            style={{ minHeight: 44, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5 }}
            testID={`inquire-creator-${creator.id}`}
            accessibilityRole="link"
            accessibilityLabel={`Open ${creator.username}'s external inquiry link`}
            activeOpacity={0.7}>
            <Text style={[s.details, { color: colors.foreground, fontFamily: 'DMSans_700Bold' }]}>Inquire</Text>
            <Feather name="arrow-up-right" size={14} color={colors.foreground} />
          </TouchableOpacity>
        ) : null}
      </View>
      {onMessage ? (
        <TouchableOpacity
          style={[s.msgBtn, { opacity: messagingLoading ? 0.5 : 1 }]}
          onPress={(e) => { e.stopPropagation(); onMessage(); }}
          disabled={messagingLoading}
          testID={`message-creator-${creator.id}`}
          accessibilityRole="button"
          accessibilityLabel={`Message ${creator.username}`}
          activeOpacity={0.7}
        >
          <Feather name="message-circle" size={18} color={colors.ink} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
