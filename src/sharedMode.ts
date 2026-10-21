export type JoinMode = 'individual' | 'shared' | 'hybrid';

export function sharedRosterError(mode: JoinMode, playerCount: number, inputNames: string[], hostName?: string): string | null {
  if (mode === 'individual') return null;
  const names = inputNames.map(name => name.trim()).filter(Boolean);
  if (mode === 'shared' && names.length !== playerCount) return '全員共有では、参加人数分の共有端末プレイヤー名が必要です。';
  if (mode === 'hybrid' && (names.length < 1 || names.length >= playerCount)) return '併用では共有端末と個人端末のプレイヤーを1人以上ずつ登録してください。';
  if (hostName !== undefined && hostName.trim() && !names.some(name => name.toLowerCase() === hostName.trim().toLowerCase())) return 'ホストの名前を共有端末プレイヤー欄に登録してください。';
  if (hostName !== undefined && !hostName.trim()) return 'ホストのプレイヤー名を入力してください。';
  if (names.some(name => name.length > 20)) return 'プレイヤー名は20文字以内にしてください。';
  if (new Set(names.map(name => name.toLowerCase())).size !== names.length) return '共有端末のプレイヤー名は重複できません。';
  return null;
}


/** Hide a completed shared-seat secret before handing the device to another person. */
export function clearSharedSeatSecret<T extends {secret?: unknown}>(view: T): T {
  return { ...view, secret: null };
}
