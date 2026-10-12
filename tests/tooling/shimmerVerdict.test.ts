import {expect,it} from 'vitest';
import {shimmerVerdict} from '../../tools/shimmer-verdict.mjs';
const good={summary:{sparkleShare:.04,usableFrames:100,alignmentShare:.95}};
it('fails unsuccessful decodes even when a stale valid receipt exists',()=>{
  expect(shimmerVerdict(1,good,.05).pass).toBe(false);
  expect(shimmerVerdict(null,good,.05).pass).toBe(false);
});
it('fails absent, null, nonfinite and unusable measurements',()=>{
  for(const score of [null,NaN,Infinity,-.1,1.1])expect(shimmerVerdict(0,{summary:{...good.summary,sparkleShare:score}},.05).pass).toBe(false);
  expect(shimmerVerdict(0,null,.05).pass).toBe(false);
  expect(shimmerVerdict(0,{summary:{...good.summary,usableFrames:0}},.05).pass).toBe(false);
});
it('requires sufficient alignment and rejects invalid baselines',()=>{
  expect(shimmerVerdict(0,{summary:{...good.summary,alignmentShare:.2}},.05).pass).toBe(false);
  expect(shimmerVerdict(0,good,NaN).pass).toBe(false);
});
it('preserves accepted measurements and the existing five-percent regression ceiling',()=>{
  expect(shimmerVerdict(0,good,.05).pass).toBe(true);
  expect(shimmerVerdict(0,{summary:{...good.summary,sparkleShare:.053}},.05).pass).toBe(false);
  expect(shimmerVerdict(0,good).compared).toBe(false);
  expect(shimmerVerdict(0,good).pass).toBe(true);
});
