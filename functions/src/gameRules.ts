export type Ballot = Record<string, string>;

export const ABSTAIN = '__abstain__';

/** Realtime Database rejects undefined anywhere inside a transaction payload. */
export function cleanRealtimeData<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => item === undefined ? null : cleanRealtimeData(item)) as T;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .map(([key, item]) => [key, cleanRealtimeData(item)] as const);
    return Object.fromEntries(entries) as T;
  }
  return value;
}

export function recommendedRoles(playerCount: number): Record<string, number> {
  const count = Math.max(3, Math.min(20, Math.floor(playerCount)));
  const wolves = Math.ceil(count / 4);
  const roles: Record<string, number> = {
    市民: 0,
    占い師: 1,
    霊媒師: count >= 6 ? 1 : 0,
    騎士: count >= 8 ? 1 : 0,
    共有者: 0,
    人狼: wolves,
    狂人: count >= 10 ? 1 : 0,
    狂言者: 0,
  };
  roles.市民 = count - Object.entries(roles).reduce((sum, [role, n]) => role === '市民' ? sum : sum + n, 0);
  return roles;
}

export function revoteVoters(livingIds: string[], tiedIds: string[]): string[] {
  const tied = new Set(tiedIds);
  return livingIds.filter((uid) => !tied.has(uid));
}

export function tallyVotes(votes: Ballot, voterIds: string[], candidateIds: string[]) {
  const voters = new Set(voterIds);
  const candidates = new Set(candidateIds);
  const ballot: Ballot = {};
  const counts = new Map<string, number>();

  for (const [voter, target] of Object.entries(votes)) {
    if (!voters.has(voter)) continue;
    if (target === ABSTAIN) {
      ballot[voter] = target;
      continue;
    }
    if (!candidates.has(target) || voter === target) continue;
    ballot[voter] = target;
    counts.set(target, (counts.get(target) || 0) + 1);
  }

  const max = Math.max(0, ...counts.values());
  const leaders = candidateIds.filter((uid) => max > 0 && (counts.get(uid) || 0) === max);
  return { ballot, counts, max, leaders };
}

export function tiedVoteAction(rule: string, isRevote: boolean, fallbackAlreadyUsed: boolean): 'random' | 'none' | 'revote' {
  if (isRevote || fallbackAlreadyUsed || rule === 'none') return 'none';
  if (rule === 'random') return 'random';
  return 'revote';
}

export function revoteFallbackPlan(livingIds: string[], tiedIds: string[], canVoteIds: string[]) {
  const canVote = new Set(canVoteIds);
  const eligible = revoteVoters(livingIds, tiedIds).filter((id) => canVote.has(id));
  if (eligible.length) return { phase: 'revote' as const, voters: eligible, candidates: tiedIds, fallback: false };
  const everyone = livingIds.filter((id) => canVote.has(id));
  if (!everyone.length) return { phase: 'execution' as const, voters: [], candidates: [], fallback: false };
  return { phase: 'vote' as const, voters: everyone, candidates: livingIds, fallback: true };
}

export function chooseRandomDistinct<T>(values: T[], randomIndex: (length: number) => number): T | undefined {
  const choices = [...new Set(values)];
  if (!choices.length) return undefined;
  return choices[randomIndex(choices.length)];
}

export function teamOf(role: string | undefined): '村人陣営' | '人狼陣営' | null {
  if (role === '人狼' || role === '狂人' || role === '狂言者') return '人狼陣営';
  if (['市民', '占い師', '霊媒師', '騎士', '共有者'].includes(role || '')) return '村人陣営';
  return null;
}

export function winningTeam(players: Array<{alive:boolean;role?:string}>): '市民陣営' | '人狼陣営' | '引き分け' | null {
  const living = players.filter(player => player.alive);
  if (!living.length) return '引き分け';
  const wolves = living.filter(player => player.role === '人狼').length;
  if (!wolves) return '市民陣営';
  const village = living.filter(player => teamOf(player.role) === '村人陣営').length;
  return wolves >= village ? '人狼陣営' : null;
}

export function canRevealSeatSecret(uid: string, device: string | undefined, phase: string, activeSeatUid: string | null): boolean {
  if (device !== 'shared') return true;
  return ['rolecheck', 'night', 'vote', 'revote'].includes(phase) && activeSeatUid === uid;
}

export function nightCompleteIds(players: Array<{uid:string;alive:boolean;connected:boolean;hold:boolean}>) {
  return players.filter(p => p.alive && p.connected && !p.hold).map(p => p.uid);
}

/** Shared-device seats remain night participants during transient connection-state changes. */
export function nightParticipantIds(players: Array<{uid:string;alive:boolean;connected:boolean;hold:boolean;device?:string}>) {
  return players.filter(p => p.alive && !p.hold && (p.connected || p.device === 'shared')).map(p => p.uid);
}
