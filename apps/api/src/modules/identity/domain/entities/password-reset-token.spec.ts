import { describe, expect, it } from 'vitest';
import { PasswordResetToken } from './password-reset-token.js';

const TOKEN_HASH = 'a'.repeat(64);
const CREATED_AT = new Date('2026-01-01T00:00:00.000Z');
const EXPIRES_AT = new Date('2026-01-01T00:30:00.000Z');

function createToken(): PasswordResetToken {
  return PasswordResetToken.create({
    id: 'token-id',
    accountId: 'account-id',
    tokenHash: TOKEN_HASH,
    expiresAt: EXPIRES_AT,
    now: CREATED_AT,
  });
}

describe('PasswordResetToken', () => {
  it('é utilizável antes da expiração', () => {
    const token = createToken();

    expect(token.isUsable(new Date('2026-01-01T00:10:00.000Z'))).toBe(true);
  });

  it('não é utilizável após a expiração', () => {
    const token = createToken();

    expect(token.isExpired(EXPIRES_AT)).toBe(true);
    expect(token.isUsable(EXPIRES_AT)).toBe(false);
  });

  it('não é utilizável depois de usado', () => {
    const token = createToken();
    token.markUsed(new Date('2026-01-01T00:10:00.000Z'));

    expect(token.isUsed).toBe(true);
    expect(token.isUsable(new Date('2026-01-01T00:11:00.000Z'))).toBe(false);
  });

  it('não é utilizável depois de revogado', () => {
    const token = createToken();
    token.revoke(new Date('2026-01-01T00:10:00.000Z'));

    expect(token.isRevoked).toBe(true);
    expect(token.isUsable(new Date('2026-01-01T00:11:00.000Z'))).toBe(false);
  });

  it('rejeita hash inválido', () => {
    expect(() =>
      PasswordResetToken.create({
        id: 'token-id',
        accountId: 'account-id',
        tokenHash: 'invalid',
        expiresAt: EXPIRES_AT,
        now: CREATED_AT,
      }),
    ).toThrow();
  });
});
