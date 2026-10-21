import { describe, expect, it } from 'vitest';
import { createMatchHistoryRecord, normalizeMatchHistory } from './matchHistory';

describe('端末内の試合履歴', () => {
  const record = (roomCode: string, endedAt: number) => createMatchHistoryRecord({
    roomCode, winner: '市民陣営', startedAt: endedAt - 1000, endedAt, rounds: 2,
    roles: [{ uid: 'a', name: '月見', role: '占い師', alive: true }],
    voteDisclosure: 'full', votes: [{ ballot: [{ voterName: '月見', targetName: '風鈴' }] }],
    nightActions: [{ round: 1, actions: [] }], publicLogs: [],
  })!;

  it('履歴IDを試合ごとに安定して生成し、記録に必要なデータを保持する', () => {
    const value = record('12345', 2000);
    expect(value.id).toBe('12345-1000');
    expect(value.roles[0].role).toBe('占い師');
    expect(value.votes[0].ballot[0].targetName).toBe('風鈴');
  });

  it('同じ試合は重複せず、最新20件を新しい順に保持する', () => {
    const old = Array.from({ length: 20 }, (_, i) => record(String(i).padStart(5, '0'), i + 1));
    const updated = normalizeMatchHistory(old, record('00019', 40));
    const added = normalizeMatchHistory(updated, record('99999', 50));
    expect(updated).toHaveLength(20);
    expect(updated[0].roomCode).toBe('00019');
    expect(added).toHaveLength(20);
    expect(added[0].roomCode).toBe('99999');
    expect(added.some(item => item.roomCode === '00000')).toBe(false);
  });

  it('不完全な記録は履歴に保存しない', () => {
    expect(createMatchHistoryRecord({ roomCode: '12345' })).toBeNull();
  });
});
