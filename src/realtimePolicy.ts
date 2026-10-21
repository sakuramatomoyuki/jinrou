export function shouldDeferRoomUpdates(room: any, hasSharedSession: boolean): boolean {
  if (!room || hasSharedSession || room.canManage) return false;
  // During role reveal, each player's action response carries their own state.
  if (room.phase === 'rolecheck') return true;
  // Ballots are private. Only refresh after the server advances to the result.
  if (['vote', 'revote'].includes(room.phase)) return true;
  // Individual night actions are private and arrive in the actor's response.
  // Chat participants receive messages on the separate, authorized chat signal.
  if (room.phase === 'night') return true;
  return false;
}

/** Avoid full room snapshots for each private action; allow one on phase change. */
export function shouldFetchSignalRevision(
  room: any,
  hasSharedSession: boolean,
  actionInFlight: boolean,
  pendingRevision: number,
  currentRevision: number,
  phaseChanged = false,
): boolean {
  if (!room || actionInFlight || pendingRevision <= currentRevision) return false;
  if (phaseChanged) return true;
  return !shouldDeferRoomUpdates(room, hasSharedSession);
}

/** Commit the locally selected night suspicion together with action completion. */
export function buildNightDoneAction(suspicionTarget?: string | null) {
  return {
    type: 'nightDone' as const,
    ...(suspicionTarget ? { suspicionTarget } : {}),
  };
}

/** Merge a server-validated private night receipt without downloading the full room again. */
export function mergePrivateActionReceipt(room: any, receipt: any) {
  if (!room || !receipt?.secret) return null;
  const gm = room.gm
    ? {
        ...room.gm,
        ...(receipt.sharedTurnUid !== undefined
          ? {
              sharedTurnUid: receipt.sharedTurnUid,
              // The shared night handoff UI reads nightTurnUid. Keep it in
              // sync with the server's canonical sharedTurnUid receipt.
              ...(room.phase === 'night' ? { nightTurnUid: receipt.sharedTurnUid } : {}),
            }
          : {}),
        ...(receipt.nightProgress ? { nightProgress: receipt.nightProgress } : {}),
      }
    : room.gm;
  return {
    ...room,
    phase: receipt.phase ?? room.phase,
    round: receipt.round ?? room.round,
    revision: receipt.revision ?? room.revision,
    signalRevision: receipt.signalRevision ?? receipt.revision ?? room.signalRevision,
    progressRevision: receipt.progressRevision ?? room.progressRevision,
    gm,
    secret: { ...(room.secret || {}), ...receipt.secret },
  };
}

export function canUseNightChat(room: any): boolean {
  return room?.phase === 'night' && !room.paused && room.secret?.me?.alive && !room.secret?.nightDone;
}

/** Heartbeat may skip snapshots only while the room revision listener is healthy. */
export function shouldUsePresenceOnlyHeartbeat(roomSignalConnected: boolean): boolean {
  return roomSignalConnected;
}

/** Managers need compact progress during private action phases, not room snapshots. */
export function shouldUseCompactManagerProgress(room: any): boolean {
  return Boolean(room?.canManage && ['rolecheck', 'night', 'vote', 'revote'].includes(room?.phase));
}

/** Apply chat deltas without replacing messages received during another request. */
export function mergeChatMessages(current: any[], incoming: any[], append: boolean): any[] {
  if (!append) return incoming.slice(-80);
  const merged = [...current];
  for (const message of incoming) {
    if (!merged.some((item) => item?.id === message?.id)) merged.push(message);
  }
  return merged.slice(-80);
}
