import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const project = 'demo-jinrou-integration';
// Fail closed even if someone invokes this file without the launcher.
assert.equal(process.env.GCLOUD_PROJECT, project);
assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1:9099');
assert.equal(process.env.FIREBASE_DATABASE_EMULATOR_HOST, '127.0.0.1:9000');
const authBase = 'http://127.0.0.1:9099';
const functionsBase = 'http://127.0.0.1:5001/' + project + '/asia-northeast1/';
const dbBase = 'http://127.0.0.1:9000';
async function request(url, options = {}) {
  const res = await fetch(url, { ...options, signal: AbortSignal.timeout(30000) });
  return { status: res.status, body: await res.json() };
}
async function client() {
  const { status, body } = await request(authBase + '/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-key', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ returnSecureToken: true }),
  });
  assert.equal(status, 200, JSON.stringify(body));
  assert.ok(body.idToken);
  return { uid: body.localId, token: body.idToken };
}
async function call(who, name, data) {
  const { status, body } = await request(functionsBase + name, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(who ? { Authorization: 'Bearer ' + who.token } : {}) },
    body: JSON.stringify({ data }),
  });
  if (body.error || status !== 200) {
    const error = new Error(JSON.stringify(body));
    error.code = body.error?.status;
    throw error;
  }
  return body.result ?? body.data;
}
const rejects = (promise, code) => assert.rejects(promise, e => e.code === code);
const action = (who, code, type, extra = {}) => call(who, 'updateRoom', { code, action: { type, ...extra } });
const view = async (who, code, kind = 'player') => (await call(who, 'getRoom', { code, kind })).view;
const roles = n => ({ 市民: n - 1, 占い師: 0, 霊媒師: 0, 騎士: 0, 共有者: 0, 人狼: 1, 狂人: 0, 狂言者: 0 });
async function room(n, settings = {}) {
  const host = await client(), players = [];
  const data = { playerCount: n, playerName: 'GM', requestId: randomUUID(),
    settings: { hostMode: 'gm', gmRevealRoles: true, roles: roles(n),
      discussionSeconds: 3600, ...settings } };
  const { code } = await call(host, 'createRoom', data);
  assert.match(code, /^\d{5}$/);
  // Idempotent retry must return the same room.
  assert.equal((await call(host, 'createRoom', data)).code, code);
  for (let i = 0; i < n; i++) {
    const p = await client();
    await call(p, 'joinRoom', { code, name: 'P' + i });
    players.push(p);
  }
  assert.equal(new Set(players.map(p => p.uid)).size, n);
  assert.equal((await view(host, code)).players.length, n);
  return { host, players, code };
}
async function start(r) {
  await action(r.host, r.code, 'start');
  assert.equal((await view(r.host, r.code)).phase, 'rolecheck');
  for (const p of r.players) await action(p, r.code, 'ready');
  assert.equal((await view(r.host, r.code)).phase, 'night');
}
async function firstVote(r) {
  await start(r);
  for (const p of r.players) await action(p, r.code, 'nightDone');
  assert.equal((await view(r.host, r.code)).phase, 'morning');
  for (const p of r.players) await action(p, r.code, 'ackMorning');
  await action(r.host, r.code, 'force');
  assert.equal((await view(r.host, r.code)).phase, 'discussion');
  await action(r.host, r.code, 'force');
  assert.equal((await view(r.host, r.code)).phase, 'vote');
}
async function db(who, path, method = 'GET', value) {
  const url = new URL(dbBase + '/' + path + '.json');
  url.searchParams.set('ns', project);
  if (who) url.searchParams.set('auth', who.token);
  return request(url, { method, ...(value === undefined ? {} : {
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value),
  }) });
}
async function denied(who, path, method, value) {
  const res = await db(who, path, method, value);
  assert.ok([401, 403].includes(res.status), JSON.stringify(res));
  assert.match(String(res.body.error), /permission denied/i);
}

test('authentication, membership, GM impersonation and personal-seat impersonation', { timeout: 120000 }, async () => {
  await rejects(call(null, 'createRoom', {}), 'UNAUTHENTICATED');
  const r = await room(3), outsider = await client(), p = r.players[0];
  await rejects(call(outsider, 'getRoom', { code: r.code }), 'PERMISSION_DENIED');
  await rejects(call(p, 'joinRoom', { code: r.code, name: 'P0', kind: 'gm' }), 'PERMISSION_DENIED');
  await rejects(action(p, r.code, 'start'), 'PERMISSION_DENIED');
  assert.equal((await view(r.host, r.code)).phase, 'waiting');
  await rejects(call(p, 'getRoom', { code: r.code, seatUid: r.players[1].uid }), 'PERMISSION_DENIED');
  await rejects(call(p, 'getManagerProgress', { code: r.code, expectedPhase: 'waiting' }), 'PERMISSION_DENIED');
  await rejects(call(p, 'disbandRoom', { code: r.code }), 'PERMISSION_DENIED');
  await call(r.host, 'disbandRoom', { code: r.code });
  await rejects(call(r.host, 'getRoom', { code: r.code }), 'NOT_FOUND');
});

test('real Database Rules allow only authorized signals and reject reads/writes', { timeout: 120000 }, async () => {
  const r = await room(3), outsider = await client(), spectator = await client();
  await call(spectator, 'joinRoom', { code: r.code, name: '観戦', kind: 'spectator' });
  for (const leaf of ['signalRevision', 'progressRevision']) {
    const path = 'rooms/' + r.code + '/' + leaf;
    for (const who of [r.host, r.players[0], spectator]) {
      const res = await db(who, path);
      assert.equal(res.status, 200, JSON.stringify(res));
      assert.equal(typeof res.body, 'number');
    }
    await denied(null, path);
    await denied(outsider, path);
    for (const who of [r.host, r.players[0], spectator, outsider, null])
      await denied(who, path, 'PUT', 999);
  }
  for (const who of [r.host, r.players[0], spectator, outsider, null]) {
    for (const path of ['', 'rooms', 'rooms/' + r.code, 'rooms/' + r.code + '/players',
      'rooms/' + r.code + '/clientMeta', 'rooms/' + r.code + '/actions',
      'rooms/' + r.code + '/votes', 'rooms/' + r.code + '/chatMembers',
      'rooms/' + r.code + '/wolfChat', 'rooms/' + r.code + '/sharedChat',
      'rooms/' + r.code + '/chatSignals/wolf', 'rooms/' + r.code + '/chatSignals/shared',
      'roomPresence/' + r.code, 'roomCreateRequests/' + r.host.uid]) await denied(who, path);
    await denied(who, 'rooms/' + r.code + '/phase', 'PUT', 'ended');
    await denied(who, 'rooms/' + r.code + '/players/' + r.players[0].uid + '/role', 'PUT', '人狼');
    await denied(who, 'rooms/' + r.code, 'PATCH', { phase: 'ended' });
    await denied(who, 'rooms/' + r.code, 'DELETE');
  }
  assert.equal((await view(r.host, r.code)).phase, 'waiting');
});

for (const n of [3, 20]) test(n + ' independent users: create → join → night → vote → victory → replay', { timeout: 240000 }, async () => {
  const r = await room(n), extra = await client();
  await rejects(call(extra, 'joinRoom', { code: r.code, name: 'overflow' }), 'RESOURCE_EXHAUSTED');
  await firstVote(r);
  const gm = await view(r.host, r.code);
  const wolf = gm.players.find(p => p.role === '人狼');
  assert.ok(wolf);
  for (const p of r.players) {
    const v = await view(p, r.code);
    assert.equal(v.canManage, false);
    assert.equal(v.gm, undefined);
    assert.equal(v.secret.me.uid, p.uid);
    assert.ok(v.secret.role);
    assert.ok(v.players.every(other => !Object.hasOwn(other, 'role')));
  }
  const human = r.players.find(p => p.uid !== wolf.uid);
  await rejects(action(human, r.code, 'vote', { target: human.uid }), 'INVALID_ARGUMENT');
  for (let i = 0; i < r.players.length; i++) {
    const p = r.players[i];
    await action(p, r.code, 'vote', { target: p.uid === wolf.uid ? human.uid : wolf.uid });
    if (i < n - 1) assert.equal((await view(r.host, r.code)).phase, 'vote');
  }
  assert.equal((await view(r.host, r.code)).phase, 'execution');
  await action(r.host, r.code, 'force');
  for (const p of [r.host, ...r.players]) {
    const v = await view(p, r.code);
    assert.equal(v.phase, 'ended');
    assert.equal(v.winner, '市民陣営');
    assert.equal(v.players.find(x => x.uid === wolf.uid).alive, false);
  }
  await action(r.host, r.code, 'replay');
  const reset = await view(r.host, r.code);
  assert.equal(reset.phase, 'waiting');
  assert.equal(reset.round, 0);
  assert.equal(reset.winner, null);
  assert.equal(reset.players.length, n);
  assert.ok(reset.players.every(p => p.alive && !p.role));
  await start(r); // same users can actually start the next match
});

test('tie → restricted revote → execution; spectators do not receive secrets', { timeout: 120000 }, async () => {
  const r = await room(4), spectator = await client();
  await call(spectator, 'joinRoom', { code: r.code, name: '観戦', kind: 'spectator' });
  await firstVote(r);
  const sv = await view(spectator, r.code, 'spectator');
  assert.equal(sv.secret, null);
  assert.equal(sv.canManage, false);
  assert.equal(sv.roleIntel, null);
  assert.ok(sv.players.every(p => !p.role));
  const [a, b, c, d] = r.players;
  for (const [p, target] of [[a,b], [b,a], [c,a], [d,b]])
    await action(p, r.code, 'vote', { target: target.uid });
  const tied = await view(r.host, r.code);
  assert.equal(tied.phase, 'revote');
  assert.deepEqual([...tied.revoteCandidates].sort(), [a.uid, b.uid].sort());
  await rejects(action(a, r.code, 'vote', { target: b.uid }), 'FAILED_PRECONDITION');
  await rejects(action(c, r.code, 'vote', { target: d.uid }), 'INVALID_ARGUMENT');
  await action(c, r.code, 'vote', { target: a.uid });
  assert.equal((await view(r.host, r.code)).phase, 'revote');
  await action(d, r.code, 'vote', { target: a.uid });
  const result = await view(r.host, r.code);
  assert.equal(result.phase, 'execution');
  assert.equal(result.players.find(p => p.uid === a.uid).alive, false);
});
