import { describe, expect, it } from 'vitest';
import { accumulatePointBreakdown, canStartReplay, resetPlayersForGame, suggestedMinorityCount, tallyWordWolfVotes, wordWolfRuntimeSettings, wordWolfScores, wordWolfSettingsForViewer, wordWolfWinner } from '../functions/src/multiGameRules.js';

describe('Word Wolf server rules', () => {
  it('suggests one minority at small tables and floors one quarter for larger tables', () => {
    expect(suggestedMinorityCount(3)).toBe(1);
    expect(suggestedMinorityCount(7)).toBe(1);
    expect(suggestedMinorityCount(8)).toBe(2);
  });

  it('preserves the game-point and room-point switches in runtime settings', () => {
    expect(wordWolfRuntimeSettings({ pointsEnabled: false, addRoomPoints: false })).toMatchObject({
      pointsEnabled: false,
      addRoomPoints: false,
    });
    expect(wordWolfRuntimeSettings({})).toMatchObject({
      discussionSeconds: 60,
      voteSeconds: 30,
      pointsEnabled: true,
      addRoomPoints: true,
    });
  });

  it('shows custom topic pairs only to the manager during lobby setup', () => {
    const settings = { gameType: 'wordwolf', wordWolf: { topicA: 'コーヒー', topicB: '紅茶', discussionSeconds: 60 } };
    expect(wordWolfSettingsForViewer(settings, true, 'waiting').wordWolf).toEqual(settings.wordWolf);
    expect(wordWolfSettingsForViewer(settings, false, 'waiting').wordWolf).toEqual({ discussionSeconds: 60 });
    expect(wordWolfSettingsForViewer(settings, true, 'wordwolf-vote').wordWolf).toEqual({ discussionSeconds: 60 });
  });

  it('detects all tied leaders and counts the minority as caught if any leader is minority', () => {
    const tie = tallyWordWolfVotes({ a: 'b', b: 'a', c: 'a', d: 'b' }, ['a', 'b', 'c', 'd'], ['b']);
    expect(tie.leaders.sort()).toEqual(['a', 'b']);
    expect(tie.caught).toBe(true);
  });

  it('ignores abstentions, invalid targets, self-votes, and nonparticipants', () => {
    const result = tallyWordWolfVotes({ a: '__abstain__', b: 'missing', c: 'c', outsider: 'a' }, ['a', 'b', 'c'], ['b']);
    expect(result).toEqual({ counts: {}, leaders: [], caught: false });
  });

  it('awards majority correct guesses, minority survival, and caught-minority reverse answers', () => {
    expect(wordWolfScores(['a', 'b', 'c'], ['c'], { a: 'c', b: 'a' }, false, false))
      .toEqual({ a: 3, b: 0, c: 5 });
    expect(wordWolfScores(['a', 'b', 'c'], ['c'], { a: 'c', b: 'a' }, true, true))
      .toEqual({ a: 3, b: 0, c: 3 });
    expect(wordWolfScores(['a', 'c'], ['c'], {}, true, false, false)).toEqual({ a: 0, c: 0 });
  });

  it('gives minority victory for escape or a correct reverse guess', () => {
    expect(wordWolfWinner(false, false)).toBe('少数派');
    expect(wordWolfWinner(true, true)).toBe('少数派');
    expect(wordWolfWinner(true, false)).toBe('多数派');
  });

  it('starts a rematch only when at least three players are connected and all approved', () => {
    const players = [{ uid: 'a', connected: true }, { uid: 'b', connected: true }, { uid: 'c', connected: true }];
    expect(canStartReplay(players, { a: true, b: true, c: true })).toBe(true);
    expect(canStartReplay(players, { a: true, b: true })).toBe(false);
    expect(canStartReplay([{ ...players[0] }, { ...players[1] }, { uid: 'c', connected: false }], { a: true, b: true, c: true })).toBe(false);
    expect(canStartReplay(players.slice(0, 2), { a: true, b: true })).toBe(false);
  });

  it('accumulates point details across games without mutating earlier records', () => {
    const previous = { a: { '人狼陣営勝利': 7, '大喜利': 2 }, b: { '生存ボーナス': 1 } };
    const next = accumulatePointBreakdown(previous, {
      a: { 'ワードウルフ': 3, '大喜利': 1 },
      b: { 'ワードウルフ': 5 },
      c: { 'ワードウルフ': 0 },
    });

    expect(next).toEqual({
      a: { '人狼陣営勝利': 7, '大喜利': 3, 'ワードウルフ': 3 },
      b: { '生存ボーナス': 1, 'ワードウルフ': 5 },
      c: {},
    });
    expect(previous.a['大喜利']).toBe(2);
  });

  it('restores players marked dead or held before the next game in the shared room', () => {
    const players = {
      a: { alive: false, hold: false },
      b: { alive: true, hold: true },
      c: { alive: false, hold: true },
    };
    resetPlayersForGame(players);
    expect(Object.values(players)).toEqual([
      { alive: true, hold: false },
      { alive: true, hold: false },
      { alive: true, hold: false },
    ]);
  });
});
