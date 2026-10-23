import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';
import { Feather } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '@clerk/expo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import {
  customFetch,
  getBaseUrl,
  getGetCurrentUserQueryKey,
  getGetUserProfileQueryKey,
  useDeleteCurrentUser,
  useGetCurrentUser,
  useUpdateCurrentUser,
} from '@workspace/api-client-react';
import { KeyboardAwareScrollViewCompat as KeyboardAwareScrollView } from '@/components/KeyboardAwareScrollViewCompat';
import { useColors } from '@/hooks/useColors';
import AppearanceSettings from '@/components/AppearanceSettings';
import LegalHelpLinks from '@/components/LegalHelpLinks';
import StudioInquirySettings from '@/components/StudioInquirySettings';
import { BiometricUnlockSettings } from '@/components/SessionSecurity';
import { mainHeaderTopPadding } from '@/lib/safeArea';
import { clearHabitReminders } from '@/lib/habitReminders';
import { miniHabitSketchbook } from '@/lib/miniHabitSketchbookStorage';
import { unregisterPushDevice } from '@/lib/pushNotifications';
import { sessionSecurityStore } from '@/lib/sessionSecurity';

type PickedImage = { uri: string; contentType: string } | null;
const HANDLE_PATTERN = /^[a-zA-Z0-9_]{3,28}$/;

function normalizeHandle(value: string) {
  return value.replace(/[^a-zA-Z0-9_]+/g, '_').replace(/_+/g, '_').slice(0, 28);
}

function resolveImageUrl(url: string | null | undefined) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const base = getBaseUrl();
  return base ? `${base}${url}` : url;
}

async function uploadAvatar(uri: string, contentType: string) {
  const response = await fetch(uri);
  const body = await response.arrayBuffer();
  const result = await customFetch<{ objectPath: string }>('/api/storage/uploads', {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body,
  });
  return `/api/storage${result.objectPath}`;
}

export default function EditProfileScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { userId, sessionId, signOut } = useAuth();
  const { data: me, isLoading, isError, refetch } = useGetCurrentUser();
  const updateProfile = useUpdateCurrentUser();
  const deleteAccount = useDeleteCurrentUser();
  const deletionInFlight = useRef(false);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [discipline, setDiscipline] = useState('');
  const [location, setLocation] = useState('');
  const [avatar, setAvatar] = useState<PickedImage>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);

  React.useEffect(() => {
    if (!me) return;
    setUsername(me.username);
    setBio(me.bio ?? '');
    setDiscipline(me.discipline ?? '');
    setLocation(me.location ?? '');
  }, [me?.id, me?.username, me?.bio, me?.discipline, me?.location]);

  const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.studioBackground },
    header: { minHeight: 58, paddingTop: mainHeaderTopPadding(insets.top, Platform.OS === 'web'), paddingHorizontal: 15, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1.5, borderBottomColor: colors.studioInk },
    back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    mark: { width: 34, height: 34, borderRadius: 11, borderWidth: 1.5, borderColor: colors.studioInk, backgroundColor: colors.studioOrange, alignItems: 'center', justifyContent: 'center' },
    heading: { flex: 1, color: colors.studioInk, fontFamily: 'DMSans_700Bold', fontSize: 19 },
    content: { width: '100%', maxWidth: 680, alignSelf: 'center', padding: 16, paddingBottom: Math.max(insets.bottom, 24) + 40, gap: 18 },
    intro: { gap: 5 },
    eyebrow: { color: colors.studioOrangeText, fontFamily: 'DMSans_700Bold', fontSize: 10, letterSpacing: 1.2 },
    title: { color: colors.studioInk, fontFamily: 'DMSans_700Bold', fontSize: 25 },
    subtitle: { color: colors.studioMuted, fontFamily: 'DMSans_400Regular', fontSize: 13, lineHeight: 19 },
    card: { gap: 13, padding: 15, borderRadius: 17, borderWidth: 1.5, borderColor: colors.studioInk, backgroundColor: colors.studioPaper, shadowColor: colors.studioInk, shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0, elevation: 2 },
    cardTitle: { color: colors.studioInk, fontFamily: 'DMSans_700Bold', fontSize: 16 },
    avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    avatarButton: { width: 76, height: 76, borderRadius: 38, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.studioInk, backgroundColor: colors.studioYellow },
    avatarImage: { width: 72, height: 72, borderRadius: 36 },
    avatarInitials: { color: colors.studioInk, fontFamily: 'DMSans_700Bold', fontSize: 24 },
    avatarHint: { flex: 1, color: colors.studioMuted, fontFamily: 'DMSans_500Medium', fontSize: 12, lineHeight: 18 },
    label: { color: colors.studioInk, fontFamily: 'DMSans_700Bold', fontSize: 12, marginBottom: -7 },
    input: { minHeight: 46, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.input, color: colors.foreground, fontFamily: 'DMSans_500Medium', fontSize: 14 },
    bio: { minHeight: 108, textAlignVertical: 'top' },
    columns: { flexDirection: 'row', gap: 10 },
    field: { flex: 1, gap: 10, minWidth: 0 },
    save: { minHeight: 48, borderRadius: 15, borderWidth: 1.5, borderColor: colors.studioInk, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
    saveText: { color: colors.primaryForeground, fontFamily: 'DMSans_700Bold', fontSize: 14 },
    rowButton: { minHeight: 50, paddingHorizontal: 13, borderRadius: 13, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.studioPaperAlt, alignItems: 'center', flexDirection: 'row', gap: 11 },
    rowText: { flex: 1, color: colors.studioInk, fontFamily: 'DMSans_600SemiBold', fontSize: 13 },
    danger: { color: colors.destructive },
    finePrint: { color: colors.studioMuted, fontFamily: 'DMSans_400Regular', fontSize: 12, lineHeight: 18 },
    modalBackdrop: { flex: 1, justifyContent: 'center', padding: 22, backgroundColor: 'rgba(0,0,0,0.55)' },
    modal: { padding: 19, borderRadius: 18, borderWidth: 1.5, borderColor: colors.studioInk, backgroundColor: colors.studioPaper, gap: 13 },
    modalActions: { flexDirection: 'row', gap: 10 },
    modalButton: { flex: 1, minHeight: 46, borderRadius: 13, borderWidth: 1.5, borderColor: colors.studioInk, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  });

  const chooseAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      if (!permission.canAskAgain && Platform.OS !== 'web') {
        Alert.alert('Photo access is off', 'Enable photo access in Settings to choose a profile image.', [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings().catch(() => undefined) },
        ]);
      } else {
        Alert.alert('Photo access needed', 'Allow photo access to choose a profile image.');
      }
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const extension = asset.uri.split('.').pop()?.toLowerCase();
    const contentType = asset.mimeType ?? ({
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic',
    }[extension ?? ''] ?? 'image/jpeg');
    setAvatar({ uri: asset.uri, contentType });
  };

  const saveProfile = async () => {
    if (!me || saving) return;
    const handle = normalizeHandle(username.trim()).replace(/^_+|_+$/g, '');
    if (!HANDLE_PATTERN.test(handle)) {
      Alert.alert('Update your handle', 'Use 3–28 letters, numbers, or underscores.');
      return;
    }
    setSaving(true);
    try {
      const avatarUrl = avatar ? await uploadAvatar(avatar.uri, avatar.contentType) : undefined;
      await updateProfile.mutateAsync({
        data: {
          username: handle,
          bio: bio.trim() || null,
          discipline: discipline.trim() || null,
          location: location.trim() || null,
          ...(avatarUrl ? { avatarUrl } : {}),
        },
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetUserProfileQueryKey(me.id) }),
      ]);
      setAvatar(null);
      Alert.alert('Profile saved', 'Your public studio has been updated.');
    } catch (error) {
      const message = error && typeof error === 'object' && 'data' in error &&
        error.data && typeof error.data === 'object' && 'error' in error.data
        ? String(error.data.error)
        : 'Please try again.';
      Alert.alert('Could not save profile', message);
    } finally {
      setSaving(false);
    }
  };

  const signOutNow = () => {
    Alert.alert('Sign out?', 'You can sign back in with the same account whenever you are ready.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          const finish = () => void signOut()
            .then(async () => {
              if (userId && sessionId) {
                try { await sessionSecurityStore.clearLastActiveAt(String(userId), sessionId); } catch { /* best effort */ }
              }
              router.replace('/(auth)/sign-in');
            })
            .catch(() => Alert.alert('Could not sign out', 'Please try again.'));
          void (userId ? unregisterPushDevice(userId) : Promise.resolve()).then(finish).catch(() => {
            Alert.alert('Could not disconnect phone alerts', 'You can still sign out. Generic push alerts may continue on this device.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign out anyway', style: 'destructive', onPress: finish },
            ]);
          });
        },
      },
    ]);
  };

  const deletionTitle = 'Delete your account permanently?';
  const deletionWarning = 'This permanently removes your AIMD profile, posts, habits, badges, messages, and other account data. This cannot be undone.';
  const showDeletionNotice = (title: string, message: string) => {
    if (Platform.OS === 'web') window.alert(`${title}\n\n${message}`);
    else Alert.alert(title, message);
  };
  const performDeletion = () => {
    if (deleteAccount.isPending || deletionInFlight.current) return;
    deletionInFlight.current = true;
    void deleteAccount.mutateAsync(undefined)
      .then(async () => {
        if (!userId) return;
        try { await sessionSecurityStore.clearAccount(String(userId)); } catch { showDeletionNotice('Account deleted', 'Local security settings could not be cleared.'); }
        try { await miniHabitSketchbook.clearAccount(userId); } catch { showDeletionNotice('Account deleted', 'Locally saved sketches could not be cleared.'); }
        try { await clearHabitReminders(userId); } catch { showDeletionNotice('Account deleted', 'Local reminder cleanup failed.'); }
      })
      .then(() => signOut())
      .then(() => router.replace('/(auth)/sign-in'))
      .catch(() => showDeletionNotice('Could not confirm completion', 'Please contact info@artismydrug.com before retrying account deletion.'))
      .finally(() => { deletionInFlight.current = false; });
  };
  const deleteAccountNow = () => {
    if (deleteAccount.isPending) return;
    if (Platform.OS === 'web') {
      setDeleteConfirmationOpen(true);
      return;
    }
    Alert.alert(deletionTitle, deletionWarning, [
      { text: 'Keep my account', style: 'cancel' },
      { text: 'Delete permanently', style: 'destructive', onPress: performDeletion },
    ]);
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to Your Studio" onPress={() => router.back()} style={styles.back}>
          <Feather name="arrow-left" size={20} color={colors.studioInk} />
        </Pressable>
        <View style={styles.mark}><Feather name="edit-2" size={16} color={colors.studioInk} /></View>
        <Text style={styles.heading}>Edit profile</Text>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator color={colors.primary} /></View>
      ) : isError || !me ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 }}>
          <Text style={styles.cardTitle}>Couldn’t load your profile</Text>
          <Pressable onPress={() => void refetch()} style={styles.rowButton}><Text style={styles.rowText}>Try again</Text></Pressable>
        </View>
      ) : (
        <KeyboardAwareScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          bottomOffset={24}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.intro}>
            <Text style={styles.eyebrow}>YOUR PUBLIC STUDIO</Text>
            <Text style={styles.title}>Make it yours.</Text>
            <Text style={styles.subtitle}>Choose what people see when they visit your studio.</Text>
          </View>

          <View style={styles.card} testID="profile-basics-editor">
            <Text style={styles.cardTitle}>Profile details</Text>
            <View style={styles.avatarRow}>
              <Pressable accessibilityRole="button" accessibilityLabel="Choose profile photo" onPress={chooseAvatar} style={styles.avatarButton} testID="choose-profile-avatar">
                {resolveImageUrl(avatar?.uri ?? me.avatarUrl) ? (
                  <Image source={{ uri: resolveImageUrl(avatar?.uri ?? me.avatarUrl)! }} style={styles.avatarImage} resizeMode="cover" />
                ) : (
                  <Text style={styles.avatarInitials}>{(username || me.username).slice(0, 2).toUpperCase()}</Text>
                )}
              </Pressable>
              <Text style={styles.avatarHint}>Tap your photo to update your studio image.</Text>
            </View>
            <Text style={styles.label}>Handle</Text>
            <TextInput accessibilityLabel="Creator handle" autoCapitalize="none" maxLength={28} value={username} onChangeText={(value) => setUsername(normalizeHandle(value))} style={styles.input} />
            <Text style={styles.label}>Bio</Text>
            <TextInput accessibilityLabel="Creator bio" value={bio} onChangeText={setBio} maxLength={500} multiline placeholder="What do you make?" placeholderTextColor={colors.mutedForeground} style={[styles.input, styles.bio]} />
            <View style={styles.columns}>
              <View style={styles.field}>
                <Text style={styles.label}>Medium</Text>
                <TextInput accessibilityLabel="Artistic medium" value={discipline} onChangeText={setDiscipline} placeholder="Painting, music, fitness…" placeholderTextColor={colors.mutedForeground} style={styles.input} />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Location</Text>
                <TextInput accessibilityLabel="Creator location" value={location} onChangeText={setLocation} placeholder="City" placeholderTextColor={colors.mutedForeground} style={styles.input} />
              </View>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Save creator profile" onPress={() => void saveProfile()} disabled={saving} style={[styles.save, saving && { opacity: 0.6 }]} testID="save-profile">
              {saving ? <ActivityIndicator color={colors.primaryForeground} /> : <><Feather name="check" size={17} color={colors.primaryForeground} /><Text style={styles.saveText}>Save changes</Text></>}
            </Pressable>
          </View>

          <View style={styles.card} testID="edit-profile-inquiries">
            <Text style={styles.cardTitle}>Inquiries</Text>
            <Text style={styles.subtitle}>Choose whether an inquiry link appears on your public studio.</Text>
            <StudioInquirySettings
              key={me.id}
              user={{ id: me.id, portfolioUrl: me.portfolioUrl, bookingOpen: me.bookingOpen, inquiryFormConfig: me.inquiryFormConfig }}
              onSaved={() => {
                void queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
                void queryClient.invalidateQueries({ queryKey: getGetUserProfileQueryKey(me.id) });
              }}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Membership</Text>
            <Text style={styles.subtitle}>{me.tier === 'free' ? 'Discovery · Free' : `Current plan · ${me.tier}`}</Text>
            <Pressable accessibilityRole="button" onPress={() => router.push('/membership')} style={styles.rowButton} testID="edit-profile-membership">
              <Feather name="shield" size={18} color={colors.studioOrangeText} />
              <Text style={styles.rowText}>View membership options</Text>
              <Feather name="chevron-right" size={18} color={colors.studioMuted} />
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>App settings</Text>
            <AppearanceSettings />
            <BiometricUnlockSettings userId={userId} />
            <Pressable accessibilityRole="button" accessibilityLabel="Notification settings" onPress={() => router.push('/notification-settings')} style={styles.rowButton} testID="profile-notification-settings">
              <Feather name="bell" size={18} color={colors.studioOrangeText} />
              <Text style={styles.rowText}>Notification settings</Text>
              <Feather name="chevron-right" size={18} color={colors.studioMuted} />
            </Pressable>
            <Text style={styles.finePrint} testID="installed-build-info">
              Version {Constants.expoConfig?.version ?? 'unknown'}
              {Constants.platform?.ios?.buildNumber
                ? ` · Build ${Constants.platform.ios.buildNumber}`
                : Platform.OS === 'web' || Constants.appOwnership === 'expo'
                  ? ' · Development preview'
                  : ' · Build unavailable'}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Account</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Sign out of Creator Studio" disabled={deleteAccount.isPending} onPress={signOutNow} style={styles.rowButton} testID="sign-out">
              <Feather name="log-out" size={18} color={colors.destructive} />
              <Text style={[styles.rowText, styles.danger]}>Sign out</Text>
              <Feather name="chevron-right" size={18} color={colors.studioMuted} />
            </Pressable>
            <LegalHelpLinks />
            <View style={{ gap: 8, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 13 }}>
              <Text style={[styles.cardTitle, styles.danger]}>Delete account</Text>
              <Text style={styles.finePrint}>Permanently remove your profile and personal content. This action cannot be undone.</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Delete my AIMD account permanently" disabled={deleteAccount.isPending} onPress={deleteAccountNow} style={[styles.rowButton, { borderColor: colors.destructive }]} testID="delete-account">
                {deleteAccount.isPending ? <ActivityIndicator color={colors.destructive} /> : <Feather name="trash-2" size={18} color={colors.destructive} />}
                <Text style={[styles.rowText, styles.danger]}>Delete my account</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAwareScrollView>
      )}

      {Platform.OS === 'web' && (
        <Modal visible={deleteConfirmationOpen} transparent animationType="fade" onRequestClose={() => setDeleteConfirmationOpen(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modal} accessibilityViewIsModal accessibilityRole="alert" testID="delete-account-confirmation">
              <Text style={[styles.cardTitle, styles.danger]}>{deletionTitle}</Text>
              <Text style={styles.finePrint}>{deletionWarning}</Text>
              <View style={styles.modalActions}>
                <Pressable accessibilityRole="button" testID="delete-confirm-cancel" style={styles.modalButton} onPress={() => setDeleteConfirmationOpen(false)}>
                  <Text style={styles.rowText}>Keep my account</Text>
                </Pressable>
                <Pressable accessibilityRole="button" testID="delete-confirm-submit" disabled={deleteAccount.isPending} style={[styles.modalButton, { backgroundColor: colors.destructive }]} onPress={() => {
                  if (!deleteConfirmationOpen || deleteAccount.isPending) return;
                  setDeleteConfirmationOpen(false);
                  performDeletion();
                }}>
                  <Text style={[styles.rowText, { color: colors.destructiveForeground }]}>Delete permanently</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}
