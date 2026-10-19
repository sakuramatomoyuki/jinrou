import { describe, expect, it } from 'vitest';
import { canUseNightChat, shouldDeferRoomUpdates } from './realtimePolicy';

describe('夜のリアルタイム更新', () => {
  const night = (role: string) => ({
    phase: 'night',
    secret: { role, me: { alive: true }, nightDone: false },
  });

  it('共有者と人狼は、行動中も専用チャットを受信する', () => {
    expect(shouldDeferRoomUpdates(night('共有者'), false)).toBe(false);
    expect(shouldDeferRoomUpdates(night('人狼'), false)).toBe(false);
  });

  it('ほかの役職は、行動中の更新をまとめて受け取る', () => {
    expect(shouldDeferRoomUpdates(night('占い師'), false)).toBe(true);
  });

  it('共有端末では引き続き即時更新する', () => {
    expect(shouldDeferRoomUpdates(night('占い師'), true)).toBe(false);
  });
});

describe('役職確認中のリアルタイム更新', () => {
  const rolecheck = (ready: boolean) => ({
    phase: 'rolecheck',
    secret: { role: '市民', ready },
  });

  it('本人が役職を確認するまでは、ほかの人の更新を受け取らない', () => {
    expect(shouldDeferRoomUpdates(rolecheck(false), false)).toBe(true);
  });

  it('本人が確認した後は更新を受け取る', () => {
    expect(shouldDeferRoomUpdates(rolecheck(true), false)).toBe(false);
  });

  it('共有端末の役職確認は既存の更新経路を保つ', () => {
    expect(shouldDeferRoomUpdates(rolecheck(false), true)).toBe(false);
  });
});

describe('再投票中の更新', () => {
  it('再投票の対象者にも確定した公開結果を受け取らせる', () => {
    const room = { phase: 'revote', revoteCandidates: ['a', 'b'], secret: { me: { uid: 'a', alive: true }, hasVoted: false } };
    expect(shouldDeferRoomUpdates(room, false)).toBe(false);
  });

  it('再投票する側は自分の投票までほかの投票更新を保留する', () => {
    const room = { phase: 'revote', revoteCandidates: ['a', 'b'], secret: { me: { uid: 'c', alive: true }, hasVoted: false } };
    expect(shouldDeferRoomUpdates(room, false)).toBe(true);
  });
});

describe('夜間チャットの利用条件', () => {
  const room = (nightDone: boolean, paused = false) => ({ phase: 'night', paused, secret: { me: { alive: true }, nightDone } });
  it('夜の行動中は利用できる', () => expect(canUseNightChat(room(false))).toBe(true));
  it('行動完了後と一時停止中は利用できない', () => {
    expect(canUseNightChat(room(true))).toBe(false);
    expect(canUseNightChat(room(false, true))).toBe(false);
  });
});
