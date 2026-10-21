export const tutorialSteps = [
  { title: 'ルームに入る', description: '名前と5桁のルーム番号を確かめて入室します。' },
  { title: '役職を確認する', description: '周りに見られないように、自分だけで役職を確認します。' },
  { title: '夜の行動', description: '対象を選び、行動を確定します。実際のゲームでは役職によって操作が異なります。' },
  { title: '投票する', description: '処刑したい人を選び、名前を確認して投票を確定します。' },
  { title: '結果を見る', description: '結果を確認します。実際の試合では権限者が次のフェーズへ進めます。' },
] as const;

export type TutorialProgress = { joined: boolean; roleSeen: boolean; nightDone: boolean; voted: boolean };

export function canAdvanceTutorial(step: number, progress: TutorialProgress): boolean {
  if (step === 0) return progress.joined;
  if (step === 1) return progress.roleSeen;
  if (step === 2) return progress.nightDone;
  if (step === 3) return progress.voted;
  return step >= 4;
}

export function nextTutorialStep(step: number, progress: TutorialProgress): number {
  return canAdvanceTutorial(step, progress) ? Math.min(step + 1, tutorialSteps.length - 1) : step;
}
