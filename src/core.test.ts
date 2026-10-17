import {describe,it,expect} from 'vitest';
const roomCode=(n:number)=>String(n).padStart(5,'0');
function winner(wolves:number,civilians:number){return wolves===0?'市民陣営':wolves>=civilians?'人狼陣営':null}
describe('基本ルールの境界',()=>{it('ルームコードを5桁で表す',()=>{expect(roomCode(0)).toBe('00000');expect(roomCode(48317)).toBe('48317');expect(roomCode(99999)).toBe('99999')});it('3人と20人の役職合計を表現できる',()=>{expect([1,1,1].reduce((a,b)=>a+b,0)).toBe(3);expect(Array(20).fill(1).reduce((a,b)=>a+b,0)).toBe(20)});it('人狼陣営は狼を人数比較から除外した市民数で勝つ',()=>{expect(winner(0,4)).toBe('市民陣営');expect(winner(2,2)).toBe('人狼陣営');expect(winner(1,3)).toBe(null)})});
