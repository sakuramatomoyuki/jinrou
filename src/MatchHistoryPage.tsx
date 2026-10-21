import React from 'react';
import { deleteMatchHistory, loadMatchHistory, type MatchHistoryRecord } from './matchHistory';

export function MatchHistoryPage({ onBack }: { onBack: () => void }) {
  const [items, setItems] = React.useState<MatchHistoryRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [selected, setSelected] = React.useState<string | null>(null);
  const reload = () => loadMatchHistory().then(setItems).catch(() => setError('この端末の履歴を読み込めませんでした。')).finally(() => setLoading(false));
  React.useEffect(() => { void reload(); }, []);
  const remove = async (id?: string) => {
    if (!window.confirm(id ? 'この試合履歴を削除しますか？' : 'この端末の試合履歴をすべて削除しますか？')) return;
    try { await deleteMatchHistory(id); setSelected(null); await reload(); }
    catch { setError('履歴を削除できませんでした。'); }
  };
  const stamp = (time: number | null) => time ? new Date(time).toLocaleString('ja-JP', { dateStyle: 'medium', timeStyle: 'short' }) : '時刻不明';
  const current = items.find(item => item.id === selected);
  return <section className="panel match-history-page">
    <button className="back" onClick={onBack}>← 戻る</button>
    <div className="eyebrow">LOCAL CHRONICLE · THIS DEVICE</div>
    <div className="history-title-row"><div><h2>試合履歴</h2><p className="muted">この端末だけに保存された直近20試合です。</p></div>{items.length > 0 && <button className="danger" onClick={() => void remove()}>すべて削除</button>}</div>
    <p className="personal-notes-privacy">履歴はFirebaseへ送信・同期されません。投票先はルームの公開設定に従って記録されます。</p>
    {error && <p className="error" role="alert">{error}</p>}
    {loading ? <p>読み込み中…</p> : items.length === 0 ? <div className="history-empty"><span>📜</span><h3>まだ試合履歴がありません</h3><p>試合が終了すると、この端末に記録されます。</p></div> : <div className="history-layout">
      <div className="history-list">{items.map(item => <article className={`history-item ${selected === item.id ? 'selected' : ''}`} key={item.id}><button className="history-open" onClick={() => setSelected(item.id)}><small>{stamp(item.endedAt)}</small><b>{item.winner}</b><span>{item.rounds}日目まで ・ {item.roles.length}人</span></button><button className="history-delete" aria-label="この履歴を削除" onClick={() => void remove(item.id)}>×</button></article>)}</div>
      {current && <article className="history-detail"><header><div><small>{stamp(current.endedAt)} ・ ルーム {current.roomCode}</small><h3>{current.winner}</h3><p>{current.rounds}日目まで</p></div><button className="secondary" onClick={() => setSelected(null)}>閉じる</button></header>
        <details open><summary>役職と最終状態</summary><div className="history-role-grid">{current.roles.map(player => <div className={player.alive ? 'note-alive' : 'note-dead'} key={player.uid}><b>{player.name}</b><span>{player.role}</span><small>{player.alive ? '生存' : '死亡'}</small></div>)}</div></details>
        {current.votes.length > 0 && <details><summary>投票履歴</summary>{current.votes.map((vote:any,index:number) => <section className="history-event" key={index}><b>第{index+1}回</b>{vote.counts?.map((entry:any)=><p key={entry.uid}>{entry.name}：{entry.votes}票</p>)}<p>無投票：{vote.abstainCount||0}人</p>{vote.ballot?.map((entry:any)=><small key={entry.voter}>{entry.voterName} → {entry.targetName}<br/></small>)}</section>)}</details>}
        {current.nightActions.length > 0 && <details><summary>夜の行動と結果</summary>{current.nightActions.map((night:any,index:number)=><section className="history-event" key={`${night.round}:${index}`}><b>第{night.round}夜</b><p>{night.result?.killed ? `${night.result.killed}が襲撃されました` : night.result?.guarded ? '襲撃は防がれました' : '襲撃はありませんでした'}</p>{night.actions?.map((action:any)=><small key={action.uid}>{action.name}（{action.role}）：{action.target||'行動なし'}{action.result?.result?`・${action.result.result}`:''}{action.suspicionTarget?`・怪しい人 ${action.suspicionTarget}`:''}<br/></small>)}</section>)}</details>}
        {current.publicLogs.length > 0 && <details><summary>ゲームの記録</summary>{current.publicLogs.map((event:any,index:number)=><p className="history-log" key={`${event.at}:${index}`}><time>{stamp(event.at)}</time> {event.message}</p>)}</details>}
        {current.adminLogs && current.adminLogs.length > 0 && <details><summary>管理記録（管理者のみ）</summary>{current.adminLogs.map((event:any,index:number)=><p className="history-log" key={`${event.at}:${index}`}><time>{stamp(event.at)}</time> {event.message}</p>)}</details>}
      </article>}
    </div>}
  </section>;
}
