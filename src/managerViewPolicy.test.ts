import { describe, expect, it } from 'vitest';
import { safeManagerPlayerList } from '../functions/src/managerViewPolicy.js';

describe('player-host management view', () => {
  it('keeps disconnect and lobby controls while stripping roles and private action data', () => {
    const [player] = safeManagerPlayerList([{
      uid: 'p1', name: 'Host', alive: true, connected: false, hold: true,
      device: 'personal', ready: true, disconnectedAt: 123, disconnectedPhase: 'night',
      role: '人狼', secret: { target: 'p2' }, votes: { p1: 'p2' },
    }]);

    expect(player).toEqual({
      uid: 'p1', name: 'Host', alive: true, connected: false, hold: true,
      device: 'personal', ready: true, disconnectedAt: 123, disconnectedPhase: 'night',
    });
    expect(player).not.toHaveProperty('role');
    expect(player).not.toHaveProperty('secret');
    expect(player).not.toHaveProperty('votes');
  });
});
