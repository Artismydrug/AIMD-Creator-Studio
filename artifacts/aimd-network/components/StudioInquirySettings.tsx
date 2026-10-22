import React, { useRef, useState } from 'react';
import {
  ActivityIndicator, Pressable, StyleSheet,
  Switch, Text, TextInput, View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetCurrentUserQueryKey, getGetUserProfileQueryKey, getListDirectoryQueryKey,
  useUpdateCurrentUser,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';

type Props = {
  user: {
    id: number;
    bookingOpen?: boolean | null;
    inquiryOptions?: string[];
  };
  onSaved: () => void;
};

export default function StudioInquirySettings({ user, onSaved }: Props) {
  const colors = useColors();
  const client = useQueryClient();
  const update = useUpdateCurrentUser();
  const lock = useRef(false);
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(!!user.bookingOpen);
  const [categories, setCategories] = useState(user.inquiryOptions ?? ['Tattoo', 'Painting', 'Other']);
  const [newCategory, setNewCategory] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const inquiriesOpen = !!user.bookingOpen;
  const edit = () => {
    setOpen(!!user.bookingOpen);
    setCategories(user.inquiryOptions ?? ['Tattoo', 'Painting', 'Other']);
    setNewCategory('');
    setError('');
    setEditing(true);
  };
  const addCategory = () => {
    const value = newCategory.trim();
    if (!value) return;
    if (value.length > 32) { setError('Service names can be up to 32 characters.'); return; }
    if (categories.length >= 20) { setError('You can add up to 20 services.'); return; }
    if (categories.some((item) => item.toLocaleLowerCase() === value.toLocaleLowerCase())) {
      setError('That service is already listed.');
      return;
    }
    setCategories((current) => [...current, value]);
    setNewCategory('');
    setError('');
  };
  const moveCategory = (index: number, offset: -1 | 1) => {
    const target = index + offset;
    if (target < 0 || target >= categories.length) return;
    setCategories((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };
  const save = async () => {
    if (lock.current) return;
    if (open && categories.length === 0) {
      setError('Add at least one service before opening inquiries.');
      return;
    }
    const trimmedCategories = categories.map((category) => category.trim());
    const normalizedCategories = trimmedCategories.map((category) => category.toLocaleLowerCase());
    if (
      trimmedCategories.some((category) => !category || category.length > 32) ||
      new Set(normalizedCategories).size !== normalizedCategories.length
    ) {
      setError('Use unique service names between 1 and 32 characters.');
      return;
    }
    lock.current = true;
    setSaving(true);
    setError('');
    try {
      const saved = await update.mutateAsync({
        data: {
          bookingOpen: open,
          inquiryOptions: trimmedCategories,
        },
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
    services: { gap: 9, paddingTop: 4 },
    serviceHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    serviceCount: { color: colors.mutedForeground, fontFamily: 'DMSans_500Medium', fontSize: 11 },
    serviceRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    serviceField: { flex: 1, minHeight: 42, paddingHorizontal: 10, borderRadius: 12,
      backgroundColor: colors.card, color: colors.foreground, borderColor: colors.studioInk,
      borderWidth: 1, fontFamily: 'DMSans_500Medium', fontSize: 13 },
    iconButton: { width: 38, height: 40, alignItems: 'center', justifyContent: 'center',
      borderRadius: 11, borderWidth: 1, borderColor: colors.studioInk, backgroundColor: colors.studioPaper },
    addRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    addButton: { minWidth: 44, height: 44, alignItems: 'center', justifyContent: 'center',
      borderRadius: 12, borderWidth: 1.5, borderColor: colors.studioInk, backgroundColor: colors.studioYellow },
  });
  return (
    <View style={s.card} testID="studio-inquiry-card">
      <View style={s.row}>
        <Feather name="send" size={17} color={colors.ink} />
        <Text style={s.eyebrow}>YOUR INQUIRIES</Text>
        <Text style={s.status}>{inquiriesOpen ? 'Open' : 'Off'}</Text>
      </View>
      {editing ? (
        <>
          <View style={s.services} testID="inquiry-options-editor">
            <View style={s.serviceHeading}>
              <Text style={s.label}>Inquiry options</Text>
              <Text style={s.serviceCount}>{categories.length}/20</Text>
            </View>
            {categories.map((category, index) => (
              <View key={`${index}-${category}`} style={s.serviceRow}>
                <TextInput
                  accessibilityLabel={`Inquiry service ${index + 1}`}
                  value={category}
                  onChangeText={(value) => setCategories((current) => current.map((item, itemIndex) => itemIndex === index ? value : item))}
                  editable={!saving}
                  maxLength={32}
                  returnKeyType="done"
                  style={s.serviceField}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Move ${category} up`}
                  disabled={saving || index === 0}
                  onPress={() => moveCategory(index, -1)}
                  style={[s.iconButton, index === 0 && { opacity: 0.4 }]}
                ><Feather name="arrow-up" size={15} color={colors.foreground} /></Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Move ${category} down`}
                  disabled={saving || index === categories.length - 1}
                  onPress={() => moveCategory(index, 1)}
                  style={[s.iconButton, index === categories.length - 1 && { opacity: 0.4 }]}
                ><Feather name="arrow-down" size={15} color={colors.foreground} /></Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${category}`}
                  disabled={saving}
                  onPress={() => setCategories((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                  style={s.iconButton}
                ><Feather name="trash-2" size={15} color={colors.destructive} /></Pressable>
              </View>
            ))}
            <View style={s.addRow}>
              <TextInput
                accessibilityLabel="New inquiry service"
                value={newCategory}
                onChangeText={setNewCategory}
                editable={!saving && categories.length < 20}
                maxLength={32}
                returnKeyType="done"
                onSubmitEditing={addCategory}
                placeholder="Add a service, e.g. Mural"
                placeholderTextColor={colors.mutedForeground}
                style={[s.serviceField, { minHeight: 46 }]}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add inquiry service"
                disabled={saving || !newCategory.trim() || categories.length >= 20}
                onPress={addCategory}
                style={[s.addButton, (!newCategory.trim() || categories.length >= 20) && { opacity: 0.5 }]}
              ><Feather name="plus" size={19} color={colors.foreground} /></Pressable>
            </View>
          </View>
          <View style={s.row}>
            <Text style={[s.label, { flex: 1 }]}>Open for inquiries</Text>
            <Switch value={open} onValueChange={setOpen} disabled={saving}
              accessibilityLabel="Open for inquiries" testID="studio-inquiry-open" />
          </View>
          <Text style={s.copy}>Visitors submit a private form from your public studio and Creator Directory. New inquiries appear in Notifications and trigger an email to your account address.</Text>
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
          <Text style={s.copy}>{inquiriesOpen
            ? 'Your inquiry form is open. Review new requests in Notifications.'
            : 'Turn on a private inquiry form for your work. No website required.'}</Text>
          <View style={s.actions}>
            <Pressable style={s.button} onPress={edit} accessibilityRole="button" testID="edit-studio-inquiries">
              <Feather name="edit-2" size={14} color={colors.foreground} />
              <Text style={s.buttonText}>{inquiriesOpen ? 'Edit inquiries' : 'Set up inquiries'}</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}
