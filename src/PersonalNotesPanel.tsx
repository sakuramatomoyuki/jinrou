import React from 'react';
import { clearPersonalNotes, emptyPersonalNote, loadPersonalNotes, savePersonalNotes, updatePersonalNote } from './personalNotes';

const noteRoles = ['市民', '占い師', '霊媒師', '騎士', '共有者', '人狼', '狂人', '狂言者'];
const notePhases: Record<string, string> = { rolecheck: '役職確認', night: '夜', morning: '朝', discussion: '議論', vote: '投票', revote: '再投票', execution: '処刑結果', ended: '試合終了' };

export function PersonalNotesPanel({ room, activeSeat }: { room: any; activeSeat: any }) {
  const uid = room?.secret?.me?.uid;
  const gameStartedAt = Number(room?.startedAt || 0);
  const cacheKey = uid && room?.code ? `${room.code}:${uid}:${gameStartedAt}` : '';
  const enabled = Boolean(room?.phase && room.phase !== 'waiting' && room.phase !== 'ranking'
    && room.viewerKind === 'player' && room.settings?.method !== 'shared' && !activeSeat
    && room.secret?.me?.device !== 'shared' && uid);
  const [open, setOpen] = React.useState(false);
  const [notes, setNotes] = React.useState<any>({});
  const [loadedKey, setLoadedKey] = React.useState('');
  const [notice, setNotice] = React.useState('');
  const timer = React.useRef<number | undefined>(undefined);

  React.useEffect(() => {
    if (!enabled || !cacheKey) { setLoadedKey(''); return; }
    let active = true;
    setLoadedKey('');
    setNotes({});
    loadPersonalNotes(room.code, uid, gameStartedAt).then(value => {
      if (active) { setNotes(value); setLoadedKey(cacheKey); setNotice('端末内に保存'); }
    }).catch(() => {
      if (active) { setNotes({}); setLoadedKey('error:' + cacheKey); setNotice('端末内メモを読み込めませんでした。内容を保護するため、保存は停止しています。'); }
    });
    return () => { active = false; };
  }, [enabled, cacheKey]);

  React.useEffect(() => {
    if (!enabled || loadedKey !== cacheKey) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      savePersonalNotes(room.code, uid, notes, gameStartedAt)
        .then(() => setNotice('端末内に保存'))
        .catch(() => setNotice('保存できませんでした'));
    }, 220);
    return () => { if (timer.current) window.clearTimeout(timer.current); };
  }, [enabled, loadedKey, cacheKey, notes]);

  if (!enabled) return null;
  const update = (id: string, patch: any) => setNotes((current: any) => updatePersonalNote(current, id, {
    ...patch,
    phase: `第${room.round || 1}日目 · ${notePhases[room.phase] || room.phase}`,
    time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
  }));
  return <>
    <button className="personal-notes-trigger" type="button" onClick={() => setOpen(true)}>✎ 推理メモ</button>
    {open && <div className="personal-notes-scrim" role="presentation" onClick={() => setOpen(false)}>
      <section className="personal-notes-drawer" role="dialog" aria-modal="true" aria-labelledby="personal-notes-title" onClick={event => event.stopPropagation()}>
        <div className="personal-notes-heading"><div><div className="eyebrow">PRIVATE NOTES · THIS DEVICE ONLY</div><h2 id="personal-notes-title">推理メモ</h2></div><button type="button" className="secondary" onClick={() => setOpen(false)}>閉じる</button></div>
        <p className="personal-notes-privacy">このメモはこの端末だけに保存され、Firebaseには送信されません。他の参加者や管理者にも見えません。</p>
        <small className="personal-notes-save" role="status">{loadedKey === cacheKey || loadedKey === 'error:' + cacheKey ? notice : 'メモを読み込み中…'}</small>
        <div className="personal-notes-list">{(room.players || []).filter((player: any) => player.uid !== uid).map((player: any) => {
          const item = notes[player.uid] || emptyPersonalNote();
          return <article className="personal-note-card" key={player.uid}>
            <header><b>{player.name}</b><span className={player.alive ? 'note-alive' : 'note-dead'}>{player.alive ? '生存' : '死亡'}</span></header>
            <small className="personal-note-timestamp">{item.phase ? `${item.phase} ・ ${item.time}` : 'まだ記録はありません'}</small>
            <label>役職予想<select className={item.prediction ? (['人狼', '狂人', '狂言者'].includes(item.prediction) ? 'prediction-wolf' : 'prediction-village') : ''} value={item.prediction} onChange={event => update(player.uid, { prediction: event.target.value })}><option value="">まだ決めない</option>{noteRoles.map(role => <option key={role} value={role}>{role}</option>)}</select></label>
            <label>信頼度<select value={item.confidence} onChange={event => update(player.uid, { confidence: event.target.value })}><option value="unknown">不明</option><option value="trust">信頼</option><option value="suspicious">怪しい</option></select></label>
            <label>メモ<textarea rows={2} maxLength={500} value={item.note} placeholder="発言や行動の気づきを記録" onChange={event => update(player.uid, { note: event.target.value })}/></label>
          </article>;
        })}</div>
      </section>
    </div>}
  </>;
}
