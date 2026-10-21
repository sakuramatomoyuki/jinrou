import { describe, expect, it, vi } from 'vitest';
import { allVoteParticipantsSubmitted, canReadSharedPublicView, canRevealSeatSecret, chooseRandomDistinct, cleanRealtimeData, invalidateNightActionsForDeath, nextSharedNightTurn, nightCompleteIds, nightParticipantIds, recommendedRoles, revoteFallbackPlan, revoteVoters, tallyVotes, teamOf, tiedVoteAction, voteParticipantIds, winningTeam } from '../functions/src/gameRules';

describe('Realtime Database保存データ', () => {
  it('オブジェクト内のundefinedを除去し、配列内はnullに置き換える', () => {
    expect(cleanRealtimeData({ endedAt: undefined, clientMeta: { gm: undefined, phase: 'night' }, items: [1, undefined, { value: undefined }] })).toEqual({
      clientMeta: { phase: 'night' },
      items: [1, null, {}],
    });
  });
});

describe('再投票のルール', () => {
  it('同率候補は投票者から外し、生存者だけを投票者にする', () => {
    expect(revoteVoters(['A', 'B', 'C', 'D'], ['A', 'B'])).toEqual(['C', 'D']);
  });
  it('再投票の参加者判定では、共有席の一時的な切断表示を無視する', () => {
    const players = [
      {uid:'A',alive:true,connected:false,hold:false,device:'shared'},
      {uid:'B',alive:true,connected:false,hold:false,device:'shared'},
      {uid:'C',alive:true,connected:false,hold:false,device:'personal'},
    ];
    const eligible = voteParticipantIds(players, 'revote', ['A']);
    expect(revoteFallbackPlan(['A','B','C'], ['A'], eligible)).toEqual({phase:'revote',voters:['B'],candidates:['A'],fallback:false});
  });

  it('再投票では同率候補への票と無投票だけを集計する', () => {
    const result = tallyVotes(
      { A: 'C', B: 'D', C: 'A', D: '__abstain__', ghost: 'B' },
      ['C', 'D'],
      ['A', 'B'],
    );
    expect(result.ballot).toEqual({ C: 'A', D: '__abstain__' });
    expect(result.max).toBe(1);
    expect(result.leaders).toEqual(['A']);
  });
});

describe('再投票の例外', () => {
  it('再投票後の同票と通常の再投票後の同票は処刑しない', () => {
    expect(tiedVoteAction('random', true, false)).toBe('none');
    expect(tiedVoteAction('revote', false, true)).toBe('none');
    expect(tiedVoteAction('random', false, false)).toBe('random');
  });
  it('再投票者がいないときは全生存者の再投票へ戻す', () => {
    expect(revoteFallbackPlan(['A','B'], ['A','B'], ['A','B'])).toEqual({phase:'vote',voters:['A','B'],candidates:['A','B'],fallback:true});
    expect(revoteFallbackPlan(['A','B'], ['A','B'], [])).toEqual({phase:'execution',voters:[],candidates:[],fallback:false});
  });
});

describe('投票確定のゲート', () => {
  it('有効な参加者の一部だけが投票した状態では集計を始めない', () => {
    expect(allVoteParticipantsSubmitted({ A: 'B' }, ['A', 'B', 'C'])).toBe(false);
    expect(allVoteParticipantsSubmitted({ A: 'B', B: '__abstain__', C: 'A' }, ['A', 'B', 'C'])).toBe(true);
  });

  it('投票参加者がいない場合に空の投票を自動確定しない', () => {
    expect(allVoteParticipantsSubmitted({}, [])).toBe(false);
  });
});

describe('共有端末の投票完了判定', () => {
  it('接続表示が揺れても全員共有の生存席を投票者に含める', () => {
    const voters = voteParticipantIds([
      {uid:'A',alive:true,connected:true,hold:false,device:'shared'},
      {uid:'B',alive:true,connected:false,hold:false,device:'shared'},
      {uid:'C',alive:true,connected:false,hold:false,device:'shared'},
    ], 'vote', []);
    expect(voters).toEqual(['A','B','C']);
    expect(voters.every(uid => Object.prototype.hasOwnProperty.call({A:'B'}, uid))).toBe(false);
  });

  it('再投票では同率者を除いた共有席だけが投票者になる', () => {
    expect(voteParticipantIds([
      {uid:'A',alive:true,connected:false,hold:false,device:'shared'},
      {uid:'B',alive:true,connected:true,hold:false,device:'shared'},
      {uid:'C',alive:true,connected:true,hold:false,device:'personal'},
    ], 'revote', ['A'])).toEqual(['B','C']);
  });
});

describe('人狼の襲撃先決定', () => {
  it('全員一致ならその対象を選ぶ', () => {
    expect(chooseRandomDistinct(['C', 'C'], () => 0)).toBe('C');
  });

  it('意見が違うときは異なる候補からランダムに1人選ぶ', () => {
    const randomIndex = vi.fn(() => 1);
    expect(chooseRandomDistinct(['C', 'D', 'C'], randomIndex)).toBe('D');
    expect(randomIndex).toHaveBeenCalledWith(2);
  });
});

describe('共有ルームの公開スナップショット権限', () => {
  it('共有・併用ルームではホストだけが公開ビューを要求できる', () => {
    expect(canReadSharedPublicView('host','host','shared')).toBe(true);
    expect(canReadSharedPublicView('guest','host','hybrid')).toBe(false);
    expect(canReadSharedPublicView('host','host','individual')).toBe(false);
  });
});

describe('共有端末の秘密情報', () => {
  it('共有プレイヤーには現在の手渡し対象の個人画面だけを返す', () => {
    expect(canRevealSeatSecret('A','shared','vote','A')).toBe(true);
    expect(canRevealSeatSecret('B','shared','vote','A')).toBe(false);
    expect(canRevealSeatSecret('A','shared','discussion',null)).toBe(false);
    expect(canRevealSeatSecret('A','personal','discussion',null)).toBe(true);
  });
});

describe('共有端末の夜行動順', () => {
  const order = ['A', 'B', 'C', 'D'];
  const players = {
    A: {alive:true,hold:false},
    B: {alive:false,hold:false},
    C: {alive:true,hold:true},
    D: {alive:true,hold:false},
  };

  it('死亡・保留済みの席を飛ばし、次の有効な人を返す', () => {
    expect(nextSharedNightTurn(order, 0, players, {A:true})).toEqual({uid:'D',index:3});
  });

  it('順番が終わった場合は次の席なしとして末尾カーソルを返す', () => {
    expect(nextSharedNightTurn(order, 3, players, {A:true,D:true})).toEqual({uid:null,index:4});
  });
});

describe('夜中に行動者または対象が死亡した場合', () => {
  it('行動者が死んだら確定済み行動を無効にし、結果も有効扱いしない', () => {
    const actions: Record<string, any> = { wolf: { target: 'town' }, seer: { target: 'town', result: { type: '占い', result: '人狼' } } };
    const done = { wolf: true, seer: true };
    expect(invalidateNightActionsForDeath(actions, done, 'seer', 123)).toEqual([]);
    expect(actions.seer.invalidatedReason).toBe('actor-dead');
    expect(actions.seer.result.invalidated).toBe(true);
    expect(done.seer).toBe(true);
  });

  it('死亡した対象への襲撃・護衛をやり直し、既に見た占い結果は無効表示のまま固定する', () => {
    const actions: Record<string, any> = {
      wolf: { target: 'town' },
      guard: { target: 'town' },
      seer: { target: 'town', result: { type: '占い', target: 'town', result: '村人（人間）' } },
    };
    const done = { wolf: true, guard: true, seer: true };
    expect(invalidateNightActionsForDeath(actions, done, 'town', 456)).toEqual(['wolf', 'guard']);
    expect(actions.wolf.invalidatedReason).toBe('target-dead');
    expect(actions.guard.invalidatedReason).toBe('target-dead');
    expect(done).toEqual({ seer: true });
    expect(actions.seer.invalidatedReason).toBe('target-dead');
    expect(actions.seer.result).toMatchObject({ invalidated: true, result: '村人（人間）' });
  });
});

describe('合意済みの役職・進行ルール', () => {
  it('3〜20人のおすすめ編成は人数と一致し、人狼を含む', () => {
    for (let count = 3; count <= 20; count++) {
      const roles = recommendedRoles(count);
      expect(Object.values(roles).reduce((sum, n) => sum + n, 0)).toBe(count);
      expect(roles['人狼']).toBeGreaterThan(0);
    }
    expect(recommendedRoles(8)).toEqual({市民:3,占い師:1,霊媒師:1,騎士:1,共有者:0,人狼:2,狂人:0,狂言者:0});
  });

  it('勝敗判定は人狼陣営の非人狼役職を市民人数に含めない', () => {
    expect(winningTeam([{alive:true,role:'人狼'},{alive:true,role:'狂人'},{alive:true,role:'市民'}])).toBe('人狼陣営');
    expect(winningTeam([{alive:true,role:'人狼'},{alive:true,role:'占い師'},{alive:true,role:'市民'}])).toBeNull();
    expect(winningTeam([])).toBe('引き分け');
  });
  it('初日白の抽選対象は村人陣営だけ', () => {
    expect(teamOf('市民')).toBe('村人陣営');
    expect(teamOf('人狼')).toBe('人狼陣営');
    expect(teamOf('狂人')).toBe('人狼陣営');
    expect(teamOf('狂言者')).toBe('人狼陣営');
  });

  it('夜の完了人数には接続中・生存・保留でない人だけを含む', () => {
    expect(nightCompleteIds([
      {uid:'a',alive:true,connected:true,hold:false},
      {uid:'b',alive:true,connected:false,hold:false},
      {uid:'c',alive:false,connected:true,hold:false},
      {uid:'d',alive:true,connected:true,hold:true},
    ])).toEqual(['a']);
  });

  it('共有端末は接続状態の一時的な揺れがあっても夜の完了待ちに含める', () => {
    expect(nightParticipantIds([
      {uid:'a',alive:true,connected:true,hold:false,device:'personal'},
      {uid:'b',alive:true,connected:false,hold:false,device:'shared'},
      {uid:'c',alive:false,connected:true,hold:false,device:'shared'},
      {uid:'d',alive:true,connected:false,hold:true,device:'shared'},
    ])).toEqual(['a', 'b']);
  });
});
