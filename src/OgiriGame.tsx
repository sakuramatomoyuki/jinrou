import React from 'react';
import type { OgiriSettings } from './gameCatalog';

type Props = { room:any; busy:boolean; act:(action:any)=>void; activeSeat?:any; openSeat:(seat:any)=>void; confirmSeat:()=>void; hideSeat:()=>void };
const options = (settings:any) => settings?.ogiri || {mode:'normal',scoring:'fun',threshold:.5,questionCount:5,inputMode:'either',judgeMode:'all',promptSource:'app',pointsEnabled:true,addRoomPoints:true};

export function OgiriSetup({settings,busy,act}:{settings:any;busy:boolean;act:(action:any)=>void}) {
  const initial:OgiriSettings=options(settings);
  const patch=(value:Partial<OgiriSettings>)=>act({type:'setOgiriSettings',settings:{...initial,...value}});
  return <section className="ogiri-setup"><h4>大喜利の設定</h4><div className="ogiri-setup-grid">
    <label>進行形式<select value={initial.mode} disabled={busy} onChange={e=>patch({mode:e.target.value as any})}><option value="normal">全員で最後まで</option><option value="survive">合格ライン方式</option><option value="knockout">最下位脱落方式</option></select></label>
    <label>採点方法<select value={initial.scoring} disabled={busy} onChange={e=>patch({scoring:e.target.value as any})}><option value="fun">面白い／普通</option><option value="ten-point">0〜10点</option></select></label>
    <label>合格ライン <b>{Math.round(initial.threshold*100)}%</b><input type="range" min="0" max="100" value={Math.round(initial.threshold*100)} disabled={busy||initial.mode==='normal'} onChange={e=>patch({threshold:Number(e.target.value)/100})}/></label>
    <label>出題数<select value={initial.questionCount} disabled={busy} onChange={e=>patch({questionCount:Number(e.target.value)})}>{Array.from({length:18},(_,i)=>i+3).map(n=><option key={n} value={n}>{n}問</option>)}</select></label>
    <label>回答方法<select value={initial.inputMode} disabled={busy} onChange={e=>patch({inputMode:e.target.value as any})}><option value="text">文字</option><option value="drawing">お絵描き</option><option value="either">文字・お絵描きから選ぶ</option></select></label>
    <label>お題<select value={initial.promptSource} disabled={busy} onChange={e=>patch({promptSource:e.target.value as any})}><option value="app">アプリのお題</option><option value="host">ホストが入力</option></select></label>
    <label>採点する人<select value={initial.judgeMode} disabled={busy} onChange={e=>patch({judgeMode:e.target.value as any})}><option value="all">回答者全員</option><option value="host">ホストだけ</option></select></label>
  </div><div className="ogiri-points"><label><input type="checkbox" checked={initial.pointsEnabled} disabled={busy} onChange={e=>patch({pointsEnabled:e.target.checked,addRoomPoints:e.target.checked&&settings.pointsEnabled})}/> 試合ポイントを付ける</label><label><input type="checkbox" checked={initial.addRoomPoints&&settings.pointsEnabled} disabled={busy||!initial.pointsEnabled||!settings.pointsEnabled} onChange={e=>patch({addRoomPoints:e.target.checked})}/> ルーム累計にも加算</label></div><p>面白い／普通は面白い票の割合、0〜10点は平均点を基準にします。自分の回答には採点できません。</p></section>;
}

export function OgiriGame({room,busy,act,activeSeat,openSeat,confirmSeat,hideSeat}:Props) {
  const game=room.miniGame||{},secret=room.secret?.miniGame||{},cfg=game.settings||options(room.settings),[prompt,setPrompt]=React.useState(''),[answerMode,setAnswerMode]=React.useState<'text'|'drawing'>('text'),[text,setText]=React.useState(''),[rated,setRated]=React.useState<Record<string,number>>({}),[canvasKey,setCanvasKey]=React.useState(0);
  const [drawingRef,answerCanvas]=useDrawingCanvas(canvasKey);
  React.useEffect(()=>{setPrompt('');setText('');setRated({});setCanvasKey(value=>value+1)},[room.phase,game.round]);
  React.useEffect(()=>{if(room.phase==='ogiri-judge')setRated(secret.ratings||{})},[room.phase,game.round,secret.ratings]);
  React.useEffect(()=>{if(cfg.inputMode==='drawing')setAnswerMode('drawing');else if(cfg.inputMode==='text')setAnswerMode('text')},[cfg.inputMode]);
  const shared=['shared','hybrid'].includes(room.settings?.method),uid=activeSeat?.uid||room.secret?.me?.uid,me=room.players?.find((player:any)=>player.uid===uid),next=room.players?.find((player:any)=>player.uid===room.sharedTurnUid);
  const handoff=()=>{if(!shared||!next||activeSeat&&!activeSeat.awaiting&&activeSeat.uid===next.uid)return null;if(!activeSeat)return <section className="ogiri-handoff"><p>端末を <b>{next.name}</b> さんに渡してください</p><button className="primary wide" onClick={()=>openSeat(next)}>端末を渡した</button></section>;if(activeSeat.awaiting)return <section className="ogiri-handoff"><p><b>{activeSeat.name}</b> さんですか？</p><button className="primary wide" onClick={confirmSeat}>はい、操作を始める</button><button className="secondary wide" onClick={hideSeat}>いいえ、画面を隠す</button></section>;return null};
  const gate=handoff();if(room.viewerKind==='spectator'&&!room.canManage&&room.phase!=='ogiri-result')return <div className="ogiri-screen"><header>大喜利</header><section className="ogiri-wait"><h2>回答と採点の進行を観戦中</h2><p>採点の集計後に結果が表示されます。</p></section></div>;if(gate)return <div className="ogiri-screen"><header>大喜利 <small>第{game.round||1}問</small></header>{gate}</div>;
  if(room.phase==='ogiri-question')return <div className="ogiri-screen"><header>大喜利 <small>第{game.round}問 / {cfg.questionCount}問</small></header>{room.canManage?<section className="ogiri-card"><h2>お題を入力</h2><textarea maxLength={120} value={prompt} onChange={e=>setPrompt(e.target.value.slice(0,120))} placeholder="例：絶対に売れない薬の名前は？"/><button className="primary wide" disabled={busy||!prompt.trim()} onClick={()=>act({type:'ogiriSetPrompt',prompt:prompt.trim()})}>回答を始める</button></section>:<section className="ogiri-wait"><h2>ホストがお題を準備しています</h2><p>少しお待ちください。</p></section>}</div>;
  if(room.phase==='ogiri-answer') {
    if(secret.hasAnswered||!room.secret?.me)return <div className="ogiri-screen"><header>大喜利 <small>第{game.round}問</small></header><section className="ogiri-wait"><h2>回答を受け付けました</h2><p>全員の回答がそろうと採点が始まります。</p><b>{game.answerCount} / {game.answerTotal}</b></section></div>;
    const save=()=>{const answer=answerMode==='text'?{mode:'text',text}:{mode:'drawing',dataUrl:answerCanvas()};act({type:'ogiriAnswer',answer})};
    return <div className="ogiri-screen"><header>大喜利 <small>第{game.round}問 · 回答</small></header><section className="ogiri-card"><small>お題</small><h2>{game.prompt}</h2>{cfg.inputMode==='either'&&<div className="ogiri-tabs"><button className={answerMode==='text'?'active':''} onClick={()=>setAnswerMode('text')}>文字で回答</button><button className={answerMode==='drawing'?'active':''} onClick={()=>setAnswerMode('drawing')}>絵で回答</button></div>}{answerMode==='text'?<textarea maxLength={200} value={text} onChange={e=>setText(e.target.value.slice(0,200))} placeholder="回答を入力（200文字まで）"/>:<OgiriCanvas key={canvasKey} canvasRef={drawingRef}/>}<button className="primary wide" disabled={busy||answerMode==='text'&&!text.trim()} onClick={save}>回答を送信</button></section></div>;
  }
  if(room.phase==='ogiri-judge') {
    const answers=game.answers||[],targets=answers.filter((item:any)=>item.uid!==uid),hostJudge=cfg.judgeMode==='host';
    if(hostJudge&&!room.canManage||!room.canManage&&(!room.secret?.me||secret.hasJudged)||!room.secret?.me&&!room.canManage)return <div className="ogiri-screen"><header>大喜利 <small>第{game.round}問 · 採点</small></header><section className="ogiri-wait"><h2>{hostJudge?'ホストが採点しています':'採点を受け付けました'}</h2><p>全員の採点が終わるまでお待ちください。</p></section></div>;
    const mark=(target:string,rating:number)=>{setRated(old=>({...old,[target]:rating}));act({type:'ogiriJudge',target,rating})};
    return <div className="ogiri-screen"><header>大喜利 <small>第{game.round}問 · 採点</small></header><section className="ogiri-judging"><h2>{hostJudge?'回答を採点してください':'ほかの人の回答を採点してください'}</h2><p>自分の回答には採点できません。</p>{targets.map((item:any)=><article className="ogiri-submission" key={item.uid}><b>{item.name}さんの回答</b>{item.mode==='drawing'?<img src={item.dataUrl} alt="回答の絵"/>:<p>{item.text}</p>}<div className="ogiri-rating">{cfg.scoring==='fun'?<><button className={rated[item.uid]===1?'selected':''} onClick={()=>mark(item.uid,1)}>面白い</button><button className={rated[item.uid]===0?'selected':''} onClick={()=>mark(item.uid,0)}>普通</button></>:Array.from({length:11},(_,score)=><button className={rated[item.uid]===score?'selected':''} key={score} onClick={()=>mark(item.uid,score)}>{score}</button>)}</div></article>)}{room.canManage&&<button className="secondary wide" disabled={busy} onClick={()=>act({type:'ogiriCloseJudging'})}>未採点を0点にして集計</button>}</section></div>;
  }
  if(room.phase==='ogiri-result') {
    const list=game.finished?game.finalRanking:game.roundRanking||[];
    return <div className="ogiri-screen"><header>大喜利 <small>{game.finished?'最終順位':`第${game.round}問の結果`}</small></header><section className="ogiri-card ogiri-results"><h2>{game.finished?'大喜利の結果':'採点結果'}</h2>{!game.finished&&<ol>{list.map((entry:any)=><li key={entry.uid}><b>{entry.name}</b><span>{cfg.scoring==='fun'?`${Math.round(entry.average*100)}% 面白い`:`${entry.average.toFixed(1)} 点`}</span></li>)}</ol>}{game.finished&&<ol>{list.map((entry:any,index:number)=><li key={entry.uid} className={entry.eliminated?'eliminated':''}><b>{index+1}位 · {entry.name}</b><span>{entry.gamePoints.toFixed(1)} pt{entry.eliminated?' · 脱落':''}</span></li>)}</ol>}{game.finished&&room.canManage?<><button className="primary wide" disabled={busy} onClick={()=>act({type:room.settings.pointsEnabled?'showRanking':'nextGameSetup'})}>{room.settings.pointsEnabled?'次へ（ルーム累計を見る）':'次のゲームを選ぶ'}</button>{room.settings.pointsEnabled&&<button className="secondary wide" disabled={busy} onClick={()=>act({type:'nextGameSetup'})}>別のゲームを選ぶ</button>}</>:game.finished?<p>ホストが次へ進めるまでお待ちください。</p>:room.canManage?<button className="primary wide" disabled={busy} onClick={()=>act({type:'ogiriAdvance'})}>次のお題へ</button>:<p>ホストが次のお題へ進めるまでお待ちください。</p>}</section></div>;
  }
  return null;
}

function useDrawingCanvas(reset:number):[React.RefObject<HTMLCanvasElement>,()=>string] {
  const ref=React.useRef<HTMLCanvasElement>(null);
  React.useEffect(()=>{const canvas=ref.current;if(!canvas)return;const context=canvas.getContext('2d');if(context){context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.strokeStyle='#171b23';context.lineWidth=5;context.lineCap='round'}},[reset]);
  const drawing=()=>ref.current?.toDataURL('image/png')||'';
  return [ref,drawing];
}
function OgiriCanvas({canvasRef}:{canvasRef:React.RefObject<HTMLCanvasElement>}) {
  const draw=React.useRef(false);const point=(event:React.PointerEvent<HTMLCanvasElement>)=>{const canvas=canvasRef.current,context=canvas?.getContext('2d');if(!canvas||!context)return;const rect=canvas.getBoundingClientRect();return {x:(event.clientX-rect.left)*canvas.width/rect.width,y:(event.clientY-rect.top)*canvas.height/rect.height,context}};
  return <div className="ogiri-drawing"><canvas ref={canvasRef} width={800} height={500} onPointerDown={event=>{const p=point(event);if(!p)return;draw.current=true;p.context.beginPath();p.context.moveTo(p.x,p.y);event.currentTarget.setPointerCapture(event.pointerId)}} onPointerMove={event=>{if(!draw.current)return;const p=point(event);if(p){p.context.lineTo(p.x,p.y);p.context.stroke()}}} onPointerUp={()=>{draw.current=false}} onPointerCancel={()=>{draw.current=false}}/><button className="secondary" onClick={()=>{const c=canvasRef.current?.getContext('2d'),canvas=canvasRef.current;if(c&&canvas){c.fillStyle='#fff';c.fillRect(0,0,canvas.width,canvas.height)}}}>消す</button></div>;
}
