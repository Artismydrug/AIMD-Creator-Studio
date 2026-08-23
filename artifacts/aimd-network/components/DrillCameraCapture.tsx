/**
 * DrillCameraCapture
 *
 * Native live-video capture for assignment submissions.
 *
 * - Uses expo-camera CameraView.recordAsync with maxDuration 30 s
 * - After capture, shows expo-video preview with retake / use actions
 * - Shows countdown timer during recording
 * - Handles camera + microphone permission states (request / open settings)
 * - Disabled on web with an explanatory message
 * - Passes captured uri + durationSecs metadata to onCaptured
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

// Lazily require native modules so web doesn't crash
let CameraView: any = null;
let useCameraPermissions: any = null;
let useMicrophonePermissions: any = null;
let VideoView: any = null;
let useVideoPlayer: any = null;

if (Platform.OS !== 'web') {
  try {
    const cam = require('expo-camera');
    CameraView = cam.CameraView;
    useCameraPermissions = cam.useCameraPermissions;
    useMicrophonePermissions = cam.useMicrophonePermissions;
  } catch {
    // Handled in render path
  }
  try {
    const vid = require('expo-video');
    VideoView = vid.VideoView;
    useVideoPlayer = vid.useVideoPlayer;
  } catch {
    // Preview falls back to text summary
  }
}

const MAX_DURATION = 30; // seconds

export type DrillCaptureResult = {
  uri: string;
  contentType: string;
  fileName: string;
  durationSecs: number;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onCaptured: (result: DrillCaptureResult) => void;
};

// ----- Preview component (needs its own hooks scope) -----
function CapturePreview({
  uri,
  durationSecs,
  onRetake,
  onUse,
}: {
  uri: string;
  durationSecs: number;
  onRetake: () => void;
  onUse: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  // Build a stable player when VideoView is available
  const player = useVideoPlayer
    ? useVideoPlayer(uri, (p: any) => {
        p.loop = true;
        p.play();
      })
    : null;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, backgroundColor: '#000' },
        preview: { flex: 1 },
        noPreview: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
        },
        noPreviewText: {
          fontFamily: 'DMSans_600SemiBold',
          fontSize: 16,
          color: '#fff',
          textAlign: 'center',
        },
        noPreviewSub: {
          fontFamily: 'DMSans_400Regular',
          fontSize: 13,
          color: 'rgba(255,255,255,0.6)',
          textAlign: 'center',
          paddingHorizontal: 30,
        },
        bar: {
          paddingHorizontal: 20,
          paddingTop: 14,
          paddingBottom: Math.max(insets.bottom, 16) + 10,
          backgroundColor: 'rgba(0,0,0,0.82)',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        },
        retakeBtn: {
          flex: 1,
          paddingVertical: 14,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.3)',
          borderRadius: 10,
        },
        retakeText: {
          fontFamily: 'DMSans_700Bold',
          fontSize: 15,
          color: '#fff',
        },
        useBtn: {
          flex: 1,
          paddingVertical: 14,
          alignItems: 'center',
          backgroundColor: colors.primary,
          borderRadius: 10,
        },
        useText: {
          fontFamily: 'DMSans_700Bold',
          fontSize: 15,
          color: colors.primaryForeground,
        },
        meta: {
          fontFamily: 'DMSans_400Regular',
          fontSize: 12,
          color: 'rgba(255,255,255,0.55)',
          textAlign: 'center',
          paddingBottom: 8,
          backgroundColor: 'rgba(0,0,0,0.82)',
          paddingTop: 4,
        },
      }),
    [colors, insets],
  );

  return (
    <View style={styles.root} testID="drill-capture-preview">
      {VideoView && player ? (
        <VideoView
          player={player}
          style={styles.preview}
          contentFit="contain"
          nativeControls={false}
          testID="drill-capture-video-view"
        />
      ) : (
        <View style={styles.noPreview}>
          <Feather name="video" size={48} color={colors.primary} />
          <Text style={styles.noPreviewText}>Footage captured</Text>
          <Text style={styles.noPreviewSub}>
            Preview is not available on this device. Tap Use Footage to attach
            it to your submission.
          </Text>
        </View>
      )}
      <Text style={styles.meta}>{Math.round(durationSecs)}s recorded</Text>
      <View style={styles.bar}>
        <TouchableOpacity
          style={styles.retakeBtn}
          onPress={onRetake}
          testID="drill-capture-retake"
          accessibilityRole="button"
          accessibilityLabel="Retake footage"
        >
          <Text style={styles.retakeText}>Retake</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.useBtn}
          onPress={onUse}
          testID="drill-capture-use"
          accessibilityRole="button"
          accessibilityLabel="Use footage"
        >
          <Text style={styles.useText}>Use Footage</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ----- Main component -----
export default function DrillCameraCapture({ visible, onClose, onCaptured }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<any>(null);

  const [recording, setRecording] = useState(false);
  const [starting, setStarting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [capturedDuration, setCapturedDuration] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);

  // Permission hooks — always called unconditionally (hooks rules)
  const cameraHook = useCameraPermissions
    ? useCameraPermissions()
    : [{ granted: false, canAskAgain: false, status: 'undetermined' }, async () => {}];
  const micHook = useMicrophonePermissions
    ? useMicrophonePermissions()
    : [{ granted: false, canAskAgain: false, status: 'undetermined' }, async () => {}];
  const [cameraPermission, requestCamera] = cameraHook;
  const [micPermission, requestMic] = micHook;

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!visible) {
      stopTimer();
      setRecording(false);
      setStarting(false);
      setElapsed(0);
      setCapturedUri(null);
      setCapturedDuration(0);
      recordingStartedAtRef.current = null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  const startRecording = async () => {
    if (!cameraRef.current || starting || recording) return;

    // Ensure microphone permission
    if (!micPermission?.granted) {
      const result = await requestMic();
      if (!result?.granted) {
        Alert.alert(
          'Microphone access needed',
          'Allow Creator Studio by AIMD to record sound with assignment footage.',
          result?.canAskAgain === false
            ? [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Open Settings', onPress: () => Linking.openSettings() },
              ]
            : undefined,
        );
        return;
      }
    }

    setStarting(true);
    setElapsed(0);

    try {
      setStarting(false);
      setRecording(true);
      recordingStartedAtRef.current = Date.now();
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          if (prev + 1 >= MAX_DURATION) {
            // Auto-stop at limit
            cameraRef.current?.stopRecording();
            return prev + 1;
          }
          return prev + 1;
        });
      }, 1000);

      const result = await cameraRef.current.recordAsync({ maxDuration: MAX_DURATION });
      stopTimer();
      setRecording(false);

      if (result?.uri) {
        const startedAt = recordingStartedAtRef.current;
        const durationSecs = startedAt
          ? Math.min(MAX_DURATION, Math.max(1, (Date.now() - startedAt) / 1000))
          : MAX_DURATION;
        setCapturedUri(result.uri);
        setCapturedDuration(durationSecs);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      recordingStartedAtRef.current = null;
    } catch {
      stopTimer();
      setRecording(false);
      setStarting(false);
      recordingStartedAtRef.current = null;
      Alert.alert('Recording failed', 'The camera could not save footage. Please try again.');
    }
  };

  const stopRecording = () => {
    if (!recording) return;
    cameraRef.current?.stopRecording();
    stopTimer();
  };

  const handleRetake = () => {
    setCapturedUri(null);
    setCapturedDuration(0);
    setElapsed(0);
    recordingStartedAtRef.current = null;
  };

  const handleUse = () => {
    if (!capturedUri) return;
    onCaptured({
      uri: capturedUri,
      contentType: 'video/mp4',
      fileName: `assignment-${Date.now()}.mp4`,
      durationSecs: capturedDuration,
    });
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, backgroundColor: '#000' },
        camera: { flex: 1 },
        topBar: {
          position: 'absolute',
          top: insets.top,
          left: 0,
          right: 0,
          paddingHorizontal: 18,
          paddingVertical: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'rgba(0,0,0,0.55)',
        },
        topLabel: {
          fontFamily: 'DMSans_600SemiBold',
          fontSize: 15,
          color: '#fff',
        },
        countdown: {
          paddingHorizontal: 10,
          paddingVertical: 4,
          backgroundColor: recording ? colors.destructive : 'rgba(255,255,255,0.15)',
          borderRadius: 6,
        },
        countdownText: {
          fontFamily: 'DMSans_700Bold',
          fontSize: 14,
          color: '#fff',
          minWidth: 40,
          textAlign: 'center',
        },
        bottom: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: insets.bottom + 24,
          alignItems: 'center',
          gap: 16,
        },
        hint: {
          fontFamily: 'DMSans_400Regular',
          fontSize: 12,
          color: 'rgba(255,255,255,0.6)',
        },
        captureBtn: {
          width: 76,
          height: 76,
          borderRadius: 38,
          borderWidth: 4,
          borderColor: '#fff',
          alignItems: 'center',
          justifyContent: 'center',
        },
        captureBtnInner: {
          width: 54,
          height: 54,
          borderRadius: recording ? 8 : 27,
          backgroundColor: recording ? colors.destructive : colors.primary,
        },
        cancelBtn: {
          paddingHorizontal: 20,
          paddingVertical: 10,
        },
        cancelText: {
          fontFamily: 'DMSans_600SemiBold',
          fontSize: 14,
          color: 'rgba(255,255,255,0.7)',
        },
        message: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 30,
          gap: 16,
          backgroundColor: colors.background,
        },
        messageTitle: {
          fontFamily: 'DMSans_700Bold',
          fontSize: 20,
          color: colors.foreground,
          textAlign: 'center',
        },
        messageBody: {
          fontFamily: 'DMSans_400Regular',
          fontSize: 14,
          lineHeight: 20,
          color: colors.mutedForeground,
          textAlign: 'center',
        },
        actionBtn: {
          paddingHorizontal: 24,
          paddingVertical: 13,
          backgroundColor: colors.primary,
          borderRadius: 10,
        },
        actionBtnText: {
          fontFamily: 'DMSans_700Bold',
          fontSize: 15,
          color: colors.primaryForeground,
        },
        secondaryBtn: {
          paddingVertical: 10,
        },
        secondaryText: {
          fontFamily: 'DMSans_500Medium',
          fontSize: 14,
          color: colors.mutedForeground,
        },
      }),
    [colors, insets, recording],
  );

  const remaining = Math.max(0, MAX_DURATION - elapsed);
  const mins = String(Math.floor(remaining / 60)).padStart(2, '0');
  const secs = String(remaining % 60).padStart(2, '0');

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={() => {
        if (recording) stopRecording();
        onClose();
      }}
      testID="drill-camera-modal"
    >
      <View style={styles.root}>
        {/* Web not supported */}
        {Platform.OS === 'web' ? (
          <View style={styles.message} testID="drill-camera-web-unsupported">
            <Feather name="video-off" size={40} color={colors.primary} />
            <Text style={styles.messageTitle}>Live capture unavailable on web</Text>
            <Text style={styles.messageBody}>
              Assignment footage must be recorded live inside Creator Studio by
              AIMD on an iOS or Android device.
            </Text>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={onClose}
              testID="drill-camera-close-web"
            >
              <Text style={styles.actionBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        ) : !CameraView ? (
          /* Native camera module unavailable */
          <View style={styles.message} testID="drill-camera-unavailable">
            <Feather name="camera-off" size={40} color={colors.primary} />
            <Text style={styles.messageTitle}>Camera unavailable</Text>
            <Text style={styles.messageBody}>
              This device does not support live video capture.
            </Text>
            <TouchableOpacity style={styles.actionBtn} onPress={onClose}>
              <Text style={styles.actionBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        ) : !cameraPermission?.granted ? (
          /* Camera permission state */
          <View style={styles.message} testID="drill-camera-permission">
            <Feather name="camera" size={40} color={colors.primary} />
            <Text style={styles.messageTitle}>Camera access needed</Text>
            <Text style={styles.messageBody}>
              Creator Studio by AIMD records a live timestamp so your instructor
              can verify the footage is original.
            </Text>
            <TouchableOpacity
              style={styles.actionBtn}
              testID="drill-camera-grant-permission"
              onPress={() =>
                cameraPermission?.canAskAgain === false
                  ? Linking.openSettings()
                  : requestCamera()
              }
            >
              <Text style={styles.actionBtnText}>
                {cameraPermission?.canAskAgain === false
                  ? 'Open Settings'
                  : 'Allow Camera'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={onClose}
              testID="drill-camera-dismiss-permission"
            >
              <Text style={styles.secondaryText}>Not now</Text>
            </TouchableOpacity>
          </View>
        ) : capturedUri ? (
          /* Preview / review */
          <CapturePreview
            uri={capturedUri}
            durationSecs={capturedDuration}
            onRetake={handleRetake}
            onUse={handleUse}
          />
        ) : (
          /* Live viewfinder */
          <>
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing="back"
              mode="video"
              testID="drill-camera-viewfinder"
            />
            <View style={styles.topBar}>
              <TouchableOpacity
                onPress={() => {
                  if (recording) stopRecording();
                  onClose();
                }}
                testID="drill-camera-cancel"
                accessibilityLabel="Cancel recording"
              >
                <Feather name="x" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.topLabel}>Assignment Footage</Text>
              <View style={styles.countdown} testID="drill-camera-countdown">
                <Text style={styles.countdownText}>
                  {recording ? `${mins}:${secs}` : `0:${String(MAX_DURATION).padStart(2, '0')}`}
                </Text>
              </View>
            </View>
            <View style={styles.bottom}>
              {!recording && (
                <Text style={styles.hint}>
                  Max {MAX_DURATION}s — tap to start
                </Text>
              )}
              <TouchableOpacity
                style={styles.captureBtn}
                onPress={recording ? stopRecording : startRecording}
                testID={recording ? 'drill-camera-stop' : 'drill-camera-record'}
                accessibilityRole="button"
                accessibilityLabel={recording ? 'Stop recording' : 'Start recording'}
                disabled={starting}
              >
                {starting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <View style={styles.captureBtnInner} />
                )}
              </TouchableOpacity>
              {!recording && (
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={onClose}
                  testID="drill-camera-cancel-bottom"
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}
