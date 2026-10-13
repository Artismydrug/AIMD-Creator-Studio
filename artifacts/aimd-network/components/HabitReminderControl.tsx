import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@clerk/expo';
import { useColors } from '@/hooks/useColors';
import {
  loadHabitReminders,
  getHabitRemindersEnabled,
  saveHabitReminder,
  removeHabitReminder,
  type HabitReminder,
} from '@/lib/habitReminders';

interface Props {
  habitId: number;
  habitName: string;
}

const DEFAULT_MESSAGE = 'Start sketching';
const NATIVE = Platform.OS === 'ios' || Platform.OS === 'android';

export function formatReminderTime(hour: number, minute: number) {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`;
}

function errorText(e: unknown) {
  return e instanceof Error ? e.message : String(e ?? 'Unknown error');
}
function isPermissionError(e: unknown) {
  const msg = errorText(e).toLowerCase();
  const code = (e as { code?: string } | null)?.code?.toLowerCase?.() ?? '';
  return msg.includes('permission') || msg.includes('denied') || code.includes('permission');
}

export default function HabitReminderControl({ habitId, habitName }: Props) {
  const defaultMessage = habitName.toLowerCase().includes('sketch') ? DEFAULT_MESSAGE : `Time for ${habitName}`.slice(0, 120);
  const colors = useColors();
  const { userId } = useAuth();
  const [open, setOpen] = useState(false);
  const [reminder, setReminder] = useState<HabitReminder | null>(null);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ text: string; permission: boolean } | null>(null);
  const [hour12, setHour12] = useState('8');
  const [minute, setMinute] = useState('00');
  const [pm, setPm] = useState(false);
  const [message, setMessage] = useState(defaultMessage);
  const busyRef = useRef(false);

  const applyToForm = (r: HabitReminder | null) => {
    const h = r?.hour ?? 8;
    const m = r?.minute ?? 0;
    setHour12(String(h % 12 === 0 ? 12 : h % 12));
    setMinute(String(m).padStart(2, '0'));
    setPm(h >= 12);
    setMessage(r?.message ?? defaultMessage);
  };

  const refresh = useCallback(async (fillForm: boolean) => {
    if (!NATIVE || !userId) return;
    setLoading(true);
    try {
      const [all, enabled] = await Promise.all([loadHabitReminders(userId), getHabitRemindersEnabled(userId)]);
      setAlertsEnabled(enabled);
      const found = all.find((r) => r.habitId === habitId) ?? null;
      setReminder(found);
      if (fillForm) applyToForm(found);
    } catch (e) {
      setError({ text: `Could not load reminder: ${errorText(e)}`, permission: false });
    } finally {
      setLoading(false);
    }
  }, [userId, habitId, habitName]);

  useFocusEffect(useCallback(() => { void refresh(false); }, [refresh]));

  const openModal = () => {
    setError(null);
    applyToForm(reminder);
    setOpen(true);
    void refresh(true);
  };

  const h = parseInt(hour12, 10);
  const m = parseInt(minute, 10);
  const hourValid = /^\d{1,2}$/.test(hour12) && h >= 1 && h <= 12;
  const minuteValid = /^\d{1,2}$/.test(minute) && m >= 0 && m <= 59;
  const messageValid = message.trim().length > 0 && message.trim().length <= 120;
  const valid = hourValid && minuteValid && messageValid;
  const hour24 = hourValid ? (h % 12) + (pm ? 12 : 0) : 0;

  const handleSave = async () => {
    if (busyRef.current || !valid || !userId || !NATIVE) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const saved = await saveHabitReminder(userId, habitId, habitName, {
        hour: hour24,
        minute: m,
        message: message.trim(),
      });
      setReminder(saved);
      setOpen(false);
    } catch (e) {
      setError({
        text: isPermissionError(e)
          ? 'Notifications are not allowed for Creator Studio by AIMD. Allow notifications in device Settings, then save again.'
          : `Could not save reminder: ${errorText(e)}`,
        permission: isPermissionError(e),
      });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const handleTurnOff = async () => {
    if (busyRef.current || !userId || !NATIVE) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      await removeHabitReminder(userId, habitId);
      setReminder(null);
      setOpen(false);
    } catch (e) {
      setError({ text: `Could not turn off reminder: ${errorText(e)}`, permission: false });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const openSettings = () => {
    void Linking.openSettings().catch(() => {
      setError({ text: 'Could not open Settings. Open your device Settings and allow notifications for Creator Studio by AIMD.', permission: false });
    });
  };

  const s = useMemo(() => StyleSheet.create({
    trigger: {
      marginTop: 10, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingHorizontal: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 8,
      borderStyle: 'dashed',
    },
    triggerText: { flex: 1, fontFamily: 'DMSans_500Medium', fontSize: 12, color: colors.mutedForeground },
    triggerOn: { color: colors.foreground },
    overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
    sheet: {
      backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
      paddingHorizontal: 18, paddingTop: 14, paddingBottom: 34, maxHeight: '90%',
    },
    handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 14 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    title: { fontFamily: 'DMSans_700Bold', fontSize: 18, color: colors.foreground },
    sub: { fontFamily: 'DMSans_400Regular', fontSize: 13, lineHeight: 18, color: colors.mutedForeground, marginBottom: 16 },
    label: { fontFamily: 'DMSans_600SemiBold', fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.mutedForeground, marginBottom: 6 },
    timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    timeInput: {
      width: 64, height: 52, textAlign: 'center', fontFamily: 'DMSans_700Bold', fontSize: 22,
      color: colors.foreground, backgroundColor: colors.input, borderRadius: 10, borderWidth: 1, borderColor: colors.border,
    },
    colon: { fontFamily: 'DMSans_700Bold', fontSize: 22, color: colors.foreground },
    seg: { flexDirection: 'row', borderWidth: 1, borderColor: colors.border, borderRadius: 10, overflow: 'hidden', marginLeft: 6 },
    segBtn: { minWidth: 52, height: 50, alignItems: 'center', justifyContent: 'center' },
    segText: { fontFamily: 'DMSans_600SemiBold', fontSize: 14 },
    invalid: { borderColor: colors.destructive },
    hint: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.mutedForeground, marginBottom: 16 },
    errText: { fontFamily: 'DMSans_500Medium', fontSize: 12, color: colors.destructive, marginBottom: 12, lineHeight: 17 },
    msgInput: {
      fontFamily: 'DMSans_400Regular', fontSize: 15, color: colors.foreground, backgroundColor: colors.input,
      borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 6,
    },
    errorBox: { backgroundColor: `${colors.destructive}1A`, borderRadius: 10, padding: 12, marginBottom: 14, gap: 8 },
    settingsBtn: { alignSelf: 'flex-start', minHeight: 40, paddingHorizontal: 12, justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: colors.destructive },
    settingsText: { fontFamily: 'DMSans_600SemiBold', fontSize: 13, color: colors.destructive },
    saveBtn: { height: 50, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    saveText: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: colors.primaryForeground },
    offBtn: { height: 46, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    offText: { fontFamily: 'DMSans_600SemiBold', fontSize: 14, color: colors.destructive },
  }), [colors]);

  if (!NATIVE) {
    return (
      <View style={s.trigger} testID={`habit-reminder-unsupported-${habitId}`} accessible accessibilityLabel="Daily reminders are only available in the iOS and Android app">
        <Feather name="bell-off" size={14} color={colors.mutedForeground} />
        <Text style={s.triggerText}>Daily reminders are available in the iOS and Android app, not on web.</Text>
      </View>
    );
  }

  const summary = reminder
    ? `${alertsEnabled ? 'Daily' : 'Paused'} at ${formatReminderTime(reminder.hour, reminder.minute)} (local time)`
    : 'Set a daily reminder';

  return (
    <>
      <TouchableOpacity
        style={s.trigger}
        onPress={openModal}
        accessibilityRole="button"
        accessibilityLabel={reminder ? `Edit reminder for ${habitName}. ${summary}` : `Set a daily reminder for ${habitName}`}
        testID={`habit-reminder-open-${habitId}`}
      >
        <Feather name={reminder ? 'bell' : 'bell-off'} size={14} color={reminder ? colors.primary : colors.mutedForeground} />
        <Text style={[s.triggerText, reminder && s.triggerOn]} testID={`habit-reminder-summary-${habitId}`}>
          {loading && !reminder ? 'Checking reminder…' : summary}
        </Text>
        <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => { if (!busy) setOpen(false); }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.overlay}>
          <View style={s.sheet} accessibilityViewIsModal>
            <View style={s.handle} />
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={s.headerRow}>
                <Text style={s.title} accessibilityRole="header">Daily reminder</Text>
                <TouchableOpacity
                  onPress={() => setOpen(false)}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel="Close reminder settings"
                  hitSlop={12}
                  testID={`habit-reminder-close-${habitId}`}
                >
                  <Feather name="x" size={22} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
              <Text style={s.sub}>
                One notification each day for "{habitName}", on this device only. You will be asked for notification permission when you save.
              </Text>

              {loading ? <ActivityIndicator color={colors.primary} style={{ marginBottom: 12 }} accessibilityLabel="Loading reminder" /> : null}

              <Text style={s.label}>Time (local)</Text>
              <View style={s.timeRow}>
                <TextInput
                  style={[s.timeInput, !hourValid && s.invalid]}
                  value={hour12}
                  onChangeText={(t) => setHour12(t.replace(/\D/g, ''))}
                  keyboardType="number-pad"
                  maxLength={2}
                  editable={!busy}
                  accessibilityLabel="Reminder hour, 1 to 12"
                  testID={`habit-reminder-hour-${habitId}`}
                />
                <Text style={s.colon}>:</Text>
                <TextInput
                  style={[s.timeInput, !minuteValid && s.invalid]}
                  value={minute}
                  onChangeText={(t) => setMinute(t.replace(/\D/g, ''))}
                  onBlur={() => { if (minuteValid) setMinute(String(m).padStart(2, '0')); }}
                  keyboardType="number-pad"
                  maxLength={2}
                  editable={!busy}
                  accessibilityLabel="Reminder minute, 0 to 59"
                  testID={`habit-reminder-minute-${habitId}`}
                />
                <View style={s.seg} accessibilityRole="radiogroup">
                  {(['AM', 'PM'] as const).map((p) => {
                    const sel = (p === 'PM') === pm;
                    return (
                      <TouchableOpacity
                        key={p}
                        style={[s.segBtn, sel && { backgroundColor: colors.primary }]}
                        onPress={() => setPm(p === 'PM')}
                        disabled={busy}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: sel }}
                        accessibilityLabel={p}
                        testID={`habit-reminder-${p.toLowerCase()}-${habitId}`}
                      >
                        <Text style={[s.segText, { color: sel ? colors.primaryForeground : colors.mutedForeground }]}>{p}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              {!hourValid || !minuteValid ? (
                <Text style={s.errText}>Enter an hour from 1 to 12 and a minute from 00 to 59.</Text>
              ) : (
                <Text style={s.hint}>Every day at {formatReminderTime(hour24, m)}</Text>
              )}

              <Text style={s.label}>Message</Text>
              <TextInput
                style={[s.msgInput, !messageValid && s.invalid]}
                value={message}
                onChangeText={setMessage}
                placeholder={DEFAULT_MESSAGE}
                placeholderTextColor={colors.mutedForeground}
                maxLength={120}
                editable={!busy}
                returnKeyType="done"
                accessibilityLabel="Reminder message"
                testID={`habit-reminder-message-${habitId}`}
              />
              {!messageValid ? <Text style={s.errText}>Add a short message.</Text> : <Text style={s.hint}>{message.trim().length}/120</Text>}

              {error ? (
                <View style={s.errorBox} accessibilityLiveRegion="assertive" testID={`habit-reminder-error-${habitId}`}>
                  <Text style={[s.errText, { marginBottom: 0 }]}>{error.text}</Text>
                  {error.permission ? (
                    <TouchableOpacity
                      style={s.settingsBtn}
                      onPress={openSettings}
                      accessibilityRole="button"
                      accessibilityLabel="Open device settings"
                      testID={`habit-reminder-open-settings-${habitId}`}
                    >
                      <Text style={s.settingsText}>Open Settings</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : null}

              <TouchableOpacity
                style={[s.saveBtn, { opacity: !valid || busy || !userId ? 0.5 : 1 }]}
                onPress={() => { void handleSave(); }}
                disabled={!valid || busy || !userId}
                accessibilityRole="button"
                accessibilityLabel={reminder ? 'Update daily reminder' : 'Save daily reminder'}
                accessibilityState={{ disabled: !valid || busy || !userId, busy }}
                testID={`habit-reminder-save-${habitId}`}
              >
                {busy ? <ActivityIndicator color={colors.primaryForeground} /> : (
                  <Text style={s.saveText}>{reminder ? 'Update reminder' : 'Save reminder'}</Text>
                )}
              </TouchableOpacity>
              {reminder ? (
                <TouchableOpacity
                  style={[s.offBtn, { opacity: busy ? 0.5 : 1 }]}
                  onPress={() => { void handleTurnOff(); }}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel="Turn off daily reminder"
                  testID={`habit-reminder-off-${habitId}`}
                >
                  <Text style={s.offText}>Turn off reminder</Text>
                </TouchableOpacity>
              ) : null}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
