export function shouldDeferRoomUpdates(room: any, hasSharedSession: boolean): boolean {
  if (!room || hasSharedSession) return false;
  if (['vote', 'revote'].includes(room.phase) && room.secret?.me?.alive && !room.secret?.hasVoted) {
    return room.phase !== 'revote' || room.revoteCandidates?.includes(room.secret?.me?.uid);
  }
  if (room.phase === 'night' && room.secret?.me?.alive && !room.secret?.nightDone) {
    // Both private chat roles must receive messages while their night turn is open.
    return !['人狼', '共有者'].includes(room.secret?.role);
  }
  return false;
}
