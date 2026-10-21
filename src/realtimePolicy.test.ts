import { describe, expect, it } from 'vitest';
import { buildNightDoneAction, canUseNightChat, mergeChatMessages, mergePrivateActionReceipt, shouldDeferRoomUpdates, shouldFetchSignalRevision, shouldUseCompactManagerProgress, shouldUsePresenceOnlyHeartbeat } from './realtimePolicy';

describe('夜間の更新抑制', () => {
  const night = (role: string, nightDone = false, canManage = false) => ({
    phase: 'night',
    canManage,
    secret: { role, me: { alive: true }, nightDone },
  });

  it('個人端末は夜の行動中、役職や行動完了状況に関係なく他人の更新を保留する', () => {
    expect(shouldDeferRoomUpdates(night('占い師'), false)).toBe(true);
    expect(shouldDeferRoomUpdates(night('共有者'), false)).toBe(true);
    expect(shouldDeferRoomUpdates(night('人狼', true), false)).toBe(true);
  });

  it('進行役と共有端末は従来どおり即時更新する', () => {
    expect(shouldDeferRoomUpdates(night('占い師', false, true), false)).toBe(false);
    expect(shouldDeferRoomUpdates(night('占い師'), true)).toBe(false);
  });

  it('夜間チャットの利用条件は維持する', () => {
    expect(canUseNightChat(night('共有者'))).toBe(true);
    expect(canUseNightChat(night('人狼'))).toBe(true);
    expect(canUseNightChat(night('市民', true))).toBe(false);
    expect(canUseNightChat({ ...night('共有者'), paused: true })).toBe(false);
  });
});

describe('役職確認と投票の更新抑制', () => {
  it('役職確認中は他の人の進捗更新を保留する', () => {
    expect(shouldDeferRoomUpdates({ phase: 'rolecheck', secret: { role: '市民', ready: false } }, false)).toBe(true);
    expect(shouldDeferRoomUpdates({ phase: 'rolecheck', secret: { role: '市民', ready: true } }, false)).toBe(true);
  });

  it('投票中は投票済みかどうかに関係なく他人の票を取得しない', () => {
    expect(shouldDeferRoomUpdates({ phase: 'vote', secret: { me: { alive: true }, hasVoted: false } }, false)).toBe(true);
    expect(shouldDeferRoomUpdates({ phase: 'vote', secret: { me: { alive: true }, hasVoted: true } }, false)).toBe(true);
    expect(shouldDeferRoomUpdates({ phase: 'revote', secret: { me: { alive: true }, hasVoted: false } }, false)).toBe(true);
  });

  it('進行役は投票や役職確認の進捗をリアルタイムで受け取る', () => {
    expect(shouldDeferRoomUpdates({ phase: 'vote', canManage: true }, false)).toBe(false);
    expect(shouldDeferRoomUpdates({ phase: 'rolecheck', canManage: true }, false)).toBe(false);
  });

  it('共有端末セッションは従来どおり更新を受け取る', () => {
    expect(shouldDeferRoomUpdates({ phase: 'vote' }, true)).toBe(false);
  });
});

describe('更新通知の再取得抑制', () => {
  const room = { phase: 'discussion', revision: 12 };

  it('操作中や最新リビジョン以下では取得しない', () => {
    expect(shouldFetchSignalRevision(room, false, true, 13, 12)).toBe(false);
    expect(shouldFetchSignalRevision(room, false, false, 12, 12)).toBe(false);
  });

  it('通常フェーズでは新しい更新を取得する', () => {
    expect(shouldFetchSignalRevision(room, false, false, 13, 12)).toBe(true);
  });

  it('夜や投票では細かな更新を止め、フェーズ変更の通知だけで最新状態を取得する', () => {
    const voting = { phase: 'vote', revision: 12, phaseRevision: 4, secret: { hasVoted: true } };
    expect(shouldFetchSignalRevision(voting, false, false, 13, 12)).toBe(false);
    expect(shouldFetchSignalRevision(voting, false, false, 5, 4, true)).toBe(true);
    expect(shouldFetchSignalRevision(voting, false, true, 5, 4, true)).toBe(false);
  });
});

describe('heartbeat のフォールバック', () => {
  it('ルーム更新通知が接続中の時だけ全体スナップショットを省く', () => {
    expect(shouldUsePresenceOnlyHeartbeat(true)).toBe(true);
    expect(shouldUsePresenceOnlyHeartbeat(false)).toBe(false);
  });
});


describe('夜の一括確定', () => {
  it('怪しい人の投票先を夜行動完了と同じ送信に含める', () => {
    expect(buildNightDoneAction('player-b')).toEqual({ type: 'nightDone', suspicionTarget: 'player-b' });
  });

  it('投票先を選んでいない場合は空の項目を送らない', () => {
    expect(buildNightDoneAction(null)).toEqual({ type: 'nightDone' });
  });
});

describe('夜の操作結果の部分更新', () => {
  it('公開ルーム情報を保ち、本人用の秘密情報と進行番号だけを差し替える', () => {
    const players = [{ uid: 'a' }];
    const room = { phase: 'night', round: 2, revision: 10, players, secret: { role: '占い師' }, gm: { sharedTurnUid: 'a' } };
    const result = mergePrivateActionReceipt(room, { phase: 'night', round: 2, revision: 11, secret: { role: '占い師', clue: { result: '村人（人間）' } }, sharedTurnUid: 'b' });
    expect(result.players).toBe(players);
    expect(result.secret.clue.result).toBe('村人（人間）');
    expect(result.gm.sharedTurnUid).toBe('b');
    expect(result.gm.nightTurnUid).toBe('b');
    expect(result.revision).toBe(11);
  });

  it('秘密情報を含まない応答は部分更新として扱わない', () => {
    expect(mergePrivateActionReceipt({ phase: 'night' }, { revision: 2 })).toBeNull();
  });

  it('チャット履歴を再取得せず、既存履歴を保ったまま進行番号を更新する', () => {
    const chat = [{ id: 'm1', text: '相談' }];
    const room = { phase: 'night', revision: 10, secret: { role: '共有者', sharedChat: chat } };
    const next = mergePrivateActionReceipt(room, { phase: 'night', revision: 11, signalRevision: 11, secret: { role: '共有者', nightDone: true } });
    expect(next.secret.sharedChat).toBe(chat);
    expect(next.secret.nightDone).toBe(true);
    expect(next.signalRevision).toBe(11);
  });
});

describe('軽量通信の差分処理', () => {
  it('管理者の役職確認・夜行動・投票では小さな進捗応答を使う', () => {
    for (const phase of ['rolecheck', 'night', 'vote', 'revote']) {
      expect(shouldUseCompactManagerProgress({ canManage: true, phase })).toBe(true);
    }
    expect(shouldUseCompactManagerProgress({ canManage: false, phase: 'night' })).toBe(false);
    expect(shouldUseCompactManagerProgress({ canManage: true, phase: 'discussion' })).toBe(false);
  });

  it('チャット差分を重複させず追加し、古い履歴を上限内に保つ', () => {
    const current = [{ id: 'm1' }];
    expect(mergeChatMessages(current, [{ id: 'm1' }, { id: 'm2' }], true)).toEqual([{ id: 'm1' }, { id: 'm2' }]);
    expect(mergeChatMessages(current, [{ id: 'm2' }], false)).toEqual([{ id: 'm2' }]);
    const many = Array.from({ length: 81 }, (_, i) => ({ id: String(i) }));
    expect(mergeChatMessages([], many, false)).toHaveLength(80);
    expect(mergeChatMessages([], many, false)[0].id).toBe('1');
  });
});
