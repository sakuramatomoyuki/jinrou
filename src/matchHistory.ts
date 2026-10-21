import { openLocalGameDb } from './personalNotes';

export type MatchHistoryRecord = {
  id: string;
  roomCode: string;
  winner: string;
  startedAt: number | null;
  endedAt: number;
  rounds: number;
  roles: Array<{ uid: string; name: string; role: string; alive: boolean }>;
  voteDisclosure: 'none' | 'count' | 'full';
  votes: any[];
  nightActions: any[];
  publicLogs: any[];
  adminLogs?: any[];
};

export function normalizeMatchHistory(list: MatchHistoryRecord[], record: MatchHistoryRecord, limit = 20): MatchHistoryRecord[] {
  const merged = [record, ...list.filter(item => item.id !== record.id)];
  return merged.sort((a, b) => b.endedAt - a.endedAt).slice(0, limit);
}

export function createMatchHistoryRecord(data: any): MatchHistoryRecord | null {
  if (!data?.roomCode || !Number.isFinite(Number(data.endedAt))) return null;
  const startedAt = Number(data.startedAt) || null;
  const endedAt = Number(data.endedAt);
  return {
    id: `${data.roomCode}-${startedAt || endedAt}`,
    roomCode: String(data.roomCode),
    winner: String(data.winner || '引き分け'),
    startedAt,
    endedAt,
    rounds: Number(data.rounds) || 0,
    roles: Array.isArray(data.roles) ? data.roles : [],
    voteDisclosure: ['none', 'count', 'full'].includes(data.voteDisclosure) ? data.voteDisclosure : 'none',
    votes: Array.isArray(data.votes) ? data.votes : [],
    nightActions: Array.isArray(data.nightActions) ? data.nightActions : [],
    publicLogs: Array.isArray(data.publicLogs) ? data.publicLogs : [],
    ...(Array.isArray(data.adminLogs) ? { adminLogs: data.adminLogs } : {}),
  };
}

export async function loadMatchHistory(): Promise<MatchHistoryRecord[]> {
  const db = await openLocalGameDb();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction('match-history', 'readonly').objectStore('match-history').get('recent');
      request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result : []);
      request.onerror = () => reject(request.error || new Error('試合履歴を読み込めませんでした。'));
    });
  } finally { db.close(); }
}

export async function saveMatchHistory(data: any): Promise<MatchHistoryRecord | null> {
  const record = createMatchHistoryRecord(data);
  if (!record) return null;
  const db = await openLocalGameDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('match-history', 'readwrite');
      const store = tx.objectStore('match-history');
      const request = store.get('recent');
      request.onsuccess = () => store.put(normalizeMatchHistory(Array.isArray(request.result) ? request.result : [], record), 'recent');
      request.onerror = () => tx.abort();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('試合履歴を保存できませんでした。'));
      tx.onabort = () => reject(tx.error || new Error('試合履歴の保存が中断されました。'));
    });
    return record;
  } finally { db.close(); }
}

export async function deleteMatchHistory(id?: string): Promise<void> {
  const db = await openLocalGameDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('match-history', 'readwrite');
      const store = tx.objectStore('match-history');
      if (id) {
        const request = store.get('recent');
        request.onsuccess = () => store.put((Array.isArray(request.result) ? request.result : []).filter((item: MatchHistoryRecord) => item.id !== id), 'recent');
        request.onerror = () => tx.abort();
      } else store.delete('recent');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('試合履歴を削除できませんでした。'));
      tx.onabort = () => reject(tx.error || new Error('試合履歴の削除が中断されました。'));
    });
  } finally { db.close(); }
}
