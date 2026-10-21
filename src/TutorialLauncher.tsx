import React from 'react';
import { canAdvanceTutorial, nextTutorialStep, tutorialSteps, type TutorialProgress } from './tutorial';

const initialProgress: TutorialProgress = { joined: false, roleSeen: false, nightDone: false, voted: false };

export function TutorialLauncher() {
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState(0);
  const [progress, setProgress] = React.useState(initialProgress);
  const [name, setName] = React.useState('月見');
  const [code, setCode] = React.useState('48317');
  const [roleVisible, setRoleVisible] = React.useState(false);
  const [target, setTarget] = React.useState('');
  const [voteTarget, setVoteTarget] = React.useState('');
  const [confirmVote, setConfirmVote] = React.useState(false);

  const start = () => { setStep(0); setProgress(initialProgress); setRoleVisible(false); setTarget(''); setVoteTarget(''); setConfirmVote(false); setOpen(true); };
  const advance = () => setStep(current => nextTutorialStep(current, progress));
  const stepInfo = tutorialSteps[step];

  return <>
    <div className="tutorial-launcher"><span aria-hidden="true">✦</span><div><b>操作を体験してみる</b><small>接続も通信も使わない練習用チュートリアル</small></div><button className="secondary" onClick={start}>体験する</button></div>
    {open && <div className="tutorial-scrim" role="presentation" onClick={() => setOpen(false)}><section className="tutorial-dialog" role="dialog" aria-modal="true" aria-labelledby="tutorial-title" onClick={event => event.stopPropagation()}>
      <header className="tutorial-header"><div><div className="eyebrow">PRACTICE · {step + 1} / {tutorialSteps.length}</div><h2 id="tutorial-title">{stepInfo.title}</h2></div><button className="secondary" onClick={() => setOpen(false)}>閉じる</button></header>
      <div className="tutorial-progress" aria-label={`${step + 1} / ${tutorialSteps.length}`}>{tutorialSteps.map((item, index) => <span key={item.title} className={index <= step ? 'complete' : ''}/>)}</div>
      <p className="tutorial-copy">{stepInfo.description}</p>
      <div className="tutorial-simulation">
        {step === 0 && <div className="tutorial-card"><div className="tutorial-mock-title">ルームに参加</div><label>あなたの名前<input className="tutorial-focus" value={name} maxLength={20} onChange={event => setName(event.target.value)}/></label><label>5桁のルーム番号<input className="tutorial-focus" type="text" inputMode="numeric" maxLength={5} value={code} onFocus={event => event.currentTarget.select()} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 5))}/></label><button className="primary tutorial-focus" disabled={!name.trim() || !/^\d{5}$/.test(code)} onClick={() => setProgress(current => ({ ...current, joined: true }))}>{progress.joined ? '入室しました' : '入室する'}</button></div>}
        {step === 1 && <div className="tutorial-card tutorial-role-card"><small>あなたの役職</small>{roleVisible ? <><span className="tutorial-role-icon">✧</span><strong>占い師</strong><p>夜に1人を占い、人狼か人間かを確認します。</p></> : <><span className="tutorial-role-hidden">☾</span><p>周りに画面を見られないようにしてから確認してください。</p><button className="primary tutorial-focus" onClick={() => { setRoleVisible(true); setProgress(current => ({ ...current, roleSeen: true })); }}>役職を確認する</button></>}</div>}
        {step === 2 && <div className="tutorial-card"><div className="tutorial-mock-title">夜の行動</div><p className="tutorial-callout">誰を占いますか？</p><select className="tutorial-focus" value={target} onChange={event => setTarget(event.target.value)}><option value="">対象を選ぶ</option><option value="fuurin">風鈴</option><option value="fukurou">梟</option></select><button className="primary tutorial-focus" disabled={!target} onClick={() => setProgress(current => ({ ...current, nightDone: true }))}>{progress.nightDone ? '行動を確定しました' : '行動を確定'}</button><small>実際のゲームでは、役職によって行動内容が変わります。</small></div>}
        {step === 3 && <div className="tutorial-card"><div className="tutorial-mock-title">投票</div><p className="tutorial-callout">誰に投票しますか？</p><select className="tutorial-focus" value={voteTarget} onChange={event => setVoteTarget(event.target.value)}><option value="">投票先を選ぶ</option><option value="fuurin">風鈴</option><option value="fukurou">梟</option><option value="abstain">無投票</option></select><button className="primary tutorial-focus" disabled={!voteTarget} onClick={() => setConfirmVote(true)}>{progress.voted ? '投票済み' : '投票する'}</button>{confirmVote && <div className="tutorial-confirm"><p>{voteTarget === 'abstain' ? '無投票' : voteTarget === 'fuurin' ? '風鈴' : '梟'}に投票しますか？</p><button className="primary" onClick={() => { setConfirmVote(false); setProgress(current => ({ ...current, voted: true })); }}>はい、投票する</button><button className="secondary" onClick={() => setConfirmVote(false)}>戻る</button></div>}</div>}
        {step === 4 && <div className="tutorial-result"><span aria-hidden="true">✦</span><small>RESULT</small><h3>投票結果を確認</h3><p>実際の試合では、設定に応じて投票結果が表示されます。</p><div className="tutorial-result-row"><b>風鈴</b><span>処刑されました</span></div><div className="tutorial-result-row"><b>勝利判定</b><span>条件を満たすと試合終了</span></div></div>}
      </div>
      <footer className="tutorial-controls"><button className="secondary" disabled={step===0} onClick={() => setStep(current => Math.max(0, current - 1))}>← 戻る</button><button className="primary" disabled={!canAdvanceTutorial(step, progress)} onClick={() => step===tutorialSteps.length-1?setOpen(false):advance()}>{step===tutorialSteps.length-1?'チュートリアルを終了':'次へ →'}</button></footer>
    </section></div>}
  </>;
}
