import { describe, expect, it } from 'vitest';
import { sharedRosterError, validSharedPin } from './sharedMode';

describe('共有端末の入力検証', () => {
  it('全員共有では全員分の名前が必要', () => {
    expect(sharedRosterError('shared', 3, ['A', 'B', 'C'])).toBeNull();
    expect(sharedRosterError('shared', 3, ['A', 'B'])).not.toBeNull();
  });
  it('併用では共有端末と個人端末を両方残す', () => {
    expect(sharedRosterError('hybrid', 4, ['A', 'B'])).toBeNull();
    expect(sharedRosterError('hybrid', 4, ['A', 'B', 'C', 'D'])).not.toBeNull();
  });
  it('共有・併用ではホスト名を共有席に含める', () => {
    expect(sharedRosterError('hybrid', 4, ['Host', 'A'], 'host')).toBeNull();
    expect(sharedRosterError('hybrid', 4, ['A', 'B'], 'Host')).toContain('ホスト');
  });
  it('共有席名の重複を拒否する', () => {
    expect(sharedRosterError('shared', 2, ['月見', '月見'])).not.toBeNull();
    expect(sharedRosterError('shared', 2, [' Moon ', 'moon'])).not.toBeNull();
  });
  it('PINは8〜64文字で確認値と一致する必要がある', () => {
    expect(validSharedPin('long-pin-123')).toBe(true);
    expect(validSharedPin('short')).toBe(false);
    expect(validSharedPin('long-pin-123', 'different')).toBe(false);
  });
});
