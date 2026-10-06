import { describe, expect, it } from 'vitest';
import { parseMediaRange } from './mediaRange';

describe('audio/video byte ranges', () => {
  it('supports initial probes, open-ended seeks, and suffix ranges', () => {
    expect(parseMediaRange('bytes=0-1', 100)).toEqual({ start: 0, end: 1 });
    expect(parseMediaRange('bytes=40-', 100)).toEqual({ start: 40, end: 99 });
    expect(parseMediaRange('bytes=-20', 100)).toEqual({ start: 80, end: 99 });
    expect(parseMediaRange('bytes=80-200', 100)).toEqual({ start: 80, end: 99 });
  });
  it.each(['bytes=100-', 'bytes=40-30', 'bytes=-0', 'bytes=-', 'bytes=0-1,3-4', 'bad', 'bytes=9007199254740992-'])(
    'rejects invalid ranges: %s', (range) => expect(parseMediaRange(range, 100)).toBeNull(),
  );
});
