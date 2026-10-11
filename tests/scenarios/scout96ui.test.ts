import { describe, expect, it } from 'vitest';
import { S } from '../../src/content/strings';
import { hunterRank } from '../../src/game/hunting';
import { codeLabel } from '../../src/platform/settings';

describe('fifth scout fixes: interface text (A96)', () => {
  it('counts one arrow and one coin in the singular, more in the plural', () => {
    expect(S('hunting.ammo', { arrows: 1 })).toBe('1 arrow');
    expect(S('hunting.ammo', { arrows: 7 })).toBe('7 arrows');
    expect(S('prompt.restock_arrows', { count: 1 })).toBe('Trade 1 hide for 1 arrow');
    expect(S('hunting.restocked', { count: 6 })).toBe('One hide traded for 6 arrows.');
    expect(S('hunting.bow_hint', { aim: 'Right click', draw: 'Left click', arrows: 1 })).toMatch(/· 1 arrow$/);
  });

  it('names the price the hunter pays at the rank reached', () => {
    const tracker = hunterRank({ taken: 3 } as never).meat;
    expect(tracker).toBeGreaterThan(2);
    expect(S('prompt.sell_game_meat', { coin: tracker })).toContain(`→ ${tracker} coins`);
  });

  it('reads every key the rebind screen accepts as its keycap', () => {
    for (const code of ['ControlRight', 'AltRight', 'MetaLeft', 'Mouse3', 'Mouse4', 'Comma', 'BracketLeft', 'Numpad5', 'CapsLock', 'NumpadAdd', 'Backslash']) {
      expect(codeLabel(code), code).not.toBe(code);
    }
    expect(codeLabel('Mouse3')).toBe('Back button');
    expect(codeLabel('Numpad5')).toBe('Num 5');
    expect(codeLabel('Backslash')).toBe(String.fromCharCode(92));
    expect(codeLabel('F7')).toBe('F7');
  });

  it('gives the controller its own arrival hint, and the pause row a cancel hint without Escape', () => {
    expect(S('arrival.controls.pad', { interact: 'A', journal: 'D-pad ↑' })).toContain('Left stick');
    expect(S('arrival.controls.pad', { interact: 'A', journal: 'D-pad ↑' })).not.toContain('Click');
    expect(S('set.cancelhint.pause')).not.toContain('Esc');
  });
});
