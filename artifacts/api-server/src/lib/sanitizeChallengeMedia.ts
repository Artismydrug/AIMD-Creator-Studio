import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

type SanitizedMedia = {
  buffer: Buffer;
  contentType: string;
};

const MEDIA_FORMATS: Record<
  string,
  {
    inputExtension: string;
    outputExtension: string;
    outputContentType: string;
    kind: "image" | "video";
    codec?: string;
    qualityArgs?: string[];
  }
> = {
  "image/jpeg": {
    inputExtension: "jpg",
    outputExtension: "jpg",
    outputContentType: "image/jpeg",
    kind: "image",
    codec: "mjpeg",
    qualityArgs: ["-q:v", "2"],
  },
  "image/jpg": {
    inputExtension: "jpg",
    outputExtension: "jpg",
    outputContentType: "image/jpeg",
    kind: "image",
    codec: "mjpeg",
    qualityArgs: ["-q:v", "2"],
  },
  "image/png": {
    inputExtension: "png",
    outputExtension: "png",
    outputContentType: "image/png",
    kind: "image",
    codec: "png",
  },
  "image/webp": {
    inputExtension: "webp",
    outputExtension: "webp",
    outputContentType: "image/webp",
    kind: "image",
    codec: "libwebp",
    qualityArgs: ["-quality", "90"],
  },
  "image/gif": {
    inputExtension: "gif",
    outputExtension: "gif",
    outputContentType: "image/gif",
    kind: "image",
    codec: "gif",
  },
  "image/heic": {
    inputExtension: "heic",
    outputExtension: "jpg",
    outputContentType: "image/jpeg",
    kind: "image",
    codec: "mjpeg",
    qualityArgs: ["-q:v", "2"],
  },
  "image/heif": {
    inputExtension: "heif",
    outputExtension: "jpg",
    outputContentType: "image/jpeg",
    kind: "image",
    codec: "mjpeg",
    qualityArgs: ["-q:v", "2"],
  },
  "video/mp4": {
    inputExtension: "mp4",
    outputExtension: "mp4",
    outputContentType: "video/mp4",
    kind: "video",
  },
  "video/quicktime": {
    inputExtension: "mov",
    outputExtension: "mp4",
    outputContentType: "video/mp4",
    kind: "video",
  },
  "video/webm": {
    inputExtension: "webm",
    outputExtension: "webm",
    outputContentType: "video/webm",
    kind: "video",
  },
};

/**
 * Rewrites challenge media before it becomes public. ffmpeg decodes and
 * re-encodes images, and remuxes videos without global, stream, chapter, data,
 * or subtitle metadata. The caller hashes the resulting public bytes so the
 * evidence record binds to the exact rendition that is stored and served.
 */
export async function sanitizeChallengeMedia(
  input: Buffer,
  contentType: string,
): Promise<SanitizedMedia> {
  const format = MEDIA_FORMATS[contentType];
  if (!format) {
    throw new Error("Unsupported challenge media format");
  }

  const workingDir = await mkdtemp(path.join(tmpdir(), "aimd-proof-"));
  const inputPath = path.join(
    workingDir,
    `source.${format.inputExtension}`,
  );
  const outputPath = path.join(
    workingDir,
    `public.${format.outputExtension}`,
  );

  try {
    await writeFile(inputPath, input);

    const commonArgs = [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-i",
      inputPath,
      "-map_metadata",
      "-1",
      "-map_metadata:s",
      "-1",
      "-map_chapters",
      "-1",
    ];

    const mediaArgs =
      format.kind === "image"
        ? [
            "-an",
            "-sn",
            "-dn",
            ...(contentType === "image/gif" ? [] : ["-frames:v", "1"]),
            "-c:v",
            format.codec!,
            ...(format.qualityArgs ?? []),
          ]
        : [
            "-map",
            "0:v:0",
            "-map",
            "0:a?",
            "-sn",
            "-dn",
            "-c",
            "copy",
            ...(format.outputContentType === "video/mp4"
              ? ["-movflags", "+faststart"]
              : []),
          ];

    await execFileAsync("ffmpeg", [...commonArgs, ...mediaArgs, outputPath], {
      timeout: 60_000,
      maxBuffer: 1024 * 1024,
    });

    const sanitized = await readFile(outputPath);
    if (sanitized.length === 0) {
      throw new Error("Sanitized challenge media is empty");
    }

    return {
      buffer: sanitized,
      contentType: format.outputContentType,
    };
  } finally {
    await rm(workingDir, { recursive: true, force: true }).catch(() => {});
  }
}