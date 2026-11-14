export function suggestedMinorityCount(playerCount: number): number {
  return Math.max(1, Math.floor(Math.max(0, Math.floor(playerCount)) / 4));
}

export type WordWolfRuntimeSettings = {
  discussionSeconds: number;
  voteSeconds: number;
  minorityCount: number | 'quarter';
  wordSource: 'app' | 'host';
  pointsEnabled: boolean;
  addRoomPoints: boolean;
};

export function wordWolfRuntimeSettings(config: Partial<WordWolfRuntimeSettings>): WordWolfRuntimeSettings {
  return {
    discussionSeconds: Number(config.discussionSeconds ?? 60),
    voteSeconds: Number(config.voteSeconds ?? 30),
    minorityCount: config.minorityCount ?? 'quarter',
    wordSource: config.wordSource === 'host' ? 'host' : 'app',
    pointsEnabled: config.pointsEnabled !== false,
    addRoomPoints: config.addRoomPoints !== false,
  };
}

/** Custom topic pairs are only needed by the manager while configuring a lobby. */
export function wordWolfSettingsForViewer<T extends Record<string, any>>(
  settings: T,
  isManager: boolean,
  phase: string,
): T {
  if (!settings.wordWolf || (isManager && phase === 'waiting')) return settings;
  const { topicA: _topicA, topicB: _topicB, ...publicWordWolf } = settings.wordWolf;
  return { ...settings, wordWolf: publicWordWolf };
}

export function tallyWordWolfVotes(votes: Record<string, string>, playerIds: string[], minorityIds: string[]) {
  const eligible = new Set(playerIds);
  const counts: Record<string, number> = {};
  for (const [voter, target] of Object.entries(votes)) {
    if (!eligible.has(voter) || target === '__abstain__' || !eligible.has(target) || target === voter) continue;
    counts[target] = (counts[target] || 0) + 1;
  }
  const maximum = Math.max(0, ...Object.values(counts));
  const leaders = Object.keys(counts).filter((uid) => maximum > 0 && counts[uid] === maximum);
  return { counts, leaders, caught: leaders.some((uid) => minorityIds.includes(uid)) };
}

export function wordWolfScores(
  playerIds: string[],
  minorityIds: string[],
  votes: Record<string, string>,
  caught: boolean,
  guessCorrect: boolean,
  pointsEnabled = true,
): Record<string, number> {
  const minority = new Set(minorityIds);
  return Object.fromEntries(playerIds.map((uid) => {
    if (!pointsEnabled) return [uid, 0];
    if (minority.has(uid)) return [uid, caught && guessCorrect ? 3 : !caught ? 5 : 0];
    return [uid, votes[uid] && minority.has(votes[uid]) ? 3 : 0];
  }));
}

export function wordWolfWinner(caught: boolean, guessCorrect: boolean): '少数派' | '多数派' {
  return !caught || guessCorrect ? '少数派' : '多数派';
}

export function canStartReplay(
  players: Array<{ uid: string; connected: boolean }>,
  approvals: Record<string, boolean>,
): boolean {
  return players.length >= 3 && players.every((player) => player.connected && approvals[player.uid] === true);
}

/** Adds per-game point entries without discarding the room's earlier history. */
export function accumulatePointBreakdown(
  current: Record<string, Record<string, number>> | undefined,
  additions: Record<string, Record<string, number>>,
): Record<string, Record<string, number>> {
  const next: Record<string, Record<string, number>> = Object.fromEntries(
    Object.entries(current || {}).map(([uid, entries]) => [uid, { ...entries }]),
  );
  for (const [uid, entries] of Object.entries(additions)) {
    next[uid] ??= {};
    for (const [label, raw] of Object.entries(entries)) {
      const points = Number(raw);
      if (Number.isFinite(points) && points !== 0) next[uid][label] = (next[uid][label] || 0) + points;
    }
  }
  return next;
}

/** Reset shared player state before starting any title in the room. */
export function resetPlayersForGame<T extends { alive: boolean; hold: boolean }>(players: Record<string, T>): void {
  for (const player of Object.values(players)) {
    player.alive = true;
    player.hold = false;
  }
}
