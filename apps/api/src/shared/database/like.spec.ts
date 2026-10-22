import { describe, expect, it } from 'vitest';
import { escapeLike } from './like.js';

describe('escapeLike', () => {
  it('escapa wildcards e a barra de escape', () => {
    expect(escapeLike('100%_test\\')).toBe('100\\%\\_test\\\\');
  });

  it('mantém texto normal inalterado', () => {
    expect(escapeLike('oficina do joão')).toBe('oficina do joão');
  });
});
