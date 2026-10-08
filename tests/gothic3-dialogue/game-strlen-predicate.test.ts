import { describe,expect,it } from 'vitest';
import { gameStrlenDwordCandidate } from '../../src/gothic3/native-game-strlen-predicate';
const native = (word:number) => ((((word ^ 0xffffffff) ^ ((word + 0x7efefeff) >>> 0)) & 0x81010100) >>> 0) !== 0;
describe('Game _strlen exact masked DWORD predicate', () => {
  it('admits a known first NUL with all 24 padding bits unknown', () => {
    expect(gameStrlenDwordCandidate(0xffffff00,0xff)).toEqual({known:true,value:true});
    expect(gameStrlenDwordCandidate(0,0)).toMatchObject({known:false});
    expect(gameStrlenDwordCandidate(0x41414141,0xffffffff)).toEqual({known:true,value:false});
    expect(gameStrlenDwordCandidate(0x80808080,0xffffffff)).toEqual({known:true,value:native(0x80808080)});
  });
  it('agrees with exhaustive original arithmetic for independent partially known bits', () => {
    let seed=0x3a412eed;
    const random=() => { seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed; };
    for (let sample=0;sample<300;sample++) {
      const word=random(), positions=new Set<number>();
      while(positions.size<8) positions.add(random()>>>27);
      let mask=0xffffffff;
      for(const bit of positions) mask=(mask & ~(1<<bit))>>>0;
      const bits=[...positions], possible=new Set<boolean>();
      for(let completion=0;completion<256;completion++) {
        let candidate=(word & mask)>>>0;
        for(let i=0;i<bits.length;i++) if((completion & (1<<i))!==0) candidate=(candidate | (1<<bits[i]!))>>>0;
        possible.add(native(candidate));
      }
      const actual=gameStrlenDwordCandidate(word,mask);
      expect(actual.known).toBe(possible.size===1);
      if(actual.known) expect(actual.value).toBe([...possible][0]);
    }
  });
});
