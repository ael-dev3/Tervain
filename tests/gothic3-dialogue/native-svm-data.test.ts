import { describe, expect, it } from 'vitest';
import { NativeSvmManagerData } from '../../src/gothic3/native-svm-data';

describe('prepared installed SVM manager contents', () => {
  it('retains the declared map contents and selected local audio language', () => {
    const svm = new NativeSvmManagerData();
    expect(svm.voices).toHaveLength(54);
    expect(svm.categories).toHaveLength(15);
    expect(svm.categories.reduce((count, category) => count + category.entries.length, 0)).toBe(581);
    expect(svm.audioLanguage).toBe('English');
  });

  it('formats the native bandit DEAD sample without inventing spoken text', () => {
    expect(new NativeSvmManagerData().sampleName('Hum_Warrior_Hard', 'DEAD'))
      .toBe('SVM_Hum_Warrior_Hard_DEAD_English.wav');
  });

  it('keeps mutable manager representations owned by each browser runtime', () => {
    const first = new NativeSvmManagerData();
    const second = new NativeSvmManagerData();
    first.voices.pop();
    first.categories[0]!.entries.pop();
    expect(second.voices).toHaveLength(54);
    expect(second.categories.reduce((count, category) => count + category.entries.length, 0)).toBe(581);
  });

  it('rejects empty and embedded-NUL CString inputs', () => {
    const svm = new NativeSvmManagerData();
    for (const [voice, label] of [['', 'DEAD'], ['Hum_Warrior_Hard', ''], ['Hum\0Bad', 'DEAD'], ['Hum', 'DEAD\0x']] as const) {
      expect(() => svm.sampleName(voice, label)).toThrow('bounded native CString');
    }
  });
});
