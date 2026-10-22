import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '@clerk/expo';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getBaseUrl,
  getGetCreatorInquiryQueryKey,
  useGetCreatorInquiry,
  type CreatorInquiryDetails,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';

function displayDate(value: string | null) {
  if (!value) return 'Recently received';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Recently received'
    : date.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function projectLabel(type: CreatorInquiryDetails['requestType']) {
  return type === 'other' ? 'Creative project' : type;
}

export default function CreatorInquiryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { getToken } = useAuth();
  const params = useLocalSearchParams<{ bookingId?: string | string[] }>();
  const rawId = Array.isArray(params.bookingId) ? params.bookingId[0] : params.bookingId;
  const bookingId = Number(rawId);
  const validId = Number.isInteger(bookingId) && bookingId > 0;
  const { data, isLoading, isError, refetch } = useGetCreatorInquiry(
    validId ? bookingId : 0,
    { query: { queryKey: getGetCreatorInquiryQueryKey(bookingId), enabled: validId } },
  );
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<CreatorInquiryDetails['references'][number] | null>(null);

  useEffect(() => {
    let active = true;
    void getToken().then((token) => {
      if (active) setAuthToken(token);
    }).catch(() => {
      if (active) setAuthToken(null);
    });
    return () => { active = false; };
  }, [getToken]);

  const s = useMemo(() => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 18,
      paddingTop: Platform.OS === 'web' ? 67 : insets.top + 8,
      paddingBottom: 13,
      borderBottomWidth: 1.5,
      borderBottomColor: colors.studioInk,
      backgroundColor: colors.studioPaper,
    },
    back: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, color: colors.foreground, fontFamily: 'DMSans_700Bold', fontSize: 19 },
    scroll: { padding: 18, paddingBottom: insets.bottom + 32, gap: 14 },
    hero: {
      padding: 18,
      borderRadius: 23,
      backgroundColor: colors.studioYellow,
      borderWidth: 1.5,
      borderColor: colors.studioInk,
      shadowColor: colors.studioShadow,
      shadowOffset: { width: 3, height: 3 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 2,
      gap: 10,
    },
    eyebrow: { color: colors.studioInk, fontFamily: 'DMSans_700Bold', fontSize: 10, letterSpacing: 1.2 },
    title: { color: colors.studioInk, fontFamily: 'DMSans_700Bold', fontSize: 25, lineHeight: 31 },
    date: { color: colors.studioInk, fontFamily: 'DMSans_500Medium', fontSize: 12 },
    card: {
      padding: 16,
      gap: 11,
      borderRadius: 20,
      backgroundColor: colors.card,
      borderWidth: 1.5,
      borderColor: colors.studioInk,
      shadowColor: colors.studioShadow,
      shadowOffset: { width: 2, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 2,
    },
    sectionTitle: { color: colors.foreground, fontFamily: 'DMSans_700Bold', fontSize: 16 },
    detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    detailText: { flex: 1, color: colors.foreground, fontFamily: 'DMSans_500Medium', fontSize: 14, lineHeight: 20 },
    actionLink: { color: colors.primary, textDecorationLine: 'underline' },
    project: { color: colors.foreground, fontFamily: 'DMSans_400Regular', fontSize: 14, lineHeight: 22 },
    references: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    reference: { width: '47%', aspectRatio: 1, borderRadius: 16, overflow: 'hidden', borderWidth: 1.5, borderColor: colors.studioInk, backgroundColor: colors.studioLavender },
    preview: { width: '100%', height: '100%' },
    noImages: { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular', fontSize: 13 },
    state: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 28 },
    stateTitle: { color: colors.foreground, fontFamily: 'DMSans_700Bold', fontSize: 18, textAlign: 'center' },
    stateText: { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular', fontSize: 14, lineHeight: 20, textAlign: 'center' },
    retry: { minHeight: 44, paddingHorizontal: 18, borderRadius: 14, backgroundColor: colors.studioOrange, borderWidth: 1.5, borderColor: colors.studioInk, justifyContent: 'center' },
    retryText: { color: colors.studioInk, fontFamily: 'DMSans_700Bold', fontSize: 13 },
    modal: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(21,16,24,0.96)', padding: 18 },
    modalImage: { width: '100%', height: '80%' },
    close: { position: 'absolute', top: insets.top + 12, right: 18, zIndex: 1, width: 44, height: 44, borderRadius: 22, backgroundColor: colors.studioPaper, alignItems: 'center', justifyContent: 'center' },
  }), [colors, insets.bottom, insets.top]);

  const imageUri = (url: string) => /^https?:\/\//i.test(url)
    ? url
    : `${getBaseUrl() ?? ''}${url}`;
  const imageHeaders = authToken ? { Authorization: `Bearer ${authToken}` } : undefined;

  if (!validId || isLoading) {
    return (
      <View style={s.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={s.state}>
          {validId ? <ActivityIndicator size="large" color={colors.primary} /> : <Feather name="alert-circle" size={36} color={colors.destructive} />}
          <Text style={s.stateTitle}>{validId ? 'Opening inquiry…' : 'Inquiry not found'}</Text>
          {!validId ? <Pressable accessibilityRole="button" onPress={() => router.back()} style={s.retry}><Text style={s.retryText}>Back to inbox</Text></Pressable> : null}
        </View>
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={s.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={s.state}>
          <Feather name={isError ? 'wifi-off' : 'lock'} size={38} color={colors.studioMuted} />
          <Text style={s.stateTitle}>This inquiry is unavailable</Text>
          <Text style={s.stateText}>Only the creator who received it can view these private details.</Text>
          {isError ? <Pressable accessibilityRole="button" onPress={() => { void refetch(); }} style={s.retry}><Text style={s.retryText}>Try again</Text></Pressable> : null}
        </View>
      </View>
    );
  }

  return (
    <View style={s.screen} testID="creator-inquiry-details">
      <Stack.Screen options={{ headerShown: false }} />
      <View style={s.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to notifications" onPress={() => router.back()} style={s.back}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={s.headerTitle}>Inquiry details</Text>
        <Feather name="lock" size={17} color={colors.mutedForeground} />
      </View>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.hero}>
          <Text style={s.eyebrow}>{projectLabel(data.requestType).toUpperCase()}</Text>
          <Text style={s.title}>{data.name} wants to work with you.</Text>
          <Text style={s.date}>{displayDate(data.submittedAt)}</Text>
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>Client</Text>
          <View style={s.detailRow}>
            <Feather name="mail" size={17} color={colors.primary} />
            <Text
              accessibilityRole="link"
              onPress={() => { void Linking.openURL(`mailto:${data.email}`); }}
              style={[s.detailText, s.actionLink]}
            >{data.email}</Text>
          </View>
          {data.phone ? (
            <View style={s.detailRow}>
              <Feather name="phone" size={17} color={colors.primary} />
              <Text
                accessibilityRole="link"
                onPress={() => { void Linking.openURL(`tel:${data.phone}`); }}
                style={[s.detailText, s.actionLink]}
              >{data.phone}</Text>
            </View>
          ) : null}
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>Project details</Text>
          <Text style={s.project}>{data.idea}</Text>
          <View style={s.detailRow}>
            <Feather name="map-pin" size={16} color={colors.primary} />
            <Text style={s.detailText}>{data.placement}</Text>
          </View>
          <View style={s.detailRow}>
            <Feather name="maximize-2" size={16} color={colors.primary} />
            <Text style={s.detailText}>{data.estimatedSize}</Text>
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>Reference images · {data.references.length}</Text>
          {data.references.length ? (
            <View style={s.references}>
              {data.references.map((reference) => (
                <Pressable
                  key={reference.id}
                  accessibilityRole="imagebutton"
                  accessibilityLabel={`Open private reference image ${reference.originalName}`}
                  onPress={() => {
                    void getToken().then((token) => {
                      setAuthToken(token);
                      setSelectedImage(reference);
                    }).catch(() => Alert.alert('Private image unavailable', 'Sign in again to view this reference.'));
                  }}
                  style={s.reference}
                >
                  {imageHeaders ? (
                    <Image
                      source={{ uri: imageUri(reference.url), headers: imageHeaders }}
                      style={s.preview}
                      contentFit="cover"
                      cachePolicy="none"
                    />
                  ) : (
                    <View style={[s.preview, { alignItems: 'center', justifyContent: 'center' }]}>
                      <Feather name="image" size={22} color={colors.studioMuted} />
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={s.noImages}>No images attached.</Text>
          )}
        </View>
      </ScrollView>

      <Modal visible={!!selectedImage} transparent animationType="fade" onRequestClose={() => setSelectedImage(null)}>
        <View style={s.modal}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close image preview" onPress={() => setSelectedImage(null)} style={s.close}>
            <Feather name="x" size={22} color={colors.foreground} />
          </Pressable>
          {selectedImage && imageHeaders ? (
            <Image source={{ uri: imageUri(selectedImage.url), headers: imageHeaders }} style={s.modalImage} contentFit="contain" cachePolicy="none" />
          ) : null}
        </View>
      </Modal>
    </View>
  );
}
