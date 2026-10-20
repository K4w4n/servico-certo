import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Request, Response } from 'express';

const REFRESH_TOKEN_COOKIE = 'refresh_token';
const COOKIE_PATH = '/v1/auth';
const DAY_IN_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class AuthCookieService {
  private readonly secure: boolean;
  private readonly domain: string | undefined;
  private readonly maxAgeMs: number;

  constructor(@Inject(ConfigService) config: ConfigService) {
    this.secure = config.get<string>('NODE_ENV') === 'production';
    this.domain = config.get<string>('COOKIE_DOMAIN') || undefined;
    this.maxAgeMs = Number(config.getOrThrow('REFRESH_TOKEN_TTL_DAYS')) * DAY_IN_MS;
  }

  setRefreshToken(response: Response, token: string): void {
    response.cookie(REFRESH_TOKEN_COOKIE, token, {
      ...this.baseOptions(),
      maxAge: this.maxAgeMs,
    });
  }

  clearRefreshToken(response: Response): void {
    response.clearCookie(REFRESH_TOKEN_COOKIE, this.baseOptions());
  }

  readRefreshToken(request: Request): string | undefined {
    const token = request.cookies?.[REFRESH_TOKEN_COOKIE];

    return typeof token === 'string' ? token : undefined;
  }

  private baseOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.secure,
      sameSite: 'lax',
      path: COOKIE_PATH,
      ...(this.domain ? { domain: this.domain } : {}),
    };
  }
}
