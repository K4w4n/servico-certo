export const PASSWORD_RESET_TOKEN_SERVICE = Symbol('PASSWORD_RESET_TOKEN_SERVICE');

export type GeneratedPasswordResetToken = {
  token: string;
  hash: string;
  expiresAt: Date;
  expiresInMinutes: number;
};

export interface PasswordResetTokenService {
  generate(now: Date): GeneratedPasswordResetToken;
  hash(token: string): string;
}
