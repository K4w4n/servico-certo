import { InvalidRefreshTokenDataError } from '../errors/identity.errors.js';

const TOKEN_HASH_REGEX = /^[a-f0-9]{64}$/;

export type RefreshTokenProps = {
  id: string;
  accountId: string;
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedById: string | null;
  createdAt: Date;
};

export class RefreshToken {
  private constructor(private readonly props: RefreshTokenProps) {}

  static create(input: {
    id: string;
    accountId: string;
    familyId: string;
    tokenHash: string;
    expiresAt: Date;
    now: Date;
  }): RefreshToken {
    assertRefreshTokenData(input.tokenHash, input.familyId, input.accountId, input.expiresAt);

    return new RefreshToken({
      id: input.id,
      accountId: input.accountId,
      familyId: input.familyId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      revokedAt: null,
      replacedById: null,
      createdAt: input.now,
    });
  }

  static restore(props: RefreshTokenProps): RefreshToken {
    return new RefreshToken(props);
  }

  get id(): string {
    return this.props.id;
  }

  get accountId(): string {
    return this.props.accountId;
  }

  get familyId(): string {
    return this.props.familyId;
  }

  get tokenHash(): string {
    return this.props.tokenHash;
  }

  get expiresAt(): Date {
    return this.props.expiresAt;
  }

  get revokedAt(): Date | null {
    return this.props.revokedAt;
  }

  get replacedById(): string | null {
    return this.props.replacedById;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get isRevoked(): boolean {
    return this.props.revokedAt !== null;
  }

  isExpired(now: Date): boolean {
    return this.props.expiresAt.getTime() <= now.getTime();
  }

  revoke(now: Date, replacedById: string | null = null): void {
    this.props.revokedAt = now;
    this.props.replacedById = replacedById;
  }
}

function assertRefreshTokenData(
  tokenHash: string,
  familyId: string,
  accountId: string,
  expiresAt: Date,
): void {
  if (
    !TOKEN_HASH_REGEX.test(tokenHash) ||
    familyId.length === 0 ||
    accountId.length === 0 ||
    Number.isNaN(expiresAt.getTime())
  ) {
    throw new InvalidRefreshTokenDataError();
  }
}
