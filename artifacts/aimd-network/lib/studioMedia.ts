import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { customFetch, getBaseUrl } from '@workspace/api-client-react';

export const STUDIO_PORTRAIT_RATIO = 9 / 16;
export const STUDIO_PHOTO_FORMATS = [
  { id: 'portrait', label: 'Portrait 4:5', ratio: 4 / 5 },
  { id: 'square', label: 'Square 1:1', ratio: 1 },
  { id: 'landscape', label: 'Wide 1.91:1', ratio: 1080 / 566 },
] as const;
export type StudioPhotoFormat = typeof STUDIO_PHOTO_FORMATS[number]['id'];

export function studioPhotoFormat(format?: StudioPhotoFormat) {
  return STUDIO_PHOTO_FORMATS.find(option => option.id === format) ?? STUDIO_PHOTO_FORMATS[0];
}

/** Recover framing from the saved derivative; legacy photos use the closest supported format. */
export function studioPhotoRatio(width: number, height: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return 4 / 5;
  const ratio = width / height;
  return STUDIO_PHOTO_FORMATS.reduce((best, option) =>
    Math.abs(Math.log(option.ratio / ratio)) < Math.abs(Math.log(best.ratio / ratio)) ? option : best,
  ).ratio;
}

export function photoCrop(width: number, height: number, format?: StudioPhotoFormat) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
    throw new Error('Could not read this photo’s dimensions. Please select the photo again.');
  }
  const ratio = studioPhotoFormat(format).ratio;
  const cropWidth = Math.min(Math.floor(width), Math.max(1, Math.round(height * ratio)));
  const cropHeight = Math.min(Math.floor(height), Math.max(1, Math.round(width / ratio)));
  return {
    originX: Math.floor((width - cropWidth) / 2),
    originY: Math.floor((height - cropHeight) / 2),
    width: cropWidth,
    height: cropHeight,
  };
}

export function fitMediaFrame(width: number, height: number, ratio: number) {
  const safeWidth = Number.isFinite(width) ? Math.max(1, width) : 1;
  const safeHeight = Number.isFinite(height) ? Math.max(1, height) : 1;
  const safeRatio = Number.isFinite(ratio) && ratio > 0 ? ratio : 4 / 5;
  const frameHeight = Math.min(safeHeight, safeWidth / safeRatio);
  return { width: frameHeight * safeRatio, height: frameHeight };
}
export const MAX_STUDIO_VIDEO_BYTES = 50 * 1024 * 1024;
export const MAX_STUDIO_AUDIO_BYTES = 25 * 1024 * 1024;
const MAX_STUDIO_IMAGE_BYTES = 20 * 1024 * 1024;
const UPLOAD_TIMEOUT_MS = 180_000;
const UPLOAD_PROGRESS_INTERVAL_MS = 100;

export type StudioMedia = {
  uri: string;
  contentType: string;
  fileName: string;
  fileSize?: number;
  width?: number;
  height?: number;
  duration?: number | null;
  mediaType: 'image' | 'video' | 'audio';
  photoFormat?: StudioPhotoFormat;
};

export type StudioUploadStatus = {
  phase: 'preparing' | 'uploading' | 'processing';
  /** Actual transferred fraction; null when the transport cannot measure it. */
  progress: number | null;
};

/** Fit a real 9:16 frame inside the available pager, never beneath its footer. */
export function portraitFrame(width: number, height: number) {
  return fitMediaFrame(width, height, STUDIO_PORTRAIT_RATIO);
}

/** Downsize without upscaling. Cropped feed formats fit inside this envelope. */
export function optimizedImageSize(width: number, height: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }
  const scale = Math.min(1, 1080 / width, 1920 / height);
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export function validateStudioMediaSize(type: StudioMedia['mediaType'], size: number) {
  const max = type === 'video' ? MAX_STUDIO_VIDEO_BYTES : type === 'audio' ? MAX_STUDIO_AUDIO_BYTES : MAX_STUDIO_IMAGE_BYTES;
  if (!Number.isFinite(size) || size <= 0) throw new Error('This file is empty or cannot be read.');
  if (size > max) throw new Error(`${type === 'video' ? 'Video' : type === 'audio' ? 'Audio' : 'Photo'} must be ${max / 1024 / 1024} MB or smaller.`);
}

/**
 * No upload until Confirm & Post. Native transfer reads the file outside JS,
 * avoiding a full ArrayBuffer copy of every video. No automatic write retries.
 */
export async function uploadStudioMedia(
  media: StudioMedia,
  getToken: () => Promise<string | null>,
  onStatus: (status: StudioUploadStatus) => void,
): Promise<string> {
  let uploadUri = media.uri;
  let contentType = media.contentType;
  let temporaryUri: string | null = null;
  let task: ReturnType<typeof FileSystem.createUploadTask> | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let finished = false;
  let cancelled = false;
  const cancelUpload = () => {
    if (task) void task.cancelAsync().catch(() => undefined);
  };
  onStatus({ phase: 'preparing', progress: null });

  const work = async () => {
    let preparedWebPhoto: Blob | undefined;
    if (media.mediaType === 'image' && Platform.OS === 'web') {
      const { prepareWebStudioPhoto } = await import('./prepareWebStudioPhoto');
      preparedWebPhoto = await prepareWebStudioPhoto(
        media.uri,
        (width, height) => photoCrop(width, height, media.photoFormat),
        optimizedImageSize,
      );
      contentType = 'image/png';
    } else if (media.mediaType === 'image') {
      const { manipulateAsync, SaveFormat } = await import('expo-image-manipulator');
      const sourceContentType = media.contentType.split(';')[0].trim().toLowerCase();
      const preserveAlpha = sourceContentType !== 'image/jpeg' && sourceContentType !== 'image/jpg' ||
        /\.png(?:[?#]|$)/i.test(media.fileName) ||
        /\.png(?:[?#]|$)/i.test(media.uri);
      const outputContentType = preserveAlpha ? 'image/png' : 'image/jpeg';
      const crop = photoCrop(media.width ?? 0, media.height ?? 0, media.photoFormat);
      const size = optimizedImageSize(crop.width, crop.height);
      const actions: import('expo-image-manipulator').Action[] = [{ crop }];
      if (size) actions.push({ resize: size });
      const result = await manipulateAsync(media.uri, actions, {
        compress: preserveAlpha ? 1 : 0.78,
        format: preserveAlpha ? SaveFormat.PNG : SaveFormat.JPEG,
      });
      // Never delete the creator's original file.
      if (result.uri !== media.uri) temporaryUri = result.uri;
      uploadUri = result.uri;
      contentType = outputContentType;
    }
    if (cancelled) throw new Error('Upload timed out. Your draft is still here.');

    if (Platform.OS === 'web') {
      const blob = preparedWebPhoto ?? await (async () => {
        const local = await fetch(uploadUri);
        if (!local.ok) throw new Error('Could not read the selected media.');
        return local.blob();
      })();
      validateStudioMediaSize(media.mediaType, blob.size);
      if (cancelled) throw new Error('Upload timed out. Your draft is still here.');
      onStatus({ phase: 'uploading', progress: null });
      const result = await customFetch<{ objectPath: string }>('/api/storage/uploads', {
        method: 'POST',
        headers: { 'Content-Type': contentType, 'X-AIMD-UPLOAD-PURPOSE': 'studio_post' },
        body: blob,
      });
      return requireObjectPath(result);
    }

    const info = await FileSystem.getInfoAsync(uploadUri);
    if (!info.exists || info.isDirectory) throw new Error('The selected file is no longer available. Choose it again.');
    validateStudioMediaSize(media.mediaType, info.size);
    const token = await getToken();
    if (cancelled) throw new Error('Upload timed out. Your draft is still here.');
    const base = getBaseUrl();
    if (!token) throw new Error('Your session needs to reconnect. Please sign in and try again.');
    if (!base) throw new Error('The upload service is not configured.');
    onStatus({ phase: 'uploading', progress: 0 });
    let lastReportedProgress = -1;
    let lastProgressUpdateAt = 0;
    task = FileSystem.createUploadTask(`${base}/api/storage/uploads`, uploadUri, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      sessionType: FileSystem.FileSystemSessionType.FOREGROUND,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': contentType,
        'X-AIMD-UPLOAD-PURPOSE': 'studio_post',
      },
    }, ({ totalBytesSent, totalBytesExpectedToSend }) => {
      if (cancelled || totalBytesExpectedToSend <= 0) return;
      const progress = Math.min(1, Math.max(0, totalBytesSent / totalBytesExpectedToSend));
      const now = Date.now();
      // Native transfers can emit many events per frame. Bound React updates,
      // but always report the first measured progress and transfer completion.
      if (progress <= lastReportedProgress ||
        (lastReportedProgress >= 0 && progress < 1 && now - lastProgressUpdateAt < UPLOAD_PROGRESS_INTERVAL_MS)) return;
      lastReportedProgress = progress;
      lastProgressUpdateAt = now;
      onStatus({ phase: progress >= 1 ? 'processing' : 'uploading', progress });
    });
    const result = await task.uploadAsync();
    if (!result) throw new Error('Upload was interrupted. Your draft is still here.');
    let response: { objectPath?: unknown; error?: unknown };
    try { response = JSON.parse(result.body); }
    catch { throw new Error('The upload service returned an unreadable response. Your draft is still here.'); }
    if (result.status < 200 || result.status >= 300) {
      throw new Error(typeof response.error === 'string' ? response.error : `Upload failed (${result.status}). Please try again.`);
    }
    return requireObjectPath(response);
  };

  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      cancelled = true;
      cancelUpload();
      reject(new Error('Upload timed out. Your draft is still here. Please try a smaller file or a stronger connection.'));
    }, UPLOAD_TIMEOUT_MS);
  });
  // A delayed native operation may finish after timeout. Clean its temporary
  // derivative only when it has actually stopped reading it.
  const operation = work().finally(async () => {
    finished = true;
    if (temporaryUri && Platform.OS !== 'web') {
      await FileSystem.deleteAsync(temporaryUri, { idempotent: true }).catch(() => undefined);
    }
  });
  try {
    return await Promise.race([operation, deadline]);
  } finally {
    if (timer) clearTimeout(timer);
    if (!finished) {
      cancelled = true;
      cancelUpload();
    }
  }
}

function requireObjectPath(response: { objectPath?: unknown }): string {
  if (typeof response.objectPath !== 'string' || !response.objectPath.startsWith('/objects/')) {
    throw new Error('The upload could not be confirmed. Your draft is still here.');
  }
  return response.objectPath;
}
