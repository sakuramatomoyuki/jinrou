export function shouldDeferRoomUpdates(room: any, hasSharedSession: boolean): boolean {
  if (!room) return false;
  if (hasSharedSession) return false;
  // Role confirmation is private to each player. Ignore other players' ready
  // updates until this player confirms; their own ready action returns fresh state.
  if (room.phase === 'rolecheck' && room.secret?.role && !room.secret?.ready) return true;
  if (['vote', 'revote'].includes(room.phase) && room.secret?.me?.alive && !room.secret?.hasVoted) {
    // Tied candidates are spectators during the revote; they must still receive
    // the public result when the eligible voters finish.
    if (room.phase === 'revote' && room.revoteCandidates?.includes(room.secret?.me?.uid)) return false;
    return true;
  }
  if (room.phase === 'night' && room.secret?.me?.alive && !room.secret?.nightDone) {
    // Both private chat roles must receive messages while their night turn is open.
    return !['人狼', '共有者'].includes(room.secret?.role);
  }
  return false;
}

export function canUseNightChat(room: any): boolean {
  return room?.phase === 'night' && !room.paused && room.secret?.me?.alive && !room.secret?.nightDone;
}
