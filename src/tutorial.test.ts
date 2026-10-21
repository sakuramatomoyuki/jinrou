import { describe, expect, it } from 'vitest';
import { canAdvanceTutorial, nextTutorialStep, tutorialSteps, type TutorialProgress } from './tutorial';

describe('操作チュートリアル', () => {
  const empty: TutorialProgress = { joined: false, roleSeen: false, nightDone: false, voted: false };
  it('指定した順序で5つの基本操作を案内する', () => {
    expect(tutorialSteps.map(step => step.title)).toEqual(['ルームに入る', '役職を確認する', '夜の行動', '投票する', '結果を見る']);
  });
  it('各操作が完了するまでは先へ進めない', () => {
    expect(canAdvanceTutorial(0, empty)).toBe(false);
    expect(nextTutorialStep(0, empty)).toBe(0);
    expect(nextTutorialStep(0, { ...empty, joined: true })).toBe(1);
  });
  it('投票確定後に結果画面へ進み、最後の画面で止まる', () => {
    const progress = { joined: true, roleSeen: true, nightDone: true, voted: true };
    expect(nextTutorialStep(3, progress)).toBe(4);
    expect(nextTutorialStep(4, progress)).toBe(4);
  });
});
