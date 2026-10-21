import { describe, expect, it } from 'vitest';
import rules from '../database.rules.json';

describe('Realtime Database のクライアント権限', () => {
  const roomRules = rules.rules.rooms.$roomCode;

  it('クライアントからルーム全体を読んだり書いたりできない', () => {
    expect(rules.rules['.read']).toBe(false);
    expect(rules.rules['.write']).toBe(false);
  });

  it('通常の更新番号と進行更新番号は参加者・観戦者・管理者だけが読める', () => {
    for (const path of ['signalRevision', 'progressRevision'] as const) {
      expect(roomRules[path]['.read']).toContain("child('clientMeta')");
      expect(roomRules[path]['.read']).toContain("auth.uid");
      expect(roomRules[path]['.read']).not.toBe(true);
      expect(roomRules[path]['.write']).toBe(false);
    }
  });

  it('チャット通知は該当チャット参加者に限定し、クライアント書き込みを拒否する', () => {
    for (const channel of ['shared', 'wolf'] as const) {
      expect(roomRules.chatSignals[channel]['.read']).toContain(`child('${channel}')`);
      expect(roomRules.chatSignals[channel]['.write']).toBe(false);
    }
  });

  it('チャット参加者一覧自体はクライアントに公開しない', () => {
    expect(roomRules.chatMembers['.read']).toBe(false);
    expect(roomRules.chatMembers['.write']).toBe(false);
  });
});
