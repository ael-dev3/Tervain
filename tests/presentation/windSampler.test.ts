import {expect, it} from 'vitest';
import {GrassWind, gustField, GUST_SPAN, GUST_TEXELS} from '../../src/presentation/grass/wind';

it('matches toroidal bilinear sampling exactly across seams, scrolling and extreme coordinates', () => {
  const wind = new GrassWind({direction: [.6, .8], steady: .2, gust: .5, speed: 4});
  const n = GUST_TEXELS, data = gustField();
  expect(n).toBeGreaterThan(0);
  expect(n & (n - 1)).toBe(0);
  const sample = (x: number, z: number) => {
    const scroll = wind.uniforms.uGustScroll.value;
    const u = (x - scroll.x) / GUST_SPAN * n - .5, v = (z - scroll.y) / GUST_SPAN * n - .5;
    const i = Math.floor(u), j = Math.floor(v), fx = u - i, fy = v - j;
    const at = (a: number, b: number) => data[(((b % n + n) % n) * n + (a % n + n) % n) * 4]! / 255;
    const a = at(i,j), b = at(i+1,j), c = at(i,j+1), d = at(i+1,j+1);
    return a + (b-a)*fx + (c-a)*fy + (a-b-c+d)*fx*fy;
  };
  const points: number[] = [0, -.5, .5, 56, -56, 56/128, -56/128, 2**40, -(2**40), 2**53, -(2**53), Number.MAX_VALUE/128, Number.MAX_VALUE, Infinity, -Infinity, NaN];
  let state = 1234567;
  for (let i=0;i<2000;i++) {state=(Math.imul(state,1664525)+1013904223)>>>0;points.push((state/2**32-.5)*10000);}
  try {
    for (let step=0;step<5;step++) {
      wind.update(.1);
      for (let i=0;i<points.length;i++) expect(wind.gustAt(points[i]!, points[(i*17+3)%points.length]!)).toBe(sample(points[i]!,points[(i*17+3)%points.length]!));
    }
  } finally {wind.dispose();}
});
