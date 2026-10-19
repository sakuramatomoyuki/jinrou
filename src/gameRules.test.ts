import { describe, expect, it, vi } from 'vitest';
import { chooseRandomDistinct, revoteVoters, tallyVotes } from '../functions/src/gameRules';

describe('再投票のルール', () => {
  it('同率候補は投票者から外し、生存者だけを投票者にする', () => {
    expect(revoteVoters(['A', 'B', 'C', 'D'], ['A', 'B'])).toEqual(['C', 'D']);
  });

  it('再投票では同率候補への票と無投票だけを集計する', () => {
    const result = tallyVotes(
      { A: 'C', B: 'D', C: 'A', D: '__abstain__', ghost: 'B' },
      ['C', 'D'],
      ['A', 'B'],
    );
    expect(result.ballot).toEqual({ C: 'A', D: '__abstain__' });
    expect(result.max).toBe(1);
    expect(result.leaders).toEqual(['A']);
  });
});

describe('人狼の襲撃先決定', () => {
  it('全員一致ならその対象を選ぶ', () => {
    expect(chooseRandomDistinct(['C', 'C'], () => 0)).toBe('C');
  });

  it('意見が違うときは異なる候補からランダムに1人選ぶ', () => {
    const randomIndex = vi.fn(() => 1);
    expect(chooseRandomDistinct(['C', 'D', 'C'], randomIndex)).toBe('D');
    expect(randomIndex).toHaveBeenCalledWith(2);
  });
});
