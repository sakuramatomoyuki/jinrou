import { describe, expect, it } from 'vitest';
import { formatSecondsRemaining } from './countdown';

describe('画面内カウントダウン表示', () => {
  it('議論は0.1秒単位、ほかのタイマーは秒単位で表示する', () => {
    expect(formatSecondsRemaining(30_000, 100, 1)).toBe('29.9');
    expect(formatSecondsRemaining(30_000, 1_100)).toBe('29');
  });

  it('期限を過ぎてもマイナス表示にならない', () => {
    expect(formatSecondsRemaining(10_000, 11_200, 1)).toBe('0.0');
  });
});
