import { describe, expect, it } from 'vitest';
import { userFacingError } from './errorMessages';

describe('利用者向けエラー表示', () => {
  it('サーバーが返した日本語の説明を保つ', () => {
    expect(userFacingError({ code: 'functions/invalid-argument', message: '役職の人数が一致しません。' })).toBe('役職の人数が一致しません。');
    expect(userFacingError({ message: 'Firebase: Error (functions/failed-precondition): 投票できません。' })).toBe('投票できません。');
  });
  it('ルーム不在、権限、入力、混雑を日本語にする', () => {
    expect(userFacingError({ code: 'functions/not-found', message: 'NOT_FOUND' })).toContain('ルームが見つかりません');
    expect(userFacingError({ code: 'functions/permission-denied', message: 'PERMISSION_DENIED' })).toContain('権限がありません');
    expect(userFacingError({ code: 'functions/invalid-argument', message: 'INVALID_ARGUMENT' })).toContain('入力内容');
    expect(userFacingError({ code: 'functions/resource-exhausted', message: 'RESOURCE_EXHAUSTED' })).toContain('操作が集中');
  });
  it('内部・通信エラーから生の技術文言を隠す', () => {
    expect(userFacingError({ code: 'functions/internal', message: 'INTERNAL [500]' })).toContain('通信に失敗');
    expect(userFacingError(new Error('Failed to fetch'))).toContain('通信に失敗');
  });
});
