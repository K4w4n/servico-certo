import { InvalidPasswordResetTokenDataError } from '../errors/identity.errors.js';

const TOKEN_HASH_REGEX = /^[a-f0-9]{64}$/;

export type PasswordResetTokenProps = {
  id: string;
  accountId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
};

export class PasswordResetToken {
  private constructor(private readonly props: PasswordResetTokenProps) {}

  static create(input: {
    id: string;
    accountId: string;
    tokenHash: string;
    expiresAt: Date;
    now: Date;
  }): PasswordResetToken {
    assertPasswordResetTokenData(input.tokenHash, input.accountId, input.expiresAt);

    return new PasswordResetToken({
      id: input.id,
      accountId: input.accountId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      usedAt: null,
      revokedAt: null,
      createdAt: input.now,
    });
  }

  static restore(props: PasswordResetTokenProps): PasswordResetToken {
    return new PasswordResetToken(props);
  }

  get id(): string {
    return this.props.id;
  }

  get accountId(): string {
    return this.props.accountId;
  }

  get tokenHash(): string {
    return this.props.tokenHash;
  }

  get expiresAt(): Date {
    return this.props.expiresAt;
  }

  get usedAt(): Date | null {
    return this.props.usedAt;
  }

  get revokedAt(): Date | null {
    return this.props.revokedAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get isUsed(): boolean {
    return this.props.usedAt !== null;
  }

  get isRevoked(): boolean {
    return this.props.revokedAt !== null;
  }

  isExpired(now: Date): boolean {
    return this.props.expiresAt.getTime() <= now.getTime();
  }

  isUsable(now: Date): boolean {
    return !this.isUsed && !this.isRevoked && !this.isExpired(now);
  }

  markUsed(now: Date): void {
    this.props.usedAt = now;
  }

  revoke(now: Date): void {
    this.props.revokedAt = now;
  }
}

function assertPasswordResetTokenData(tokenHash: string, accountId: string, expiresAt: Date): void {
  if (
    !TOKEN_HASH_REGEX.test(tokenHash) ||
    accountId.length === 0 ||
    Number.isNaN(expiresAt.getTime())
  ) {
    throw new InvalidPasswordResetTokenDataError();
  }
}
