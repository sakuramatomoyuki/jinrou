const JAPANESE_TEXT = /[\u3040-\u30ff\u3400-\u9fff]/;

/** Keep server-authored Japanese validation messages and translate Firebase transport errors. */
export function userFacingError(error: unknown, fallback = '通信に失敗しました。接続を確認して、もう一度お試しください。'): string {
  const value = error && typeof error === 'object' ? error as { code?: unknown; message?: unknown } : {};
  const message = String(value.message ?? error ?? '')
    .replace(/^Firebase(?:Error)?:\s*/i, '')
    .replace(/^Error\s*\((?:functions|auth)\/[a-z-]+\)\s*:?\s*/i, '')
    .trim();
  if (message && JAPANESE_TEXT.test(message)) return message;

  const code = `${String(value.code ?? '')} ${message}`.toLowerCase();
  if (/not-found|404/.test(code)) return 'ルームが見つかりません。ルームコードを確認してください。';
  if (/permission-denied|unauthenticated|permission|403/.test(code)) return 'この操作を行う権限がありません。参加状態を確認してください。';
  if (/invalid-argument|invalid argument|400/.test(code)) return '入力内容を確認して、もう一度お試しください。';
  if (/resource-exhausted|too many requests|429/.test(code)) return '操作が集中しています。少し待ってから、もう一度お試しください。';
  if (/unavailable|deadline-exceeded|internal|unknown|network|failed to fetch|500|502|503|504/.test(code)) return fallback;
  return fallback;
}
