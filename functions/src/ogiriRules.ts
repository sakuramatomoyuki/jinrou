export type OgiriMode = 'normal' | 'survive' | 'knockout';
export type OgiriScoring = 'fun' | 'ten-point';
export type OgiriInputMode = 'text' | 'drawing' | 'either';
export type OgiriSettings = { mode: OgiriMode; scoring: OgiriScoring; threshold: number; questionCount: number; inputMode: OgiriInputMode; judgeMode: 'host' | 'all'; promptSource: 'app' | 'host'; pointsEnabled: boolean; addRoomPoints: boolean };

export function validateOgiriSettings(value: Partial<OgiriSettings>): string | null {
  if (!['normal','survive','knockout'].includes(String(value.mode))) return '大喜利の進行形式を選んでください。';
  if (!['fun','ten-point'].includes(String(value.scoring))) return '採点方法を選んでください。';
  if (!['text','drawing','either'].includes(String(value.inputMode))) return '回答方法を選んでください。';
  if (!['host','all'].includes(String(value.judgeMode))) return '採点者を選んでください。';
  if (!['app','host'].includes(String(value.promptSource))) return 'お題の用意方法を選んでください。';
  if (!Number.isInteger(value.questionCount) || Number(value.questionCount) < 3 || Number(value.questionCount) > 20) return '出題数は3〜20問にしてください。';
  if (typeof value.threshold !== 'number' || value.threshold < 0 || value.threshold > 1) return '合格ラインは0〜100%の範囲で設定してください。';
  return null;
}

export type OgiriAnswer = { mode:'text'; text:string } | { mode:'drawing'; dataUrl:string };
export function normalizeOgiriAnswer(inputMode: OgiriInputMode, raw: any): OgiriAnswer | null {
  if (!raw || !['text','drawing'].includes(raw.mode)) return null;
  if (inputMode !== 'either' && raw.mode !== inputMode) return null;
  if (raw.mode === 'text') {
    const text = String(raw.text || '').trim();
    return text && text.length <= 200 ? { mode:'text', text } : null;
  }
  const dataUrl = String(raw.dataUrl || '');
  if (!/^data:image\/(png|webp|jpeg);base64,/.test(dataUrl) || dataUrl.length > 3_000_000) return null;
  return { mode:'drawing', dataUrl };
}

export function normalizeOgiriRating(scoring: OgiriScoring, raw: unknown): number | null {
  if (scoring === 'fun') return raw === 1 || raw === '1' ? 1 : raw === 0 || raw === '0' ? 0 : null;
  const value = Number(raw);
  return Number.isInteger(value) && value >= 0 && value <= 10 ? value : null;
}

export function ogiriRoundScores(answerUids: string[], ratings: Record<string, Record<string, number>>, scoring: OgiriScoring) {
  return Object.fromEntries(answerUids.map((answerUid) => {
    const votes = Object.entries(ratings).filter(([judgeUid]) => judgeUid !== answerUid).map(([, scores]) => scores[answerUid]).filter((score) => Number.isFinite(score));
    const average = votes.length ? votes.reduce((sum, score) => sum + score, 0) / votes.length : 0;
    return [answerUid, { average, votes: votes.length, gamePoints: scoring === 'fun' ? average * 10 : average }];
  }));
}

export function ogiriEliminations(mode: OgiriMode, activeUids: string[], scores: Record<string, {average:number}>, threshold: number, scoring: OgiriScoring): string[] {
  if (mode === 'normal' || activeUids.length <= 2) return [];
  if (mode === 'survive') {
    const cutoff = scoring === 'fun' ? threshold : threshold * 10;
    return activeUids.filter((uid) => (scores[uid]?.average ?? 0) < cutoff);
  }
  const min = Math.min(...activeUids.map((uid) => scores[uid]?.average ?? 0));
  const lowest = activeUids.filter((uid) => (scores[uid]?.average ?? 0) === min);
  return lowest.length === 1 ? lowest : [];
}

export function ogiriRatingsComplete(targetUids: string[], ratings: Record<string, number> | undefined): boolean {
  return targetUids.every((uid) => Object.prototype.hasOwnProperty.call(ratings || {}, uid));
}
