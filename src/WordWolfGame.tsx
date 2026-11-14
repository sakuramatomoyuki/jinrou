import React from 'react';

type Props = {
  room: any;
  busy: boolean;
  act: (action: any) => void;
  activeSeat?: any;
  openSeat: (seat: any) => void;
  confirmSeat: () => void;
  hideSeat: () => void;
  onSendChat?: (message: string) => void;
};

export function WordWolfSetup({ settings, busy, act }: { settings: any; busy: boolean; act: (action: any) => void }) {
  const initial = settings?.wordWolf || {};
  const [majority, setMajority] = React.useState(String(initial.topicA || ''));
  const [minority, setMinority] = React.useState(String(initial.topicB || ''));
  React.useEffect(() => { setMajority(String(initial.topicA || '')); setMinority(String(initial.topicB || '')); }, [initial.topicA, initial.topicB]);
  const patch = (values: any) => act({ type: 'setWordWolfSettings', settings: { ...initial, ...values } });
  return <section className="ww-setup"><h4>ワードウルフの設定</h4><div className="ww-setup-grid">
    <label>議論時間<select value={initial.discussionSeconds || 60} disabled={busy} onChange={e => patch({ discussionSeconds: Number(e.target.value) })}>{Array.from({ length: 10 }, (_, i) => (i + 1) * 30).map(n => <option key={n} value={n}>{n < 60 ? `${n}秒` : `${Math.floor(n / 60)}分${n % 60 ? `${n % 60}秒` : ''}`}</option>)}</select></label>
    <label>投票時間<select value={initial.voteSeconds || 30} disabled={busy} onChange={e => patch({ voteSeconds: Number(e.target.value) })}>{Array.from({ length: 10 }, (_, i) => (i + 1) * 30).map(n => <option key={n} value={n}>{n < 60 ? `${n}秒` : `${Math.floor(n / 60)}分${n % 60 ? `${n % 60}秒` : ''}`}</option>)}</select></label>
    <label>少数派の人数<select value={initial.minorityCount ?? 'quarter'} disabled={busy} onChange={e => patch({ minorityCount: e.target.value === 'quarter' ? 'quarter' : Number(e.target.value) })}><option value="quarter">参加人数の4分の1（切り捨て・最低1人）</option>{Array.from({ length: Math.max(1, Math.min(9, settings.playerCount - 1)) }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}人</option>)}</select></label>
    <label>お題の用意<select value={initial.wordSource || 'app'} disabled={busy} onChange={e => patch({ wordSource: e.target.value })}><option value="app">アプリからランダム</option><option value="host">ホストが入力</option></select></label>
  </div>{initial.wordSource === 'host'&&<div className="ww-topic-pair"><label>お題 A<input maxLength={40} value={majority} onChange={e => setMajority(e.target.value.slice(0, 40))} placeholder="例：コーヒー"/></label><label>お題 B<input maxLength={40} value={minority} onChange={e => setMinority(e.target.value.slice(0, 40))} placeholder="例：紅茶"/></label><button className="secondary" disabled={busy||!majority.trim()||!minority.trim()||majority.trim()===minority.trim()} onClick={() => patch({ topicA: majority.trim(), topicB: minority.trim() })}>お題を保存</button></div>}
  <div className="ww-point-options"><label><input type="checkbox" checked={initial.pointsEnabled!==false} disabled={busy} onChange={e => patch({ pointsEnabled: e.target.checked, addRoomPoints: e.target.checked && !!settings.pointsEnabled })}/>ゲーム内ポイントを有効にする</label><label><input type="checkbox" checked={!!settings.pointsEnabled&&initial.addRoomPoints!==false} disabled={busy||!settings.pointsEnabled||initial.pointsEnabled===false} onChange={e => patch({ addRoomPoints: e.target.checked })}/>ルーム累計に加算する</label></div></section>;
}

export function WordWolfGame({ room, busy, act, activeSeat, openSeat, confirmSeat, hideSeat, onSendChat }: Props) {
  const [target, setTarget] = React.useState('');
  const [confirmed, setConfirmed] = React.useState(false);
  const [guess, setGuess] = React.useState('');
  const [chatDraft, setChatDraft] = React.useState('');
  const [remaining, setRemaining] = React.useState(0);
  const phase = room.phase;
  const game = room.miniGame || {};
  const secret = room.secret?.miniGame;
  const shared = ['shared', 'hybrid'].includes(room.settings?.method);
  const eligible = (room.players || []).filter((p: any) => p.alive && p.connected);
  const me = room.players?.find((p: any) => p.uid === (activeSeat?.uid || room.secret?.me?.uid));
  const nextUid = room.sharedTurnUid || room.gm?.sharedTurnUid;
  const nextPlayer = room.players?.find((p: any) => p.uid === nextUid);
  const deadline = Number(game.deadline || room.deadline || 0);
  const display = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

  React.useEffect(() => {
    setTarget(''); setConfirmed(false); setGuess(''); setChatDraft('');
  }, [phase, room.round]);
  React.useEffect(() => {
    if (!deadline) { setRemaining(0); return; }
    const update = () => setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    update(); const timer = window.setInterval(update, 250);
    return () => window.clearInterval(timer);
  }, [deadline]);

  const waiting = (title: string, detail: string) => <section className="ww-stage"><span className="ww-sigil">♧</span><h2>{title}</h2><p>{detail}</p><div className="ww-progress">{game.readyCount ?? game.voteCount ?? game.guessCount ?? 0} / {game.readyTotal ?? game.voteCount ?? game.guessTotal ?? eligible.length}</div></section>;
  const handoff = (kind: 'word' | 'vote' | 'guess') => {
    if (!shared || !nextPlayer) return null;
    if (!activeSeat) return <section className="ww-handoff"><p>端末を <b>{nextPlayer.name}</b> さんに渡してください</p><button className="primary wide" onClick={() => openSeat(nextPlayer)}>端末を渡した</button></section>;
    if (activeSeat.awaiting) return <section className="ww-handoff"><p><b>{activeSeat.name}</b> さんですか？</p><button className="primary wide" onClick={confirmSeat}>はい、操作を始める</button><button className="secondary wide" onClick={hideSeat}>いいえ、画面を隠す</button></section>;
    if (!secret || activeSeat.uid !== nextUid) return <section className="ww-handoff"><p>個人情報を準備しています…</p><button className="secondary wide" onClick={hideSeat}>画面を隠す</button></section>;
    if (kind === 'word' && secret.hasRead) return <section className="ww-handoff"><p>お題の確認は完了しています。</p><button className="secondary wide" onClick={hideSeat}>画面を隠す</button></section>;
    if (kind === 'vote' && secret.hasVoted) return <section className="ww-handoff"><p>投票は完了しています。</p><button className="secondary wide" onClick={hideSeat}>画面を隠す</button></section>;
    return null;
  };

  if (phase === 'wordwolf-word') {
    const gate = handoff('word');
    if (gate) return <div className="wordwolf-screen"><header><span>ワードウルフ</span><small>お題の確認</small></header>{gate}</div>;
    if (!secret?.word) return <div className="wordwolf-screen">{waiting('自分のお題を確認してください', '確認後、全員がそろうと議論が始まります。')}</div>;
    return <div className="wordwolf-screen"><header><span>ワードウルフ</span><small>あなたは{secret.side}</small></header><section className="ww-private-card"><span>あなたのお題</span><strong>{secret.word}</strong><p>この言葉は、ほかの人に見せないでください。</p><button className="primary wide" disabled={busy || secret.hasRead} onClick={() => act({ type: 'wordRead' })}>お題を確認した</button></section>{shared&&<button className="secondary wide ww-hide" onClick={hideSeat}>画面を隠す</button>}{!shared&&secret.hasRead&&waiting('ほかの人を待っています…', `${game.readyCount || 0} / ${game.readyTotal || eligible.length}人がお題を確認しました。`)}</div>;
  }
  if (phase === 'wordwolf-discussion') return <div className="wordwolf-screen"><header><span>ワードウルフ</span><small>議論</small></header><section className="ww-stage"><span className="ww-sigil">☾</span><h2>会話から違いを探そう</h2><p>お題の名前を直接言わずに、みんなで話し合ってください。</p><strong className="ww-timer">{display(remaining)}</strong></section></div>;
  if (phase === 'wordwolf-vote') {
    const gate = handoff('vote');
    if (gate) return <div className="wordwolf-screen"><header><span>ワードウルフ</span><small>投票</small></header>{gate}</div>;
    if (secret?.hasVoted) return <div className="wordwolf-screen"><header><span>ワードウルフ</span><small>投票</small></header>{waiting('投票しました', 'ほかの人の投票を待っています…')}</div>;
    const choose = (value: string) => { setTarget(value); setConfirmed(false); };
    const submit = () => { if (!target) return; act({ type: 'wordVote', target }); setConfirmed(false); };
    return <div className="wordwolf-screen"><header><span>ワードウルフ</span><small>投票 · {display(remaining)}</small></header><section className="ww-vote-card"><h2>少数派だと思う人は？</h2><p>投票先は、投票が終わるまで公開されません。</p><div className="ww-candidates">{eligible.filter((p: any) => p.uid !== me?.uid).map((p: any) => <button key={p.uid} className={target === p.uid ? 'selected' : ''} onClick={() => choose(p.uid)}>{p.name}</button>)}<button className={target === '__abstain__' ? 'selected' : ''} onClick={() => choose('__abstain__')}>無投票</button></div>{confirmed?<div className="ww-confirm"><b>{target === '__abstain__' ? '無投票' : `${room.players.find((p: any) => p.uid === target)?.name}さん`}に投票しますか？</b><button className="primary wide" disabled={busy} onClick={submit}>はい、投票する</button><button className="secondary wide" onClick={() => setConfirmed(false)}>選び直す</button></div>:<button className="primary wide" disabled={!target} onClick={() => setConfirmed(true)}>投票先を確認</button>}</section></div>;
  }
  if (phase === 'wordwolf-guess') {
    const gate = handoff('guess');
    if (gate) return <div className="wordwolf-screen"><header><span>ワードウルフ</span><small>少数派の逆推理</small></header>{gate}</div>;
    if (secret?.side !== '少数派') return <div className="wordwolf-screen"><header><span>ワードウルフ</span><small>少数派の逆推理</small></header>{waiting('少数派が答えを考えています…', 'お題 Aが当たるか見届けましょう。')}</div>;
    if (secret?.guess) return <div className="wordwolf-screen"><header><span>ワードウルフ</span><small>少数派の逆推理</small></header>{waiting('回答しました', '少数派全員の回答を待っています…')}{room.settings?.method==='individual'&&<WordWolfChat messages={secret.chat||[]} value={chatDraft} onChange={setChatDraft} onSend={()=>{if(chatDraft.trim()){onSendChat?.(chatDraft.trim());setChatDraft('')}}} busy={busy}/>}</div>;
    return <div className="wordwolf-screen"><header><span>ワードウルフ</span><small>残り {display(remaining)}</small></header><section className="ww-private-card"><span>少数派の番です</span><h2>お題 Aは何だった？</h2><input value={guess} onChange={e => setGuess(e.target.value.slice(0, 60))} maxLength={60} placeholder="お題 Aを入力"/><button className="primary wide" disabled={!guess.trim() || busy} onClick={() => act({ type: 'wordGuess', guess: guess.trim() })}>回答する</button></section>{room.settings?.method==='individual'&&<WordWolfChat messages={secret.chat||[]} value={chatDraft} onChange={setChatDraft} onSend={()=>{if(chatDraft.trim()){onSendChat?.(chatDraft.trim());setChatDraft('')}}} busy={busy}/>}</div>;
  }
  if (phase === 'wordwolf-result') return <div className="wordwolf-screen ww-result-screen"><header><span>ワードウルフ</span><small>結果発表</small></header><section className="ww-result"><div className="eyebrow">REVEAL</div><h2>{game.caught ? (game.guessCorrect?'少数派の逆推理が的中':'少数派が見つかりました') : '少数派は逃げ切りました'}</h2>{game.caught&&<p>少数派の逆推理：{game.guessCorrect?'正解':'不正解'}</p>}<div className="ww-words"><div><small>お題 A</small><b>{game.majorityWord}</b></div><div><small>お題 B</small><b>{game.minorityWord}</b></div></div><div className="ww-results-list">{(game.results||[]).map((row: any) => <div key={row.uid}><b>{row.name}</b><span>{row.side} · {row.word}</span><strong>+{row.points} pt</strong>{room.settings.pointsEnabled&&<small>ルーム累計 {row.roomPoints} pt</small>}</div>)}</div>{room.canManage?<><button className="primary wide" disabled={busy} onClick={() => act({ type: room.settings.pointsEnabled?'showRanking':'nextGameSetup' })}>{room.settings.pointsEnabled?'次へ（ルーム累計を見る）':'次のゲームを選ぶ'}</button>{room.settings.pointsEnabled&&<button className="secondary wide" disabled={busy} onClick={() => act({ type: 'nextGameSetup' })}>別のゲームを選ぶ</button>}</>:<p>ホストが次へ進めるまでお待ちください。</p>}</section></div>;
  return null;
}


function WordWolfChat({messages,value,onChange,onSend,busy}:{messages:any[];value:string;onChange:(value:string)=>void;onSend:()=>void;busy:boolean}) {
  return <section className="ww-chat"><header><b>少数派だけの相談</b><small>ここでの会話は多数派には表示されません</small></header><div className="ww-chat-messages">{messages.map((message:any)=><p key={message.id}><b>{message.name}</b><span>{message.text}</span></p>)}{messages.length===0&&<small>まだ会話はありません</small>}</div><div className="ww-chat-compose"><input value={value} maxLength={300} placeholder="相談を入力" onChange={event=>onChange(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'&&!event.shiftKey&&value.trim()){event.preventDefault();onSend()}}}/><button className="primary" disabled={busy||!value.trim()} onClick={onSend}>送信</button></div></section>;
}
