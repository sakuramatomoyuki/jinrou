export type Ballot = Record<string, string>;

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
    if (target === '__abstain__') {
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

export function chooseRandomDistinct<T>(values: T[], randomIndex: (length: number) => number): T | undefined {
  const choices = [...new Set(values)];
  if (!choices.length) return undefined;
  return choices[randomIndex(choices.length)];
}
