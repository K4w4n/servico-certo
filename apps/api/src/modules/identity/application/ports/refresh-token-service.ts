export const REFRESH_TOKEN_SERVICE = Symbol('REFRESH_TOKEN_SERVICE');

export type GeneratedRefreshToken = {
  token: string;
  hash: string;
  expiresAt: Date;
};

export interface RefreshTokenService {
  generate(now: Date): GeneratedRefreshToken;
  hash(token: string): string;
}
