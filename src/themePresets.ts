export const THEME_ROLES = ['市民','占い師','霊媒師','騎士','共有者','人狼','狂人','狂言者'] as const;
export const THEME_PHASES = ['rolecheck','night','discussion','vote','dawn','victory'] as const;
export const PHASE_NAMES: Record<string,string> = {rolecheck:'役職確認',night:'夜の行動',discussion:'話し合い',vote:'投票',dawn:'夜明け',victory:'勝利'};
export const TEXT_KEYS = [
  ['rolePrompt','役職確認の見出し'],['nightPrompt','夜行動の見出し'],['discussionPrompt','話し合いの見出し'],['votePrompt','投票の見出し'],['morningPrompt','朝の結果の見出し'],['executionPrompt','投票結果の見出し'],['nightWait','夜の待機メッセージ'],['gameOverTitle','ゲーム終了の見出し'],['gameOverSubtitle','ゲーム終了後の説明'],['suspectPrompt','夜の怪しい人投票の見出し'],['actionPrompt','夜の役職行動の案内'],['voteQuestion','投票時の質問'],['votePrivacy','投票の秘密についての説明'],['passInstruction','共有端末を渡す案内'],['executionResult','投票結果の見出し']
] as const;
export type MediaAsset = {id:string;name:string;mime:string;bytes:number;dataUrl:string;fit?:'cover'|'contain';x?:number;y?:number;zoom?:number;start?:number;end?:number;volume?:number};
export type ThemePreset = {
  version:1; id:string; name:string; updatedAt:number;
  background:{kind:'gradient'|'image'|'video';color:string;gradient:string;assetId:string;fit:'cover'|'contain';x:number;y:number;zoom:number};
  sceneBackgrounds?:Record<string,{kind:'gradient'|'image'|'video';color:string;gradient:string;assetId:string;fit:'cover'|'contain';x:number;y:number;zoom:number}>;
  texts:Record<string,string>;
  roleArt:Record<string,{assetId:string;motion:'none'|'float'|'glow'|'turn'}>;
  roleDescriptions:Record<string,string>;
  textColor?:string; font?:string;
  animations:Record<string,{enabled:boolean;duration:number;style:'cinematic'|'fade'|'zoom'|'none';assetId:string;soundAssetId:string;videoAudio:boolean}>;
  music:Record<string,{assetId:string;enabled:boolean;volume:number;start:number;end:number;continueAcross:boolean}>;
  assets:Record<string,MediaAsset>;
};
export const ANIMATION_EVENTS=[['attack','襲撃'],['divinationHuman','占い（村人）'],['divinationWolf','占い（人狼）'],['exile','処刑・追放'],['guard','護衛'],['medium','霊媒'],['morning','朝の襲撃結果'],['phase','フェーズ移行']] as const;
export function createThemePreset(name='新しいプリセット'):ThemePreset {
  const texts:Record<string,string>={rolePrompt:'あなたの役職を確認しましょう',nightPrompt:'夜の行動',discussionPrompt:'話し合い',votePrompt:'投票',morningPrompt:'夜が明けました',executionPrompt:'投票結果',nightWait:'ほかの人を待っています…',gameOverTitle:'ゲーム終了',gameOverSubtitle:'勝敗が決まりました',suspectPrompt:'怪しいと思う人',actionPrompt:'対象を選んでください',voteQuestion:'誰に投票しますか？',votePrivacy:'投票先は他の人には見えません。',passInstruction:'端末を渡してください',executionResult:'投票結果'};
  const roleArt=Object.fromEntries(THEME_ROLES.map(role=>[role,{assetId:'',motion:'float' as const}]));
  const roleDescriptions=Object.fromEntries(THEME_ROLES.map(role=>[role,'']));
  const animations=Object.fromEntries(ANIMATION_EVENTS.map(([key])=>[key,{enabled:key==='phase',duration:key==='phase'?1.8:2.2,style:'cinematic' as const,assetId:'',soundAssetId:'',videoAudio:false}]));
  const music=Object.fromEntries(THEME_PHASES.map(phase=>[phase,{assetId:'',enabled:false,volume:.12,start:0,end:0,continueAcross:true}]));
  const background={kind:'gradient' as const,color:'#111c29',gradient:'radial-gradient(ellipse at 70% 0%, #34445c 0%, transparent 46%), linear-gradient(145deg, #101826, #172333 62%, #101826)',assetId:'',fit:'cover' as const,x:50,y:50,zoom:100};
  const sceneGradients:Record<string,string>={day:'radial-gradient(ellipse at 50% 0%, #a77d4a 0%, transparent 46%), linear-gradient(145deg,#6d7768,#344437 65%,#1d2b2c)',dusk:'radial-gradient(ellipse at 70% 0%,#9d6449 0%,transparent 50%),linear-gradient(145deg,#372b35,#242737 65%,#111923)',night:background.gradient,dawn:'radial-gradient(ellipse at 50% 0%,#b39a74 0%,transparent 45%),linear-gradient(145deg,#46515a,#243442 70%,#18202b)',ballot:'radial-gradient(ellipse at 50% 0%,#79454b 0%,transparent 42%),linear-gradient(145deg,#241b28,#171c29 65%,#101722)','victory-village':'radial-gradient(ellipse at 50% 0%,#bda36b 0%,transparent 48%),linear-gradient(145deg,#50604b,#2b3b3b 65%,#18232a)','victory-wolf':'radial-gradient(ellipse at 70% 0%,#662f47 0%,transparent 45%),linear-gradient(145deg,#201827,#171a2b 65%,#0c111b)'};
  const sceneBackgrounds=Object.fromEntries(Object.entries(sceneGradients).map(([key,gradient])=>[key,{...background,gradient}]));
  return {version:1,id:globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`,name,updatedAt:Date.now(),roleDescriptions,background,sceneBackgrounds,texts,roleArt,animations,music,assets:{}};
}
const DB_NAME='moonlit-theme-presets',STORE='presets';
function openDB():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>req.result.createObjectStore(STORE,{keyPath:'id'});req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
export async function listThemePresets():Promise<ThemePreset[]>{const db=await openDB();return new Promise((resolve,reject)=>{const r=db.transaction(STORE).objectStore(STORE).getAll();r.onsuccess=()=>resolve((r.result||[]).sort((a:ThemePreset,b:ThemePreset)=>b.updatedAt-a.updatedAt));r.onerror=()=>reject(r.error)})}
export async function saveThemePreset(preset:ThemePreset):Promise<void>{const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put({...preset,updatedAt:Date.now()});tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)})}
export async function deleteThemePreset(id:string):Promise<void>{const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(id);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)})}
export function readFileAsDataUrl(file:File):Promise<string>{return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||''));reader.onerror=()=>reject(reader.error);reader.readAsDataURL(file)})}
export function sanitizeRoomTheme(preset:ThemePreset){const {assets,...rest}=preset;const used=new Set<string>([preset.background.assetId,...Object.values(preset.sceneBackgrounds||{}).map(x=>x.assetId),...Object.values(preset.roleArt||{}).map(x=>x.assetId),...Object.values(preset.animations||{}).flatMap(x=>[x.assetId,x.soundAssetId]),...Object.values(preset.music||{}).map(x=>x.assetId)].filter(Boolean));return {...rest,assets:Object.fromEntries([...used].filter(id=>assets[id]).map(id=>{const asset=assets[id];return [id,{name:asset.name,mime:asset.mime,bytes:asset.bytes}]}))}}
export const THEME_JSON_MAX_BYTES=110*1024*1024;
export function parseThemePresetJSON(json:string):ThemePreset{
  if(new Blob([json]).size>THEME_JSON_MAX_BYTES)throw new Error('プリセットJSONは110MB以下にしてください。');
  const input=JSON.parse(json) as Partial<ThemePreset>;
  if(input.version!==1||!input.id||!input.background||!input.assets||typeof input.assets!=='object')throw new Error('形式が正しくありません。');
  const base=createThemePreset(String(input.name||'共有プリセット').slice(0,24));
  const assets:Record<string,MediaAsset>={};let total=0;
  for(const [id,raw] of Object.entries(input.assets)){
    const a=raw as MediaAsset;if(Object.keys(input.assets).length>80||!/^[\w-]{8,100}$/.test(id)||!a||typeof a.dataUrl!=='string'||!/^data:(image|video|audio)\/[\w.+-]+;base64,/.test(a.dataUrl))throw new Error('素材データを読み込めません。素材を含むJSONファイルを選んでください。');
    const actual=Math.floor(((a.dataUrl.split(',')[1]||'').length*3)/4),bytes=Number(a.bytes)||actual;if(bytes>25*1024*1024||actual>26*1024*1024)throw new Error('素材は1つ25MB以下にしてください。');total+=bytes;if(total>80*1024*1024)throw new Error('素材の合計は80MB以下にしてください。');
    assets[id]={...a,id,name:String(a.name||'素材').slice(0,120),mime:String(a.mime||'application/octet-stream').slice(0,80),bytes};
  }
  const id=String(input.id);if(!/^[\w-]{8,80}$/.test(id))throw new Error('プリセットIDが正しくありません。');
  const gradient=(value:unknown,fallback:string)=>typeof value==='string'&&value.length<=240&&/^(linear|radial)-gradient\(/i.test(value)&&!/[;{}]|url\s*\(/i.test(value)?value:fallback;
  const background={...base.background,...input.background,gradient:gradient(input.background.gradient,base.background.gradient)} as ThemePreset['background'];
  const sceneBackgrounds=Object.fromEntries(Object.entries(input.sceneBackgrounds||{}).slice(0,12).map(([key,value])=>[key,{...background,...value,gradient:gradient((value as any)?.gradient,background.gradient)}]));
  return {...base,...input,id,name:String(input.name||'共有プリセット').slice(0,24),updatedAt:Date.now(),background,sceneBackgrounds,texts:{...base.texts,...input.texts},roleArt:{...base.roleArt,...input.roleArt},roleDescriptions:{...base.roleDescriptions,...input.roleDescriptions},animations:{...base.animations,...input.animations},music:{...base.music,...input.music},assets};
}
