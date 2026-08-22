import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { sanitizeChallengeMedia } from "./sanitizeChallengeMedia";

const execFileAsync = promisify(execFile);

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function addPngTextChunk(png: Buffer, keyword: string, value: string): Buffer {
  const type = Buffer.from("tEXt");
  const data = Buffer.from(`${keyword}\0${value}`);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([type, data])));
  const chunk = Buffer.concat([length, type, data, checksum]);

  const iendTypeOffset = png.indexOf(Buffer.from("IEND"));
  if (iendTypeOffset < 4) throw new Error("Invalid PNG fixture");
  const iendChunkOffset = iendTypeOffset - 4;
  return Buffer.concat([
    png.subarray(0, iendChunkOffset),
    chunk,
    png.subarray(iendChunkOffset),
  ]);
}

describe("sanitizeChallengeMedia", () => {
  it("removes embedded PNG text metadata from the public rendition", async () => {
    const basePng = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    );
    const privateMarker = "37.7749,-122.4194";
    const source = addPngTextChunk(basePng, "GPSLocation", privateMarker);
    expect(source.includes(Buffer.from(privateMarker))).toBe(true);

    const sanitized = await sanitizeChallengeMedia(source, "image/png");
    const publicHash = createHash("sha256")
      .update(sanitized.buffer)
      .digest("hex");

    expect(sanitized.contentType).toBe("image/png");
    expect(publicHash).toHaveLength(64);
    expect(sanitized.buffer.subarray(1, 4).toString()).toBe("PNG");
    expect(sanitized.buffer.includes(Buffer.from(privateMarker))).toBe(false);
    expect(sanitized.buffer.includes(Buffer.from("GPSLocation"))).toBe(false);
  });

  it("removes container metadata from a public proof video", async () => {
    const workingDir = await mkdtemp(path.join(tmpdir(), "aimd-video-test-"));
    const inputPath = path.join(workingDir, "source.mp4");
    const privateMarker = "PRIVATE_AIMD_LOCATION_MARKER";

    try {
      await execFileAsync("ffmpeg", [
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-f",
        "lavfi",
        "-i",
        "color=c=red:s=16x16:d=0.2",
        "-metadata",
        `comment=${privateMarker}`,
        "-c:v",
        "mpeg4",
        "-t",
        "0.2",
        inputPath,
      ]);

      const source = await readFile(inputPath);
      expect(source.includes(Buffer.from(privateMarker))).toBe(true);

      const sanitized = await sanitizeChallengeMedia(source, "video/mp4");

      expect(sanitized.contentType).toBe("video/mp4");
      expect(sanitized.buffer.includes(Buffer.from(privateMarker))).toBe(false);
    } finally {
      await rm(workingDir, { recursive: true, force: true });
    }
  });
});