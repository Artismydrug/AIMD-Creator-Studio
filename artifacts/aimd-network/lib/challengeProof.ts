import { Platform } from 'react-native';
import type { ImagePickerAsset } from 'expo-image-picker';
import { customFetch } from '@workspace/api-client-react';

export type ChallengeProofPurpose = 'challenge_final' | 'challenge_process';
export type ChallengeCaptureSource = 'native_camera' | 'media_library';
export type ChallengeMediaType = 'image' | 'video';
export type ChallengeCameraFacing = 'front' | 'back';

export type ChallengeProofAsset = {
  uri: string;
  fileName: string;
  contentType: string;
  mediaType: ChallengeMediaType;
  captureSource: ChallengeCaptureSource;
  capturedAt: string | null;
  exifTimestamp: string | null;
  devicePlatform: 'ios' | 'android';
  cameraFacing?: ChallengeCameraFacing;
  deviceMake?: string;
  deviceModel?: string;
  software?: string;
};

type ExifRecord = Record<string, unknown> | null | undefined;

function cleanExifText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim()
    ? value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 120)
    : undefined;
}

function firstExifText(exif: ExifRecord, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = cleanExifText(exif?.[key]);
    if (value) return value;
  }
  return undefined;
}

export function normalizeExifTimestamp(exif: ExifRecord): string | null {
  const raw = firstExifText(exif, [
    'DateTimeOriginal',
    'DateTimeDigitized',
    'DateTime',
    '{Exif}.DateTimeOriginal',
  ]);
  if (!raw) return null;

  const match = raw.match(
    /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/,
  );
  if (match) {
    const [, year, month, day, hour, minute, second] = match;
    const parsed = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    );
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function nativePlatform(): 'ios' | 'android' {
  return Platform.OS === 'ios' ? 'ios' : 'android';
}

function metadataFromExif(exif: ExifRecord) {
  return {
    exifTimestamp: normalizeExifTimestamp(exif),
    deviceMake: firstExifText(exif, ['Make', '{TIFF}.Make']),
    deviceModel: firstExifText(exif, ['Model', '{TIFF}.Model']),
    software: firstExifText(exif, ['Software', '{TIFF}.Software']),
  };
}

export function fromNativeCameraCapture(
  capture: { uri: string; exif?: Record<string, unknown> | null },
  mediaType: ChallengeMediaType,
  cameraFacing: ChallengeCameraFacing,
): ChallengeProofAsset {
  const metadata = metadataFromExif(capture.exif);
  const extension = mediaType === 'video' ? 'mp4' : 'jpg';
  return {
    uri: capture.uri,
    fileName: `aimd-proof-${Date.now()}.${extension}`,
    contentType: mediaType === 'video' ? 'video/mp4' : 'image/jpeg',
    mediaType,
    captureSource: 'native_camera',
    capturedAt: new Date().toISOString(),
    cameraFacing,
    devicePlatform: nativePlatform(),
    ...metadata,
  };
}

export function fromImagePickerAsset(
  asset: ImagePickerAsset,
): ChallengeProofAsset {
  const mediaType: ChallengeMediaType =
    asset.type === 'video' ? 'video' : 'image';
  const extension = mediaType === 'video' ? 'mp4' : 'jpg';
  const metadata = metadataFromExif(
    asset.exif as Record<string, unknown> | null | undefined,
  );

  return {
    uri: asset.uri,
    fileName: asset.fileName ?? `process-proof-${Date.now()}.${extension}`,
    contentType:
      asset.mimeType ??
      (mediaType === 'video' ? 'video/mp4' : 'image/jpeg'),
    mediaType,
    captureSource: 'media_library',
    capturedAt: metadata.exifTimestamp,
    devicePlatform: nativePlatform(),
    ...metadata,
  };
}

export async function uploadChallengeProof(
  asset: ChallengeProofAsset,
  purpose: ChallengeProofPurpose,
): Promise<{ objectPath: string; sha256: string }> {
  const fileResponse = await fetch(asset.uri);
  const arrayBuffer = await fileResponse.arrayBuffer();
  const headers: Record<string, string> = {
    'Content-Type': asset.contentType,
    'X-AIMD-Upload-Purpose': purpose,
    'X-AIMD-Capture-Source': asset.captureSource,
    'X-AIMD-Device-Platform': asset.devicePlatform,
  };

  if (asset.capturedAt) headers['X-AIMD-Captured-At'] = asset.capturedAt;
  if (asset.exifTimestamp) {
    headers['X-AIMD-Exif-Timestamp'] = asset.exifTimestamp;
  }
  if (asset.cameraFacing) {
    headers['X-AIMD-Camera-Facing'] = asset.cameraFacing;
  }
  if (asset.deviceMake) headers['X-AIMD-Device-Make'] = asset.deviceMake;
  if (asset.deviceModel) headers['X-AIMD-Device-Model'] = asset.deviceModel;
  if (asset.software) headers['X-AIMD-Device-Software'] = asset.software;

  return customFetch<{ objectPath: string; sha256: string }>(
    '/api/storage/uploads',
    {
      method: 'POST',
      headers,
      body: arrayBuffer,
    },
  );
}