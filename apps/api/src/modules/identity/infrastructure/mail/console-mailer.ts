import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Mailer, PasswordResetEmail } from '../../application/ports/mailer.js';

export class ConsoleMailer implements Mailer {
  private readonly logger = new Logger(ConsoleMailer.name);
  private readonly webAppUrl: string;

  constructor(config: ConfigService) {
    this.webAppUrl = config.getOrThrow<string>('WEB_APP_URL');
  }

  sendPasswordReset(email: PasswordResetEmail): Promise<void> {
    const resetUrl = buildResetUrl(this.webAppUrl, email.token);

    this.logger.log(`Password reset para ${email.to} (${email.tenantName}): ${resetUrl}`);

    return Promise.resolve();
  }
}

export function buildResetUrl(webAppUrl: string, token: string): string {
  return `${webAppUrl.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`;
}
