import React from 'react';
import { shouldHandoffToSharedSeat } from './sharedMode';

type Props = { room:any; busy:boolean; act:(action:any)=>void; activeSeat?:any; openSeat:(seat:any)=>void; confirmSeat:()=>void; hideSeat:()=>void };

export function SurveySetup({settings,busy,act}:{settings:any;busy:boolean;act:(action:any)=>void}) {
  const initial=settings?.survey||{source:'sequential',maxQuestions:5};
  return <section className="survey-setup"><h4>匿名アンケートの設定</h4><label>質問の用意<select value={initial.source} disabled={busy} onChange={event=>act({type:'setSurveySettings',settings:{...initial,source:event.target.value}})}><option value="sequential">参加者が順番に質問を作る</option><option value="host">ホストが質問を用意する</option></select></label><label>質問数<select value={initial.maxQuestions} disabled={busy} onChange={event=>act({type:'setSurveySettings',settings:{...initial,maxQuestions:Number(event.target.value)}})}>{Array.from({length:20},(_,index)=>index+1).map(number=><option key={number} value={number}>{number}問</option>)}</select></label><p>回答者の名前と回答内容は結び付けず、全員の回答後に集計だけを公開します。匿名アンケートではポイントを加算しません。</p></section>;
}

export function SurveyGame({room,busy,act,activeSeat,openSeat,confirmSeat,hideSeat}:Props) {
  const game=room.miniGame||{},secret=room.secret?.miniGame||{},question=game.question;
  const [prompt,setPrompt]=React.useState(''),[type,setType]=React.useState<'single'|'multiple'|'text'|'boolean'>('single'),[options,setOptions]=React.useState(''),[answer,setAnswer]=React.useState<string|string[]>('');
  React.useEffect(()=>{setPrompt('');setOptions('');setAnswer('')},[room.phase,game.questionIndex,question?.id]);
  const shared=['shared','hybrid'].includes(room.settings?.method),uid=activeSeat?.uid||room.secret?.me?.uid,player=room.players?.find((item:any)=>item.uid===uid),next=room.players?.find((item:any)=>item.uid===room.sharedTurnUid);
  const handoff=()=>{
    if(!shouldHandoffToSharedSeat(room.settings?.method,next,activeSeat))return null;
    if(!activeSeat)return <section className="survey-handoff"><p>端末を <b>{next.name}</b> さんに渡してください</p><button className="primary wide" onClick={()=>openSeat(next)}>端末を渡した</button></section>;
    if(activeSeat.awaiting)return <section className="survey-handoff"><p><b>{activeSeat.name}</b> さんですか？</p><button className="primary wide" onClick={confirmSeat}>はい、操作を始める</button><button className="secondary wide" onClick={hideSeat}>いいえ、画面を隠す</button></section>;
    return null;
  };
  const gate=handoff();
  if(room.viewerKind==='spectator')return <div className="survey-screen"><header>匿名アンケート</header><section className="survey-wait"><h2>匿名の進行を観戦中</h2><p>回答の締切後に集計結果が表示されます。</p></section></div>;
  if(gate)return <div className="survey-screen"><header>匿名アンケート</header>{gate}</div>;
  if(room.phase==='survey-question') {
    const hostQuestion=game.source==='host',isAuthor=hostQuestion?room.canManage:uid===room.sharedTurnUid||room.canManage;
    if(!isAuthor)return <div className="survey-screen"><header>匿名アンケート <small>質問づくり</small></header><section className="survey-wait"><h2>質問を準備しています</h2><p>質問ができるまでお待ちください。</p></section></div>;
    const choices=options.split('\n').map(value=>value.trim()).filter(Boolean);
    return <div className="survey-screen"><header>匿名アンケート <small>第{game.questionIndex+1}問 / {game.maxQuestions}問</small></header><section className="survey-card"><h2>{hostQuestion?'質問を作成':'あなたが質問を作る番です'}</h2><label>質問文<textarea maxLength={120} value={prompt} onChange={event=>setPrompt(event.target.value.slice(0,120))} placeholder="例：休日に行きたい場所は？"/></label><label>回答形式<select value={type} onChange={event=>setType(event.target.value as any)}><option value="single">1つ選ぶ</option><option value="multiple">複数選ぶ</option><option value="text">自由記述</option><option value="boolean">はい／いいえ</option></select></label>{['single','multiple'].includes(type)&&<label>選択肢（1行に1つ、2〜10個）<textarea value={options} onChange={event=>setOptions(event.target.value)} placeholder={'海\n山\n街'}/></label>}<button className="primary wide" disabled={busy||!prompt.trim()||(['single','multiple'].includes(type)&&(choices.length<2||choices.length>10||new Set(choices).size!==choices.length))} onClick={()=>act({type:'surveySetQuestion',question:{prompt,type,options:choices}})}>回答を開始する</button></section></div>;
  }
  if(room.phase==='survey-answer') {
    if(secret.hasAnswered||!room.secret?.me)return <div className="survey-screen"><header>匿名アンケート <small>第{game.questionIndex+1}問</small></header><section className="survey-wait"><h2>{secret.hasAnswered?'回答を受け付けました':'ほかの人が回答しています'}</h2><p>ほかの人の回答が終わるまでお待ちください。</p><b>{game.answerCount} / {game.answerTotal}</b>{room.canManage&&<button className="secondary wide" disabled={busy} onClick={()=>act({type:'surveyEndAnswers'})}>回答を締め切って結果を見る</button>}</section></div>;
    const submit=()=>act({type:'surveyAnswer',answer});
    return <div className="survey-screen"><header>匿名アンケート <small>第{game.questionIndex+1}問</small></header><section className="survey-card"><h2>{question?.prompt}</h2>{question?.type==='single'&&<div className="survey-options">{question.options.map((choice:string)=><button key={choice} className={answer===choice?'selected':''} onClick={()=>setAnswer(choice)}>{choice}</button>)}</div>}{question?.type==='multiple'&&<div className="survey-options">{question.options.map((choice:string)=><button key={choice} className={Array.isArray(answer)&&answer.includes(choice)?'selected':''} onClick={()=>setAnswer(current=>{const values=Array.isArray(current)?current:[];return values.includes(choice)?values.filter(value=>value!==choice):[...values,choice]})}>{Array.isArray(answer)&&answer.includes(choice)?'✓ ':''}{choice}</button>)}</div>}{question?.type==='boolean'&&<div className="survey-options"><button className={answer==='はい'?'selected':''} onClick={()=>setAnswer('はい')}>はい</button><button className={answer==='いいえ'?'selected':''} onClick={()=>setAnswer('いいえ')}>いいえ</button></div>}{question?.type==='text'&&<textarea maxLength={80} value={typeof answer==='string'?answer:''} onChange={event=>setAnswer(event.target.value.slice(0,80))} placeholder="回答を入力（80文字まで）"/>}<button className="primary wide" disabled={busy||!answer||(Array.isArray(answer)&&!answer.length)} onClick={submit}>匿名で回答する</button></section></div>;
  }
  if(room.phase==='survey-results') {
    const results=game.results||{},question=game.question||{};
    return <div className="survey-screen"><header>匿名アンケート <small>第{game.questionIndex+1}問の結果</small></header><section className="survey-card survey-result"><h2>{question.prompt}</h2><p>{results.responseCount||0}人が回答</p>{question.type==='text'?<div className="survey-text-results">{(results.responses||[]).map((value:string,index:number)=><blockquote key={index}>{value}</blockquote>)}</div>:<div className="survey-bars">{Object.entries(results.counts||{}).map(([choice,count]:any)=><div key={choice}><span>{choice}</span><b>{count}票 · {results.percentages?.[choice]||0}%</b><i><em style={{width:`${results.percentages?.[choice]||0}%`}}/></i></div>)}</div>}{room.canManage?(game.finished?<><button className="primary wide" disabled={busy} onClick={()=>act({type:room.settings.pointsEnabled?'showRanking':'nextGameSetup'})}>{room.settings.pointsEnabled?'次へ（ルーム累計を見る）':'次のゲームを選ぶ'}</button>{room.settings.pointsEnabled&&<button className="secondary wide" disabled={busy} onClick={()=>act({type:'nextGameSetup'})}>別のゲームを選ぶ</button>}</>:<button className="primary wide" disabled={busy} onClick={()=>act({type:'surveyAdvance'})}>次の質問へ</button>):<p>管理者が次へ進むまでお待ちください。</p>}</section></div>;
  }
  return null;
}
