import { describe, expect, it } from 'vitest';
import {
  DEFAULT_WORD_WOLF,
  GAME_CATALOG,
  defaultMinorityCount,
  rankByRoomPoints,
  surveyQuestionIsValid,
  validateWordWolfSettings,
} from './gameCatalog';

describe('multi-game catalog and shared setup rules', () => {
  it('lists each planned game exactly once', () => {
    expect(GAME_CATALOG.map((game) => game.id)).toEqual(['jinrou', 'wordwolf', 'ogiri', 'survey']);
  });

  it('uses a quarter of players, rounded down, for the suggested minority', () => {
    expect(defaultMinorityCount(3)).toBe(1);
    expect(defaultMinorityCount(8)).toBe(2);
    expect(defaultMinorityCount(20)).toBe(5);
  });

  it('starts Word Wolf at one minute of discussion and thirty seconds of voting', () => {
    expect(DEFAULT_WORD_WOLF.discussionSeconds).toBe(60);
    expect(DEFAULT_WORD_WOLF.voteSeconds).toBe(30);
    expect(validateWordWolfSettings(DEFAULT_WORD_WOLF)).toBeNull();
    expect(validateWordWolfSettings({ ...DEFAULT_WORD_WOLF, voteSeconds: 45 })).toContain('30秒単位');
  });

  it('validates survey question options and hides duplicate choices', () => {
    expect(surveyQuestionIsValid('single', '好きな季節は？', ['春', '夏'])).toBe(true);
    expect(surveyQuestionIsValid('multiple', '好きな季節は？', ['春', '春'])).toBe(false);
    expect(surveyQuestionIsValid('text', 'ひとこと', [])).toBe(true);
  });

  it('assigns tied overall standings the same rank and skips the next rank', () => {
    expect(rankByRoomPoints([{ name: 'A', points: 10 }, { name: 'B', points: 10 }, { name: 'C', points: 8 }]))
      .toEqual([{ name: 'A', points: 10, rank: 1 }, { name: 'B', points: 10, rank: 1 }, { name: 'C', points: 8, rank: 3 }]);
  });
});
