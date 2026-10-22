import React from 'react';
import { ActivityIndicator, Image, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getGetCreatorTattooBookingQueryKey, useGetCreatorTattooBooking, useGetCurrentUser } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { mainHeaderTopPadding } from '@/lib/safeArea';

export default function CommissionInquiryDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const id = Number(rawId);
  const validId = Number.isSafeInteger(id) && id > 0;
  const { data: viewer, isError: viewerError } = useGetCurrentUser();
  const { data, isLoading, isError, refetch } = useGetCreatorTattooBooking(validId ? id : 0, {
    query: {
      enabled: validId && !!viewer,
      queryKey: [...getGetCreatorTattooBookingQueryKey(validId ? id : 0), viewer?.id ?? null],
    },
  });
  const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.studioBackground },
    header: { paddingTop: mainHeaderTopPadding(insets.top, Platform.OS === 'web'), paddingBottom: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1.5, borderColor: colors.studioInk, backgroundColor: colors.studioPaper },
    heading: { color: colors.studioInk, fontFamily: 'DMSans_700Bold', fontSize: 20, flex: 1 },
    content: { padding: 18, paddingBottom: Math.max(insets.bottom, 24) + 24, gap: 16, maxWidth: 680, width: '100%', alignSelf: 'center' },
    card: { padding: 16, gap: 12, backgroundColor: colors.studioPaper, borderWidth: 1.5, borderColor: colors.studioInk, borderRadius: 18 },
    category: { color: colors.studioOrangeText, fontFamily: 'DMSans_700Bold', fontSize: 11, letterSpacing: 1.1, textTransform: 'uppercase' },
    name: { color: colors.studioInk, fontFamily: 'DMSans_700Bold', fontSize: 24 },
    text: { color: colors.studioInk, fontFamily: 'DMSans_400Regular', fontSize: 15, lineHeight: 22 },
    label: { color: colors.studioMuted, fontFamily: 'DMSans_700Bold', fontSize: 12 },
    button: { minHeight: 48, paddingHorizontal: 16, borderRadius: 99, borderWidth: 1.5, borderColor: colors.studioInk, backgroundColor: colors.studioYellow, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9 },
    buttonText: { color: colors.studioInk, fontFamily: 'DMSans_700Bold', fontSize: 14 },
    image: { width: 150, height: 150, borderRadius: 14, backgroundColor: colors.studioMint },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    state: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12, backgroundColor: colors.studioBackground },
  });

  if (validId && !viewerError && (isLoading || (!data && !isError))) {
    return <View style={styles.state}><Stack.Screen options={{ headerShown: false }} /><ActivityIndicator color={colors.primary} /><Text style={styles.text}>Loading inquiry…</Text></View>;
  }
  if (!validId || viewerError || isError || !data) {
    return <View style={styles.state}><Stack.Screen options={{ headerShown: false }} /><Text style={styles.name}>Inquiry unavailable</Text><Pressable style={styles.button} onPress={() => router.back()}><Text style={styles.buttonText}>Go back</Text></Pressable>{validId ? <Pressable style={styles.button} onPress={() => void refetch()}><Text style={styles.buttonText}>Try again</Text></Pressable> : null}</View>;
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to notifications" onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.studioInk} />
        </Pressable>
        <Text style={styles.heading}>Commission inquiry</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.category}>{data.category}</Text>
          <Text style={styles.name}>{data.name}</Text>
          <Text style={styles.text}>{data.email}</Text>
          {data.phone ? <Text style={styles.text}>{data.phone}</Text> : null}
          <View style={styles.row}>
            <Pressable style={styles.button} accessibilityRole="link" onPress={() => void Linking.openURL(`mailto:${encodeURIComponent(data.email)}`)}>
              <Feather name="mail" size={16} color={colors.studioInk} /><Text style={styles.buttonText}>Email client</Text>
            </Pressable>
            {data.phone ? <Pressable style={styles.button} accessibilityRole="link" onPress={() => void Linking.openURL(`tel:${data.phone}`)}>
              <Feather name="phone" size={16} color={colors.studioInk} /><Text style={styles.buttonText}>Call</Text>
            </Pressable> : null}
          </View>
        </View>
        <View style={styles.card}>
          {data.questions.map((question) => (
            <View key={question.id} style={{ gap: 5 }}>
              <Text style={styles.label}>{question.label}</Text>
              <Text style={styles.text}>{data.answers[question.id] || '—'}</Text>
            </View>
          ))}
        </View>
        {data.references.length ? (
          <View style={styles.card}>
            <Text style={styles.heading}>Reference images</Text>
            <View style={styles.row}>
              {data.references.map((reference) => <Image key={reference.id} source={{ uri: reference.url }} style={styles.image} accessibilityLabel={reference.originalName} />)}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
