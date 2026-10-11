import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { Writable } from "node:stream";

/** pipeline observes both upstream errors and client disconnects, and cancels
 * the source instead of leaving an unhandled 'error' event or wasted download. */
export async function pipeMediaBody(
  body: ReadableStream<Uint8Array>,
  destination: Writable,
): Promise<void> {
  await pipeline(Readable.fromWeb(body as import("node:stream/web").ReadableStream<Uint8Array>), destination);
}
