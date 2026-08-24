import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Modal,
  Alert,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useListEvents, useCheckInToEvent } from '@workspace/api-client-react';
import EventCard from '@/components/EventCard';

// Camera is a native device feature — import only on native platforms
let CameraView: any = null;
let useCameraPermissions: any = null;
if (Platform.OS !== 'web') {
  try {
    const cam = require('expo-camera');
    CameraView = cam.CameraView;
    useCameraPermissions = cam.useCameraPermissions;
  } catch {
    // expo-camera not available
  }
}

type CheckInState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; eventTitle: string; message: string; alreadyCheckedIn: boolean }
  | { status: 'error'; message: string };

function QRScanner({ onClose }: { onClose: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [scanned, setScanned] = useState(false);
  const [checkIn, setCheckIn] = useState<CheckInState>({ status: 'idle' });

  const permHook = useCameraPermissions ? useCameraPermissions() : [{ granted: false, canAskAgain: false }, () => {}];
  const [permission, requestPermission] = permHook;

  const checkInMutation = useCheckInToEvent({
    mutation: {
      onSuccess: (data) => {
        if (data.success) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setCheckIn({
            status: 'success',
            eventTitle: data.eventTitle ?? '',
            message: data.message,
            alreadyCheckedIn: data.alreadyCheckedIn ?? false,
          });
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setCheckIn({ status: 'error', message: data.message });
        }
      },
      onError: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setCheckIn({ status: 'error', message: 'Check-in failed — check your connection' });
      },
    },
  });

  const handleBarcode = useCallback(({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    setCheckIn({ status: 'loading' });
    checkInMutation.mutate({ data: { qrData: data } });
  }, [scanned]);

  const s = useMemo(() => StyleSheet.create({
    overlay: { flex: 1, backgroundColor: '#000' },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: insets.top + 12,
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    headerTitle: {
      fontFamily: 'DMSans_600SemiBold',
      fontSize: 18,
      color: '#f2f2f2',
    },
    camera: { flex: 1 },
    frame: {
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    frameBox: {
      width: 240,
      height: 240,
      borderWidth: 2,
      borderColor: colors.primary,
    },
    hint: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 14,
      color: '#a6a6a6',
      marginTop: 16,
      textAlign: 'center',
    },
    resultBox: {
      position: 'absolute',
      bottom: insets.bottom + 24,
      left: 24,
      right: 24,
      backgroundColor: colors.card,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    resultTitle: {
      fontFamily: 'DMSans_600SemiBold',
      fontSize: 14,
      color: colors.primary,
      marginBottom: 6,
    },
    resultText: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 14,
      color: colors.foreground,
      marginBottom: 12,
    },
    scanAgainBtn: {
      alignItems: 'center',
      padding: 10,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    scanAgainText: {
      fontFamily: 'DMSans_600SemiBold',
      fontSize: 14,
      color: colors.primary,
    },
    permBox: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      paddingHorizontal: 32,
    },
    permTitle: {
      fontFamily: 'DMSans_600SemiBold',
      fontSize: 18,
      color: '#f2f2f2',
      textAlign: 'center',
    },
    permText: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 14,
      color: '#a6a6a6',
      textAlign: 'center',
    },
    permBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
    },
    permBtnText: {
      fontFamily: 'DMSans_600SemiBold',
      fontSize: 15,
      color: colors.primaryForeground,
    },
  }), [colors, insets]);

  if (!CameraView) {
    return (
      <View style={[s.overlay, { alignItems: 'center', justifyContent: 'center' }]}>
        <View style={s.header}>
          <TouchableOpacity onPress={onClose}>
            <Feather name="x" size={24} color="#f2f2f2" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Check In</Text>
          <View style={{ width: 24 }} />
        </View>
        <Text style={s.permTitle}>Camera not available on web</Text>
        <Text style={s.permText}>Use the Expo Go app on your phone to scan QR codes</Text>
      </View>
    );
  }

  if (!permission) return <View style={s.overlay} />;

  if (!permission.granted) {
    return (
      <View style={s.overlay}>
        <View style={s.header}>
          <TouchableOpacity onPress={onClose}>
            <Feather name="x" size={24} color="#f2f2f2" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Check In</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={s.permBox}>
          <Feather name="camera" size={56} color="#a6a6a6" />
          <Text style={s.permTitle}>Camera Access Needed</Text>
          <Text style={s.permText}>Allow camera access to scan event QR codes and check in</Text>
          {permission.canAskAgain ? (
            <TouchableOpacity style={s.permBtn} onPress={requestPermission}>
              <Text style={s.permBtnText}>Enable Camera</Text>
            </TouchableOpacity>
          ) : (
            <Text style={[s.permText, { color: '#f04040' }]}>
              Camera access was denied. Enable it in Settings.
            </Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={s.overlay}>
      <View style={s.header}>
        <TouchableOpacity onPress={onClose}>
          <Feather name="x" size={24} color="#f2f2f2" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Scan to Check In</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={{ flex: 1 }}>
        <CameraView
          style={s.camera}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={scanned ? undefined : handleBarcode}
        />
        <View style={s.frame} pointerEvents="none">
          <View style={s.frameBox} />
          <Text style={s.hint}>Point at an event QR code</Text>
        </View>
        {checkIn.status !== 'idle' && (
          <View style={[s.resultBox, checkIn.status === 'error' && { borderColor: colors.destructive }]}>
            {checkIn.status === 'loading' ? (
              <ActivityIndicator color={colors.primary} />
            ) : checkIn.status === 'success' ? (
              <>
                <Text style={s.resultTitle}>
                  {checkIn.alreadyCheckedIn ? 'Already Checked In ✓' : 'Check-In Confirmed ✓'}
                </Text>
                <Text style={s.resultText}>{checkIn.eventTitle}</Text>
                <TouchableOpacity
                  style={s.scanAgainBtn}
                  onPress={() => { setScanned(false); setCheckIn({ status: 'idle' }); }}
                >
                  <Text style={s.scanAgainText}>Scan Another</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={[s.resultTitle, { color: colors.destructive }]}>Check-In Failed</Text>
                <Text style={s.resultText}>{checkIn.message}</Text>
                <TouchableOpacity
                  style={[s.scanAgainBtn, { borderColor: colors.destructive }]}
                  onPress={() => { setScanned(false); setCheckIn({ status: 'idle' }); }}
                >
                  <Text style={[s.scanAgainText, { color: colors.destructive }]}>Try Again</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

export default function EventsScreen({ embedded = false }: { embedded?: boolean }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [scanning, setScanning] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { data: events, isLoading, isError, refetch } = useListEvents({ upcoming: true } as any);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

    const topPad = embedded ? 16 : Platform.OS === 'web' ? 67 : insets.top + 8;

  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingTop: topPad,
      paddingHorizontal: 16,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerTitle: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 22,
      color: colors.foreground,
    },
    scanBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    scanBtnText: {
      fontFamily: 'DMSans_600SemiBold',
      fontSize: 13,
      color: colors.primary,
    },
    listContent: {
      paddingTop: 12,
      paddingBottom: Platform.OS === 'web' ? 100 : 90,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 80,
      gap: 12,
    },
    emptyTitle: {
      fontFamily: 'DMSans_600SemiBold',
      fontSize: 16,
      color: colors.foreground,
    },
    emptyText: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 14,
      color: colors.mutedForeground,
    },
    retryBtn: {
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 20,
      paddingVertical: 8,
    },
    retryText: {
      fontFamily: 'DMSans_500Medium',
      fontSize: 14,
      color: colors.foreground,
    },
    sectionHeader: {
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    sectionTitle: {
      fontFamily: 'DMSans_600SemiBold',
      fontSize: 12,
      color: colors.mutedForeground,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
  }), [colors, topPad]);

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Events</Text>
        <TouchableOpacity
          style={s.scanBtn}
          onPress={() => {
            setScanning(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }}
          testID="scan-qr-button"
        >
          <Feather name="camera" size={14} color={colors.primary} />
          <Text style={s.scanBtnText}>Check In</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={s.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : isError ? (
        <View style={s.centered}>
          <Feather name="wifi-off" size={40} color={colors.mutedForeground} />
          <Text style={s.emptyTitle}>Failed to load events</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => refetch()}>
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <EventCard event={item} onRsvpChange={refetch} />}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            events && events.length > 0 ? (
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>Upcoming Events</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={s.centered}>
              <Feather name="calendar" size={48} color={colors.muted} />
              <Text style={s.emptyTitle}>No events scheduled</Text>
              <Text style={s.emptyText}>Check back soon for pop-ups and workshops</Text>
            </View>
          }
        />
      )}

      <Modal visible={scanning} animationType="slide">
        <QRScanner onClose={() => setScanning(false)} />
      </Modal>
    </View>
  );
}
