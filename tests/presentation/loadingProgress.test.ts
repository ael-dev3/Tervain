import { describe, expect, it } from 'vitest';
import { LoadingProgress } from '../../src/presentation/ui/loadingProgress';

describe('journey preparation progress', () => {
  it('keeps completed stages behind the current phase when earlier downloads finish late', () => {
    const progress = new LoadingProgress();
    progress.update({ phase: 'residents', completed: 2, total: 12 });
    const woodland = progress.update({ phase: 'woodland', completed: 1, total: 1 });
    expect(progress.update({ phase: 'residents', completed: 12, total: 12 })).toEqual(woodland);
    expect(woodland.index).toBeGreaterThan(1);
  });

  it('uses decoded asset/work counts and rejects an out-of-order callback within a phase', () => {
    const progress = new LoadingProgress();
    progress.update({ phase: 'models', completed: 5, total: 15 });
    expect(progress.update({ phase: 'models', completed: 3, total: 15 })).toMatchObject({ completed: 5, total: 15, fraction: 1 / 3 });
    expect(progress.update({ phase: 'models', completed: 6, total: 15 })).toMatchObject({ completed: 6, fraction: .4 });
  });

  it('leaves unknown work indeterminate instead of reporting a guessed percent', () => {
    const progress = new LoadingProgress();
    expect(progress.update({ phase: 'physics' })).toMatchObject({ completed: null, total: null, fraction: null });
    expect(progress.update({ phase: 'physics', completed: 1, total: Infinity })).toMatchObject({ completed: null, total: null, fraction: null });
    expect(progress.update({ phase: 'physics', completed: 1, total: .2 })).toMatchObject({ completed: null, total: null, fraction: null });
  });

  it('restarts the first phase on recovery without leaking the previous graphics count', () => {
    const progress = new LoadingProgress();
    progress.update({ phase: 'graphics', completed: 1, total: 1, detail: 'The woodland is ready.' });
    expect(progress.reset()).toMatchObject({ phase: 'prepare', index: 0, total: null, completed: null, fraction: null, detail: null });
    expect(progress.update({ phase: 'residents', completed: 1, total: 10 })).toMatchObject({ fraction: .1 });
  });

  it('shows discovered counts accurately while preserving the already drawn stage fill', () => {
    const progress = new LoadingProgress();
    progress.update({ phase: 'terrain', completed: 4, total: 8 });
    expect(progress.update({ phase: 'terrain', completed: 4, total: 12 })).toMatchObject({ completed: 4, total: 12, fraction: .5 });
    expect(progress.update({ phase: 'terrain', completed: 12, total: 12 })).toMatchObject({ completed: 12, total: 12, fraction: 1 });
  });

  it('supports a smaller ordered preparation sequence without drawing nonexistent stages', () => {
    const progress = new LoadingProgress(['prepare', 'terrain', 'graphics']);
    expect(progress.update({ phase: 'residents', completed: 12, total: 12 }).phase).toBe('prepare');
    expect(progress.update({ phase: 'terrain', completed: 1, total: 4 }).index).toBe(1);
    expect(progress.phases).toHaveLength(3);
  });
});
