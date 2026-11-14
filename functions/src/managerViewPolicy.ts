/** Public player fields a player-host needs for management controls. */
export function safeManagerPlayerList(players: Array<Record<string, any>>) {
  return players.map((player) => ({
    uid: player.uid,
    name: player.name,
    alive: Boolean(player.alive),
    connected: Boolean(player.connected),
    hold: Boolean(player.hold),
    device: player.device || 'personal',
    ready: Boolean(player.ready),
    ...(player.disconnectedAt ? { disconnectedAt: player.disconnectedAt } : {}),
    ...(player.disconnectedPhase ? { disconnectedPhase: player.disconnectedPhase } : {}),
  }));
}
