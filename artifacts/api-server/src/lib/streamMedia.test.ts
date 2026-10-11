import { Writable } from "node:stream";
import { describe, expect, it, vi } from "vitest";
import { pipeMediaBody } from "./streamMedia";

describe("media stream lifecycle", () => {
  it("delivers the complete body", async () => {
    const chunks: Buffer[] = [];
    const destination = new Writable({ write(chunk, _encoding, done) { chunks.push(chunk); done(); } });
    const response = new Response("audio-data");
    await pipeMediaBody(response.body!, destination);
    expect(Buffer.concat(chunks).toString()).toBe("audio-data");
  });

  it("observes upstream errors instead of emitting an unhandled stream error", async () => {
    const body = new ReadableStream<Uint8Array>({ start(controller) { controller.error(new Error("upstream failed")); } });
    const destination = new Writable({ write(_chunk, _encoding, done) { done(); } });
    await expect(pipeMediaBody(body, destination)).rejects.toThrow("upstream failed");
    expect(destination.destroyed).toBe(true);
  });

  it("cancels the source when the viewer disconnects", async () => {
    const cancel = vi.fn();
    const body = new ReadableStream<Uint8Array>({
      pull(controller) { controller.enqueue(new Uint8Array([1, 2, 3])); }, cancel,
    });
    const destination = new Writable({ write(_chunk, _encoding, done) { done(new Error("viewer disconnected")); } });
    await expect(pipeMediaBody(body, destination)).rejects.toThrow("viewer disconnected");
    expect(cancel).toHaveBeenCalledTimes(1);
  });
});
