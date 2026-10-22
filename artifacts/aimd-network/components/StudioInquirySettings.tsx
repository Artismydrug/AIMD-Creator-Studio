import React, { useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Linking, Pressable, Share, StyleSheet,
  Switch, Text, TextInput, View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetCurrentUserQueryKey, getGetUserProfileQueryKey, getListDirectoryQueryKey,
  useUpdateCurrentUser,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { getStudioInquiryLink, normalizeStudioLink } from '@/lib/studioInquiry';

type Props = {
  user: { id: number; portfolioUrl?: string | null; bookingOpen?: boolean | null };
  onSaved: () => void;
};

export default function StudioInquirySettings({ user, onSaved }: Props) {
  const colors = useColors();
  const client = useQueryClient();
  const update = useUpdateCurrentUser();
  const lock = useRef(false);
  const [editing, setEditing] = useState(false);
  const [link, setLink] = useState(user.portfolioUrl ?? '');
  const [open, setOpen] = useState(!!user.bookingOpen);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const activeLink = getStudioInquiryLink(user);
  const website = normalizeStudioLink(user.portfolioUrl);
  const edit = () => {
    setLink(user.portfolioUrl ?? '');
    setOpen(!!user.bookingOpen);
    setError('');
    setEditing(true);
  };
  const openLink = async () => {
    if (!website) return;
    try { await Linking.openURL(website); }
    catch { Alert.alert('Could not open link', 'Check your link and try again.'); }
  };
  const share = async () => {
    if (!activeLink) return;
    try { await Share.share({ message: activeLink, title: 'My studio inquiries' }); }
    catch { Alert.alert('Could not share link', 'Please try again.'); }
  };
  const save = async () => {
    if (lock.current) return;
    const trimmed = link.trim();
    const normalized = normalizeStudioLink(trimmed);
    if ((trimmed && !normalized) || (open && !normalized)) {
      setError('Add a valid https:// or http:// contact or booking URL. No passwords in links.');
      return;
    }
    lock.current = true;
    setSaving(true);
    setError('');
    try {
      const saved = await update.mutateAsync({
        data: { portfolioUrl: normalized, bookingOpen: open },
      });
      client.setQueryData(getGetCurrentUserQueryKey(), saved);
      void client.invalidateQueries({ queryKey: getGetUserProfileQueryKey(user.id) });
      void client.invalidateQueries({ queryKey: getListDirectoryQueryKey() });
      setEditing(false);
      onSaved();
    } catch {
      setError('Your inquiry settings were not saved. Please try again.');
    } finally {
      lock.current = false;
      setSaving(false);
    }
  };
  const s = StyleSheet.create({
    card: { padding: 18, gap: 14, backgroundColor: colors.studioMint, borderColor: colors.studioInk,
      borderWidth: 1.5, borderRadius: 22, shadowColor: colors.studioShadow,
      shadowOffset: { width: 3, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 2 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    eyebrow: { flex: 1, color: colors.ink, fontFamily: 'DMSans_700Bold', fontSize: 10, letterSpacing: 1.2 },
    status: { color: colors.ink, fontFamily: 'DMSans_700Bold', fontSize: 12 },
    title: { color: colors.ink, fontFamily: 'DMSans_700Bold', fontSize: 24, lineHeight: 29 },
    copy: { color: colors.ink, fontFamily: 'DMSans_400Regular', fontSize: 13, lineHeight: 19 },
    label: { color: colors.ink, fontFamily: 'DMSans_700Bold', fontSize: 13 },
    field: { minHeight: 48, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 12,
      backgroundColor: colors.card, color: colors.foreground, borderColor: colors.studioInk,
      borderWidth: 1, fontFamily: 'DMSans_400Regular', fontSize: 14 },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    button: { minHeight: 46, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row',
      alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 99,
      borderWidth: 1.5, borderColor: colors.studioInk, backgroundColor: colors.studioPaper },
    buttonText: { color: colors.foreground, fontFamily: 'DMSans_700Bold', fontSize: 13 },
    error: { color: colors.destructive, backgroundColor: colors.card, padding: 8, borderRadius: 8,
      fontFamily: 'DMSans_500Medium', fontSize: 13, lineHeight: 19 },
  });
  return (
    <View style={s.card} testID="studio-inquiry-card">
      <View style={s.row}>
        <Feather name="send" size={17} color={colors.ink} />
        <Text style={s.eyebrow}>YOUR INQUIRIES</Text>
        <Text style={s.status}>{activeLink ? 'Open' : 'Off'}</Text>
      </View>
      <Text style={s.title}>Let’s work together.</Text>
      {editing ? (
        <>
          <Text style={s.label}>Website / booking link</Text>
          <TextInput
            accessibilityLabel="Your contact or booking URL"
            testID="studio-inquiry-url"
            value={link} onChangeText={setLink} editable={!saving}
            placeholder="https://your-website.com/contact"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none" autoCorrect={false} keyboardType="url"
            maxLength={2048} style={s.field}
          />
          <View style={s.row}>
            <Text style={[s.label, { flex: 1 }]}>Open for inquiries</Text>
            <Switch value={open} onValueChange={setOpen} disabled={saving}
              accessibilityLabel="Open for inquiries" testID="studio-inquiry-open" />
          </View>
          <Text style={s.copy}>When on, visitors can contact you from your public studio and Creator Directory. This link also serves as your website link.</Text>
          {error ? <Text style={s.error} accessibilityRole="alert">{error}</Text> : null}
          <View style={s.actions}>
            <Pressable style={s.button} onPress={save} disabled={saving}
              accessibilityRole="button" testID="save-studio-inquiries">
              {saving ? <ActivityIndicator color={colors.foreground} /> : <Feather name="check" size={15} color={colors.foreground} />}
              <Text style={s.buttonText}>{saving ? 'Saving…' : 'Save inquiries'}</Text>
            </Pressable>
            <Pressable style={s.button} onPress={() => setEditing(false)} disabled={saving}
              accessibilityRole="button" testID="cancel-studio-inquiries">
              <Text style={s.buttonText}>Cancel</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <>
          <Text style={s.copy}>{activeLink
            ? 'Your inquiry option is live on your public studio and in Creator Directory.'
            : 'Add a contact or booking link to let visitors reach you about work.'}</Text>
          <View style={s.actions}>
            <Pressable style={s.button} onPress={edit} accessibilityRole="button" testID="edit-studio-inquiries">
              <Feather name="edit-2" size={14} color={colors.foreground} />
              <Text style={s.buttonText}>{website ? 'Edit inquiries' : 'Set up inquiries'}</Text>
            </Pressable>
            {website ? <Pressable style={s.button} onPress={openLink} accessibilityRole="link" testID="preview-studio-inquiry-link">
              <Text style={s.buttonText}>Visit link</Text><Feather name="arrow-up-right" size={14} color={colors.foreground} />
            </Pressable> : null}
            {activeLink ? <Pressable style={s.button} onPress={share} accessibilityRole="button" testID="share-studio-inquiry-link">
              <Feather name="share-2" size={14} color={colors.foreground} /><Text style={s.buttonText}>Share link</Text>
            </Pressable> : null}
          </View>
        </>
      )}
    </View>
  );
}
