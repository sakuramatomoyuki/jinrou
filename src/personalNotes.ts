export type PersonalNote = {
  prediction: string;
  confidence: 'unknown' | 'trust' | 'suspicious';
  note: string;
  phase: string;
  time: string;
};

export type PersonalNotes = Record<string, PersonalNote>;

const DB_NAME = 'moonlit-village-local';
const STORE_NAME = 'personal-notes';
const DB_VERSION = 2;

export function emptyPersonalNote(): PersonalNote {
  return { prediction: '', confidence: 'unknown', note: '', phase: '', time: '' };
}

export function updatePersonalNote(notes: PersonalNotes, playerId: string, patch: Partial<PersonalNote>): PersonalNotes {
  if (!playerId) return notes;
  return { ...notes, [playerId]: { ...emptyPersonalNote(), ...notes[playerId], ...patch } };
}

export function openLocalGameDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('このブラウザでは端末内メモを利用できません。'));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
      if (!request.result.objectStoreNames.contains('match-history')) request.result.createObjectStore('match-history');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('端末内メモを開けませんでした。'));
    request.onblocked = () => reject(new Error('端末内メモの更新がほかのタブで保留されています。'));
  });
}

function recordKey(roomCode: string, playerId: string) {
  return `${roomCode}:${playerId}`;
}

export async function loadPersonalNotes(roomCode: string, playerId: string, gameStartedAt?: number): Promise<PersonalNotes> {
  const db = await openLocalGameDb();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(recordKey(roomCode, playerId));
      request.onsuccess = () => {
        const record = request.result;
        if (record && gameStartedAt !== undefined && record.gameStartedAt !== gameStartedAt) {
          const cleanup = db.transaction(STORE_NAME, 'readwrite');
          cleanup.objectStore(STORE_NAME).delete(recordKey(roomCode, playerId));
          cleanup.oncomplete = () => resolve({});
          cleanup.onerror = () => reject(cleanup.error || new Error('前回の推理メモを消去できませんでした。'));
          return;
        }
        resolve(record?.notes || {});
      };
      request.onerror = () => reject(request.error || new Error('端末内メモを読み込めませんでした。'));
    });
  } finally {
    db.close();
  }
}

export async function savePersonalNotes(roomCode: string, playerId: string, notes: PersonalNotes, gameStartedAt?: number): Promise<void> {
  const db = await openLocalGameDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put({ notes, gameStartedAt, updatedAt: Date.now() }, recordKey(roomCode, playerId));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('端末内メモを保存できませんでした。'));
      transaction.onabort = () => reject(transaction.error || new Error('端末内メモの保存が中断されました。'));
    });
  } finally {
    db.close();
  }
}

export async function clearPersonalNotes(roomCode: string, playerId: string): Promise<void> {
  const db = await openLocalGameDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).delete(recordKey(roomCode, playerId));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('端末内メモを削除できませんでした。'));
    });
  } finally {
    db.close();
  }
}
