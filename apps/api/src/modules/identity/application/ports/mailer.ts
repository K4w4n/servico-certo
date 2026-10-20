export const MAILER = Symbol('MAILER');

export type PasswordResetEmail = {
  to: string;
  accountName: string;
  tenantName: string;
  token: string;
  expiresInMinutes: number;
};

export interface Mailer {
  sendPasswordReset(email: PasswordResetEmail): Promise<void>;
}
