import { describe, expect, it } from 'vitest';
import { validateContent } from '../../src/content/validate';

describe('authored content', () => {
  it('has resolvable dialogue links, entry rules and text', () => {
    expect(validateContent()).toEqual([]);
  });
});
