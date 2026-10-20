import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import type { Mailer, PasswordResetEmail } from '../../application/ports/mailer.js';
import { buildResetUrl } from './console-mailer.js';

export class SmtpMailer implements Mailer {
  private readonly logger = new Logger(SmtpMailer.name);
  private readonly transporter: ReturnType<typeof nodemailer.createTransport>;
  private readonly from: string;
  private readonly webAppUrl: string;

  constructor(config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');

    if (!host) {
      throw new Error('SMTP_HOST é obrigatório quando MAIL_TRANSPORT=smtp');
    }

    const user = config.get<string>('SMTP_USER');
    const pass = config.get<string>('SMTP_PASS');

    this.transporter = nodemailer.createTransport({
      host,
      port: Number(config.getOrThrow('SMTP_PORT')),
      secure: config.get<boolean>('SMTP_SECURE') ?? false,
      ...(user && pass ? { auth: { user, pass } } : {}),
    });
    this.from = config.getOrThrow<string>('MAIL_FROM');
    this.webAppUrl = config.getOrThrow<string>('WEB_APP_URL');
  }

  async sendPasswordReset(email: PasswordResetEmail): Promise<void> {
    const resetUrl = buildResetUrl(this.webAppUrl, email.token);
    const subject = 'Redefinição de senha — Serviço Certo';
    const text = [
      `Olá, ${email.accountName}.`,
      '',
      `Recebemos um pedido para redefinir a senha da sua conta em ${email.tenantName}.`,
      '',
      `Acesse: ${resetUrl}`,
      '',
      `O link expira em ${email.expiresInMinutes} minutos. Se você não solicitou, ignore este e-mail.`,
    ].join('\n');

    const html = [
      `<p>Olá, ${escapeHtml(email.accountName)}.</p>`,
      `<p>Recebemos um pedido para redefinir a senha da sua conta em <strong>${escapeHtml(email.tenantName)}</strong>.</p>`,
      `<p><a href="${resetUrl}">Redefinir senha</a></p>`,
      `<p>O link expira em ${email.expiresInMinutes} minutos. Se você não solicitou, ignore este e-mail.</p>`,
    ].join('');

    try {
      await this.transporter.sendMail({
        from: this.from,
        to: email.to,
        subject,
        text,
        html,
      });
    } catch (error) {
      this.logger.error(
        `Falha ao enviar e-mail de reset para ${email.to}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}

function escapeHtml(value: string): string {
  const entities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };

  return value.replace(/[&<>"']/g, (character) => entities[character] ?? character);
}
