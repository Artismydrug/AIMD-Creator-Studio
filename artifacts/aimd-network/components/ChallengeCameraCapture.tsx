import React, { useMemo, useRef, useState } from 'react';
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
import {
  ChallengeCameraFacing,
  ChallengeMediaType,
  ChallengeProofAsset,
  fromNativeCameraCapture,
} from '@/lib/challengeProof';

let CameraView: any = null;
let useCameraPermissions: any = null;
let useMicrophonePermissions: any = null;
if (Platform.OS !== 'web') {
  try {
    const camera = require('expo-camera');
    CameraView = camera.CameraView;
    useCameraPermissions = camera.useCameraPermissions;
    useMicrophonePermissions = camera.useMicrophonePermissions;
  } catch {
    // The unsupported state below explains how to continue.
  }
}

type Props = {
  visible: boolean;
  onClose: () => void;
  onCaptured: (asset: ChallengeProofAsset) => void;
};

export default function ChallengeCameraCapture({
  visible,
  onClose,
  onCaptured,
}: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<any>(null);
  const [mediaType, setMediaType] = useState<ChallengeMediaType>('image');
  const [facing, setFacing] = useState<ChallengeCameraFacing>('back');
  const [capturing, setCapturing] = useState(false);
  const [recording, setRecording] = useState(false);

  const cameraPermissionHook = useCameraPermissions
    ? useCameraPermissions()
    : [{ granted: false, canAskAgain: false }, async () => ({ granted: false })];
  const microphonePermissionHook = useMicrophonePermissions
    ? useMicrophonePermissions()
    : [{ granted: false, canAskAgain: false }, async () => ({ granted: false })];
  const [cameraPermission, requestCameraPermission] = cameraPermissionHook;
  const [microphonePermission, requestMicrophonePermission] =
    microphonePermissionHook;

  const capture = async () => {
    if (!cameraRef.current) return;
    if (recording) {
      cameraRef.current.stopRecording();
      return;
    }
    if (capturing) return;
    setCapturing(true);
    try {
      if (mediaType === 'image') {
        const result = await cameraRef.current.takePictureAsync({
          quality: 0.88,
          exif: true,
        });
        if (result?.uri) {
          onCaptured(fromNativeCameraCapture(result, 'image', facing));
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onClose();
        }
      } else {
        if (!microphonePermission?.granted) {
          const microphone = await requestMicrophonePermission();
          if (!microphone?.granted) {
            Alert.alert(
              'Microphone permission needed',
              'Allow microphone access to record a process video with sound.',
              microphone?.canAskAgain === false
                ? [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Open settings', onPress: () => Linking.openSettings() },
                  ]
                : undefined,
            );
            return;
          }
        }
        setRecording(true);
        setCapturing(false);
        const result = await cameraRef.current.recordAsync({ maxDuration: 60 });
        if (result?.uri) {
          onCaptured(fromNativeCameraCapture(result, 'video', facing));
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onClose();
        }
      }
    } catch {
      Alert.alert(
        'Capture failed',
        'The camera could not save this proof. Please try again.',
      );
    } finally {
      setCapturing(false);
      setRecording(false);
    }
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, backgroundColor: colors.background },
        camera: { flex: 1 },
        topBar: {
          position: 'absolute',
          top: insets.top,
          left: 0,
          right: 0,
          paddingHorizontal: 16,
          paddingVertical: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'rgba(0,0,0,0.58)',
        },
        title: {
          color: colors.foreground,
          fontFamily: 'DMSans_600SemiBold',
          fontSize: 16,
        },
        controls: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: insets.bottom + 20,
          alignItems: 'center',
          gap: 18,
        },
        modeRow: {
          flexDirection: 'row',
          backgroundColor: 'rgba(0,0,0,0.64)',
          padding: 4,
        },
        modeButton: { paddingHorizontal: 18, paddingVertical: 9 },
        modeButtonActive: { backgroundColor: colors.primary },
        modeText: {
          color: colors.foreground,
          fontFamily: 'DMSans_600SemiBold',
          fontSize: 13,
        },
        modeTextActive: { color: colors.primaryForeground },
        actionRow: {
          width: '100%',
          paddingHorizontal: 30,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        captureButton: {
          width: 78,
          height: 78,
          borderRadius: 39,
          borderWidth: 5,
          borderColor: colors.foreground,
          alignItems: 'center',
          justifyContent: 'center',
        },
        captureInner: {
          width: 58,
          height: 58,
          borderRadius: 29,
          backgroundColor: colors.primary,
        },
        recordingInner: {
          width: 34,
          height: 34,
          borderRadius: 4,
          backgroundColor: colors.destructive,
        },
        iconButton: {
          width: 46,
          height: 46,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.64)',
        },
        message: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 30,
          gap: 14,
        },
        messageTitle: {
          color: colors.foreground,
          fontFamily: 'DMSans_700Bold',
          fontSize: 21,
          textAlign: 'center',
        },
        messageText: {
          color: colors.mutedForeground,
          fontFamily: 'DMSans_400Regular',
          fontSize: 14,
          textAlign: 'center',
        },
        permissionButton: {
          backgroundColor: colors.primary,
          paddingHorizontal: 20,
          paddingVertical: 12,
        },
        permissionText: {
          color: colors.primaryForeground,
          fontFamily: 'DMSans_600SemiBold',
          fontSize: 14,
        },
      }),
    [colors, insets],
  );

  const close = () => {
    if (recording) cameraRef.current?.stopRecording();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <View style={styles.root}>
        {!CameraView || Platform.OS === 'web' ? (
          <View style={styles.message}>
            <Feather name="camera-off" size={34} color={colors.primary} />
            <Text style={styles.messageTitle}>Native camera required</Text>
            <Text style={styles.messageText}>
              Proof-of-work entries must be captured in the AIMD mobile app on
              iOS or Android.
            </Text>
            <TouchableOpacity style={styles.permissionButton} onPress={close}>
              <Text style={styles.permissionText}>Close</Text>
            </TouchableOpacity>
          </View>
        ) : !cameraPermission?.granted ? (
          <View style={styles.message}>
            <Feather name="camera" size={34} color={colors.primary} />
            <Text style={styles.messageTitle}>Camera permission needed</Text>
            <Text style={styles.messageText}>
              AIMD records an in-app capture timestamp for instructor review.
              This evidence remains pending until a reviewer approves it.
            </Text>
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={() =>
                cameraPermission?.canAskAgain === false
                  ? Linking.openSettings()
                  : requestCameraPermission()
              }
            >
              <Text style={styles.permissionText}>
                {cameraPermission?.canAskAgain === false
                  ? 'Open settings'
                  : 'Allow camera'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={close}>
              <Text style={styles.messageText}>Not now</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing={facing}
              mode={mediaType === 'image' ? 'picture' : 'video'}
            />
            <View style={styles.topBar}>
              <TouchableOpacity onPress={close} accessibilityLabel="Close camera">
                <Feather name="x" size={24} color={colors.foreground} />
              </TouchableOpacity>
              <Text style={styles.title}>Capture final proof</Text>
              <View style={{ width: 24 }} />
            </View>
            <View style={styles.controls}>
              <View style={styles.modeRow}>
                {(['image', 'video'] as const).map((mode) => (
                  <TouchableOpacity
                    key={mode}
                    style={[
                      styles.modeButton,
                      mediaType === mode && styles.modeButtonActive,
                    ]}
                    onPress={() => setMediaType(mode)}
                    disabled={recording}
                  >
                    <Text
                      style={[
                        styles.modeText,
                        mediaType === mode && styles.modeTextActive,
                      ]}
                    >
                      {mode === 'image' ? 'PHOTO' : 'VIDEO'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() =>
                    setFacing((current) =>
                      current === 'back' ? 'front' : 'back',
                    )
                  }
                  disabled={recording}
                  accessibilityLabel="Flip camera"
                >
                  <Feather
                    name="refresh-cw"
                    size={21}
                    color={colors.foreground}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.captureButton}
                  onPress={capture}
                  accessibilityLabel={
                    mediaType === 'image'
                      ? 'Capture proof photo'
                      : recording
                        ? 'Stop proof video'
                        : 'Record proof video'
                  }
                >
                  {capturing && !recording ? (
                    <ActivityIndicator color={colors.foreground} />
                  ) : (
                    <View
                      style={
                        recording
                          ? styles.recordingInner
                          : styles.captureInner
                      }
                    />
                  )}
                </TouchableOpacity>
                <View style={{ width: 46 }} />
              </View>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}