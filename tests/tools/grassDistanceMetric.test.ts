import {describe,it,expect} from 'vitest';
import {grassDistanceBucket,grassLuminanceUnits} from '../../tools/grass-distance-metric.mjs';
describe('grass distance capture labels',()=>{
 it('keeps three known one-hot strata distinct',()=>{
  expect([grassDistanceBucket(255,0,0),grassDistanceBucket(0,255,0),grassDistanceBucket(0,0,255)]).toEqual([0,1,2]);
 });
 it('rejects uncovered pixels and tracks uncertain boundary mixtures separately',()=>{
  expect(grassDistanceBucket(0,0,0)).toBe(255);
  expect(grassDistanceBucket(63,0,0)).toBe(255);
  expect(grassDistanceBucket(64,0,0)).toBe(0);
  expect(grassDistanceBucket(128,127,0)).toBe(3);
  expect(grassDistanceBucket(0,10,245)).toBe(2);
 });
 it('retains fractional MSAA coverage without inventing another distance band',()=>{
  expect(grassDistanceBucket(0,64,0)).toBe(1);
  expect(grassDistanceBucket(200,50,0)).toBe(0);
  expect(grassDistanceBucket(199,51,0)).toBe(3);
 });
 it('distinguishes above 60 from exactly 60 without float threshold noise',()=>{
  expect(grassLuminanceUnits(160,160,160)-grassLuminanceUnits(100,100,100)).toBe(600000);
  expect(grassLuminanceUnits(161,161,161)-grassLuminanceUnits(100,100,100)).toBeGreaterThan(600000);
  expect(grassLuminanceUnits(231,199,167)).toBe(2034928);
 });
});
