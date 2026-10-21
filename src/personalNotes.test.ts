import { describe, expect, it } from 'vitest';
import { emptyPersonalNote, updatePersonalNote } from './personalNotes';

describe('端末内推理メモ', () => {
  it('初期値は空欄で、予想・信頼度・自由記述を保持する', () => {
    const note = updatePersonalNote({}, 'player-a', { prediction: '占い師', confidence: 'trust', note: '初日の発言を確認' });
    expect(note['player-a']).toEqual({ prediction: '占い師', confidence: 'trust', note: '初日の発言を確認', phase: '', time: '' });
    expect(emptyPersonalNote()).toEqual({ prediction: '', confidence: 'unknown', note: '', phase: '', time: '' });
  });

  it('一人のメモを変更しても、ほかの参加者のメモを保つ', () => {
    const notes = { 'player-a': { prediction: '人狼', confidence: 'suspicious' as const, note: '発言に矛盾', phase: '第1日目 · 議論', time: '12:34' } };
    expect(updatePersonalNote(notes, 'player-b', { note: '後で確認' })).toEqual({
      ...notes,
      'player-b': { prediction: '', confidence: 'unknown', note: '後で確認', phase: '', time: '' },
    });
  });
});
