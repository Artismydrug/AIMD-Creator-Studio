import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  createTattooBookingDraft,
  customFetch,
  submitTattooBooking,
} from '@workspace/api-client-react';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useColors } from '@/hooks/useColors';

type ProjectType = 'tattoo' | 'painting' | 'other';
type ReferenceImage = {
  uri: string;
  name: string;
  contentType: string;
  sizeBytes?: number;
};
type SubmittedInquiry = {
  id: number;
  notificationStatus: 'sent' | 'pending' | 'failed';
};

const MAX_REFERENCES = 6;
const MAX_REFERENCE_BYTES = 10 * 1024 * 1024;
const PROJECT_TYPES: { value: ProjectType; label: string; icon: React.ComponentProps<typeof Feather>['name'] }[] = [
  { value: 'tattoo', label: 'Tattoo', icon: 'edit-3' },
  { value: 'painting', label: 'Painting', icon: 'image' },
  { value: 'other', label: 'Other', icon: 'plus' },
];
const PROJECT_COPY: Record<ProjectType, {
  headline: string;
  ideaLabel: string;
  ideaPlaceholder: string;
  placementLabel: string;
  placementPlaceholder: string;
  sizeLabel: string;
  sizePlaceholder: string;
}> = {
  tattoo: {
    headline: 'Tell us about your tattoo.',
    ideaLabel: 'Tattoo idea',
    ideaPlaceholder: 'Share the concept, style, and meaning behind it.',
    placementLabel: 'Body placement',
    placementPlaceholder: 'For example, left forearm',
    sizeLabel: 'Estimated size',
    sizePlaceholder: 'For example, 4 × 6 inches',
  },
  painting: {
    headline: 'Describe the painting you imagine.',
    ideaLabel: 'Painting vision',
    ideaPlaceholder: 'Describe the subject, mood, colors, or story.',
    placementLabel: 'Canvas or surface',
    placementPlaceholder: 'Canvas, wall, or another surface',
    sizeLabel: 'Approximate dimensions',
    sizePlaceholder: 'For example, 24 × 36 inches',
  },
  other: {
    headline: 'What are you imagining?',
    ideaLabel: 'Project details',
    ideaPlaceholder: 'Tell us what you have in mind.',
    placementLabel: 'Medium or project type',
    placementPlaceholder: 'For example, mural or illustration',
    sizeLabel: 'Timeline or scope',
    sizePlaceholder: 'When you need it or the project scale',
  },
};

function imageContentType(asset: ImagePicker.ImagePickerAsset) {
  if (asset.mimeType?.startsWith('image/')) return asset.mimeType;
  const extension = (asset.fileName ?? asset.uri.split('?')[0]).split('.').pop()?.toLowerCase();
  const byExtension: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    heic: 'image/heic',
    heif: 'image/heif',
    gif: 'image/gif',
  };
  return byExtension[extension ?? ''] ?? 'image/jpeg';
}

export default function CommissionInquiryScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ creatorName?: string | string[] }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const rawCreatorName = Array.isArray(params.creatorName) ? params.creatorName[0] : params.creatorName;
  const creatorName = rawCreatorName?.trim().replace(/^@/, '').slice(0, 120) || 'Creator';
  const submitLock = useRef(false);
  const [requestType, setRequestType] = useState<ProjectType>('tattoo');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [idea, setIdea] = useState('');
  const [placement, setPlacement] = useState('');
  const [estimatedSize, setEstimatedSize] = useState('');
  const [references, setReferences] = useState<ReferenceImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<SubmittedInquiry | null>(null);

  const copy = PROJECT_COPY[requestType];
  const topInsetFallback = Platform.OS === 'web' && width <= 500 ? 56 : 8;
  const topPadding = Math.max(insets.top, topInsetFallback) + 8;
  const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.studioBackground },
    header: {
      minHeight: 58, paddingTop: topPadding, paddingBottom: 10, paddingHorizontal: 16,
      flexDirection: 'row', alignItems: 'center', gap: 10,
      borderBottomWidth: 1.5, borderBottomColor: colors.studioInk,
    },
    back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerMark: {
      width: 34, height: 34, borderRadius: 11, borderWidth: 1.5,
      borderColor: colors.studioInk, backgroundColor: colors.studioOrange,
      alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }],
    },
    headerLabel: { flex: 1, color: colors.studioInk, fontFamily: 'DMSans_700Bold', fontSize: 11, letterSpacing: 1 },
    scroll: { flex: 1 },
    content: {
      width: '100%', maxWidth: 680, alignSelf: 'center',
      padding: 16, paddingBottom: Math.max(insets.bottom, 24) + 32, gap: 20,
    },
    intro: { gap: 6, paddingTop: 4 },
    eyebrow: { color: colors.studioOrangeText, fontFamily: 'DMSans_700Bold', fontSize: 10, letterSpacing: 1.2 },
    title: { color: colors.studioInk, fontFamily: 'DMSans_700Bold', fontSize: 27, lineHeight: 32 },
    subtitle: { color: colors.studioMuted, fontFamily: 'DMSans_400Regular', fontSize: 14, lineHeight: 20 },
    section: { gap: 10 },
    sectionTitle: { color: colors.studioInk, fontFamily: 'DMSans_700Bold', fontSize: 15 },
    projectTypes: { flexDirection: 'row', gap: 8 },
    projectType: {
      flex: 1, minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
      paddingHorizontal: 6, borderWidth: 1.5, borderColor: colors.studioInk,
      borderRadius: 14, backgroundColor: colors.studioPaper,
    },
    projectTypeSelected: { backgroundColor: colors.studioYellow },
    projectTypeText: { color: colors.studioInk, fontFamily: 'DMSans_700Bold', fontSize: 12 },
    field: { gap: 6 },
    label: { color: colors.studioInk, fontFamily: 'DMSans_700Bold', fontSize: 12 },
    input: {
      minHeight: 46, paddingHorizontal: 12, paddingVertical: 10,
      borderRadius: 13, borderWidth: 1.5, borderColor: colors.studioInk,
      backgroundColor: colors.studioPaper, color: colors.studioInk,
      fontFamily: 'DMSans_500Medium', fontSize: 14,
    },
    multiline: { minHeight: 118, textAlignVertical: 'top' },
    helper: { color: colors.studioMuted, fontFamily: 'DMSans_400Regular', fontSize: 11, lineHeight: 16 },
    referenceButton: {
      minHeight: 72, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
      borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.studioInk,
      borderRadius: 15, backgroundColor: colors.studioPaper,
    },
    referenceButtonText: { color: colors.studioInk, fontFamily: 'DMSans_700Bold', fontSize: 13 },
    referenceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
    referenceThumb: {
      width: 82, height: 82, overflow: 'hidden', borderRadius: 13,
      borderWidth: 1.5, borderColor: colors.studioInk, backgroundColor: colors.studioPaperAlt,
    },
    removeReference: {
      position: 'absolute', top: 4, right: 4, width: 25, height: 25,
      alignItems: 'center', justifyContent: 'center', borderRadius: 13,
      backgroundColor: colors.studioPaper, borderWidth: 1, borderColor: colors.studioInk,
    },
    privacy: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 11,
      borderRadius: 13, backgroundColor: colors.studioPaperAlt,
    },
    privacyText: { flex: 1, color: colors.studioMuted, fontFamily: 'DMSans_500Medium', fontSize: 11, lineHeight: 16 },
    error: {
      padding: 11, borderRadius: 12, borderWidth: 1, borderColor: colors.destructive,
      backgroundColor: colors.card, color: colors.destructive,
      fontFamily: 'DMSans_600SemiBold', fontSize: 12, lineHeight: 18,
    },
    submit: {
      minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      borderRadius: 15, borderWidth: 1.5, borderColor: colors.studioInk,
      backgroundColor: colors.primary, shadowColor: colors.studioInk,
      shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0, elevation: 2,
    },
    submitText: { color: colors.primaryForeground, fontFamily: 'DMSans_700Bold', fontSize: 14 },
    successCard: {
      alignItems: 'flex-start', gap: 12, padding: 20,
      borderRadius: 18, borderWidth: 1.5, borderColor: colors.studioInk,
      backgroundColor: colors.studioPaper, shadowColor: colors.studioInk,
      shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 3,
    },
    secondaryButton: {
      minHeight: 44, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
      borderRadius: 13, borderWidth: 1.5, borderColor: colors.studioInk, backgroundColor: colors.studioYellow,
    },
    secondaryButtonText: { color: colors.studioInk, fontFamily: 'DMSans_700Bold', fontSize: 12 },
  });

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/community');
  };

  const chooseProjectType = (value: ProjectType) => {
    setRequestType(value);
    setIdea('');
    setPlacement('');
    setEstimatedSize('');
    setError(null);
  };

  const addReferences = async () => {
    if (references.length >= MAX_REFERENCES) return;
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError('Allow photo access to add reference images.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: MAX_REFERENCES - references.length,
        quality: 1,
      });
      if (result.canceled) return;
      const selected = result.assets.map((asset, index) => {
        const extension = (asset.fileName ?? asset.uri.split('?')[0]).split('.').pop()?.toLowerCase() || 'jpg';
        return {
          uri: asset.uri,
          name: asset.fileName?.trim() || `reference-${references.length + index + 1}.${extension}`,
          contentType: imageContentType(asset),
          sizeBytes: asset.fileSize,
        };
      });
      const accepted = selected.filter((file) => !file.sizeBytes || file.sizeBytes <= MAX_REFERENCE_BYTES);
      setReferences((current) => [...current, ...accepted].slice(0, MAX_REFERENCES));
      setError(accepted.length < selected.length ? 'Each image must be 10 MB or smaller.' : null);
    } catch {
      setError('Could not open your photo library. Please try again.');
    }
  };

  const submit = async () => {
    if (submitLock.current || isSubmitting) return;
    const cleanName = name.trim();
    const cleanEmail = email.trim();
    if (!cleanName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Add your name and a valid email address to continue.');
      return;
    }
    if (idea.trim().length < 10 || !placement.trim() || !estimatedSize.trim()) {
      setError('Complete the project details before sending your inquiry.');
      return;
    }

    submitLock.current = true;
    setIsSubmitting(true);
    setError(null);
    try {
      const draft = await createTattooBookingDraft({
        requestType,
        name: cleanName,
        email: cleanEmail,
        phone: phone.trim() || null,
        idea: idea.trim(),
        placement: placement.trim(),
        estimatedSize: estimatedSize.trim(),
        preferredArtist: creatorName,
        website: '',
      });

      for (const reference of references) {
        const fileResponse = await fetch(reference.uri);
        if (!fileResponse.ok) throw new Error(`Could not read ${reference.name}.`);
        const fileBytes = await fileResponse.arrayBuffer();
        if (fileBytes.byteLength > MAX_REFERENCE_BYTES) {
          throw new Error(`${reference.name} is larger than 10 MB.`);
        }
        await customFetch<{ id: number }>(`/api/tattoo-bookings/${draft.id}/references`, {
          method: 'POST',
          headers: {
            'Content-Type': reference.contentType,
            'X-Booking-Token': draft.uploadToken,
            'X-File-Name': encodeURIComponent(reference.name),
          },
          body: fileBytes,
        });
      }

      const result = await submitTattooBooking(draft.id, { uploadToken: draft.uploadToken });
      setSubmitted({ id: result.id, notificationStatus: result.notificationStatus });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not send your inquiry. Please try again.');
    } finally {
      submitLock.current = false;
      setIsSubmitting(false);
    }
  };

  const startAnotherInquiry = () => {
    setSubmitted(null);
    setRequestType('tattoo');
    setName('');
    setEmail('');
    setPhone('');
    setIdea('');
    setPlacement('');
    setEstimatedSize('');
    setReferences([]);
    setError(null);
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to studio" onPress={goBack} style={styles.back} testID="commission-inquiry-back">
          <Feather name="arrow-left" size={20} color={colors.studioInk} />
        </Pressable>
        <View style={styles.headerMark}><Feather name="edit-3" size={16} color={colors.studioInk} /></View>
        <Text style={styles.headerLabel}>STUDIO INQUIRY</Text>
      </View>

      <KeyboardAwareScrollViewCompat
        style={styles.scroll}
        contentContainerStyle={styles.content}
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {submitted ? (
          <View style={styles.successCard} accessibilityLiveRegion="polite" testID="commission-inquiry-success">
            <Feather name="check-circle" size={32} color={colors.primary} />
            <Text style={styles.eyebrow}>REQUEST #{submitted.id}</Text>
            <Text style={styles.title}>Your inquiry is in {creatorName}’s studio queue.</Text>
            {submitted.notificationStatus === 'failed' ? (
              <Text style={styles.subtitle}>Your request and private images are saved. The studio email alert was delayed, but your inquiry is safe in the queue.</Text>
            ) : submitted.notificationStatus === 'pending' ? (
              <Text style={styles.subtitle}>Your request is saved. The studio email alert is processing.</Text>
            ) : (
              <Text style={styles.subtitle}>You’ll hear back by email.</Text>
            )}
            <Pressable accessibilityRole="button" onPress={goBack} style={styles.secondaryButton}>
              <Feather name="arrow-left" size={15} color={colors.studioInk} />
              <Text style={styles.secondaryButtonText}>Back to studio</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={startAnotherInquiry} style={{ paddingVertical: 8 }}>
              <Text style={styles.helper}>Send another inquiry</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.intro}>
              <Text style={styles.eyebrow}>INQUIRY FOR · {creatorName.toUpperCase()}</Text>
              <Text style={styles.title}>Let’s make something.</Text>
              <Text style={styles.subtitle}>Share your idea directly with {creatorName}.</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>What are we making?</Text>
              <View style={styles.projectTypes}>
                {PROJECT_TYPES.map((item) => {
                  const selected = requestType === item.value;
                  return (
                    <Pressable
                      key={item.value}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => chooseProjectType(item.value)}
                      style={[styles.projectType, selected && styles.projectTypeSelected]}
                      testID={`commission-type-${item.value}`}
                    >
                      <Feather name={item.icon} size={14} color={colors.studioInk} />
                      <Text style={styles.projectTypeText}>{item.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your details</Text>
              <View style={styles.field}>
                <Text style={styles.label}>Name *</Text>
                <TextInput
                  accessibilityLabel="Your name"
                  autoComplete="name"
                  autoCapitalize="words"
                  maxLength={120}
                  onChangeText={setName}
                  placeholder="Your full name"
                  placeholderTextColor={colors.studioMuted}
                  returnKeyType="next"
                  style={styles.input}
                  textContentType="name"
                  value={name}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Email *</Text>
                <TextInput
                  accessibilityLabel="Your email"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  maxLength={254}
                  onChangeText={setEmail}
                  placeholder="you@email.com"
                  placeholderTextColor={colors.studioMuted}
                  returnKeyType="next"
                  style={styles.input}
                  textContentType="emailAddress"
                  value={email}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Phone (optional)</Text>
                <TextInput
                  accessibilityLabel="Phone number, optional"
                  autoComplete="tel"
                  keyboardType="phone-pad"
                  maxLength={40}
                  onChangeText={setPhone}
                  placeholder="Phone number"
                  placeholderTextColor={colors.studioMuted}
                  returnKeyType="next"
                  style={styles.input}
                  textContentType="telephoneNumber"
                  value={phone}
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{copy.headline}</Text>
              <View style={styles.field}>
                <Text style={styles.label}>{copy.ideaLabel} *</Text>
                <TextInput
                  accessibilityLabel={`${copy.ideaLabel}, required`}
                  maxLength={4000}
                  multiline
                  onChangeText={setIdea}
                  placeholder={copy.ideaPlaceholder}
                  placeholderTextColor={colors.studioMuted}
                  style={[styles.input, styles.multiline]}
                  textAlignVertical="top"
                  value={idea}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>{copy.placementLabel} *</Text>
                <TextInput
                  accessibilityLabel={`${copy.placementLabel}, required`}
                  maxLength={160}
                  onChangeText={setPlacement}
                  placeholder={copy.placementPlaceholder}
                  placeholderTextColor={colors.studioMuted}
                  style={styles.input}
                  value={placement}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>{copy.sizeLabel} *</Text>
                <TextInput
                  accessibilityLabel={`${copy.sizeLabel}, required`}
                  maxLength={120}
                  onChangeText={setEstimatedSize}
                  placeholder={copy.sizePlaceholder}
                  placeholderTextColor={colors.studioMuted}
                  style={styles.input}
                  value={estimatedSize}
                />
              </View>
            </View>

            <View style={styles.section}>
              <View>
                <Text style={styles.sectionTitle}>Reference images</Text>
                <Text style={styles.helper}>Up to six photos or sketches · 10 MB each</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add private reference images"
                disabled={references.length >= MAX_REFERENCES}
                onPress={() => void addReferences()}
                style={[styles.referenceButton, references.length >= MAX_REFERENCES && { opacity: 0.55 }]}
                testID="commission-add-references"
              >
                <Feather name="image" size={18} color={colors.studioOrangeText} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.referenceButtonText}>Add photos or sketches</Text>
                  <Text style={styles.helper}>Only the AIMD studio team can see them.</Text>
                </View>
                <Feather name="plus" size={17} color={colors.studioInk} />
              </Pressable>
              {references.length > 0 && (
                <View style={styles.referenceGrid}>
                  {references.map((reference) => (
                    <View key={reference.uri} style={styles.referenceThumb}>
                      <Image source={{ uri: reference.uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${reference.name}`}
                        onPress={() => setReferences((current) => current.filter((item) => item.uri !== reference.uri))}
                        style={styles.removeReference}
                      >
                        <Feather name="x" size={14} color={colors.studioInk} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.privacy}>
              <Feather name="lock" size={14} color={colors.studioInk} />
              <Text style={styles.privacyText}>Your contact details and references are sent privately to the AIMD studio.</Text>
            </View>

            {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: isSubmitting, busy: isSubmitting }}
              disabled={isSubmitting}
              onPress={() => void submit()}
              style={[styles.submit, isSubmitting && { opacity: 0.65 }]}
              testID="commission-submit"
            >
              {isSubmitting ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Feather name="send" size={16} color={colors.primaryForeground} />
              )}
              <Text style={styles.submitText}>{isSubmitting ? 'Sending inquiry…' : 'Send inquiry'}</Text>
            </Pressable>
          </>
        )}
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}
