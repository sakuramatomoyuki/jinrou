import React from 'react';
import { ANIMATION_EVENTS, createThemePreset, deleteThemePreset, listThemePresets, parseThemePresetJSON, PHASE_NAMES, readFileAsDataUrl, saveThemePreset, THEME_PHASES, THEME_ROLES, TEXT_KEYS, type MediaAsset, type ThemePreset } from './themePresets';

const MAX_FILE = 25 * 1024 * 1024;
const devices = { phone: { label: 'スマートフォン', width: 320, height: 620 }, tablet: { label: 'iPad', width: 540, height: 720 }, desktop: { label: 'PC', width: 720, height: 440 } } as const;
type Device = keyof typeof devices;
type PreviewScene = 'rolecheck' | 'night' | 'discussion' | 'vote' | 'execution' | 'dawn' | 'animation' | 'victory-village' | 'victory-wolf' | 'ranking' | 'invalid-match' | 'walkthrough';
const previewLabels: Record<PreviewScene, string> = { rolecheck: '役職確認', night: '夜の行動', discussion: '話し合い', vote: '投票', execution: '処刑結果', dawn: '朝の結果', animation: '演出', 'victory-village': '市民陣営の勝利', 'victory-wolf': '人狼陣営の勝利', ranking: '累計ランキング', 'invalid-match': '無効試合', walkthrough: '一人プレイ体験' };
type Props = { onBack: () => void; onApply: (preset: ThemePreset | null) => void; selectedId?: string };

function PreviewArt({name}:{name:string}) {
  const art:Record<string,React.ReactNode>={
    '市民':<><path d="M34 66 90 22l56 44M45 64v73h90V64M79 137V91h24v46M57 81h16m34 0h16"/><circle cx="90" cy="52" r="4"/></>,
    '占い師':<><path d="M90 24 128 57 117 119 90 140 63 119 52 57Z"/><path d="m52 57 38 23 38-23M90 24v56m0 60V80M61 130h58"/></>,
    '霊媒師':<><path d="M64 40h52M70 40v34l20 18-20 18v25h40v-25L90 92l20-18V40M76 113h28"/><circle cx="90" cy="64" r="6"/></>,
    '騎士':<><path d="M90 22 141 43v39q-3 48-51 78Q42 130 39 82V43Z"/><path d="M90 43v84M62 70h56m-28-27 19 19-19 19-19-19Z"/></>,
    '共有者':<><circle cx="70" cy="61" r="17"/><circle cx="110" cy="61" r="17"/><path d="M37 133q3-43 33-43t33 43m-13 0q3-43 33-43t33 43M79 49h22m-11-11v22"/></>,
    '人狼':<><path d="m38 62 10-38 34 24 18-13 33 9 12 42-14 41-39 16-37-22-18-35Z"/><path d="m58 70 23 12m41-12-23 12M72 105q18 13 36 0M67 126l9-14m29 14-9-14"/></>,
    '狂人':<><path d="m49 50-10-27 40 22 21-35 19 36 37-21-8 34q-9 45-49 45T49 50Z"/><circle cx="99" cy="94" r="37"/><path d="M83 91h5m22 0h5m-27 18q11 11 22 0"/></>,
    '狂言者':<><path d="M48 62q4-42 42-42t42 42l-9 57q-12 25-33 25t-33-25Z"/><path d="m59 76 29-7-13 21Zm43-7 29 7-16 14ZM81 111q10-8 20 0m-38-60L46 31m71 20 19-20"/></>};
  return <svg className={`theme-role-vector role-${name}`} viewBox="0 0 180 170" aria-hidden="true"><path className="role-vector-frame" d="M20 150V63Q20 11 90 9q70 2 70 54v87Z"/><g className="role-vector-mark">{art[name]||art['市民']}</g><path className="role-vector-base" d="M16 153h148"/></svg>;
}
function PreviewAnimationArt({name}:{name:string}) {
  return <svg className={`theme-animation-vector anim-${name}`} viewBox="0 0 180 180" aria-hidden="true">{name==='attack'||name==='exile'?<><path className="anim-slash" d="M32 24 67 66l-9 9 38 42M67 17 99 59l-9 8 37 42m-3-93 32 41-10 9 20 26"/><path d="m49 112 9 13m55-7 11 12m26-20 10 9"/></>:name==='guard'?<><path d="M90 18 145 38v46q-5 51-55 78Q40 135 35 84V38Z"/><path d="m90 48 10 28 30 2-23 18 9 28-26-17-26 17 9-28-23-18 30-2Z"/></>:name.startsWith('divination')?<><path d="M90 19 131 55 118 124 90 146 62 124 49 55Z"/><path d="m49 55 41 26 41-26M90 19v62m0 65V81"/></>:<><circle cx="90" cy="90" r="58"/><circle cx="90" cy="90" r="42"/><path d="m90 45 13 32 34 3-26 22 8 33-29-19-29 19 8-33-26-22 34-3Z"/></>}</svg>;
}

export function ThemeStudio({ onBack, onApply, selectedId }: Props) {
  const [items, setItems] = React.useState<ThemePreset[]>([]);
  const [draft, setDraft] = React.useState<ThemePreset>(() => createThemePreset());
  const [editing, setEditing] = React.useState(false);
  const [tab, setTab] = React.useState('preview');
  const [bgScene, setBgScene] = React.useState('night');
  const [device, setDevice] = React.useState<Device>('phone');
  const [previewScene, setPreviewScene] = React.useState<PreviewScene>('rolecheck');
  const [previewRole, setPreviewRole] = React.useState<string>('占い師');
  const [previewAnimation, setPreviewAnimation] = React.useState<string>('attack');
  const [walkStep, setWalkStep] = React.useState(0);
  const [walkResult, setWalkResult] = React.useState<'village'|'wolf'|'invalid'>('village');
  const [message, setMessage] = React.useState('');
  const [presetJson, setPresetJson] = React.useState('');
  const previewRef = React.useRef<HTMLDivElement>(null);
  const pasteRef = React.useRef<HTMLDivElement>(null);
  const assetTargetRef = React.useRef('background');
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [previewScale, setPreviewScale] = React.useState(.7);

  const reload = React.useCallback(async () => {
    try { const all = await listThemePresets(); setItems(all); return all; }
    catch { setMessage('この端末の保存領域を利用できませんでした。'); return []; }
  }, []);
  React.useEffect(() => { void reload(); }, [reload]);
  React.useLayoutEffect(() => {
    const node = previewRef.current;
    if (!node) return;
    const measure = () => {
      const box = node.getBoundingClientRect();
      const d = devices[device];
      setPreviewScale(Math.min(box.width / d.width, box.height / d.height));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [device, editing, tab]);

  const update = (fn: (old: ThemePreset) => ThemePreset) => setDraft(old => fn(structuredClone(old)));
  const background = draft.sceneBackgrounds?.[bgScene] || draft.background;
  const sceneBackground = (scene: string) => draft.sceneBackgrounds?.[scene] || draft.background;
  const walkScenes: PreviewScene[] = ['rolecheck','night','dawn','discussion','vote','execution',(walkResult==='village'?'victory-village':walkResult==='wolf'?'victory-wolf':'invalid-match') as PreviewScene,...(walkResult==='invalid'?[]:['ranking' as PreviewScene])];
  const walkIndex = Math.min(walkStep, walkScenes.length - 1);
  const shownScene = previewScene === 'walkthrough' ? walkScenes[walkIndex] : previewScene;
  const previewBackground = sceneBackground(shownScene === 'rolecheck' || shownScene === 'night' ? 'night' : shownScene === 'discussion' ? 'day' : shownScene === 'vote' || shownScene === 'execution' ? 'ballot' : shownScene === 'dawn' ? 'dawn' : shownScene);
  const bgAsset = draft.assets[previewBackground.assetId];
  const mutateBackground = (p: ThemePreset, fn: (b: ThemePreset['background']) => void) => {
    const b = { ...(p.sceneBackgrounds?.[bgScene] || p.background) };
    fn(b);
    if (bgScene === 'default') p.background = b;
    else { p.sceneBackgrounds ||= {}; p.sceneBackgrounds[bgScene] = b; }
  };
  const roleMedia = draft.assets[draft.roleArt[previewRole]?.assetId];
  const previewAnim = draft.animations[previewAnimation];
  const previewAnimMedia = draft.assets[previewAnim?.assetId];
  const audioAssets = Object.values(draft.assets).filter(a => a.mime.startsWith('audio/'));
  const visualAssets = Object.values(draft.assets).filter(a => a.mime.startsWith('image/') || a.mime.startsWith('video/'));

  const newPreset = () => { setDraft(createThemePreset()); setEditing(true); setTab('preview'); setMessage(''); setPreviewScene('rolecheck'); };
  const edit = (preset: ThemePreset) => { setDraft(structuredClone(preset)); setEditing(true); setTab('preview'); setMessage(''); };
  const assignAsset = (target: string, id: string) => update(p => {
    if (target === 'background') mutateBackground(p, b => { b.assetId = id; if (id) b.kind = p.assets[id]?.mime.startsWith('video/') ? 'video' : 'image'; });
    else if (target.startsWith('role:')) p.roleArt[target.slice(5)].assetId = id;
    else if (target.startsWith('music:')) { p.music[target.slice(6)].assetId = id; p.music[target.slice(6)].enabled = Boolean(id); }
    else if (target.startsWith('animation:')) p.animations[target.slice(10)].assetId = id;
    else if (target.startsWith('sound:')) p.animations[target.slice(6)].soundAssetId = id;
    return p;
  });
  const addFile = async (file: File, target = assetTargetRef.current) => {
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/') && !file.type.startsWith('audio/')) { setMessage('画像・動画・音声ファイルを選んでください。'); return; }
    if (file.size > MAX_FILE) { setMessage('1ファイル25MBまでです。短くトリミングしてから追加してください。'); return; }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const id = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const asset: MediaAsset = { id, name: file.name, mime: file.type, bytes: file.size, dataUrl, fit: 'cover', x: 50, y: 50, zoom: 100, start: 0, end: 0, volume: .15 };
      update(p => { p.assets[id] = asset; return p; });
      assignAsset(target, id);
      setMessage(`${file.name}を追加しました。素材一覧から別の場面にも割り当てられます。`);
    } catch { setMessage('ファイルを読み込めませんでした。'); }
  };
  const onPaste = (event: React.ClipboardEvent) => {
    const file = Array.from(event.clipboardData.files).find(f => f.type.startsWith('image/') || f.type.startsWith('video/') || f.type.startsWith('audio/'));
    if (file) { event.preventDefault(); void addFile(file, 'library'); }
  };
  const onDrop = (event: React.DragEvent) => { event.preventDefault(); const file = Array.from(event.dataTransfer.files).find(f => f.type.startsWith('image/') || f.type.startsWith('video/') || f.type.startsWith('audio/')); if (file) void addFile(file, 'library'); };
  const targetUpload = (target: string) => { assetTargetRef.current = target; fileRef.current?.click(); };
  const save = async () => {
    if (!draft.name.trim()) { setMessage('プリセット名を入力してください。'); return; }
    if (draft.name.trim().length > 24) { setMessage('プリセット名は24文字以内にしてください。'); return; }
    const total = Object.values(draft.assets).reduce((n, a) => n + a.bytes, 0);
    if (total > 80 * 1024 * 1024) { setMessage('素材の合計は80MB以内にしてください。'); return; }
    try { await saveThemePreset({ ...draft, name: draft.name.trim() }); await reload(); setEditing(false); setMessage('プリセットを保存しました。'); }
    catch { setMessage('保存できませんでした。端末の空き容量を確認してください。'); }
  };
  const remove = async (p: ThemePreset) => { if (!confirm(`「${p.name}」を削除しますか？`)) return; await deleteThemePreset(p.id); if (selectedId === p.id) onApply(null); await reload(); };
  const exportPreset = (p: ThemePreset) => { const blob = new Blob([JSON.stringify(p)], { type: 'application/json' }), url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = `${p.name}.moonlit.json`; a.click(); URL.revokeObjectURL(url); };
  const importPreset = async (json: string) => {
    try {
      if (new Blob([json]).size > 110 * 1024 * 1024) throw Error('サイズが大きすぎます');
      const p = parseThemePresetJSON(json);
      await saveThemePreset(p); await reload(); setPresetJson(''); setMessage(`「${p.name}」を読み込みました。素材一覧に保存されています。`);
    } catch { setMessage('JSONを読み込めませんでした。共有用プリセットJSONか確認してください。'); }
  };
  const setText = (key: string, value: string) => update(p => { p.texts[key] = value.slice(0, 60); return p; });
  const setAnim = (key: string, patch: Partial<ThemePreset['animations'][string]>) => update(p => { p.animations[key] = { ...p.animations[key], ...patch }; return p; });
  const selectAsset = (target: string, label: string, assets: MediaAsset[]) => <label className="field theme-asset-select">{label}<select value={target === 'background' ? background.assetId : target.startsWith('role:') ? draft.roleArt[target.slice(5)]?.assetId || '' : target.startsWith('music:') ? draft.music[target.slice(6)]?.assetId || '' : target.startsWith('animation:') ? draft.animations[target.slice(10)]?.assetId || '' : draft.animations[target.slice(6)]?.soundAssetId || ''} onChange={e => assignAsset(target, e.target.value)}><option value="">素材を選ぶ</option>{assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>;

  const stageStyle: React.CSSProperties = { width: devices[device].width, height: devices[device].height, transform: `translate(-50%,-50%) scale(${previewScale})`, backgroundColor: previewBackground.color, backgroundImage: previewBackground.kind === 'gradient' ? previewBackground.gradient : undefined, backgroundSize: previewBackground.fit === 'contain' ? 'contain' : `${previewBackground.zoom || 100}% auto`, backgroundPosition: `${previewBackground.x ?? 50}% ${previewBackground.y ?? 50}%`, color: draft.textColor || '#f3e7cc', fontFamily: draft.font || 'inherit', '--theme-preview-duration': `${previewAnim?.duration || 1.8}s` } as React.CSSProperties;
  const stageAsset = bgAsset?.dataUrl;
  const roleAssetStyle: React.CSSProperties = roleMedia ? { objectFit: roleMedia.fit || 'cover', objectPosition: `${roleMedia.x ?? 50}% ${roleMedia.y ?? 50}%`, transform: `scale(${(roleMedia.zoom || 100) / 100})` } : {};
  const soundPlay = (asset: MediaAsset | undefined) => {
    if (!asset) return;
    const audio = new Audio(asset.dataUrl);
    audio.volume = Math.max(0, Math.min(1, asset.volume ?? .15));
    audio.addEventListener('loadedmetadata', () => { audio.currentTime = Math.min(asset.start || 0, Math.max(0, audio.duration - .05)); }, { once: true });
    if (asset.end && asset.end > (asset.start || 0)) audio.ontimeupdate = () => { if (audio.currentTime >= asset.end!) audio.pause(); };
    void audio.play().catch(() => setMessage('再生できませんでした。画面を一度タップしてから試してください。'));
  };

  return <section className="panel theme-studio" onPaste={onPaste}>
    <input ref={fileRef} type="file" hidden accept="image/*,video/*,audio/*" onChange={e => { const f = e.target.files?.[0]; if (f) void addFile(f); e.currentTarget.value = ''; }}/>
    <button className="back" onClick={onBack}>← 戻る</button>
    <div className="eyebrow">MOONLIT VILLAGE · ATELIER</div>
    <div className="theme-studio-heading"><div><h2>世界観プリセット</h2><p className="muted">右側で実際の画面サイズのプレビューを見ながら編集できます。</p></div><button className="primary" onClick={newPreset}>＋ 新規作成</button></div>
    {message && <p className="theme-message" role="status">{message}</p>}
    {!editing && <section className="theme-import-panel"><div><b>共有JSONを読み込む</b><p>ホストや友人から受け取ったプリセットJSONを貼り付けるか、ファイルを選んでください。</p></div><textarea aria-label="プリセットJSONを貼り付け" value={presetJson} onChange={e => setPresetJson(e.target.value)} placeholder="JSONをここに貼り付けます"/><div><button className="secondary" disabled={!presetJson.trim()} onClick={() => void importPreset(presetJson)}>貼り付けたJSONを読み込む</button><label className="secondary theme-json-file">JSONファイルを選ぶ<input type="file" accept=".json,application/json" onChange={e => { const file = e.target.files?.[0]; if (file) void file.text().then(importPreset); e.currentTarget.value = ''; }}/></label></div><small>手順：JSON欄を押す → ペースト →「読み込む」。ファイルなら「JSONファイルを選ぶ」を押します。</small></section>}
    {editing && <>
      <div className="theme-name-row"><label className="field">プリセット名<input value={draft.name} maxLength={24} onChange={e => update(p => { p.name = e.target.value.slice(0, 24); return p; })}/><small>{draft.name.length}/24文字</small></label><div><button className="primary" onClick={() => void save()}>保存</button><button className="secondary" onClick={() => setEditing(false)}>キャンセル</button></div></div>
      <div className="theme-editor-layout">
        <div className="theme-editor-controls">
          <nav className="theme-tabs" aria-label="プリセット編集">{[['preview','プレビュー'],['background','背景・切り抜き'],['text','文字'],['roles','役職画'],['motion','アニメ・効果音'],['music','場面別BGM']].map(([key,label]) => <button key={key} className={tab === key ? 'selected' : ''} onClick={() => setTab(key)}>{label}</button>)}</nav>
          {tab === 'preview' && <div className="theme-section"><h3>プレビューする画面</h3><p className="muted">画面を切り替えると、文字や素材の実際の見え方を確認できます。</p><div className="theme-scene-switch">{(Object.keys(previewLabels) as PreviewScene[]).map(scene => <button key={scene} className={previewScene === scene ? 'selected' : ''} onClick={() => {setPreviewScene(scene);if(scene==='walkthrough')setWalkStep(0);}}>{previewLabels[scene]}</button>)}</div>{previewScene === 'rolecheck' && <label className="field">役職<select value={previewRole} onChange={e => setPreviewRole(e.target.value)}>{THEME_ROLES.map(role => <option key={role}>{role}</option>)}</select></label>}{previewScene === 'animation' && <label className="field">演出<select value={previewAnimation} onChange={e => setPreviewAnimation(e.target.value)}>{ANIMATION_EVENTS.map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label>}{previewScene === 'walkthrough' && <div className="theme-walkthrough-controls"><b>一人で遊ぶ流れを画面ごとに確認</b><p>{walkIndex+1} / {walkScenes.length} ・ {previewLabels[shownScene]}</p><label className="field">デモの結末<select value={walkResult} onChange={e => {setWalkResult(e.target.value as any);setWalkStep(0);}}><option value="village">市民陣営の勝利</option><option value="wolf">人狼陣営の勝利</option><option value="invalid">無効試合</option></select></label><div><button className="secondary" disabled={walkIndex===0} onClick={()=>setWalkStep(n=>Math.max(0,n-1))}>← 前へ</button><button className="primary" disabled={walkIndex>=walkScenes.length-1} onClick={()=>setWalkStep(n=>Math.min(walkScenes.length-1,n+1))}>次の場面 →</button><button className="secondary" onClick={()=>setWalkStep(0)}>最初から</button></div></div>}<div className="theme-preview-actions"><button className="secondary" onClick={() => { setDevice('phone'); setPreviewScene('rolecheck'); }}>役職確認を表示</button><button className="secondary" onClick={() => { setPreviewScene('animation'); }}>演出を表示</button></div></div>}
          {tab === 'background' && <div className="theme-section"><h3>背景と切り抜き位置</h3><p className="muted">対象の場面を選んで、右の画面を見ながら位置を調整します。</p><label className="field">編集する場面<select value={bgScene} onChange={e => setBgScene(e.target.value)}>{[['day','昼・話し合い'],['dusk','夕暮れ'],['night','夜・役職確認'],['dawn','夜明け'],['ballot','投票'],['victory-village','市民陣営の勝利'],['victory-wolf','人狼陣営の勝利'],['ranking','ルーム累計ランキング'],['invalid-match','無効試合'],['default','その他の画面']].map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><div className="theme-choice-grid"><label className="field">背景の種類<select value={background.kind} onChange={e => update(p => { mutateBackground(p, b => { b.kind = e.target.value as any; }); return p; })}><option value="gradient">グラデーション</option><option value="image">写真・イラスト</option><option value="video">動画</option></select></label><label className="field">背景色<input type="color" value={background.color} onChange={e => update(p => { mutateBackground(p, b => { b.color = e.target.value; }); return p; })}/></label></div><label className="field">グラデーション<input value={background.gradient} onChange={e => update(p => { mutateBackground(p, b => { b.gradient = e.target.value.slice(0, 240); }); return p; })}/><small>例：linear-gradient(140deg, #101826, #253548)</small></label><div className="theme-choice-grid"><label className="field">切り抜き<select value={background.fit} onChange={e => update(p => { mutateBackground(p, b => { b.fit = e.target.value as any; }); return p; })}><option value="cover">画面に合わせる</option><option value="contain">全体を表示</option></select></label><label className="field">素材<select value={background.assetId} onChange={e => update(p => { mutateBackground(p, b => { b.assetId = e.target.value; }); return p; })}><option value="">素材を選ぶ</option>{visualAssets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label></div><CropControls value={background} onChange={(patch) => update(p => { mutateBackground(p, b => Object.assign(b, patch)); return p; })} image={background.assetId ? draft.assets[background.assetId] : undefined} onPointerChange={(x,y) => update(p => { mutateBackground(p,b => {b.x=x;b.y=y;}); return p; })}/><button className="secondary" onClick={() => targetUpload('background')}>＋ 新しい画像・動画を追加</button></div>}
          {tab === 'text' && <div className="theme-section"><h3>表示する文字</h3><p className="muted">変更は右のプレビューでその場で確認できます。長い文章は60文字で区切ります。</p>{TEXT_KEYS.map(([key,label]) => <label className="field" key={key}>{label}<input value={draft.texts[key] || ''} maxLength={60} onChange={e => setText(key, e.target.value)}/><small>{(draft.texts[key] || '').length}/60</small></label>)}<div className="theme-choice-grid"><label className="field">文字色<input type="color" value={draft.textColor || '#e8edf5'} onChange={e => update(p => { p.textColor = e.target.value; return p; })}/></label><label className="field">書体<select value={draft.font || 'Noto Sans JP'} onChange={e => update(p => { p.font = e.target.value; return p; })}><option>Noto Sans JP</option><option>serif</option><option>sans-serif</option><option>monospace</option></select></label></div></div>}
          {tab === 'roles' && <div className="theme-section"><h3>役職画と役職確認の見え方</h3><p className="muted">役職を選ぶと右側の本番サイズのプレビューが切り替わります。画像は再アップロードせず素材から選べます。</p>{THEME_ROLES.map(role => { const row = draft.roleArt[role], media = draft.assets[row.assetId]; return <article className={`theme-role-row ${previewRole === role ? 'is-previewing' : ''}`} key={role} onClick={() => { setPreviewRole(role); setPreviewScene('rolecheck'); }}><div><b>{role}</b><small>{media?.name || '既定の役職イラストを使用中'}</small></div>{media && (media.mime.startsWith('video/') ? <video src={media.dataUrl} muted autoPlay loop playsInline style={{objectFit:media.fit||'cover',objectPosition:`${media.x??50}% ${media.y??50}%`}}/> : <img src={media.dataUrl} style={{objectFit:media.fit||'cover',objectPosition:`${media.x??50}% ${media.y??50}%`}}/>)}{selectAsset(`role:${role}`,'使う素材',visualAssets)}<button className="secondary" onClick={e => {e.stopPropagation();targetUpload(`role:${role}`);}}>＋ 新しい画像を追加</button><div className="theme-inline"><label>動き<select value={row.motion} onChange={e => update(p => {p.roleArt[role].motion=e.target.value as any;return p;})}><option value="none">動かさない</option><option value="float">浮遊</option><option value="glow">発光</option><option value="turn">ゆっくり回転</option></select></label><label className="field theme-role-description">役職説明<textarea maxLength={160} value={draft.roleDescriptions[role] || ''} placeholder="空欄なら標準の説明を使います" onChange={e => update(p => {p.roleDescriptions[role]=e.target.value.slice(0,160);return p;})}/><small>{(draft.roleDescriptions[role] || '').length}/160</small></label></div></article>;})}</div>}
          {tab === 'motion' && <div className="theme-section"><h3>アニメーション・効果音</h3><p className="muted">演出を選ぶと右のプレビュー画面で動きを確認できます。</p><label className="field">プレビューする演出<select value={previewAnimation} onChange={e => {setPreviewAnimation(e.target.value);setPreviewScene('animation');}}>{ANIMATION_EVENTS.map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label>{ANIMATION_EVENTS.map(([key,label]) => {const row = draft.animations[key], media = draft.assets[row.assetId], sound = draft.assets[row.soundAssetId]; return <article className={`theme-motion-row ${previewAnimation === key ? 'is-previewing' : ''}`} key={key} onClick={() => {setPreviewAnimation(key);setPreviewScene('animation');}}><div className="theme-motion-heading"><b>{label}</b><label><input type="checkbox" checked={row.enabled} onChange={e => setAnim(key,{enabled:e.target.checked})}/>有効</label></div><div className="theme-inline"><label>演出<select value={row.style} onChange={e => setAnim(key,{style:e.target.value as any,enabled:e.target.value!=='none'})}><option value="none">なし</option><option value="fade">フェード</option><option value="zoom">ズーム</option><option value="cinematic">シネマ風</option></select></label><label>秒数<input type="number" min="0.2" max="8" step="0.1" value={row.duration} onChange={e => setAnim(key,{duration:Math.max(.2,Math.min(8,Number(e.target.value)||.2))})}/></label></div><div className="theme-choice-grid">{selectAsset(`animation:${key}`,'登録済みの演出素材',visualAssets)}<button className="secondary" onClick={e => {e.stopPropagation();targetUpload(`animation:${key}`);}}>演出素材を追加</button></div>{media&&<small>{media.name} ・ 動画の音声 {row.videoAudio?'使用':'不使用'}</small>}{media?.mime.startsWith('video/')&&<label className="theme-check"><input type="checkbox" checked={row.videoAudio} onChange={e => setAnim(key,{videoAudio:e.target.checked})}/>動画に含まれる音声を使う</label>}<div className="theme-choice-grid">{selectAsset(`sound:${key}`,'登録済みの効果音',audioAssets)}<button className="secondary" onClick={e => {e.stopPropagation();targetUpload(`sound:${key}`);}}>効果音を追加</button>{sound&&<button className="secondary" onClick={e => {e.stopPropagation();soundPlay(sound);}}>▶ 音を試聴</button>}</div></article>;})}</div>}
          {tab === 'music' && <div className="theme-section"><h3>場面別BGM</h3><p className="muted">「役職確認」と「夜の行動」は別々に設定できます。同じ曲を使う場面は、下の「登録済み素材」から選ぶだけです。</p>{THEME_PHASES.map(phase => {const row = draft.music[phase], media = draft.assets[row.assetId]; return <article className={`theme-music-row ${media ? 'has-music' : ''}`} key={phase}><div className="theme-motion-heading"><div><h4>{PHASE_NAMES[phase]}</h4><small>{phase === 'rolecheck' ? '最初に役職を確認するとき' : phase === 'night' ? '夜の行動中' : 'この場面の間、再生します'}</small></div><label className="theme-check"><input type="checkbox" checked={row.enabled} onChange={e => update(p => {p.music[phase].enabled=e.target.checked;return p;})}/>使用する</label></div>{selectAsset(`music:${phase}`,'登録済みの音楽を選ぶ',audioAssets)}<div className="theme-choice-grid"><button className="secondary" onClick={() => targetUpload(`music:${phase}`)}>＋ 音楽を追加</button>{media&&<button className="secondary" onClick={() => soundPlay(media)}>▶ 試聴</button>}</div>{media&&<><p className="theme-selected-media">♫ {media.name}</p><label className="field">音量 {Math.round(row.volume*100)}%<input type="range" min="0" max="100" value={row.volume*100} onChange={e => update(p => {p.music[phase].volume=Number(e.target.value)/100;return p;})}/></label><div className="theme-inline"><label>再生開始秒<input type="number" min="0" step="0.1" value={row.start} onChange={e => update(p => {p.music[phase].start=Number(e.target.value)||0;return p;})}/></label><label>終了秒（0=曲の最後）<input type="number" min="0" step="0.1" value={row.end} onChange={e => update(p => {p.music[phase].end=Number(e.target.value)||0;return p;})}/></label></div><label className="theme-check"><input type="checkbox" checked={row.continueAcross} onChange={e => update(p => {p.music[phase].continueAcross=e.target.checked;return p;})}/>次の場面もこの曲なら途中から続ける</label><audio controls src={media.dataUrl} onLoadedMetadata={e => {e.currentTarget.currentTime=row.start||0; e.currentTarget.volume=row.volume;}}/></>}</article>;})}</div>}
          <div className="theme-paste-card" ref={pasteRef} tabIndex={0} role="button" aria-label="コピーした画像や音声を貼り付ける" onPaste={onPaste} onDragOver={e => e.preventDefault()} onDrop={onDrop} onClick={() => pasteRef.current?.focus()}><span aria-hidden="true">▧</span><div><b>素材をペースト / ドロップ</b><p>この枠を押してから画像・音声をペースト。ファイルをここへドラッグしても追加できます。</p><small>追加後、右の素材一覧から各場面へ割り当てます。</small></div></div>
        </div>
        <aside className="theme-live-column">
          <div className="theme-live-sticky"><div className="theme-preview-toolbar"><div><small>LIVE PREVIEW</small><b>{previewLabels[previewScene==='walkthrough'?shownScene:previewScene]} ・ {devices[device].label}</b></div><div className="theme-device-switch">{(Object.keys(devices) as Device[]).map(d => <button key={d} className={device === d ? 'selected' : ''} onClick={() => setDevice(d)}>{d === 'phone' ? 'スマホ' : d === 'tablet' ? 'iPad' : 'PC'}</button>)}</div></div>
            <div className={`theme-preview-frame preview-${device}`} ref={previewRef} style={{aspectRatio:`${devices[device].width}/${devices[device].height}`}}>
              <div className={`theme-preview-stage scene-${shownScene}`} style={stageStyle}>
                {previewBackground.kind === 'image' && stageAsset && <img className="theme-stage-bg" src={stageAsset} alt="" style={{objectFit:previewBackground.fit,objectPosition:`${previewBackground.x??50}% ${previewBackground.y??50}%`,transform:`scale(${(previewBackground.zoom||100)/100})`}}/>}
                {previewBackground.kind === 'video' && stageAsset && <video className="theme-stage-bg" src={stageAsset} muted autoPlay loop playsInline style={{objectFit:previewBackground.fit,objectPosition:`${previewBackground.x??50}% ${previewBackground.y??50}%`,transform:`scale(${(previewBackground.zoom||100)/100})`}}/>}
                <div className="theme-stage-shade"/>
                {shownScene === 'rolecheck' ? <div className="theme-stage-role"><small>MOONLIT VILLAGE</small><div className={`theme-role-preview-art motion-${draft.roleArt[previewRole]?.motion||'none'}`}>{roleMedia ? roleMedia.mime.startsWith('video/') ? <video src={roleMedia.dataUrl} muted autoPlay loop playsInline style={roleAssetStyle}/> : <img src={roleMedia.dataUrl} alt="" style={roleAssetStyle}/> : <PreviewArt name={previewRole}/>}</div><p>{draft.texts.rolePrompt}</p><h2>{previewRole}</h2><b>{['人狼','狂人','狂言者'].includes(previewRole)?'人狼陣営':'市民陣営'}</b><small>{draft.roleDescriptions[previewRole]||'役職に応じた能力の説明がここに表示されます。'}</small><button>確認完了・次へ</button></div>
                  : shownScene === 'animation' ? <div className={`theme-stage-animation theme-animation-${previewAnim?.style||'cinematic'} ${previewAnim?.enabled?'':'is-disabled'}`} style={{'--theme-preview-duration':`${previewAnim?.duration||1.8}s`} as React.CSSProperties}>{previewAnimMedia&&(previewAnimMedia.mime.startsWith('video/')?<video src={previewAnimMedia.dataUrl} muted={!previewAnim.videoAudio} autoPlay loop playsInline/>:<img src={previewAnimMedia.dataUrl} alt=""/>)}<PreviewAnimationArt name={previewAnimation}/><small>{ANIMATION_EVENTS.find(e=>e[0]===previewAnimation)?.[1]}</small><b>{previewAnim?.enabled?previewAnim.style==='none'?'演出なし':'演出プレビュー':'この演出は無効です'}</b></div>
                  : <div className={`theme-stage-content scene-content-${shownScene}`}><small>MOONLIT VILLAGE</small><p>{shownScene==='night'?draft.texts.nightPrompt:shownScene==='discussion'?draft.texts.discussionPrompt:shownScene==='vote'?draft.texts.votePrompt:shownScene==='execution'?draft.texts.executionPrompt:shownScene==='dawn'?draft.texts.morningPrompt:shownScene==='ranking'?'HALL OF THE MOONLIT VILLAGE':shownScene==='invalid-match'?'NO CONTEST':shownScene.startsWith('victory-')?draft.texts.gameOverTitle:'処刑結果'}</p><strong>{shownScene==='night'?'占い師は対象を選び、怪しい人を投票します':shownScene==='vote'?'誰に投票しますか？':shownScene==='execution'?'投票の結果、ミナさんが処刑されました':shownScene==='dawn'?'昨夜は襲撃がありませんでした':shownScene==='victory-village'?'市民陣営の勝利':shownScene==='victory-wolf'?'人狼陣営の勝利':shownScene==='ranking'?'ルーム累計ランキング':shownScene==='invalid-match'?'この試合は無効試合です':shownScene==='discussion'?'村人たちの話し合い':'投票結果'}</strong>{shownScene==='ranking'&&<ol className="theme-stage-ranks"><li>ミナ　24 pt</li><li>カイ　19 pt</li><li>ユキ　15 pt</li></ol>}<div className="theme-stage-timer">{shownScene==='discussion'?'01:28.4':shownScene==='vote'?'投票':shownScene==='night'?'夜':''}</div><button>{shownScene==='vote'?draft.texts.voteQuestion:shownScene==='execution'||shownScene==='dawn'?'次へ':shownScene==='ranking'?'再戦・退出':shownScene.startsWith('victory-')?'役職一覧':shownScene==='invalid-match'?'ルームへ戻る':draft.texts.actionPrompt}</button></div>}
              </div>
            </div>
            <div className="theme-asset-shelf"><div><h3>このプリセットの素材</h3><small>同じ素材は何度でも割り当てできます。</small></div>
              {Object.values(draft.assets).length === 0 ? <p className="muted">まだ素材がありません。貼り付け枠か「素材を追加」から登録できます。</p> : Object.values(draft.assets).map(a => <article className="theme-asset-card" key={a.id}><div className="theme-asset-thumb">{a.mime.startsWith('image/')?<img src={a.dataUrl} alt=""/>:a.mime.startsWith('video/')?<video src={a.dataUrl} muted/>:<span>♫</span>}</div><div className="theme-asset-meta"><b>{a.name}</b><small>{(a.bytes/1024/1024).toFixed(1)} MB · {a.mime.split('/')[0]}</small></div><button className="secondary" onClick={() => {assetTargetRef.current='background';assignAsset('background',a.id);setTab('background');}}>背景に使う</button><button className="secondary" aria-label={`${a.name}を削除`} onClick={() => update(p => {delete p.assets[a.id];if(p.background.assetId===a.id)p.background.assetId='';for(const bg of Object.values(p.sceneBackgrounds||{}))if(bg.assetId===a.id)bg.assetId='';for(const role of Object.values(p.roleArt))if(role.assetId===a.id)role.assetId='';for(const item of Object.values(p.music))if(item.assetId===a.id)item.assetId='';for(const item of Object.values(p.animations)){if(item.assetId===a.id)item.assetId='';if(item.soundAssetId===a.id)item.soundAssetId='';}return p;})}>削除</button></article>)}
              <button className="secondary wide" onClick={() => targetUpload('background')}>＋ 素材を追加</button>
            </div>
          </div>
        </aside>
      </div>
    </>}
    {!editing && <>{items.length === 0 ? <div className="theme-empty"><span>✦</span><h3>まだプリセットがありません</h3><p>新規作成から、背景や役職画、場面ごとの音楽を組み合わせましょう。</p></div> : <div className="theme-preset-grid">{items.map(p => <article className="theme-preset-card" key={p.id}><div className="theme-preset-swatch" style={{background:p.background.kind==='gradient'?p.background.gradient:p.background.color}}>{p.background.kind==='image'&&p.assets[p.background.assetId]&&<img src={p.assets[p.background.assetId].dataUrl} alt=""/>}<span>{selectedId===p.id?'使用中':'保存済み'}</span></div><h3>{p.name}</h3><small>{Object.keys(p.assets).length}個の素材 ・ 更新 {new Date(p.updatedAt).toLocaleDateString('ja-JP')}</small><div><button className="primary" onClick={() => onApply(p)}>この端末で使う</button><button className="secondary" onClick={() => edit(p)}>編集</button><button className="secondary" onClick={() => exportPreset(p)}>書き出す</button><button className="danger" onClick={() => void remove(p)}>削除</button></div></article>)}</div>}</>}
  </section>;
}

function CropControls({ value, image, onChange, onPointerChange }: { value: ThemePreset['background']; image?: MediaAsset; onChange:(patch:Partial<ThemePreset['background']>)=>void; onPointerChange:(x:number,y:number)=>void }) {
  const crop = React.useRef<HTMLDivElement>(null);
  const start = (e:React.PointerEvent<HTMLDivElement>) => { if(!image)return; e.currentTarget.setPointerCapture(e.pointerId); (e.currentTarget as any)._drag={x:e.clientX,y:e.clientY,cx:value.x,cy:value.y}; };
  const move = (e:React.PointerEvent<HTMLDivElement>) => { const initial=(e.currentTarget as any)._drag;if(!initial||!e.currentTarget.hasPointerCapture(e.pointerId))return;const rect=e.currentTarget.getBoundingClientRect();onPointerChange(Math.max(0,Math.min(100,initial.cx-(e.clientX-initial.x)/rect.width*100)),Math.max(0,Math.min(100,initial.cy-(e.clientY-initial.y)/rect.height*100))); };
  return <div className="theme-crop-tool"><div className="theme-crop-preview" ref={crop} onPointerDown={start} onPointerMove={move} onPointerUp={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}} onPointerCancel={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}}>{image&&(image.mime.startsWith('video/')?<video src={image.dataUrl} muted autoPlay loop playsInline style={{objectFit:value.fit,objectPosition:`${value.x}% ${value.y}%`,transform:`scale(${value.zoom/100})`}}/>:<img src={image.dataUrl} alt="" style={{objectFit:value.fit,objectPosition:`${value.x}% ${value.y}%`,transform:`scale(${value.zoom/100})`}}/>)}<span>表示範囲 ・ つまんで移動</span><i/></div><label>画面への合わせ方<select value={value.fit} onChange={e=>onChange({fit:e.target.value as any})}><option value="cover">画面に合わせて切り抜く</option><option value="contain">画像全体を表示</option></select></label><label>拡大 {value.zoom}%<input type="range" min="70" max="180" value={value.zoom} onChange={e=>onChange({zoom:Number(e.target.value)})}/></label><label>左右位置 {value.x}%<input type="range" min="0" max="100" value={value.x} onChange={e=>onChange({x:Number(e.target.value)})}/></label><label>上下位置 {value.y}%<input type="range" min="0" max="100" value={value.y} onChange={e=>onChange({y:Number(e.target.value)})}/></label></div>;
}
