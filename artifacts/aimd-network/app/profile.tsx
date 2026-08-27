import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/expo';
import {
  customFetch,
  getBaseUrl,
  getGetUserProfileQueryKey,
  useGetCurrentUser,
  useGetProgress,
  useGetUserProfile,
  useDeleteCurrentUser,
  useListBadges,
  useListStudioPosts,
  getListStudioPostsQueryKey,
  useUpdateCurrentUser,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import StudioVideo from '@/components/StudioVideo';

type LocalImage = { uri: string; contentType: string } | null;

function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const base = getBaseUrl();
  return base ? `${base}${url}` : url;
}

async function uploadAvatar(uri: string, contentType: string): Promise<string> {
  const fileResponse = await fetch(uri);
  const arrayBuffer = await fileResponse.arrayBuffer();
  const result = await customFetch<{ objectPath: string }>('/api/storage/uploads', {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body: arrayBuffer,
  });
  return `/api/storage${result.objectPath}`;
}

function initials(username: string): string {
  return username.slice(0, 2).toUpperCase();
}

function Avatar({
  username,
  avatarUrl,
  size,
}: {
  username: string;
  avatarUrl: string | null | undefined;
  size: number;
}) {
  const colors = useColors();
  const source = resolveImageUrl(avatarUrl);
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.muted }]}>
      {source ? (
        <Image source={{ uri: source }} style={{ width: size, height: size, borderRadius: size / 2 }} />
      ) : (
        <Text style={[styles.avatarText, { color: colors.primary, fontSize: size * 0.35 }]}>{initials(username)}</Text>
      )}
    </View>
  );
}

function ProfileEditor({
  id,
  username: initialUsername,
  bio: initialBio,
  discipline: initialDiscipline,
  location: initialLocation,
  avatarUrl: initialAvatarUrl,
  onSaved,
}: {
  id: number;
  username: string;
  bio: string | null | undefined;
  discipline: string | null | undefined;
  location: string | null | undefined;
  avatarUrl: string | null | undefined;
  onSaved: () => void;
}) {
  const colors = useColors();
  const [username, setUsername] = useState(initialUsername);
  const [bio, setBio] = useState(initialBio ?? '');
  const [discipline, setDiscipline] = useState(initialDiscipline ?? '');
  const [location, setLocation] = useState(initialLocation ?? '');
  const [selectedAvatar, setSelectedAvatar] = useState<LocalImage>(null);
  const updateProfile = useUpdateCurrentUser();
  const avatarPreview = selectedAvatar?.uri ?? resolveImageUrl(initialAvatarUrl);

  const chooseAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      if (!permission.canAskAgain && Platform.OS !== 'web') {
        Alert.alert(
          'Photo access is off',
          'Enable photo access in Settings to choose a profile image.',
          [{ text: 'Not now', style: 'cancel' }, { text: 'Open Settings', onPress: () => Linking.openSettings().catch(() => undefined) }],
        );
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
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      heic: 'image/heic',
    }[extension ?? ''] ?? 'image/jpeg');
    setSelectedAvatar({ uri: asset.uri, contentType });
  };

  const save = async () => {
    try {
      const avatarUrl = selectedAvatar
        ? await uploadAvatar(selectedAvatar.uri, selectedAvatar.contentType)
        : undefined;
      await updateProfile.mutateAsync({
        data: {
          username: username.trim(),
          bio: bio.trim() || null,
          discipline: discipline.trim() || null,
          location: location.trim() || null,
          ...(avatarUrl ? { avatarUrl } : {}),
        },
      });
      Alert.alert('Profile saved', 'Your creator profile is up to date.');
      onSaved();
    } catch {
      Alert.alert('Could not save profile', 'Check your connection and try again.');
    }
  };

  return (
    <View style={[styles.editor, { borderColor: colors.border, backgroundColor: colors.card }]}>
      <View style={styles.editorHeader}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Creator profile</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Choose profile photo"
          onPress={chooseAvatar}
          style={styles.avatarPicker}
          testID="choose-profile-avatar"
        >
          <Avatar username={username || initialUsername} avatarUrl={avatarPreview} size={76} />
          <View style={[styles.avatarEdit, { backgroundColor: colors.primary }]}>
            <Feather name="camera" size={13} color={colors.primaryForeground} />
          </View>
        </Pressable>
      </View>

      <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Handle</Text>
      <TextInput
        accessibilityLabel="Creator handle"
        autoCapitalize="none"
        maxLength={28}
        onChangeText={setUsername}
        style={[styles.input, { color: colors.foreground, backgroundColor: colors.input, borderColor: colors.border }]}
        value={username}
      />

      <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Bio</Text>
      <TextInput
        accessibilityLabel="Creator bio"
        maxLength={500}
        multiline
        onChangeText={setBio}
        placeholder="What are you making right now?"
        placeholderTextColor={colors.mutedForeground}
        style={[styles.input, styles.bioInput, { color: colors.foreground, backgroundColor: colors.input, borderColor: colors.border }]}
        value={bio}
      />

      <View style={styles.twoColumns}>
        <View style={styles.field}>
          <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Medium</Text>
          <TextInput
            accessibilityLabel="Artistic medium"
            onChangeText={setDiscipline}
            placeholder="Tattoo"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { color: colors.foreground, backgroundColor: colors.input, borderColor: colors.border }]}
            value={discipline}
          />
        </View>
        <View style={styles.field}>
          <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Location</Text>
          <TextInput
            accessibilityLabel="Creator location"
            onChangeText={setLocation}
            placeholder="Los Angeles"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { color: colors.foreground, backgroundColor: colors.input, borderColor: colors.border }]}
            value={location}
          />
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Save creator profile"
        disabled={updateProfile.isPending}
        onPress={save}
        style={[styles.saveButton, { backgroundColor: colors.primary, opacity: updateProfile.isPending ? 0.55 : 1 }]}
        testID="save-profile"
      >
        {updateProfile.isPending ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <>
            <Feather name="check" size={18} color={colors.primaryForeground} />
            <Text style={[styles.saveText, { color: colors.primaryForeground }]}>Save profile</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signOut } = useAuth();
  const deleteAccount = useDeleteCurrentUser();
  const {
    data: me,
    isLoading: meLoading,
    isError: meError,
    refetch: refetchMe,
  } = useGetCurrentUser();
  const { data: progress, isError: progressError, refetch: refetchProgress } = useGetProgress();
  const { data: badges, isError: badgesError, refetch: refetchBadges } = useListBadges();
  const { data: posts, isLoading: postsLoading } = useListStudioPosts(
    { userId: me?.id, limit: 10 },
    {
      query: {
        enabled: !!me,
        queryKey: me ? getListStudioPostsQueryKey({ userId: me.id, limit: 10 }) : [],
      },
      request: {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      },
    },
  );
  const {
    data: publicProfile,
    refetch: refetchPublicProfile,
  } = useGetUserProfile(me?.id ?? 0, {
    query: {
      enabled: !!me,
      queryKey: me ? getGetUserProfileQueryKey(me.id) : [],
    },
  });
  const [videosMuted, setVideosMuted] = useState(true);
  const topPadding = Platform.OS === 'web' ? 67 : insets.top + 10;

  const s = useMemo(() => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    header: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 12,
      paddingBottom: 12,
      paddingHorizontal: 16,
      paddingTop: topPadding,
    },
    headerTitle: { color: colors.foreground, flex: 1, fontFamily: 'DMSans_700Bold', fontSize: 20 },
    headerButton: { padding: 6 },
    content: { gap: 16, padding: 16, paddingBottom: Platform.OS === 'web' ? 100 : insets.bottom + 36 },
    accountActions: { borderTopWidth: 1, paddingTop: 16 },
    deleteAccountSection: { gap: 8, paddingTop: 8 },
    deleteAccountTitle: { color: colors.foreground, fontFamily: 'DMSans_600SemiBold', fontSize: 15 },
    deleteAccountDescription: { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular', fontSize: 13, lineHeight: 19 },
    signOutButton: { alignItems: 'center', borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: 8, justifyContent: 'center', minHeight: 46 },
    signOutText: { fontFamily: 'DMSans_700Bold', fontSize: 14 },
    state: { alignItems: 'center', gap: 12, justifyContent: 'center', minHeight: 320, padding: 24 },
    stateTitle: { color: colors.foreground, fontFamily: 'DMSans_600SemiBold', fontSize: 17 },
    stateText: { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular', fontSize: 14, textAlign: 'center' },
    overview: { alignItems: 'center', gap: 10, padding: 20, borderRadius: colors.radius + 4, borderWidth: 2, borderColor: colors.primary },
    username: { color: colors.foreground, fontFamily: 'DMSans_700Bold', fontSize: 22 },
     bio: { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular', fontSize: 14, lineHeight: 20, textAlign: 'center' },
    tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
    tag: { backgroundColor: colors.card, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5 },
    tagText: { color: colors.mutedForeground, fontFamily: 'DMSans_500Medium', fontSize: 12 },
    metrics: { backgroundColor: colors.card, borderColor: colors.cyan, borderRadius: colors.radius + 2, borderWidth: 2, flexDirection: 'row', overflow: 'hidden' },
     metric: { alignItems: 'center', flex: 1, gap: 3, paddingVertical: 12 },
     metricPressed: { opacity: 0.65 },
     metricIcon: { marginBottom: 2 },
    metricDivider: { backgroundColor: colors.border, width: 1 },
    metricValue: { color: colors.foreground, fontFamily: 'DMSans_700Bold', fontSize: 17 },
    metricLabel: { color: colors.mutedForeground, fontFamily: 'DMSans_500Medium', fontSize: 10, textTransform: 'uppercase' },
    statusCard: { borderColor: colors.gold, borderRadius: colors.radius + 2, borderWidth: 2, gap: 6, padding: 14 },
     statusCardHeader: { alignItems: 'center', flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
    statusTitle: { color: colors.foreground, flex: 1, fontFamily: 'DMSans_600SemiBold', fontSize: 15 },
    statusText: { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular', fontSize: 13, lineHeight: 19 },
    badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    badge: { alignItems: 'center', backgroundColor: colors.muted, borderRadius: colors.radius, flexDirection: 'row', gap: 6, paddingHorizontal: 10, paddingVertical: 7 },
    badgeText: { color: colors.foreground, fontFamily: 'DMSans_500Medium', fontSize: 12 },
     portfolio: { gap: 10 },
     portfolioHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
     portfolioTitle: { color: colors.foreground, fontFamily: 'DMSans_600SemiBold', fontSize: 16 },
     portfolioCount: { color: colors.mutedForeground, fontFamily: 'DMSans_500Medium', fontSize: 12 },
     portfolioPost: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, borderWidth: 1, overflow: 'hidden' },
     portfolioMedia: { height: 220, width: '100%' },
     portfolioImage: { backgroundColor: colors.muted, height: 220, width: '100%' },
     portfolioCaption: { color: colors.foreground, fontFamily: 'DMSans_400Regular', fontSize: 14, lineHeight: 20, padding: 14 },
     portfolioMeta: { alignItems: 'center', borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', gap: 6, paddingHorizontal: 14, paddingBottom: 12 },
     portfolioMetaText: { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular', fontSize: 11 },
  }), [colors, insets.bottom, topPadding]);

  if (meLoading) {
    return <View style={[s.screen, s.state]}><ActivityIndicator color={colors.primary} size="large" /></View>;
  }

  if (meError || !me) {
    return (
      <View style={[s.screen, s.state]}>
        <Feather name="user-x" size={42} color={colors.mutedForeground} />
        <Text style={s.stateTitle}>Couldn’t load your profile</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Retry loading profile" onPress={() => refetchMe()}>
          <Text style={[s.statusTitle, { color: colors.primary }]}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const handleSaved = () => {
    refetchMe();
    refetchPublicProfile();
    refetchProgress();
    refetchBadges();
  };
  const handleSignOut = () => {
    Alert.alert(
      'Sign out?',
      'You can sign back in with the same account whenever you are ready.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: () => {
            void signOut()
              .then(() => router.replace('/(auth)/sign-in'))
              .catch(() => Alert.alert('Could not sign out', 'Please try again.'));
          },
        },
      ],
    );
  };
  const handleDeleteAccount = () => {
    if (deleteAccount.isPending) return;

    Alert.alert(
      'Delete your account permanently?',
      'This permanently removes your AIMD profile, posts, habits, badges, messages, and other account data. This cannot be undone.',
      [
        { text: 'Keep my account', style: 'cancel' },
        {
          text: 'Delete permanently',
          style: 'destructive',
          onPress: () => {
            void deleteAccount.mutateAsync(undefined)
              .then(() => signOut())
              .then(() => router.replace('/(auth)/sign-in'))
              .catch(() => Alert.alert('Could not delete account', 'Your account is still active. Please try again.'));
          },
        },
      ],
    );
  };
  const mediumTags = [me.discipline, me.location].filter((value): value is string => !!value);

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={s.headerButton}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={s.headerTitle}>Your studio</Text>
      </View>

      <KeyboardAwareScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <View style={[s.overview, { backgroundColor: colors.magentaWash }]}>
          <Avatar username={me.username} avatarUrl={me.avatarUrl} size={94} />
          <Text style={s.username}>{me.username}</Text>
           {me.bio ? <Text style={s.bio} numberOfLines={2}>{me.bio}</Text> : <Text style={s.bio}>Add a bio.</Text>}
          {mediumTags.length > 0 && (
            <View style={s.tags}>
              {mediumTags.map((tag) => <View key={tag} style={s.tag}><Text style={s.tagText}>{tag}</Text></View>)}
            </View>
          )}
        </View>

        <View style={s.metrics}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create a new studio post"
            onPress={() => router.push({ pathname: '/feed', params: { compose: '1' } })}
            style={({ pressed }) => [s.metric, pressed && s.metricPressed]}
            testID="profile-posts-button"
          >
            <Feather name="grid" size={14} color={colors.cyan} style={s.metricIcon} />
            <Text style={s.metricValue}>{publicProfile?.postCount ?? 0}</Text>
            <Text style={s.metricLabel}>Posts</Text>
          </Pressable>
          <View style={s.metricDivider} />
          <View style={s.metric}><Feather name="users" size={14} color={colors.cyan} style={s.metricIcon} /><Text style={s.metricValue}>{publicProfile?.followerCount ?? '—'}</Text><Text style={s.metricLabel}>Followers</Text></View>
          <View style={s.metricDivider} />
          <View style={s.metric}><Feather name="user-plus" size={14} color={colors.cyan} style={s.metricIcon} /><Text style={s.metricValue}>{publicProfile?.followingCount ?? '—'}</Text><Text style={s.metricLabel}>Following</Text></View>
          <View style={s.metricDivider} />
          <View style={s.metric}><Feather name="zap" size={14} color={colors.cyan} style={s.metricIcon} /><Text style={s.metricValue}>{progress?.currentStreak ?? 0}</Text><Text style={s.metricLabel}>Day streak</Text></View>
        </View>

        <Pressable
          style={[s.statusCard, { backgroundColor: colors.goldWash }]}
          accessibilityRole="button"
          accessibilityLabel={me.tier === 'free' ? 'View membership options' : 'Manage your AIMD membership'}
          onPress={() => router.push('/membership')}
          testID="profile-membership-button"
        >
          <View style={s.statusCardHeader}>
            <Text style={s.statusTitle}><Feather name="shield" size={14} color={colors.primary} />  {progress?.phase?.phase ?? 'Discovering'} · {me.tier === 'free' ? 'Free' : me.tier}</Text>
            <Feather name="chevron-right" size={18} color={colors.primary} />
          </View>
          <Text style={s.statusText}>
            {me.tier === 'free'
               ? 'Free access. See what’s coming next.'
               : 'Membership active. Manage your access.'}
          </Text>
          {progressError && <Text style={[s.statusText, { color: colors.destructive }]}>Progress details are temporarily unavailable.</Text>}
        </Pressable>

        <View>
          <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 10 }]}>Unlocked badges</Text>
          {badgesError ? (
            <Text style={[s.statusText, { color: colors.destructive }]}>Badges couldn’t load right now.</Text>
          ) : (badges ?? []).length === 0 ? (
            <Text style={s.statusText}>Your first badge will appear here as you build your practice.</Text>
          ) : (
            <View style={s.badgeRow}>
              {(badges ?? []).slice(0, 6).map((badge) => (
                <View key={badge.id} style={s.badge}>
                  <Feather name="award" size={15} color={colors.primary} />
                  <Text style={s.badgeText}>{badge.name}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

         <View style={s.portfolio}>
           <View style={s.portfolioHeader}>
             <Text style={s.portfolioTitle}>Studio work</Text>
             <Text style={s.portfolioCount}>{posts?.length ?? 0} posts</Text>
           </View>
           {postsLoading ? (
             <ActivityIndicator color={colors.primary} style={{ paddingVertical: 20 }} />
           ) : (posts ?? []).length === 0 ? (
             <Text style={s.statusText}>Your published work will appear here as your portfolio.</Text>
           ) : (
             (posts ?? []).map((post) => (
               <View key={post.id} style={s.portfolioPost}>
                 {post.imageUrl && post.mediaType === 'video' ? (
                   <StudioVideo
                     uri={resolveImageUrl(post.imageUrl) ?? post.imageUrl}
                     active={false}
                     reducedMotion
                     muted={videosMuted}
                     onMutedChange={setVideosMuted}
                     style={s.portfolioMedia}
                   />
                 ) : post.imageUrl ? (
                   <Image
                     source={{ uri: resolveImageUrl(post.imageUrl) ?? post.imageUrl }}
                     style={s.portfolioImage}
                     resizeMode="cover"
                   />
                 ) : null}
                 {post.caption ? <Text style={s.portfolioCaption}>{post.caption}</Text> : null}
                 <View style={s.portfolioMeta}>
                   <Feather name="heart" size={13} color={colors.mutedForeground} />
                   <Text style={s.portfolioMetaText}>{post.likes ?? 0}</Text>
                   <Text style={s.portfolioMetaText}>{new Date(post.createdAt).toLocaleDateString()}</Text>
                 </View>
               </View>
             ))
           )}
         </View>

        <ProfileEditor
          key={`${me.id}-${me.username}-${me.avatarUrl ?? ''}-${me.bio ?? ''}-${me.discipline ?? ''}-${me.location ?? ''}`}
          id={me.id}
          username={me.username}
          bio={me.bio}
          discipline={me.discipline}
          location={me.location}
          avatarUrl={me.avatarUrl}
          onSaved={handleSaved}
        />

        <View style={[s.accountActions, { borderTopColor: colors.border }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign out of Creator Studio"
            disabled={deleteAccount.isPending}
            onPress={handleSignOut}
            style={[s.signOutButton, { borderColor: colors.border }]}
            testID="sign-out"
          >
            <Feather name="log-out" size={16} color={colors.destructive} />
            <Text style={[s.signOutText, { color: colors.destructive }]}>Sign out</Text>
          </Pressable>
          <View style={[s.deleteAccountSection, { borderTopColor: colors.border }]}>
            <Text style={s.deleteAccountTitle}>Delete account</Text>
            <Text style={s.deleteAccountDescription}>
              Permanently remove your AIMD account and all associated data. This action cannot be undone.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Delete my AIMD account permanently"
              disabled={deleteAccount.isPending}
              onPress={handleDeleteAccount}
              style={[s.signOutButton, { borderColor: colors.destructive, opacity: deleteAccount.isPending ? 0.55 : 1 }]}
              testID="delete-account"
            >
              <Feather name="trash-2" size={16} color={colors.destructive} />
              <Text style={[s.signOutText, { color: colors.destructive }]}>Delete my account</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarText: { fontFamily: 'DMSans_700Bold' },
  editor: { borderRadius: 12, borderWidth: 1, gap: 10, padding: 14 },
  editorHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  sectionTitle: { fontFamily: 'DMSans_600SemiBold', fontSize: 16 },
  avatarPicker: { position: 'relative' },
  avatarEdit: { alignItems: 'center', borderRadius: 14, bottom: -2, height: 28, justifyContent: 'center', position: 'absolute', right: -2, width: 28 },
  inputLabel: { fontFamily: 'DMSans_500Medium', fontSize: 12, marginTop: 2 },
  input: { borderRadius: 10, borderWidth: 1, fontFamily: 'DMSans_400Regular', fontSize: 14, minHeight: 44, paddingHorizontal: 12, paddingVertical: 9 },
  bioInput: { minHeight: 82, textAlignVertical: 'top' },
  twoColumns: { flexDirection: 'row', gap: 10 },
  field: { flex: 1 },
  saveButton: { alignItems: 'center', borderRadius: 10, flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 4, minHeight: 46 },
  saveText: { fontFamily: 'DMSans_700Bold', fontSize: 14 },
});