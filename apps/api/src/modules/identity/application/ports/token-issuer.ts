export const TOKEN_ISSUER = Symbol('TOKEN_ISSUER');

export type AccessTokenPayload = {
  accountId: string;
  tenantId: string;
};

export type IssuedAccessToken = {
  token: string;
  expiresIn: number;
};

export interface TokenIssuer {
  issue(payload: AccessTokenPayload): Promise<IssuedAccessToken>;
  verify(token: string): Promise<AccessTokenPayload>;
}
